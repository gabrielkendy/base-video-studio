import { supabaseAdmin } from "@/lib/supabase/admin";
import { fal } from "@/lib/fal/client";
import { buildFalInput } from "@/lib/fal/models";
import { ensureFalConfigured } from "@/lib/fal/key";
import { webhookToken } from "@/lib/auth";
import type { Job } from "@/types";

/**
 * Dispara um job para a fal.ai e marca como PROCESSING.
 *
 * Arquitetura: a própria fal.ai já é uma fila. Em vez de um cron puxar a fila
 * (inviável no Vercel Hobby, que só permite cron 1x/dia), disparamos na hora —
 * ao criar o job (POST /api/jobs) e no retry. O webhook conclui depois.
 * O cron diário (process-queue) só reconcilia jobs travados / órfãos.
 *
 * Idempotente: só dispara se o job estiver QUEUED.
 */
export async function dispatchJob(jobId: string): Promise<void> {
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job) return;
  const j = job as Job;
  if (j.status !== "QUEUED") return; // já disparado/concluído

  // Garante que há uma chave da fal configurada (banco ou env)
  if (!(await ensureFalConfigured())) {
    await supabaseAdmin
      .from("jobs")
      .update({
        status: "FAILED",
        error_message:
          "Chave da fal.ai não configurada. Vá em Configurações e cole sua chave.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", j.id);
    return;
  }

  try {
    const imageUrls = (j.input_images ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((i) => i.url);

    const endpoint = j.fal_endpoint ?? j.model_id;
    const input = buildFalInput({
      endpoint,
      prompt: j.prompt,
      negativePrompt: j.negative_prompt,
      imageUrls,
      duration: j.config?.duration,
      aspectRatio: j.config?.aspect_ratio,
      resolution: j.config?.resolution,
      generateAudio: j.config?.generate_audio,
      videoUrl: j.config?.input_video_url,
      characterOrientation: j.config?.character_orientation,
    });

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/fal/webhook?jobId=${j.id}&t=${webhookToken(j.id)}`;
    const { request_id } = await fal.queue.submit(endpoint, {
      input,
      webhookUrl,
    });

    await supabaseAdmin
      .from("jobs")
      .update({
        status: "PROCESSING",
        fal_request_id: request_id,
        started_at: new Date().toISOString(),
      })
      .eq("id", j.id)
      .eq("status", "QUEUED"); // evita corrida
  } catch (e) {
    await supabaseAdmin
      .from("jobs")
      .update({
        status: "FAILED",
        error_message: e instanceof Error ? e.message : String(e),
        completed_at: new Date().toISOString(),
      })
      .eq("id", j.id);
  }
}
