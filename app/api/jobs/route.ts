import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchJob } from "@/lib/fal/dispatch";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({
  modelId: z.string().min(1),
  type: z.enum(["TEXT_TO_VIDEO", "IMAGE_TO_VIDEO"]),
  prompt: z.string().max(4000).optional(),
  negativePrompt: z.string().max(2000).optional(),
  inputImages: z
    .array(
      z.object({
        url: z.string().url(),
        order: z.number(),
        storagePath: z.string().optional(),
      })
    )
    .default([]),
  config: z
    .object({
      duration: z.number().optional(),
      aspectRatio: z.string().optional(),
      resolution: z.string().optional(),
      generateAudio: z.boolean().optional(),
      inputVideoUrl: z.string().url().optional(),
      characterOrientation: z.enum(["image", "video"]).optional(),
    })
    .default({}),
});

// POST /api/jobs — cria um job na fila (status QUEUED). O cron dispara depois.
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Busca o modelo no catálogo
  const { data: model, error: modelErr } = await supabaseAdmin
    .from("models")
    .select("*")
    .eq("id", input.modelId)
    .eq("is_active", true)
    .single();

  if (modelErr || !model) {
    return NextResponse.json({ error: "MODEL_NOT_FOUND" }, { status: 404 });
  }

  // Validações de coerência (edit/motion usam vídeo; create usa imagem/texto)
  const hasVideo = Boolean(input.config.inputVideoUrl);
  if (
    input.type === "IMAGE_TO_VIDEO" &&
    input.inputImages.length === 0 &&
    !hasVideo
  ) {
    return NextResponse.json({ error: "IMAGE_OR_VIDEO_REQUIRED" }, { status: 400 });
  }
  if (input.type === "TEXT_TO_VIDEO" && !input.prompt?.trim()) {
    return NextResponse.json({ error: "PROMPT_REQUIRED" }, { status: 400 });
  }
  if (input.inputImages.length > model.max_images) {
    return NextResponse.json(
      { error: "TOO_MANY_IMAGES", max: model.max_images },
      { status: 400 }
    );
  }

  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .insert({
      created_by: user,
      model_id: model.id,
      type: input.type,
      status: "QUEUED",
      prompt: input.prompt ?? null,
      negative_prompt: input.negativePrompt ?? null,
      input_images: input.inputImages,
      config: {
        duration: input.config.duration,
        aspect_ratio: input.config.aspectRatio,
        resolution: input.config.resolution,
        generate_audio: input.config.generateAudio,
        input_video_url: input.config.inputVideoUrl,
        character_orientation: input.config.characterOrientation,
      },
      fal_endpoint: model.endpoint,
      point_cost: model.point_cost,
    })
    .select()
    .single();

  if (error || !job) {
    return NextResponse.json(
      { error: "CREATE_FAILED", details: error?.message },
      { status: 500 }
    );
  }

  // Dispara pra fal.ai na hora (a fal é a fila). O webhook conclui depois.
  // O submit é rápido (só enfileira do lado da fal e retorna request_id).
  await dispatchJob(job.id);

  // devolve o estado atualizado (já PROCESSING, ou FAILED se o submit falhou)
  const { data: updated } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", job.id)
    .single();

  return NextResponse.json({ job: updated ?? job }, { status: 201 });
}

// GET /api/jobs — lista os últimos jobs (fallback caso o Realtime caia)
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { data: jobs } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);
  return NextResponse.json({ jobs: jobs ?? [] });
}
