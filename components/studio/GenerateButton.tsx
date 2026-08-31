"use client";

import { Sparkles, Loader2 } from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { estimateCost, formatUsd, formatBrl } from "@/lib/fal/pricing";

export function GenerateButton() {
  const { selectedModel, prompt, images, config, submit, submitting } =
    useStudio();

  const needsImage = selectedModel ? !selectedModel.supports_text : false;
  const ready = Boolean(prompt.trim()) && (!needsImage || images.length > 0);
  const disabled = submitting || !selectedModel || !ready;

  // Recalcula AO VIVO sempre que modelo/duração/resolução/áudio mudam
  const est = selectedModel
    ? estimateCost(
        selectedModel.endpoint,
        config.duration,
        config.resolution,
        config.generateAudio ?? true
      )
    : null;

  return (
    <div className="space-y-2">
      {/* Breakdown de custo ao vivo */}
      {est && (
        <div className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-900/60 px-3 py-2 text-xs">
          <span className="text-ink-400">
            {est.seconds}s × {formatUsd(est.perSecond)}/s
            {est.note ? ` · ${est.note}` : ""}
          </span>
          <span className="font-semibold text-white">
            {formatUsd(est.usd)}
            <span className="ml-1 font-normal text-ink-500">
              ({formatBrl(est.brl)})
            </span>
          </span>
        </div>
      )}

      <button
        onClick={submit}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-glow px-4 py-3 text-sm font-bold text-ink-950 shadow-lg shadow-lime-glow/10 transition hover:bg-lime-bright disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin-slow" /> Enviando…
          </>
        ) : (
          <>
            Gerar
            <span className="flex items-center gap-1 opacity-90">
              <Sparkles className="h-3.5 w-3.5" />
              {est ? formatUsd(est.usd) : `${selectedModel?.point_cost ?? 0} pts`}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
