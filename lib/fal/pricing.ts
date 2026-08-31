// ===========================================================================
// Estimativa de custo por geração, baseada nos preços públicos da fal.ai
// (maio/2026). Varia por MODELO, DURAÇÃO e RESOLUÇÃO.
// ⚠️ É uma ESTIMATIVA — o valor real cobrado pela fal pode variar um pouco
// (aspect ratio, áudio, arredondamentos). Ajuste os números aqui se mudar.
// ===========================================================================

/** Câmbio USD→BRL usado só para exibição. Ajuste quando quiser. */
export const USD_TO_BRL = 5.5;

interface PricingRule {
  // preço por segundo que varia por resolução (ex.: Seedance) — áudio incluso
  perSecondByResolution?: Record<string, number>;
  // preço por segundo fixo, SEM áudio (ex.: Veo 3, Kling)
  perSecond?: number;
  // preço por segundo COM áudio, quando difere (ex.: Veo 3)
  perSecondAudio?: number;
}

const PRICING: Record<string, PricingRule> = {
  // Seedance 2.0 — billing por tokens ≈ varia com a resolução (áudio não muda o preço)
  "bytedance/seedance-2.0/image-to-video": {
    perSecondByResolution: { "480p": 0.134, "720p": 0.302, "1080p": 0.68 },
  },
  "bytedance/seedance-2.0/reference-to-video": {
    perSecondByResolution: { "480p": 0.134, "720p": 0.302, "1080p": 0.68 },
  },
  // Seedance 2.0 Fast — mais barato, 480p/720p
  "bytedance/seedance-2.0/fast/image-to-video": {
    perSecondByResolution: { "480p": 0.107, "720p": 0.242 },
  },
  "bytedance/seedance-2.0/fast/reference-to-video": {
    perSecondByResolution: { "480p": 0.107, "720p": 0.242 },
  },
  // Veo 3 (Google) — áudio muda o preço
  "fal-ai/veo3": { perSecond: 0.5, perSecondAudio: 0.75 },
  "fal-ai/veo3/image-to-video": { perSecond: 0.5, perSecondAudio: 0.75 },
  "fal-ai/veo3/fast": { perSecond: 0.25, perSecondAudio: 0.4 },
  // Kling 3.0 Pro — áudio muda o preço
  "fal-ai/kling-video/v3/pro/image-to-video": {
    perSecond: 0.112,
    perSecondAudio: 0.168,
  },
  "fal-ai/kling-video/v3/pro/text-to-video": {
    perSecond: 0.112,
    perSecondAudio: 0.168,
  },
  // Kling O1 Reference — sem áudio
  "fal-ai/kling-video/o1/reference-to-video": { perSecond: 0.112 },
  // Kling O1 Video Edit — $0.168/s
  "fal-ai/kling-video/o1/video-to-video/edit": { perSecond: 0.168 },
  // Kling 3.0 Omni Edit (O3)
  "fal-ai/kling-video/o3/pro/video-to-video/edit": { perSecond: 0.196 },
  // Grok Imagine Video Edit
  "xai/grok-imagine-video/edit-video": { perSecond: 0.05 },
  // Kling 3.0 Motion Control
  "fal-ai/kling-video/v3/pro/motion-control": {
    perSecond: 0.112,
    perSecondAudio: 0.168,
  },
  // Kling Motion Control (v2.6) — mais barato
  "fal-ai/kling-video/v2.6/standard/motion-control": { perSecond: 0.07 },
};

const DEFAULT_DURATION = 5;

export interface CostEstimate {
  usd: number;
  brl: number;
  perSecond: number;
  seconds: number;
  note?: string;
}

/** Estima o custo de uma geração. Retorna null se o modelo não tiver preço mapeado. */
export function estimateCost(
  endpoint: string,
  duration?: number,
  resolution?: string,
  audioOn: boolean = true
): CostEstimate | null {
  const rule = PRICING[endpoint];
  if (!rule) return null;

  const seconds = duration && duration > 0 ? duration : DEFAULT_DURATION;

  let perSecond: number | undefined;
  let note: string | undefined;

  if (rule.perSecondByResolution) {
    const key = (resolution ?? "720p").toLowerCase();
    perSecond =
      rule.perSecondByResolution[key] ?? rule.perSecondByResolution["720p"];
  } else if (audioOn && rule.perSecondAudio != null) {
    perSecond = rule.perSecondAudio;
    note = "com áudio";
  } else {
    perSecond = rule.perSecond;
    if (rule.perSecondAudio != null) note = "sem áudio";
  }

  if (perSecond == null) return null;

  const usd = perSecond * seconds;
  return { usd, brl: usd * USD_TO_BRL, perSecond, seconds, note };
}

export function formatUsd(v: number): string {
  return `$${v.toFixed(2)}`;
}

export function formatBrl(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}
