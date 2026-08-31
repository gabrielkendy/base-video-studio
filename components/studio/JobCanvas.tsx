"use client";

import { useState } from "react";
import {
  Download,
  Sparkles,
  AlertTriangle,
  RotateCw,
  Film,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useStudio } from "@/lib/studio-context";
import { JobDetailsModal } from "./JobDetailsModal";

export function JobCanvas() {
  const { selectedJob, reusePrompt } = useStudio();
  const [detailsOpen, setDetailsOpen] = useState(false);

  async function retry(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "PATCH" });
    toast.success("Reenviado para a fila.");
  }

  async function cancel(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    toast.success("Geração cancelada.");
  }

  if (!selectedJob) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-900 ring-1 ring-ink-800">
          <Film className="h-7 w-7 text-ink-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-ink-300">
            Seu vídeo aparece aqui
          </p>
          <p className="mt-1 text-xs text-ink-500">
            Configure à esquerda e clique em Gerar.
          </p>
        </div>
      </div>
    );
  }

  const job = selectedJob;
  const isWorking = job.status === "QUEUED" || job.status === "PROCESSING";

  return (
    <>
    <div className="flex h-full flex-col p-4">
      {/* status header */}
      <div className="mb-3 flex items-center gap-2">
        {job.status === "PROCESSING" && (
          <span className="flex items-center gap-1.5 rounded-full bg-lime-glow/10 px-2.5 py-1 text-xs font-medium text-lime-glow animate-pulse-glow">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-glow" />
            Generating
          </span>
        )}
        {job.status === "QUEUED" && (
          <span className="rounded-full bg-ink-800 px-2.5 py-1 text-xs font-medium text-ink-300">
            Na fila
          </span>
        )}
        {job.status === "COMPLETED" && (
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            Concluído
          </span>
        )}
        {job.status === "FAILED" && (
          <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
            Falhou
          </span>
        )}
        {job.status === "CANCELLED" && (
          <span className="rounded-full bg-ink-800 px-2.5 py-1 text-xs font-medium text-ink-500 line-through">
            Cancelado
          </span>
        )}
        <span className="text-xs text-ink-500">{job.model_id}</span>
      </div>

      {/* área principal */}
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-ink-800 bg-ink-900/40">
        {isWorking && (
          <div className="canvas-generating flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-2 border-ink-700 border-t-lime-glow animate-spin-slow" />
              <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-lime-glow" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">
                {job.status === "QUEUED" ? "Aguardando…" : "Gerando vídeo…"}
              </p>
              <p className="mt-1 max-w-md text-xs text-ink-500">
                Isso pode levar de alguns segundos a alguns minutos.
              </p>
            </div>
            <button
              onClick={() => cancel(job.id)}
              className="mt-1 flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs font-medium text-ink-300 transition hover:border-red-500/40 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          </div>
        )}

        {job.status === "COMPLETED" && job.output_url && (
          <video
            src={job.output_url}
            controls
            loop
            autoPlay
            muted
            playsInline
            className="max-h-full max-w-full rounded-xl"
          />
        )}

        {job.status === "COMPLETED" && !job.output_url && (
          <p className="text-sm text-ink-400">
            Concluído, mas sem URL de vídeo. Verifique o modelo/parâmetros.
          </p>
        )}

        {job.status === "FAILED" && (
          <div className="flex max-w-md flex-col items-center gap-3 p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-ink-300">Algo deu errado nesta geração.</p>
            {job.error_message && (
              <p className="max-h-24 overflow-y-auto rounded-lg bg-ink-900 p-2 text-[11px] text-ink-500">
                {job.error_message}
              </p>
            )}
            <button
              onClick={() => retry(job.id)}
              className="flex items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink-700"
            >
              <RotateCw className="h-3.5 w-3.5" /> Tentar de novo
            </button>
          </div>
        )}
      </div>

      {/* prompt + ações */}
      {(job.prompt || job.status === "COMPLETED") && (
        <div className="mt-3 flex items-start gap-3">
          {job.prompt && (
            <p className="line-clamp-2 flex-1 text-xs text-ink-400">
              {job.prompt}
            </p>
          )}
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setDetailsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-300 transition hover:border-ink-600 hover:text-white"
            >
              <Info className="h-3.5 w-3.5" /> Detalhes
            </button>
            <button
              onClick={() => reusePrompt(job)}
              className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-300 transition hover:border-ink-600 hover:text-white"
            >
              Reusar prompt
            </button>
            {job.status === "COMPLETED" && job.output_url && (
              <a
                href={job.output_url}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-lime-glow px-2.5 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-lime-bright"
              >
                <Download className="h-3.5 w-3.5" /> Baixar
              </a>
            )}
          </div>
        </div>
      )}
    </div>

    <JobDetailsModal
      job={detailsOpen ? job : null}
      onClose={() => setDetailsOpen(false)}
    />
    </>
  );
}
