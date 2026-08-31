import crypto from "crypto";

// ===========================================================================
// Criptografia simétrica (AES-256-GCM) para guardar segredos no banco.
// A chave é derivada do SESSION_SECRET — se ele mudar, é só reconfigurar.
// ===========================================================================

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const secret = process.env.SESSION_SECRET || "dev-fallback-secret";
  return crypto.createHash("sha256").update(secret).digest();
}

/** Criptografa um texto. Retorna "iv.tag.ciphertext" em base64. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    enc.toString("base64"),
  ].join(".");
}

/** Descriptografa "iv.tag.ciphertext". Retorna null se inválido/adulterado. */
export function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null;
  try {
    const [ivb, tagb, encb] = payload.split(".");
    if (!ivb || !tagb || !encb) return null;
    const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivb, "base64"));
    decipher.setAuthTag(Buffer.from(tagb, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encb, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

/** Mascara um segredo para exibição: mostra só os últimos 4 caracteres. */
export function maskSecret(secret: string): string {
  if (secret.length <= 4) return "••••";
  return `••••••••${secret.slice(-4)}`;
}
