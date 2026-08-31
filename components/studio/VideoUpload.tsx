"use client";

import { useRef, useState } from "react";
import { Film, X, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useStudio } from "@/lib/studio-context";

export function VideoUpload({
  label,
  hint,
}: {
  label: string;
  hint: string;
}) {
  const { inputVideoUrl, setInputVideoUrl } = useStudio();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(`Falha no upload (${d.error ?? res.status}).`);
        return;
      }
      const { url } = await res.json();
      setInputVideoUrl(url);
      toast.success("Vídeo enviado.");
    } catch {
      toast.error("Erro ao enviar o vídeo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-300">
        {label}
      </label>

      {inputVideoUrl ? (
        <div className="group relative overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
          <video
            src={inputVideoUrl}
            controls
            muted
            playsInline
            className="max-h-40 w-full bg-ink-950 object-contain"
          />
          <button
            onClick={() => setInputVideoUrl(null)}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-ink-950/80 text-ink-300 transition hover:text-red-400"
            title="Remover vídeo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-700 bg-ink-900/50 py-6 text-ink-400 transition hover:border-lime-glow/40 hover:text-lime-glow disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin-slow" />
          ) : (
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              <UploadCloud className="h-5 w-5" />
            </div>
          )}
          <span className="text-sm font-medium">
            {uploading ? "Enviando…" : "Enviar vídeo"}
          </span>
          <span className="text-[10px] text-ink-500">{hint}</span>
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
