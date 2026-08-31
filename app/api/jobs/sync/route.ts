import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { reconcileProcessing } from "@/lib/fal/reconcile";

export const runtime = "nodejs";
export const maxDuration = 60;

// GET /api/jobs/sync — o frontend chama isto periodicamente enquanto há jobs
// PROCESSING. Consulta a fal e conclui os que terminaram (substitui o webhook).
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const result = await reconcileProcessing();
  return NextResponse.json({ ok: true, ...result });
}
