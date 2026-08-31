// ===========================================================================
// Validação de sessão compatível com Edge Runtime (middleware) via Web Crypto.
// Reproduz exatamente o HMAC-SHA256 hex usado em lib/auth.ts (node:crypto),
// permitindo VALIDAR a assinatura do cookie no edge — não só checar presença.
// ===========================================================================

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signEdge(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return toHex(sig);
}

/** Comparação de strings em tempo constante (evita timing attack). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Valida o token de sessão no Edge. Retorna o nome do usuário ou null.
 * Mesma estrutura de lib/auth.ts: `${name}:${ts}.${hmac}`.
 */
export async function verifySessionEdge(
  token: string | undefined,
  secret: string | undefined
): Promise<string | null> {
  if (!token || !secret) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!payload || !sig) return null;

  const expected = await signEdge(payload, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  return payload.split(":")[0] || "equipe";
}
