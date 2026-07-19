import { defaultLocale } from "@/lib/locale";

/**
 * /llms.txt — answer-engine / LLM guidance (spec: llmstxt.org).
 *
 * A plain-markdown map of what OnlineJourno Newsroom is and the public pages
 * worth citing. Route handler (not a static public/ file) so the URLs stay in
 * sync with the locale prefix and can be generated. Sibling to app/robots.ts
 * and app/sitemap.ts — the same public, ungated surfaces are advertised here;
 * the authed workspace (brief, calendar, gaps, signals, …) is omitted.
 */
export const dynamic = "force-static";

const BASE = "https://app.onlinejourno.com";
const L = `${BASE}/${defaultLocale}`;

const BODY = `# OnlineJourno Newsroom

> The agentic newsroom: proprietary editorial intelligence for working reporters. It watches the public record coming in, contextualises it against a newsroom's own archive, and returns ranked beat briefs — plus a pre-publish "fair chance" cue and a post-publish diagnostic for every story. Grounded in journalism scholarship (PEJ framing, the Deuze typology, BBC/smartocto user needs), not vibes. By journalists, for journalists.

## Core pages

- [Newsroom home](${L}): what OnlineJourno Newsroom is and who it is for.
- [Showcase](${L}/showcase): the platform running on demo data — what's live, what's moving, what needs work.
- [Standards](${L}/standards): the journalism scholarship the scores and tags trace back to.
- [Architecture](${L}/architecture): how the pipeline turns sources into briefs.

## About

- [OnlineJourno](https://onlinejourno.com): the vendor-neutral, open-source journalism-intelligence project this newsroom belongs to.
`;

export async function GET(): Promise<Response> {
  return new Response(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
