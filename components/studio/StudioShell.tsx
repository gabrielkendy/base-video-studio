"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, LogOut, Settings, KeyRound } from "lucide-react";
import { useStudio } from "@/lib/studio-context";
import { CreatePanel } from "./CreatePanel";
import { JobCanvas } from "./JobCanvas";
import { HistorySidebar } from "./HistorySidebar";

export function StudioShell({ falConfigured }: { falConfigured: boolean }) {
  const router = useRouter();
  const { userName } = useStudio();

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink-950">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-ink-800 bg-ink-900/80 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-lime-glow/10 ring-1 ring-lime-glow/30">
            <Sparkles className="h-3.5 w-3.5 text-lime-glow" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">
            BASE Video Studio
          </span>
          <span className="ml-1 rounded-md bg-ink-800 px-1.5 py-0.5 text-[10px] font-medium text-ink-400">
            interno
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-400">
            Olá, <span className="text-ink-200">{userName}</span>
          </span>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-300 transition hover:border-ink-600 hover:text-white"
          >
            <Settings className="h-3.5 w-3.5" /> Configurações
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-300 transition hover:border-ink-600 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </header>

      {/* Banner se não há chave da fal configurada */}
      {!falConfigured && (
        <Link
          href="/settings"
          className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/15"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Configure sua chave da fal.ai para começar a gerar — clique aqui
        </Link>
      )}

      {/* 3 colunas */}
      <div className="flex min-h-0 flex-1">
        <aside className="w-[340px] shrink-0 overflow-y-auto border-r border-ink-800 bg-ink-900/40">
          <CreatePanel />
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden bg-ink-950">
          <JobCanvas />
        </main>

        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-ink-800 bg-ink-900/40 lg:block">
          <HistorySidebar />
        </aside>
      </div>
    </div>
  );
}
