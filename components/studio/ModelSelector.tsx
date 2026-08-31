"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Check, BarChart3 } from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { cn } from "@/lib/utils";

export function ModelSelector() {
  const { modelsForMode: models, selectedModel, setSelectedModelId } = useStudio();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-left transition hover:border-ink-600"
      >
        <span className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-500">
            Modelo
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
            {selectedModel?.name ?? "Selecione"}
            <BarChart3 className="h-3.5 w-3.5 text-lime-glow" />
          </span>
        </span>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-ink-500 transition",
            open && "rotate-90"
          )}
        />
      </button>

      {open && (
        <div className="absolute bottom-full z-30 mb-2 max-h-80 w-full overflow-y-auto rounded-xl border border-ink-700 bg-ink-850 p-1 shadow-2xl">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setSelectedModelId(m.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition hover:bg-ink-800",
                selectedModel?.id === m.id && "bg-ink-800"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-white">
                  {m.name}
                  <span className="rounded bg-lime-glow/10 px-1.5 py-0.5 text-[10px] font-semibold text-lime-glow">
                    ✨ {m.point_cost}
                  </span>
                </div>
                {m.description && (
                  <p className="mt-0.5 truncate text-[11px] text-ink-400">
                    {m.description}
                  </p>
                )}
              </div>
              {selectedModel?.id === m.id && (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-lime-glow" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
