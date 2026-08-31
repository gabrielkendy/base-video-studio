import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractVideoUrl, extractThumbnailUrl } from "@/lib/fal/models";
import { webhookToken } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/fal/webhook?jobId=...&t=... — a fal chama isto quando o job termina
export async function POST(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  const token = req.nextUrl.searchParams.get("t");
  if (!jobId) {
    return NextResponse.json({ error: "NO_JOB" }, { status: 400 });
  }
  // Anti-spoofing: só aceita com o token HMAC que nós mesmos geramos por job
  if (token !== webhookToken(jobId)) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  // Formato da fal: { status: 'OK' | 'ERROR', payload: {...}, error: {...} }
  const isOk = payload.status === "OK" || payload.status === "COMPLETED";

  if (isOk) {
    const data = payload.payload ?? payload;
    const url = extractVideoUrl(data);
    const thumb = extractThumbnailUrl(data);

    await supabaseAdmin
      .from("jobs")
      .update({
        status: "COMPLETED",
        output_url: url ?? null,
        thumbnail_url: thumb ?? null,
        output_meta: data as Record<string, unknown>,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .neq("status", "COMPLETED"); // idempotente

    if (url) {
      // evita asset duplicado se o webhook chegar duas vezes
      const { data: existing } = await supabaseAdmin
        .from("assets")
        .select("id")
        .eq("job_id", jobId)
        .maybeSingle();

      if (!existing) {
        const { data: job } = await supabaseAdmin
          .from("jobs")
          .select("created_by")
          .eq("id", jobId)
          .single();

        await supabaseAdmin.from("assets").insert({
          kind: "VIDEO",
          url,
          source: "generation",
          job_id: jobId,
          created_by: job?.created_by ?? null,
        });
      }
    }
  } else {
    await supabaseAdmin
      .from("jobs")
      .update({
        status: "FAILED",
        error_message: JSON.stringify(payload.error ?? payload.payload ?? payload),
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .neq("status", "COMPLETED");
  }

  return NextResponse.json({ ok: true });
}
