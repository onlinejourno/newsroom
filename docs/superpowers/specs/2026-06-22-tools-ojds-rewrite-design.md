# Design spec — tools.onlinejourno.com OJDS rewrite (Next.js UI + Python analysis API)

**Status:** Drafted 2026-06-22. Cross-repo project (owned by this session). Goal: make
`tools.onlinejourno.com` OJDS-coherent — homepage + crawl-budget-analyser + web-bloat-checker — with
the shared header/footer, retiring the Streamlit UI + the bare static homepage + the nginx proxy.

## Why

The tools have no OJDS chrome (no shared header/footer) and look off-brand. **crawl-budget-analyser is
Streamlit** — it can't take the shared header/footer or match OJDS, and resists design change. The
analysis (crawl map, Common Crawl coverage, structural issues, competitor compare, editorial briefing)
*works* and shouldn't be reimplemented/regressed. So: keep the analysis, replace the UI.

## Architecture (founder-approved)

- **Next.js + OJDS frontend** = one app, `onlinejourno-tools-web` (new repo). Serves the tools
  **homepage** + `/crawl-budget-analyser` + `/web-bloat-checker`, all with the shared OJDS header +
  footer (the cross-property IA from `SHARED-IA.md`). Deploys to the **`onlinejourno-tools` Fly app**,
  replacing the nginx proxy + static index.html.
- **Analysis stays Python, exposed as an API:** in `news-crawl-budget-analyzer`, add a thin **FastAPI**
  that wraps the existing `webapp/fetchers` + `audit_log` (the Streamlit `app.py` logic), returning
  JSON. Deploys to `crawl-budget-analyser.fly.dev` (replacing the Streamlit entrypoint). The Next.js
  page calls it and renders OJDS.
- **web-bloat-checker** is already Node — Phase 3 either exposes its logic as an API the Next page
  calls, or its result UI is reskinned; decided when we reach it.
- **Charts:** plotly → **Recharts** (React, themeable to OJDS tokens). Resolves the platform's deferred
  chart-lib question (#107) for this app.

## OJDS reuse

Vendor the platform's OJDS foundation into the tools app (it's a separate repo): `globals.css` tokens,
the Kittel font (`KarnataFKittel.otf` + OFL), the core components (`Card`/`Badge`/`Tag`/`Button`/
`Tabs`), and a header + `SiteFooter` built from the **same `site-nav.ts`** (Home · Platform · Tools ·
Editorial Optimiser + the legal pages + GitHub + CC BY 4.0). Keep it a copy now; a shared `@onlinejourno/ui`
package is a later consolidation.

## API contract (crawl-budget)

`POST /api/crawl-analysis { url, competitors?[] }` → JSON:
`{ crawlMap, aiCrawlerCoverage, structuralIssues[], competitors[], briefing }` — one field per
existing Streamlit section. The Next page renders each as an OJDS `Card` + Recharts where the Streamlit
used plotly. (Exact shapes pinned in the plan, read from `fetchers.py`.)

## Phases (each ships independently)

1. **Scaffold + OJDS homepage + shared chrome** → deploy to `onlinejourno-tools`. Replaces the bare
   static homepage with an OJDS Next.js landing (header/footer, "the suite", links to both tools).
   **Immediate coherence win** + the app skeleton. Lowest risk.
2. **crawl-budget:** FastAPI over the existing analysis (`crawl-budget-analyser.fly.dev`) + the OJDS
   Next.js page (form → results: cards + Recharts). Retires Streamlit.
3. **web-bloat-checker:** OJDS page in the tools app over its (Node) logic.

## Deploy / infra

- `onlinejourno-tools` Fly app → the Next.js standalone (Dockerfile like the platform's). Custom domain
  `tools.onlinejourno.com` already wired (DNS + cert done).
- `crawl-budget-analyser.fly.dev` → FastAPI (uvicorn) instead of Streamlit.
- Bots crawl freely; rate-limit only human IPs on the tool endpoints (>3/hr, exempt bot UAs) per
  `SHARED-IA.md` — middleware in the Next app.

## Testing & success criteria

- Each phase: `type-check` + `build` green; deployed; `tools.onlinejourno.com` (+ each route) → 200 with
  the OJDS header/footer; bots get 200 (not blocked). crawl-budget results match the Streamlit output
  (spot-check a known URL).

## Out of scope / later

A shared `@onlinejourno/ui` package (vendor-copy for now); auth on the tools; the News Ranking property
(provisioned separately). The platform repo is unaffected (this is the tools repos + a new one).

## References

`~/projects/news-crawl-budget-analyzer` (Streamlit `webapp/app.py` + `fetchers`), `~/projects/web-bloat-checker`
(Node), `deploy/proxy/` (current nginx — retired by Phase 1), `marketing/SHARED-IA.md`, the platform's
`apps/web/{lib/site-nav.ts,components/ui,components/SiteFooter.tsx,app/globals.css}` for OJDS.
