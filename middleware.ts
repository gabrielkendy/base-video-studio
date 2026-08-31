import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { verifySessionEdge } from "@/lib/session-edge";

/**
 * Protege rotas internas. Agora VALIDA a assinatura HMAC do cookie no Edge
 * (Web Crypto), não apenas a presença — um cookie forjado é rejeitado aqui.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rotas públicas (não exigem sessão)
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/fal/webhook")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = await verifySessionEdge(token, process.env.SESSION_SECRET);

  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!user) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/settings/:path*",
    "/api/jobs/:path*",
    "/api/upload/:path*",
    "/api/settings/:path*",
  ],
};
