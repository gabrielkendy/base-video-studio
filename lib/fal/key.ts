import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";
import { fal } from "@/lib/fal/client";

// ===========================================================================
// Resolve a chave da fal.ai em tempo de execução:
//   1) app_settings.fal_key_encrypted (configurada pela UI, criptografada)
//   2) fallback: process.env.FAL_KEY (deploy "clássico")
// Assim cada pessoa pode plugar a própria chave pela aba de Configurações.
// ===========================================================================

export type FalKeySource = "db" | "env" | null;

export async function resolveFalKey(): Promise<{
  key: string | null;
  source: FalKeySource;
}> {
  try {
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("fal_key_encrypted")
      .eq("id", "singleton")
      .maybeSingle();
    const dec = decryptSecret(data?.fal_key_encrypted);
    if (dec) return { key: dec, source: "db" };
  } catch {
    /* tabela pode não existir ainda — cai no fallback */
  }
  if (process.env.FAL_KEY) return { key: process.env.FAL_KEY, source: "env" };
  return { key: null, source: null };
}

/**
 * Configura o cliente fal com a chave resolvida. Retorna false se não há chave
 * (nesse caso o chamador deve falhar o job com mensagem amigável).
 */
export async function ensureFalConfigured(): Promise<boolean> {
  const { key } = await resolveFalKey();
  if (!key) return false;
  fal.config({ credentials: key });
  return true;
}
