import { NextResponse, type NextRequest } from "next/server";

import { demoViewerSession } from "@/lib/auth";
import { SESSION_COOKIE, signToken } from "@/lib/session-token";

export const dynamic = "force-dynamic";

// Public entry (middleware OPEN): start a read-only demo-viewer session by setting
// the session cookie on the redirect response, then land in the surfaces. A Route
// Handler (not a page) because Next forbids cookie writes during a page render.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const dv = await demoViewerSession("demo");
  const dest = dv ? `/${locale}/${dv.room}` : `/${locale}/login`;
  // Relative Location → the browser resolves it against the public host. Avoids
  // NextResponse.redirect(new URL(dest, req.url)), where req.url is Fly's internal
  // bind (0.0.0.0:3000) behind the proxy.
  const res = new NextResponse(null, { status: 307, headers: { Location: dest } });
  if (dv) {
    res.cookies.set(SESSION_COOKIE, await signToken(dv.accountId, dv.tokenVersion), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14,
      path: "/",
    });
  }
  return res;
}
