"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { getModelProfile } from "@/lib/fal/models";
import { MediaModal } from "./MediaModal";

export function ImageTray() {
  const { images, removeImage, reorderImages, selectedModel } = useStudio();
  const [modalOpen, setModalOpen] = useState(false);

  const max = selectedModel?.max_images ?? 1;
  const canAdd = images.length < max;
  const profile = selectedModel
    ? getModelProfile(selectedModel.endpoint)
    : null;
  const mode = profile?.imageMode ?? "single";
  const isCharacter = Boolean(profile?.characterImageParam);

  const { label, hint } = isCharacter
    ? {
        label: "Imagem do personagem",
        hint: "Rosto e corpo visíveis — o personagem que vai ganhar o movimento.",
      }
    : mode === "multi"
      ? {
          label: "Fotos de referência",
          hint: `Até ${max} fotos — cite @Image1, @Image2… no prompt para guiar o vídeo.`,
        }
      : mode === "first_last"
        ? {
            label: "Imagem inicial e final",
            hint: "Imagem 1 = primeiro quadro · Imagem 2 = último quadro (opcional).",
          }
        : { label: "Imagem", hint: "" };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-ink-300">{label}</label>
        <span className="text-[10px] text-ink-500">
          {images.length}/{max}
        </span>
      </div>
      {hint && <p className="mb-2 text-[10px] leading-snug text-ink-500">{hint}</p>}

      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div
            key={`${img.url}-${i}`}
            className="group relative h-20 w-20 overflow-hidden rounded-xl border border-ink-700 bg-ink-900"
          >
            <Image
              src={img.url}
              alt={`imagem ${i + 1}`}
              fill
              sizes="80px"
              className="object-cover"
              unoptimized
            />
            {/* número de ordem */}
            <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-md bg-ink-950/80 text-[10px] font-semibold text-lime-glow">
              {i + 1}
            </span>
            {/* remover */}
            <button
              onClick={() => removeImage(i)}
              className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-md bg-ink-950/80 text-ink-300 opacity-0 transition hover:text-white group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
            {/* reordenar */}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-ink-950/90 to-transparent px-0.5 py-0.5 opacity-0 transition group-hover:opacity-100">
              <button
                onClick={() => reorderImages(i, i - 1)}
                disabled={i === 0}
                className="text-ink-300 transition hover:text-white disabled:opacity-20"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => reorderImages(i, i + 1)}
                disabled={i === images.length - 1}
                className="text-ink-300 transition hover:text-white disabled:opacity-20"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {canAdd && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-700 bg-ink-900/50 text-ink-500 transition hover:border-lime-glow/40 hover:text-lime-glow"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px]">Adicionar</span>
          </button>
        )}
      </div>

      <MediaModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
