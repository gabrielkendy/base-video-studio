import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createSession, destroySession } from "@/lib/auth";

export const runtime = "nodejs";

// Rate limiting best-effort (por instância). Trava brute-force básico.
const WINDOW_MS = 15 * 60_000; // 15 min
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 0, resetAt: now + WINDOW_MS });
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function registerFail(ip: string) {
  const rec = attempts.get(ip);
  if (rec) rec.count++;
}

/** Comparação em tempo constante (evita timing attack na senha). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // ainda compara contra si mesmo para não vazar diferença de tempo
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

// POST /api/auth — valida senha e cria sessão
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "TOO_MANY_ATTEMPTS" },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }

  let body: { password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "SERVER_MISCONFIGURED" }, { status: 500 });
  }

  if (typeof body.password !== "string" || !safeEqual(body.password, expected)) {
    registerFail(ip);
    return NextResponse.json({ error: "SENHA_INVALIDA" }, { status: 401 });
  }

  await createSession(body.name || "equipe");
  return NextResponse.json({ ok: true });
}

// DELETE /api/auth — logout
export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
