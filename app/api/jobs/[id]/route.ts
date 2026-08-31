import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchJob } from "@/lib/fal/dispatch";
import { fal } from "@/lib/fal/client";
import type { Job } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// DELETE /api/jobs/[id] — cancela um job na fila (QUEUED) ou em geração (PROCESSING).
// Se já está PROCESSING, também cancela na fal.ai para parar de processar/cobrar.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;

  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();
  const j = job as Job | null;

  // Tenta cancelar na fal se já foi disparado
  if (j?.status === "PROCESSING" && j.fal_request_id) {
    try {
      await fal.queue.cancel(j.fal_endpoint ?? j.model_id, {
        requestId: j.fal_request_id,
      });
    } catch {
      /* pode já ter terminado — segue marcando como cancelado */
    }
  }

  await supabaseAdmin
    .from("jobs")
    .update({ status: "CANCELLED", completed_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["QUEUED", "PROCESSING"]);

  return NextResponse.json({ ok: true });
}

// PATCH /api/jobs/[id] — retry: volta um job FAILED para a fila (QUEUED)
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { id } = await params;
  await supabaseAdmin
    .from("jobs")
    .update({
      status: "QUEUED",
      error_message: null,
      fal_request_id: null,
      started_at: null,
      completed_at: null,
    })
    .eq("id", id)
    .in("status", ["FAILED", "CANCELLED"]);

  // re-dispara pra fal na hora
  await dispatchJob(id);
  return NextResponse.json({ ok: true });
}
