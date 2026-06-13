import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/locale";
import { SESSION_COOKIE, verifyToken } from "@/lib/session-token";

// Paths (after the /{locale} prefix) reachable without a session (ADR 0055).
const OPEN = ["login", "register", "accept", "pending"];

// Pick best supported locale from Accept-Language, else default.
function negotiate(req: NextRequest): string {
  const header = req.headers.get("accept-language");
  if (!header) return defaultLocale;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    const base = tag.split("-")[0];
    const hit = locales.find((l) => l === tag || l === base);
    if (hit) return hit;
  }
  return defaultLocale;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const locale = locales.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );

  // No locale prefix → add one and redirect.
  if (!locale) {
    const url = req.nextUrl.clone();
    const loc = negotiate(req);
    url.pathname = `/${loc}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // The login gate: everything requires a valid session except OPEN paths.
  const rest = pathname.slice(`/${locale}`.length).replace(/^\//, "");
  const top = rest.split("/")[0];
  if (OPEN.includes(top)) return NextResponse.next();

  const account = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!account) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip API, Next internals, and any file with an extension (assets).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
