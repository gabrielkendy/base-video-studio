"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      toast.error("Digite a senha de acesso.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      if (res.ok) {
        toast.success(`Bem-vindo(a), ${name || "equipe"}!`);
        router.push("/studio");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(
          data.error === "SENHA_INVALIDA"
            ? "Senha incorreta."
            : "Não foi possível entrar."
        );
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* glow de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{ background: "rgba(212,255,50,0.10)" }}
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-glow/10 ring-1 ring-lime-glow/30">
            <Sparkles className="h-6 w-6 text-lime-glow" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            BASE Video Studio
          </h1>
          <p className="mt-1 text-sm text-ink-400">
            Geração de vídeo por IA — acesso interno
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-ink-700 bg-ink-850/60 p-6 backdrop-blur"
        >
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">
              Seu nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              autoFocus
              className="w-full rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-ink-600 focus:border-lime-glow/50 focus:ring-2 focus:ring-lime-glow/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">
              Senha de acesso
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-ink-600 focus:border-lime-glow/50 focus:ring-2 focus:ring-lime-glow/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-glow px-4 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-lime-bright disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin-slow" />
            ) : (
              <>
                Entrar <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-600">
          Uso interno · Agência BASE
        </p>
      </div>
    </main>
  );
}
