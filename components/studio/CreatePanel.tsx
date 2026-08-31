"use client";

import { Video, Image as ImageIcon } from "lucide-react";
import { useStudio, type StudioMode } from "@/lib/studio-context";
import { cn } from "@/lib/utils";
import { ImageTray } from "./ImageTray";
import { VideoUpload } from "./VideoUpload";
import { ModelSelector } from "./ModelSelector";
import { ConfigBar } from "./ConfigBar";
import { GenerateButton } from "./GenerateButton";

const TABS: { id: StudioMode; label: string }[] = [
  { id: "create", label: "Criar vídeo" },
  { id: "edit", label: "Editar vídeo" },
  { id: "motion", label: "Motion Control" },
];

const PROMPT_CFG: Record<
  StudioMode,
  { label: string; placeholder: string; optional?: boolean }
> = {
  create: {
    label: "Incitar (prompt)",
    placeholder: "Descreva o vídeo que você quer gerar…",
  },
  edit: {
    label: "Descreva a edição",
    placeholder: 'O que mudar? Ex.: "Faça nevar", "troque o fundo por uma praia"…',
  },
  motion: {
    label: "Prompt (opcional)",
    placeholder: "Contexto extra do movimento/cena…",
    optional: true,
  },
};

export function CreatePanel() {
  const {
    mode,
    setMode,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    selectedModel,
    characterOrientation,
    setCharacterOrientation,
  } = useStudio();

  const promptCfg = PROMPT_CFG[mode];

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Abas Criar / Editar / Motion */}
      <div className="flex items-center gap-1 rounded-xl border border-ink-800 bg-ink-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={cn(
              "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition",
              mode === t.id
                ? "bg-ink-700 text-white"
                : "text-ink-400 hover:text-ink-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---- Inputs por aba ---- */}
      {mode === "create" &&
        selectedModel &&
        selectedModel.max_images > 0 && <ImageTray />}

      {mode === "edit" && (
        <>
          <VideoUpload
            label="Vídeo para editar"
            hint="3 a 10 segundos · .mp4 ou .mov"
          />
          <ImageTray />
        </>
      )}

      {mode === "motion" && (
        <>
          <VideoUpload
            label="Vídeo de movimento (referência)"
            hint="3 a 30 segundos · o personagem vai copiar este movimento"
          />
          <ImageTray />
          {/* Modo de cena: de onde vem o cenário/pose */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">
              Modo de cena
            </label>
            <div className="flex items-center gap-1 rounded-xl border border-ink-800 bg-ink-900 p-1">
              {(
                [
                  { id: "video", label: "Do vídeo", icon: Video },
                  { id: "image", label: "Da imagem", icon: ImageIcon },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setCharacterOrientation(opt.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition",
                    characterOrientation === opt.id
                      ? "bg-ink-700 text-white"
                      : "text-ink-400 hover:text-ink-200"
                  )}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-ink-500">
              De onde vêm o cenário e o enquadramento do vídeo final.
            </p>
          </div>
        </>
      )}

      {/* Prompt */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-300">
          {promptCfg.label}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={mode === "create" ? 5 : 3}
          placeholder={promptCfg.placeholder}
          className="w-full resize-none rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-ink-600 focus:border-lime-glow/40 focus:ring-2 focus:ring-lime-glow/15"
        />
      </div>

      {/* Negative prompt — só onde faz sentido (create) */}
      {mode === "create" && (
        <details className="group">
          <summary className="cursor-pointer select-none text-xs font-medium text-ink-400 transition hover:text-ink-200">
            Prompt negativo (opcional)
          </summary>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            rows={2}
            placeholder="O que evitar no vídeo…"
            className="mt-2 w-full resize-none rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-ink-600 focus:border-lime-glow/40 focus:ring-2 focus:ring-lime-glow/15"
          />
        </details>
      )}

      {/* Seletor de modelo (filtrado pela aba) */}
      <ModelSelector />

      {/* Config bar */}
      {selectedModel && <ConfigBar />}

      {/* Botão gerar */}
      <GenerateButton />
    </div>
  );
}
