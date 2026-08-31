import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

// POST /api/upload — sobe mídia pro Storage e registra na biblioteca de assets
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE", max: "50MB" }, { status: 413 });
  }

  // Só aceita imagem/vídeo/áudio (o tipo vem do cliente, mas filtra o grosso)
  const mime = file.type || "";
  const allowed =
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/");
  if (!allowed) {
    return NextResponse.json({ error: "UNSUPPORTED_TYPE" }, { status: 415 });
  }

  const kind = mime.startsWith("video")
    ? "VIDEO"
    : mime.startsWith("audio")
      ? "AUDIO"
      : "IMAGE";

  const ALLOWED_EXT = new Set([
    "jpg", "jpeg", "png", "webp", "gif", "avif",
    "mp4", "mov", "webm", "m4v",
    "mp3", "wav", "m4a", "ogg",
  ]);
  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  const ext = ALLOWED_EXT.has(rawExt) ? rawExt : "bin";
  const path = `${kind.toLowerCase()}/${nanoid()}.${ext}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from("media")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("media").getPublicUrl(path);

  const { data: asset } = await supabaseAdmin
    .from("assets")
    .insert({
      kind,
      url: publicUrl,
      storage_path: path,
      source: "upload",
      created_by: user,
    })
    .select()
    .single();

  return NextResponse.json({
    url: publicUrl,
    storagePath: path,
    kind,
    asset,
  });
}
