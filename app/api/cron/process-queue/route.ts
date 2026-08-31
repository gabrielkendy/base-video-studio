import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fal } from "@/lib/fal/client";
import { extractVideoUrl, extractThumbnailUrl } from "@/lib/fal/models";
import { dispatchJob } from "@/lib/fal/dispatch";
import type { Job } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const TIMEOUT_AFTER_MS = 30 * 60_000; // marca FAILED jobs PROCESSING há +30min

/**
 * Varredor de segurança. Os jobs são disparados na hora (lib/fal/dispatch),
 * então este endpoint NÃO é o caminho principal — é só uma rede de proteção:
 *  1. Conclui jobs cujo webhook falhou (consulta o status na fal).
 *  2. Dispara jobs QUEUED órfãos (caso o submit inicial tenha falhado).
 *  3. Expira jobs presos há muito tempo.
 *
 * No Vercel Hobby o cron roda 1x/dia (limite do plano). Mesmo assim o app
 * funciona em tempo real porque o disparo é imediato e o webhook conclui.
 * Você também pode chamar este endpoint manualmente quando quiser.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const reconciled = await reconcileStuckJobs();

  // dispara QUEUED órfãos (não deveriam existir, mas por segurança)
  const { data: orphans } = await supabaseAdmin
    .from("jobs")
    .select("id")
    .eq("status", "QUEUED")
    .order("created_at", { ascending: true })
    .limit(10);

  let dispatched = 0;
  for (const o of orphans ?? []) {
    await dispatchJob(o.id);
    dispatched++;
  }

  return NextResponse.json({ ok: true, reconciled, dispatched });
}

export const POST = GET;

/** Confere na fal jobs PROCESSING; conclui os prontos, expira os velhos. */
async function reconcileStuckJobs(): Promise<number> {
  const { data: processing } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("status", "PROCESSING");

  let count = 0;
  for (const job of (processing ?? []) as Job[]) {
    const endpoint = job.fal_endpoint ?? job.model_id;

    // timeout duro
    if (
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
        .eq("id", job.id);
      count++;
      continue;
    }

    if (!job.fal_request_id) continue;

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
            status: "COMPLETED",
            output_url: url ?? null,
            thumbnail_url: thumb ?? null,
            output_meta: r.data as Record<string, unknown>,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id)
          .neq("status", "COMPLETED");

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
        }
        count++;
      }
    } catch {
      /* tenta de novo no próximo tick */
    }
  }
  return count;
}
