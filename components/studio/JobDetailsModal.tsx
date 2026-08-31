"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  X,
  Copy,
  Check,
  Download,
  Repeat2,
  Clock,
  Proportions,
  Gem,
  Volume2,
  VolumeX,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useStudio } from "@/lib/studio-context";
import {
  estimateCost,
  formatUsd,
  formatBrl,
} from "@/lib/fal/pricing";
import type { Job } from "@/types";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success(`${label} copiado!`);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Não consegui copiar.");
        }
      }}
      className="flex items-center gap-1 rounded-md border border-ink-700 px-2 py-1 text-[11px] text-ink-300 transition hover:border-ink-600 hover:text-white"
    >
      {copied ? (
        <Check className="h-3 w-3 text-lime-glow" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function ConfigChip({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-xs text-ink-200">
      <span className="text-ink-400">{icon}</span>
      {children}
    </span>
  );
}

export function JobDetailsModal({
  job,
  onClose,
}: {
  job: Job | null;
  onClose: () => void;
}) {
  const { models, reusePrompt } = useStudio();

  useEffect(() => {
    if (!job) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [job, onClose]);

  if (!job) return null;

  const model = models.find((m) => m.id === job.model_id);
  const audioOn = job.config?.generate_audio ?? true;
  const est = estimateCost(
    job.model_id,
    job.config?.duration,
    job.config?.resolution,
    audioOn
  );

  const fullData = JSON.stringify(
    {
      modelo: model?.name ?? job.model_id,
      endpoint: job.model_id,
      prompt: job.prompt,
      prompt_negativo: job.negative_prompt,
      duracao: job.config?.duration,
      aspect_ratio: job.config?.aspect_ratio,
      resolucao: job.config?.resolution,
      audio: audioOn,
      custo_estimado_usd: est?.usd,
      criado_em: job.created_at,
    },
    null,
    2
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-800 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-white">Detalhes da geração</h2>
          <button onClick={onClose} className="text-ink-400 transition hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {/* preview */}
          {job.status === "COMPLETED" && job.output_url && (
            <video
              src={job.output_url}
              controls
              loop
              muted
              playsInline
              className="max-h-56 w-full rounded-xl bg-ink-950"
            />
          )}

          {/* modelo + custo */}
          <div className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-850/50 p-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-500">
                Modelo
              </p>
              <p className="text-sm font-semibold text-white">
                {model?.name ?? job.model_id}
              </p>
              <p className="text-[10px] text-ink-600">{job.model_id}</p>
            </div>
            {est && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-ink-500">
                  Custo estimado
                </p>
                <p className="text-sm font-bold text-lime-glow">
                  {formatUsd(est.usd)}
                </p>
                <p className="text-[10px] text-ink-500">{formatBrl(est.brl)}</p>
              </div>
            )}
          </div>

          {/* configs */}
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide text-ink-500">
              Configurações
            </p>
            <div className="flex flex-wrap gap-2">
              {job.config?.duration != null && (
                <ConfigChip icon={<Clock className="h-3.5 w-3.5" />}>
                  {job.config.duration}s
                </ConfigChip>
              )}
              {job.config?.aspect_ratio && (
                <ConfigChip icon={<Proportions className="h-3.5 w-3.5" />}>
                  {job.config.aspect_ratio}
                </ConfigChip>
              )}
              {job.config?.resolution && (
                <ConfigChip icon={<Gem className="h-3.5 w-3.5" />}>
                  {job.config.resolution}
                </ConfigChip>
              )}
              <ConfigChip
                icon={
                  audioOn ? (
                    <Volume2 className="h-3.5 w-3.5" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5" />
                  )
                }
              >
                {audioOn ? "Com áudio" : "Sem áudio"}
              </ConfigChip>
            </div>
          </div>

          {/* prompt */}
          {job.prompt && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wide text-ink-500">
                  Prompt
                </p>
                <CopyButton text={job.prompt} label="Prompt" />
              </div>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-ink-800 bg-ink-950 p-3 text-xs leading-relaxed text-ink-200">
                {job.prompt}
              </div>
            </div>
          )}

          {/* prompt negativo */}
          {job.negative_prompt && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wide text-ink-500">
                  Prompt negativo
                </p>
                <CopyButton text={job.negative_prompt} label="Prompt negativo" />
              </div>
              <div className="rounded-xl border border-ink-800 bg-ink-950 p-3 text-xs text-ink-300">
                {job.negative_prompt}
              </div>
            </div>
          )}

          {/* imagens de entrada */}
          {job.input_images?.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-ink-500">
                Imagens usadas ({job.input_images.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {job.input_images
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((img, i) => (
                    <div
                      key={i}
                      className="relative h-16 w-16 overflow-hidden rounded-lg border border-ink-800"
                    >
                      <Image
                        src={img.url}
                        alt={`img ${i + 1}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                      <span className="absolute left-1 top-1 rounded bg-ink-950/80 px-1 text-[9px] font-semibold text-lime-glow">
                        {i + 1}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* datas */}
          <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
            <Calendar className="h-3 w-3" />
            {format(new Date(job.created_at), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}{" "}
            ({formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ptBR })})
          </div>
        </div>

        {/* ações */}
        <div className="flex items-center justify-between gap-2 border-t border-ink-800 px-5 py-3">
          <CopyButton text={fullData} label="Todos os dados" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                reusePrompt(job);
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-200 transition hover:border-ink-600 hover:text-white"
            >
              <Repeat2 className="h-3.5 w-3.5" /> Reusar
            </button>
            {job.status === "COMPLETED" && job.output_url && (
              <a
                href={job.output_url}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-lime-glow px-3 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-lime-bright"
              >
                <Download className="h-3.5 w-3.5" /> Baixar
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
