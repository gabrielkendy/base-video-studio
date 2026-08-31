import { supabaseAdmin } from "@/lib/supabase/admin";
import { fal } from "@/lib/fal/client";
import { extractVideoUrl, extractThumbnailUrl } from "@/lib/fal/models";
import { ensureFalConfigured } from "@/lib/fal/key";
import type { Job } from "@/types";

const TIMEOUT_AFTER_MS = 30 * 60_000; // expira PROCESSING preso há +30min

/**
 * Consulta a fal.ai o status de TODOS os jobs PROCESSING e atualiza o banco
 * (COMPLETED + url, ou FAILED). É o mecanismo principal de conclusão, já que
 * o webhook pode não chegar e o cron do Hobby roda só 1x/dia.
 * Idempotente e seguro para rodar com frequência (chamado pelo frontend).
 */
export async function reconcileProcessing(): Promise<{
  checked: number;
  completed: number;
  failed: number;
}> {
  // sem chave configurada não dá pra consultar a fal
  if (!(await ensureFalConfigured())) {
    return { checked: 0, completed: 0, failed: 0 };
  }

  const { data: processing } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("status", "PROCESSING");

  let completed = 0;
  let failed = 0;
  const list = (processing ?? []) as Job[];

  await Promise.all(
    list.map(async (job) => {
      const endpoint = job.fal_endpoint ?? job.model_id;
      if (!job.fal_request_id) return;

      try {
        const st = await fal.queue.status(endpoint, {
          requestId: job.fal_request_id,
          logs: false,
        });

        if (st.status === "COMPLETED") {
          const r = await fal.queue.result(endpoint, {
            requestId: job.fal_request_id,
          });
          const url = extractVideoUrl(r.data);
          const thumb = extractThumbnailUrl(r.data);

          await supabaseAdmin
            .from("jobs")
            .update({
              status: url ? "COMPLETED" : "FAILED",
              output_url: url ?? null,
              thumbnail_url: thumb ?? null,
              output_meta: r.data as Record<string, unknown>,
              error_message: url ? null : "Concluído sem URL de vídeo.",
              completed_at: new Date().toISOString(),
            })
            .eq("id", job.id)
            .eq("status", "PROCESSING");

          if (url) {
            const { data: existing } = await supabaseAdmin
              .from("assets")
              .select("id")
              .eq("job_id", job.id)
              .maybeSingle();
            if (!existing) {
              await supabaseAdmin.from("assets").insert({
                kind: "VIDEO",
                url,
                source: "generation",
                job_id: job.id,
                created_by: job.created_by,
              });
            }
            completed++;
          } else {
            failed++;
          }
        } else if (
          job.started_at &&
          Date.now() - new Date(job.started_at).getTime() > TIMEOUT_AFTER_MS
        ) {
          await supabaseAdmin
            .from("jobs")
            .update({
              status: "FAILED",
              error_message: "Tempo limite excedido (sem retorno da fal.ai).",
              completed_at: new Date().toISOString(),
            })
            .eq("id", job.id)
            .eq("status", "PROCESSING");
          failed++;
        }
      } catch {
        /* tenta de novo no próximo tick */
      }
    })
  );

  return { checked: list.length, completed, failed };
}
