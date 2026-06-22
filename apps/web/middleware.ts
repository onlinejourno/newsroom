import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/locale";
import { SESSION_COOKIE, verifyToken } from "@/lib/session-token";

// Paths (after the /{locale} prefix) reachable without a session (ADR 0055).
const OPEN = ["login", "register", "accept", "pending", "showcase"];

// ── Abuse prevention (defensive) ─────────────────────────────────────────────
// The app is not an SEO surface (onlinejourno.com is), so block known search
// crawlers, SEO tools, AI scrapers and generic bots. Social-preview UAs
// (facebookexternalhit, Twitterbot, Slackbot, LinkedInBot, Discordbot, WhatsApp)
// are intentionally NOT blocked so shared links still render a preview.
const BLOCKED_BOTS =
  /(googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex|sogou|exabot|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|seznambot|bytespider|gptbot|google-extended|ccbot|claudebot|claude-web|anthropic-ai|perplexitybot|amazonbot|applebot|chatgpt-user|oai-searchbot|cohere-ai|diffbot|scrapy|python-requests|curl\/|wget|go-http-client|libwww-perl|java\/)/i;

// Per-IP sliding-window rate limit on the public routes. In-memory — per machine,
// resets on cold start, which is fine for abuse prevention on warm Fly VMs.
const RL_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RL_MAX = 40; // generous for a human on login/register/showcase
const rlHits = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  return (
    (xff ? xff.split(",")[0].trim() : "") ||
    req.headers.get("fly-client-ip") ||
    "unknown"
  );
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (rlHits.get(ip) ?? []).filter((t) => now - t < RL_WINDOW_MS);
  recent.push(now);
  rlHits.set(ip, recent);
  if (rlHits.size > 50_000) rlHits.clear(); // bound memory on a long-warm machine
  return recent.length > RL_MAX;
}

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

  // Forward the path so server components (the masthead) can mark the active
  // lifecycle stage — App Router doesn't expose the pathname otherwise.
  const withPath = () => {
    const h = new Headers(req.headers);
    h.set("x-invoke-path", pathname);
    return NextResponse.next({ request: { headers: h } });
  };

  // Block crawlers/scrapers — the app isn't for indexing (the portal is).
  if (BLOCKED_BOTS.test(req.headers.get("user-agent") ?? "")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // The login gate: everything requires a valid session except OPEN paths.
  const rest = pathname.slice(`/${locale}`.length).replace(/^\//, "");
  const top = rest.split("/")[0];
  if (OPEN.includes(top)) {
    // Rate-limit the public routes (brute-force / session-spam).
    if (rateLimited(clientIp(req))) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": String(RL_WINDOW_MS / 1000) },
      });
    }
    return withPath();
  }

  const account = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!account) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }
  return withPath();
}

export const config = {
  // Skip API, Next internals, and any file with an extension (assets).
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
