# OnlineJourno — shared site IA (all properties)

One brand, four properties. Each carries the **same cross-property nav + footer** so the suite reads
as one site. The platform (app.onlinejourno.com) and the onlinejourno.com WordPress theme already
implement this — the **tools** and **editorial-optimiser** apps should match it.

## Properties

- **Home / portal** — https://onlinejourno.com
- **Platform** — https://app.onlinejourno.com
- **Tools** — https://tools.onlinejourno.com (web-bloat-checker, crawl-budget-analyser)
- **Editorial Optimiser** — https://editorial-optimiser.onlinejourno.com

## Header nav (same set + order, every property)

`Home · Platform · Tools · Editorial Optimiser` (the portal also adds `Docs · About`).

## Footer (every property — the standard pages live here for SEO)

- **Product:** Home · Platform · Tools · Editorial Optimiser
- **Project:** Source on GitHub (`https://github.com/onlinejourno/platform`) · Products · Docs & self-host
- **Legal:** About · Privacy Policy · Contact · License & Attribution
  (→ `onlinejourno.com/{about, privacy-policy, contact, license-attribution}`)
- **Base:** `© {year} OnlineJourno · A platform by journalists, for journalists` · `Content licensed CC BY 4.0`
- **Style:** ink band, responsive (columns collapse to 1–2 on phones).

## Bots + abuse (the tools app)

- **Never block search / AI crawlers** — they index us; SEO + AI visibility is the growth funnel.
- Rate-limit only **human IPs on the expensive tool pages**: **>3 hits/hour → 429 + `Retry-After`**.
- **Exempt known bot UAs** (Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, …) from the limit —
  the UA list is used to *let bots through*, never to block them. Homepage + other pages unrestricted.

## Reference implementation (copy from the platform)

- Platform: `apps/web/components/SiteFooter.tsx`, `apps/web/lib/site-nav.ts`, `apps/web/components/Masthead.tsx` (Products menu).
- WordPress: `marketing/wordpress/theme/onlinejourno/{header,footer,front-page}.php`.
