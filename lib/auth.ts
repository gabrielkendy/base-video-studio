import { cookies } from "next/headers";
import crypto from "crypto";
import { SESSION_COOKIE } from "@/lib/constants";

export { SESSION_COOKIE };

function sign(value: string): string {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET!)
    .update(value)
    .digest("hex");
}

/** Cria a sessão (cookie httpOnly assinado) com o nome do usuário. */
export async function createSession(name: string): Promise<void> {
  const clean = (name || "equipe").slice(0, 40).replace(/[:.]/g, "");
  const payload = `${clean}:${Date.now()}`;
  const token = `${payload}.${sign(payload)}`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: "/",
  });
}

/** Retorna o nome do usuário logado, ou null se o cookie for inválido/ausente. */
export async function getSession(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!payload || sign(payload) !== sig) return null;
  return payload.split(":")[0] || "equipe";
}

/** Remove a sessão (logout). */
export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Token assinado por job para proteger o webhook da fal contra spoofing.
 * Sem isto, qualquer um poderia POSTar no webhook e marcar um job como
 * concluído com uma URL arbitrária.
 */
export function webhookToken(jobId: string): string {
  return sign(`webhook:${jobId}`).slice(0, 32);
}

