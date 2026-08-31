"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, UploadCloud, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { useStudio } from "@/lib/studio-context";
import { cn } from "@/lib/utils";
import type { Asset, MediaKind } from "@/types";

type Tab = "uploads" | "gen_images" | "gen_videos" | "elements";

const TABS: { id: Tab; label: string }[] = [
  { id: "uploads", label: "Envios" },
  { id: "gen_images", label: "Gerações de imagens" },
  { id: "gen_videos", label: "Gerações em vídeo" },
  { id: "elements", label: "Elementos" },
];

export function MediaModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addImage } = useStudio();
  const [tab, setTab] = useState<Tab>("uploads");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const supabase = createBrowserClient();
    let q = supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);

    if (tab === "uploads") q = q.eq("source", "upload").eq("kind", "IMAGE");
    if (tab === "gen_images") q = q.eq("source", "generation").eq("kind", "IMAGE");
    if (tab === "gen_videos") q = q.eq("kind", "VIDEO");
    if (tab === "elements") q = q.eq("kind", "AUDIO");

    const { data } = await q;
    setAssets((data as Asset[]) ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    if (open) fetchAssets();
  }, [open, fetchAssets]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleUpload(file: File) {
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
      const { url, storagePath, kind } = await res.json();
      toast.success("Mídia enviada.");
      if (kind === "IMAGE") {
        addImage({ url, storagePath });
        onClose();
      } else {
        fetchAssets();
      }
    } catch {
      toast.error("Erro ao enviar a mídia.");
    } finally {
      setUploading(false);
    }
  }

  function pickAsset(a: Asset) {
    if (a.kind !== "IMAGE") {
      toast.error("Só imagens podem ir para a sequência de geração.");
      return;
    }
    addImage({ url: a.url, storagePath: a.storage_path ?? undefined });
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-ink-800 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-white">Carregar mídia</h2>
          <button
            onClick={onClose}
            className="text-ink-400 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 border-b border-ink-800 px-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative px-3 py-2.5 text-xs font-medium transition",
                tab === t.id
                  ? "text-white"
                  : "text-ink-400 hover:text-ink-200"
              )}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-lime-glow" />
              )}
            </button>
          ))}
        </div>

        {/* corpo */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* botão central de upload */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mb-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-700 bg-ink-850/60 py-7 text-ink-300 transition hover:border-lime-glow/40 hover:text-lime-glow disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin-slow" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
            <span className="text-sm font-medium">
              {uploading ? "Enviando…" : "Carregar mídia"}
            </span>
            <span className="text-[11px] text-ink-500">
              Imagem, vídeo ou áudio
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />

          {/* galeria */}
          {loading ? (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl shimmer" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <p className="py-8 text-center text-xs text-ink-500">
              Nada por aqui ainda nesta aba.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {assets.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pickAsset(a)}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-ink-800 bg-ink-850 transition hover:border-lime-glow/50"
                >
                  {a.kind === "VIDEO" ? (
                    <video
                      src={a.url}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : a.kind === "AUDIO" ? (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-400">
                      🎵 áudio
                    </div>
                  ) : (
                    <Image
                      src={a.url}
                      alt=""
                      fill
                      sizes="120px"
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* aviso */}
        <div className="flex items-center gap-2 border-t border-ink-800 px-5 py-2.5 text-[11px] text-ink-500">
          <ShieldAlert className="h-3.5 w-3.5" />
          Conteúdo protegido por direitos autorais não é permitido.
        </div>
      </div>
    </div>
  );
}
