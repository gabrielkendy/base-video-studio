import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para o browser (usa a anon key).
 * Serve para LEITURA + Realtime no frontend. Toda ESCRITA passa pelas API routes.
 */
export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
