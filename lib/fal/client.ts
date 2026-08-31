import { fal } from "@fal-ai/client";

// Pré-configura com a env (se existir). A chave definitiva é resolvida em
// runtime por lib/fal/key.ts (ensureFalConfigured) — banco (UI) ou env.
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

export { fal };
