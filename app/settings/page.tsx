"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Save,
  Trash2,
} from "lucide-react";

interface Status {
  configured: boolean;
  source: "db" | "env" | null;
  masked: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [falKey, setFalKey] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/settings", { cache: "no-store" });
    if (res.ok) setStatus(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (falKey.trim().length < 8) {
      toast.error("Cole uma chave válida da fal.ai.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ falKey: falKey.trim() }),
      });
      if (res.ok) {
        toast.success("Chave salva com segurança! Já pode gerar vídeos.");
        setFalKey("");
        load();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(`Não foi possível salvar (${d.error ?? res.status}).`);
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function removeKey() {
    await fetch("/api/settings", { method: "DELETE" });
    toast.success("Chave removida.");
    load();
  }

  return (
    <main className="min-h-screen bg-ink-950 px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <Link
          href="/studio"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao studio
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-glow/10 ring-1 ring-lime-glow/30">
            <KeyRound className="h-5 w-5 text-lime-glow" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Configurações</h1>
            <p className="text-xs text-ink-400">Sua chave da fal.ai</p>
          </div>
        </div>

        {/* Status atual */}
        <div className="mb-4 rounded-2xl border border-ink-800 bg-ink-900/60 p-4">
          {status === null ? (
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin-slow" /> Carregando…
            </div>
          ) : status.configured ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Chave configurada
                  </p>
                  <p className="text-xs text-ink-500">
                    {status.masked} ·{" "}
                    {status.source === "db"
                      ? "salva no app"
                      : "via variável de ambiente"}
                  </p>
                </div>
              </div>
              {status.source === "db" && (
                <button
                  onClick={removeKey}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-300 transition hover:border-red-500/40 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-400">
              ⚠️ Nenhuma chave configurada — cole abaixo para começar a gerar.
            </p>
          )}
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-5">
          <label className="mb-1.5 block text-xs font-medium text-ink-300">
            {status?.configured ? "Atualizar chave da fal.ai" : "Chave da fal.ai"}
          </label>
          <input
            type="password"
            value={falKey}
            onChange={(e) => setFalKey(e.target.value)}
            placeholder="cole sua FAL_KEY aqui (ex.: xxxxxxxx:yyyyyyyy)"
            className="w-full rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-ink-600 focus:border-lime-glow/50 focus:ring-2 focus:ring-lime-glow/20"
          />
          <p className="mt-2 text-[11px] text-ink-500">
            A chave é <b>criptografada</b> antes de salvar e nunca aparece no
            navegador. Pegue a sua em{" "}
            <a
              href="https://fal.ai/dashboard/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-lime-glow hover:underline"
            >
              fal.ai/dashboard/keys <ExternalLink className="h-3 w-3" />
            </a>
          </p>

          <button
            onClick={save}
            disabled={saving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-glow px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-lime-bright disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin-slow" />
            ) : (
              <>
                <Save className="h-4 w-4" /> Salvar chave
              </>
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-ink-600">
          BASE Video Studio · cada um usa a própria conta da fal.ai
        </p>
      </div>
    </main>
  );
}
