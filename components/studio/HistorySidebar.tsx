"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Download,
  RotateCw,
  X,
  Repeat2,
  Info,
  History as HistoryIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useStudio } from "@/lib/studio-context";
import { estimateCost, formatUsd, formatBrl, USD_TO_BRL } from "@/lib/fal/pricing";
import { cn } from "@/lib/utils";
import { JobDetailsModal } from "./JobDetailsModal";
import type { Job } from "@/types";

export function HistorySidebar() {
  const { jobs, jobsLoading, selectedJob, setSelectedJobId, reusePrompt } =
    useStudio();
  const [detailsJob, setDetailsJob] = useState<Job | null>(null);

  async function cancel(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    toast.success("Job cancelado.");
  }
  async function retry(id: string) {
    await fetch(`/api/jobs/${id}`, { method: "PATCH" });
    toast.success("Reenviado para a fila.");
  }

  // Gasto total ao vivo (soma dos vídeos concluídos)
  const completed = jobs.filter((j) => j.status === "COMPLETED");
  const totalUsd = completed.reduce((sum, j) => {
    const e = estimateCost(
      j.model_id,
      j.config?.duration,
      j.config?.resolution,
      j.config?.generate_audio ?? true
    );
    return sum + (e?.usd ?? 0);
  }, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-ink-800 px-4">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-ink-400" />
          <span className="text-sm font-medium text-white">Histórico</span>
        </div>
        {completed.length > 0 && (
          <span
            title={`Gasto estimado em ${completed.length} vídeo(s)`}
            className="rounded-md bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-ink-300"
          >
            ~{formatUsd(totalUsd)} · {formatBrl(totalUsd * USD_TO_BRL)}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {jobsLoading && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl shimmer" />
            ))}
          </>
        )}

        {!jobsLoading && jobs.length === 0 && (
          <p className="py-8 text-center text-xs text-ink-500">
            Nenhuma geração ainda.
          </p>
        )}

        {jobs.map((job) => (
          <HistoryCard
            key={job.id}
            job={job}
            active={selectedJob?.id === job.id}
            onSelect={() => setSelectedJobId(job.id)}
            onCancel={() => cancel(job.id)}
            onRetry={() => retry(job.id)}
            onReuse={() => reusePrompt(job)}
            onInfo={() => setDetailsJob(job)}
          />
        ))}
      </div>

      <JobDetailsModal job={detailsJob} onClose={() => setDetailsJob(null)} />
    </div>
  );
}

function HistoryCard({
  job,
  active,
  onSelect,
  onCancel,
  onRetry,
  onReuse,
  onInfo,
}: {
  job: Job;
  active: boolean;
  onSelect: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onReuse: () => void;
  onInfo: () => void;
}) {
  const isWorking = job.status === "QUEUED" || job.status === "PROCESSING";

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-xl border bg-ink-900 transition",
        active
          ? "border-lime-glow/40"
          : "border-ink-800 hover:border-ink-700"
      )}
    >
      <div className="relative aspect-video bg-ink-850">
        {job.status === "COMPLETED" && job.output_url ? (
          <video
            src={job.output_url}
            muted
            loop
            playsInline
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
            className="h-full w-full object-cover"
          />
        ) : isWorking ? (
          <div className="flex h-full w-full items-center justify-center">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-lime-glow animate-pulse-glow">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-glow" />
              {job.status === "QUEUED" ? "Na fila" : "Generating"}
            </span>
          </div>
        ) : job.status === "FAILED" ? (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-red-400">
            Falhou
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] text-ink-600">
            {job.status === "CANCELLED" ? "Cancelado" : "—"}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2.5 py-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-ink-300">
            {job.prompt || job.model_id}
          </p>
          <p className="text-[10px] text-ink-600">
            {formatDistanceToNow(new Date(job.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInfo();
            }}
            className="rounded-md p-1 text-ink-400 transition hover:text-white"
            title="Ver detalhes (prompt, modelo, custo)"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          {job.status === "COMPLETED" && job.output_url && (
            <>
              <a
                href={job.output_url}
                download
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-md p-1 text-ink-400 transition hover:text-lime-glow"
                title="Baixar"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReuse();
                }}
                className="rounded-md p-1 text-ink-400 transition hover:text-white"
                title="Reusar prompt"
              >
                <Repeat2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {job.status === "FAILED" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="rounded-md p-1 text-ink-400 transition hover:text-white"
              title="Tentar de novo"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          )}
          {(job.status === "QUEUED" || job.status === "PROCESSING") && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="rounded-md p-1 text-ink-400 transition hover:text-red-400"
              title="Cancelar geração"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
