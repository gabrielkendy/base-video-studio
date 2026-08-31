import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptSecret, maskSecret } from "@/lib/crypto";
import { resolveFalKey } from "@/lib/fal/key";

export const runtime = "nodejs";

// GET /api/settings — status da chave (NUNCA devolve a chave em texto)
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { key, source } = await resolveFalKey();
  return NextResponse.json({
    configured: Boolean(key),
    source, // "db" | "env" | null
    masked: key ? maskSecret(key) : null,
    canEdit: true, // a chave do banco sempre pode ser editada pela UI
  });
}

// POST /api/settings — salva a chave da fal.ai (criptografada no banco)
export async function POST(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const falKey = typeof body?.falKey === "string" ? body.falKey.trim() : "";

  if (falKey.length < 8) {
    return NextResponse.json({ error: "INVALID_KEY" }, { status: 400 });
  }

  const user = await getSession();
  const { error } = await supabaseAdmin.from("app_settings").upsert(
    {
      id: "singleton",
      fal_key_encrypted: encryptSecret(falKey),
      updated_by: user,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json(
      { error: "SAVE_FAILED", details: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, masked: maskSecret(falKey) });
}

// DELETE /api/settings — remove a chave salva no banco (volta pro fallback env)
export async function DELETE() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  await supabaseAdmin
    .from("app_settings")
    .update({ fal_key_encrypted: null, updated_at: new Date().toISOString() })
    .eq("id", "singleton");
  return NextResponse.json({ ok: true });
}
