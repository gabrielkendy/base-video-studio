// ===========================================================================
// Ponto ÚNICO de tradução do nosso config -> input esperado por cada modelo fal.
// Cada modelo tem schema próprio (verificado via OpenAPI da fal.ai, maio/2026).
// Ajuste os PERFIS abaixo se a fal mudar algum endpoint.
// ===========================================================================

export type ModelCategory = "create" | "edit" | "motion";

type ImageMode = "none" | "single" | "first_last" | "multi";
type DurationFormat = "none" | "plain" | "suffix_s"; // "5" vs "5s" vs ausente

interface ModelProfile {
  imageMode: ImageMode;
  multiImageParam?: string; // nome do array quando imageMode === "multi"
  firstImageParam?: string; // nome do 1º frame (default "image_url"; Kling v3 i2v = "start_image_url")
  videoParam?: string; // vídeo de entrada (edit/motion), ex "video_url"
  characterImageParam?: string; // motion: imagem do personagem (ex "image_url")
  characterOrientation?: boolean; // motion: enum "image" | "video" (de onde vem o cenário)
  durationFormat: DurationFormat;
  aspectRatio: boolean;
  resolution: boolean;
  negativePrompt: boolean;
  audioParam?: string; // nome do campo de áudio: generate_audio | keep_audio | keep_original_sound
  audioDefault?: boolean; // default do toggle de áudio para este modelo
  promptOptimizer?: boolean;
}

/** Classifica o modelo pela estrutura do endpoint (sem precisar de coluna no banco). */
export function modelCategory(endpoint: string): ModelCategory {
  if (endpoint.includes("motion-control")) return "motion";
  // qualquer endpoint de edição: .../edit, .../video-to-video/edit, .../edit-video
  if (endpoint.includes("edit")) return "edit";
  return "create";
}

// Perfis verificados via OpenAPI da fal.ai (maio/2026).
const PROFILES: Record<string, ModelProfile> = {
  // ---- CREATE: Seedance 2.0 (ByteDance) — prefixo "bytedance/" ----
  "bytedance/seedance-2.0/image-to-video": {
    imageMode: "first_last",
    durationFormat: "plain",
    aspectRatio: true,
    resolution: true,
    negativePrompt: false,
    audioParam: "generate_audio",
  },
  "bytedance/seedance-2.0/reference-to-video": {
    imageMode: "multi",
    multiImageParam: "image_urls",
    durationFormat: "plain",
    aspectRatio: true,
    resolution: true,
    negativePrompt: false,
    audioParam: "generate_audio",
  },
  "bytedance/seedance-2.0/fast/image-to-video": {
    imageMode: "first_last",
    durationFormat: "plain",
    aspectRatio: true,
    resolution: true,
    negativePrompt: false,
    audioParam: "generate_audio",
  },
  "bytedance/seedance-2.0/fast/reference-to-video": {
    imageMode: "multi",
    multiImageParam: "image_urls",
    durationFormat: "plain",
    aspectRatio: true,
    resolution: true,
    negativePrompt: false,
    audioParam: "generate_audio",
  },
  // ---- CREATE: Veo 3 (Google) ----
  "fal-ai/veo3": {
    imageMode: "none",
    durationFormat: "suffix_s",
    aspectRatio: true,
    resolution: true,
    negativePrompt: true,
    audioParam: "generate_audio",
  },
  "fal-ai/veo3/fast": {
    imageMode: "none",
    durationFormat: "suffix_s",
    aspectRatio: true,
    resolution: true,
    negativePrompt: true,
    audioParam: "generate_audio",
  },
  "fal-ai/veo3/image-to-video": {
    imageMode: "single",
    durationFormat: "suffix_s",
    aspectRatio: true,
    resolution: true,
    negativePrompt: true,
    audioParam: "generate_audio",
  },
  // ---- CREATE: Kling 3.0 ----
  "fal-ai/kling-video/v3/pro/text-to-video": {
    imageMode: "none",
    durationFormat: "plain",
    aspectRatio: true,
    resolution: false,
    negativePrompt: true,
    audioParam: "generate_audio",
  },
  "fal-ai/kling-video/v3/pro/image-to-video": {
    imageMode: "first_last",
    firstImageParam: "start_image_url",
    durationFormat: "plain",
    aspectRatio: false,
    resolution: false,
    negativePrompt: true,
    audioParam: "generate_audio",
  },
  // ---- CREATE: Kling O1 Reference (multi até 7) ----
  "fal-ai/kling-video/o1/reference-to-video": {
    imageMode: "multi",
    multiImageParam: "image_urls",
    durationFormat: "plain",
    aspectRatio: true,
    resolution: false,
    negativePrompt: false,
  },
  // ---- EDIT: Kling O1 Video Edit (vídeo + prompt + até 4 imagens) ----
  "fal-ai/kling-video/o1/video-to-video/edit": {
    imageMode: "multi",
    multiImageParam: "image_urls",
    videoParam: "video_url",
    durationFormat: "none",
    aspectRatio: false,
    resolution: false,
    negativePrompt: false,
    audioParam: "keep_audio",
    audioDefault: false,
  },
  // ---- EDIT: Kling 3.0 Omni Edit (O3) — vídeo + prompt + até 4 imagens ----
  "fal-ai/kling-video/o3/pro/video-to-video/edit": {
    imageMode: "multi",
    multiImageParam: "image_urls",
    videoParam: "video_url",
    durationFormat: "none",
    aspectRatio: false,
    resolution: false,
    negativePrompt: false,
    audioParam: "keep_audio",
    audioDefault: true,
  },
  // ---- EDIT: Grok Imagine Video Edit — vídeo + prompt + resolução ----
  "xai/grok-imagine-video/edit-video": {
    imageMode: "none",
    videoParam: "video_url",
    durationFormat: "none",
    aspectRatio: false,
    resolution: true,
    negativePrompt: false,
  },
  // ---- MOTION: Kling 3.0 Motion Control (vídeo de motion + imagem personagem) ----
  "fal-ai/kling-video/v3/pro/motion-control": {
    imageMode: "none",
    videoParam: "video_url",
    characterImageParam: "image_url",
    characterOrientation: true,
    durationFormat: "none",
    aspectRatio: false,
    resolution: false,
    negativePrompt: false,
    audioParam: "keep_original_sound",
    audioDefault: true,
  },
  // ---- MOTION: Kling Motion Control (v2.6) — mais barato ----
  "fal-ai/kling-video/v2.6/standard/motion-control": {
    imageMode: "none",
    videoParam: "video_url",
    characterImageParam: "image_url",
    characterOrientation: true,
    durationFormat: "none",
    aspectRatio: false,
    resolution: false,
    negativePrompt: false,
    audioParam: "keep_original_sound",
    audioDefault: true,
  },
};

// Perfil seguro para modelos não mapeados (genérico).
const DEFAULT_PROFILE: ModelProfile = {
  imageMode: "single",
  durationFormat: "plain",
  aspectRatio: true,
  resolution: true,
  negativePrompt: true,
};

export function getModelProfile(endpoint: string): ModelProfile {
  return PROFILES[endpoint] ?? DEFAULT_PROFILE;
}

export interface BuildInputArgs {
  endpoint: string;
  prompt?: string | null;
  negativePrompt?: string | null;
  imageUrls: string[];
  videoUrl?: string | null;
  characterOrientation?: string; // "image" | "video"
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  generateAudio?: boolean;
}

/**
 * Monta o objeto `input` enviado para `fal.queue.submit(endpoint, { input })`,
 * respeitando o schema de cada modelo. Só envia campos que o modelo aceita.
 */
export function buildFalInput(a: BuildInputArgs): Record<string, unknown> {
  const p = getModelProfile(a.endpoint);
  const input: Record<string, unknown> = {};

  if (a.prompt && a.prompt.trim()) input.prompt = a.prompt.trim();

  if (p.negativePrompt && a.negativePrompt && a.negativePrompt.trim()) {
    input.negative_prompt = a.negativePrompt.trim();
  }

  // Vídeo de entrada (edit/motion)
  if (p.videoParam && a.videoUrl) input[p.videoParam] = a.videoUrl;

  // Duração
  if (
    p.durationFormat !== "none" &&
    typeof a.duration === "number" &&
    !Number.isNaN(a.duration)
  ) {
    input.duration =
      p.durationFormat === "suffix_s" ? `${a.duration}s` : `${a.duration}`;
  }

  if (p.aspectRatio && a.aspectRatio) input.aspect_ratio = a.aspectRatio;
  if (p.resolution && a.resolution) input.resolution = a.resolution.toLowerCase();

  const urls = a.imageUrls.filter(Boolean);

  // Motion: imagem do personagem em param próprio + orientação de cena
  if (p.characterImageParam) {
    if (urls[0]) input[p.characterImageParam] = urls[0];
    if (p.characterOrientation) {
      input.character_orientation = a.characterOrientation ?? "video";
    }
  } else if (urls.length) {
    // Demais modos de imagem
    const firstParam = p.firstImageParam ?? "image_url";
    if (p.imageMode === "single") {
      input[firstParam] = urls[0];
    } else if (p.imageMode === "first_last") {
      input[firstParam] = urls[0];
      if (urls[1]) input.end_image_url = urls[1];
    } else if (p.imageMode === "multi") {
      input[p.multiImageParam ?? "image_urls"] = urls;
    }
  }

  // Áudio (nome do campo varia por modelo)
  if (p.audioParam) {
    input[p.audioParam] = a.generateAudio ?? p.audioDefault ?? true;
  }
  if (p.promptOptimizer) input.prompt_optimizer = true;

  return input;
}

/** Extrai a URL do vídeo de respostas da fal (formato varia entre modelos). */
export function extractVideoUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, any>;
  return (
    d.video?.url ??
    d.video_url ??
    d.url ??
    d.output?.video?.url ??
    d.output?.url ??
    (Array.isArray(d.videos) ? d.videos[0]?.url : undefined)
  );
}

/** Extrai uma thumbnail/poster quando o modelo devolve. */
export function extractThumbnailUrl(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, any>;
  return (
    d.thumbnail_url ??
    d.image?.url ??
    d.video?.thumbnail_url ??
    d.poster_url ??
    undefined
  );
}
