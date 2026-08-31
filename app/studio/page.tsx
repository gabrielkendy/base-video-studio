import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveFalKey } from "@/lib/fal/key";
import { StudioProvider } from "@/lib/studio-context";
import { StudioShell } from "@/components/studio/StudioShell";
import type { Model } from "@/types";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const { data } = await supabaseAdmin
    .from("models")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const models = (data as Model[]) ?? [];
  const { key } = await resolveFalKey();
  const falConfigured = Boolean(key);

  return (
    <StudioProvider models={models} userName={user}>
      <StudioShell falConfigured={falConfigured} />
    </StudioProvider>
  );
}
