"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Proportions, Gem, Check, Volume2, VolumeX } from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { getModelProfile } from "@/lib/fal/models";
import { cn } from "@/lib/utils";

/** Chip genérico com dropdown ancorado. */
function Chip({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
          open
            ? "border-lime-glow/40 bg-ink-800 text-white"
            : "border-ink-700 bg-ink-900 text-ink-200 hover:border-ink-600"
        )}
      >
        <span className="text-ink-400">{icon}</span>
        {label}
      </button>
      {open && (
        <div className="absolute bottom-full z-30 mb-2 min-w-[140px] rounded-xl border border-ink-700 bg-ink-850 p-1 shadow-2xl">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function Option({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-ink-800",
        active ? "text-white" : "text-ink-300"
      )}
    >
      {children}
      {active && <Check className="h-4 w-4 text-lime-glow" />}
    </button>
  );
}

export function ConfigBar() {
  const { selectedModel, config, setConfig } = useStudio();
  if (!selectedModel) return null;

  const hasDuration = selectedModel.durations.length > 0;
  const hasAspect = selectedModel.aspect_ratios.length > 0;
  const hasResolution = selectedModel.resolutions.length > 0;
  const hasAudio = Boolean(getModelProfile(selectedModel.endpoint).audioParam);
  const audioOn =
    config.generateAudio ??
    getModelProfile(selectedModel.endpoint).audioDefault ??
    true;

  // Se o modelo não expõe nenhuma config, não mostra a barra
  if (!hasDuration && !hasAspect && !hasResolution && !hasAudio) {
    return (
      <p className="text-[11px] text-ink-500">
        Este modelo usa configuração fixa (sem opções de duração/formato).
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Duração — campo digitável + sugestões */}
      {hasDuration && (
      <Chip icon={<Clock className="h-3.5 w-3.5" />} label={`${config.duration ?? "?"}s`}>
        {(close) => (
          <div className="w-[180px] p-1">
            <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium text-ink-400">
              Selecione a duração
            </p>
            <input
              type="number"
              min={1}
              value={config.duration ?? ""}
              onChange={(e) =>
                setConfig({ duration: Number(e.target.value) || undefined })
              }
              className="mb-1 w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-sm text-white outline-none focus:border-lime-glow/40"
            />
            <div className="flex flex-wrap gap-1 px-0.5">
              {selectedModel.durations.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setConfig({ duration: d });
                    close();
                  }}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition",
                    config.duration === d
                      ? "bg-lime-glow text-ink-950"
                      : "bg-ink-800 text-ink-300 hover:bg-ink-700"
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        )}
      </Chip>
      )}

      {/* Aspect ratio */}
      {hasAspect && (
      <Chip
        icon={<Proportions className="h-3.5 w-3.5" />}
        label={config.aspectRatio ?? "Auto"}
      >
        {(close) =>
          selectedModel.aspect_ratios.map((ar) => (
            <Option
              key={ar}
              active={config.aspectRatio === ar}
              onClick={() => {
                setConfig({ aspectRatio: ar });
                close();
              }}
            >
              {ar}
            </Option>
          ))
        }
      </Chip>
      )}

      {/* Resolução */}
      {hasResolution && (
      <Chip icon={<Gem className="h-3.5 w-3.5" />} label={config.resolution ?? "720p"}>
        {(close) =>
          selectedModel.resolutions.map((r) => (
            <Option
              key={r}
              active={config.resolution === r}
              onClick={() => {
                setConfig({ resolution: r });
                close();
              }}
            >
              {r}
            </Option>
          ))
        }
      </Chip>
      )}

      {/* Toggle de áudio (com / sem) */}
      {hasAudio && (
        <button
          onClick={() => setConfig({ generateAudio: !audioOn })}
          title={audioOn ? "Áudio ligado — clique para desligar" : "Áudio desligado — clique para ligar"}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
            audioOn
              ? "border-lime-glow/40 bg-lime-glow/10 text-lime-glow"
              : "border-ink-700 bg-ink-900 text-ink-400 hover:border-ink-600"
          )}
        >
          {audioOn ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
          {audioOn ? "Com áudio" : "Sem áudio"}
        </button>
      )}
    </div>
  );
}
