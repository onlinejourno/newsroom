# SEO + E-E-A-T Audit — Port the elaborate engine into the platform

**Status:** Design (approved in brainstorming 2026-06-14)
**Scope decision:** Full parity with the original `discover-dashboard` audit, built in **one push**, plus a **Core Web Vitals** enhancement.

## Goal

The platform's `/en/scores` audit is shallow (the compact `distribution_fit` channel scores only). The original Streamlit project `discover-dashboard` has a production-grade SEO + E-E-A-T audit (~22 SEJ periodic-table checks, three rich channel scorers, SQEG, recirculation, signal radar, potential score, YouTube + AI-assistant queries, Keywords-Everywhere/backlinks). Port that engine into the platform **faithfully** (same formulas, weights, thresholds, advice text) and render it in Next.js, and **add a Core Web Vitals dimension** the original lacks.

## Sources (read-only references — do NOT modify these projects)

- **Gold source (audit logic):** `/Users/subhashrai/Data Protection/discover-dashboard/` — `analyze/seo_eeat.py`, `analyze/sqeg.py`, `analyze/channel_scorer.py`, `analyze/recirculation.py`, `analyze/scoring_utils.py`, `predict/scorer.py`, `config.py`, `dashboard/app.py`, plus the keyless/keyed fetchers in `data/` (`ai_queries_fetcher.py`, `youtube_fetcher.py`, `gdelt_fetcher.py`, `ke_client.py`).
- **CWV source:** `/Users/subhashrai/projects/news-intel/src/collect_pagespeed.py` — Google PageSpeed Insights v5 (mobile, performance): `performance_score`, `lcp_ms`, `cls_score`, `tbt_ms`, `fcp_ms`; env `PAGESPEED_API_KEY`.
- **Probity:** `/Users/subhashrai/projects/web-bloat-checker` — already integrated via `apps/web/lib/probity.ts` (→ `:4870`). Unchanged.

## Architecture

**Engine placement:** `packages/scoring-py` (the stub package explicitly created for "SEO + E-E-A-T audit engine, SQEG, recirculation … inheritance from discover-dashboard"). Vendor + adapt the original Python modules here so the platform is self-contained (no runtime dependency on `discover-dashboard`).

**Data flow (on-demand, cached):**
```
/en/scores story row → "Run SEO + E-E-A-T Audit" (server action)
  → uv run --package onlinejourno-scoring onlinejourno-scoring audit <url> [--trend t] [--need n] --json
  → full audit JSON (stdout)
  → persist to seo_audit (tenant, story, url, audit JSONB, computed_at)
  → React render of all sections
Re-run = re-compute + overwrite cache.
```
Mirrors the existing `apps/web/lib/analyze.ts` → `distribution_fit.py` subprocess pattern.

## Python engine — `packages/scoring-py/src/onlinejourno_scoring/`

Each module ports the original's logic **verbatim** (formulas, weights, thresholds, grade bands, SQEG §refs, remediation strings). Each is independently unit-tested.

- `fetch.py` — HTTP fetch + BeautifulSoup parse; Cloudflare/consent-block detection, paywall (partial/hard) detection, JS-rendered detection; Google-News-RSS metadata fallback; `meta_hints` override. Returns a normalized `Page` (title, meta, headings, images, schema types, author, published/modified, internal/external links, word count, canonical, og:*, body text, flags).
- `seo_checks.py` — the **SEJ periodic-table** checks grouped by element code (Ti, Ds, Hd, Mm, Sd, Cn, Il, El, Au, Fr, Tr, Sc, Ar, Sh, Ac). Each check → `{element, signal, severity (critical|warning|ok), finding, recommendation}`. Overall score `=(passed/total)×100 − critical×12 − warning×4`, grade A/B/C/D/F (80/65/50/35).
- `channels.py` — rich **Discover / News / Search** scorers (per the enumerated signal mixes + CF fallbacks + original-reporting nuance + news-sitemap/section signals). Each → `{score, grade, signals:[{name, value, max, note}]}`.
- `sqeg.py` — **YMYL** classification (Critical/High/Medium/Low via section-path + keyword signals, with requirements list); **Page Quality** (MC, Experience, Authoritativeness, Trustworthiness, Date Transparency, Beneficial Purpose, Website Reputation) with SQEG §refs and PQ grade; **Needs Met** + query-intent; **Lowest-Quality risk flags**.
- `recirculation.py` — internal-link quality: total, same-section, deeper-taxonomy, good/weak anchors, related-block; score (volume 30 / relevance 30 / anchor 25 / related 10 / taxonomy 5); rule-based recommendations.
- `potential.py` — potential score = `0.40·trend_momentum + 0.30·content_alignment + 0.20·domain_authority + 0.10·freshness` (weights from original `config.py`); reuse platform `trend_score.py`/`keywords.py` inputs where they fit; score label HIGH/MEDIUM/LOW/VERY LOW.
- `cwv.py` — **NEW.** Port `collect_pagespeed.py`: PSI v5 mobile/performance → `{performance_score, lcp_ms, cls_score, tbt_ms, fcp_ms}` + a derived Page-Experience grade and remediation. Needs `PAGESPEED_API_KEY`; on 429/missing key/timeout → `{available:false, reason}` (section hidden in UI). Feeds the Technical-SEO radar axis.
- `signals_radar.py` — 5-axis rollup: Content depth, E-E-A-T, Technical SEO (now boosted by CWV when available), Freshness, Distribution readiness.
- Keyless/keyed fetchers: `ai_queries.py` (Google Suggest — "What People Ask AI Assistants"), `youtube.py` (autocomplete search queries + angle tags), `gdelt.py` (domain topic authority), `keywords_everywhere.py` (ranking keywords, PASF, backlinks — `KEYWORDS_EVERYWHERE` key present). Each degrades gracefully (returns empty/`available:false`) on error/missing key.
- `audit.py` — orchestrator: runs all of the above for a URL/trend/need and assembles **one JSON** (the full audit). `cli.py` — `audit` subcommand (+ `--trend`, `--need`, `--json`).
- **Out of scope:** GSC Discover performance (no OAuth) — omitted; the section is simply absent.

## Web rendering — `apps/web`

- `lib/seoAudit.ts` — `runSeoAudit(url, {trend, need})` spawns the `onlinejourno-scoring audit` subprocess (mirrors `analyze.ts`), returns the typed audit; plus DB read/write of the cache.
- `lib/db.ts` — `seoAuditFor(tenantId, storyId)` (read cache), `upsertSeoAudit(...)`.
- Server action on `/en/scores` + a per-row **"Run SEO + E-E-A-T Audit"** trigger.
- Components (one per section, dependency-free SVG for charts), matching the original's sections and **its educational/remediation text** (ground-up principle — surfaces explain the *why*):
  - `AuditScorecard` (overall score + grade + "how it's calculated")
  - `ChannelCards` (Discover/News/Search + expandable signal breakdown)
  - `SignalRadar` (5-axis SVG radar)
  - `SqegPanel` (YMYL / PQ / Needs-Met + PQ signal bars + risk flags)
  - `PeriodicTable` (SEJ checks grouped by element, expandable, severity-coded)
  - `Recirculation`, `Taxonomy`, `PotentialPanel`
  - `CoreWebVitals` (**new** — LCP/INP·TBT/CLS/FCP + perf score + Page-Experience grade)
  - `YouTubeQueries`, `AiAssistantQueries`
  - `KeywordsIntelligence` (ranking keywords + PASF + backlinks)
  - `PremiumDistributionAdvisory` (paywalled stories — urgency + ranked options)
- Score-distribution histogram on the list view (SVG).

## Persistence

Migration `infra/migrations/00NN_seo_audit.sql`: `seo_audit(tenant_id, story_id, url, audit jsonb, computed_at, primary key (tenant_id, story_id))`. On-demand compute, cached; "Run" overwrites.

## Integration with existing

`distribution_fit.py` stays for the table's compact "Audit ▾" + need-weighting (ADR 0049). The rich audit is the deep-dive; its channel cards come from the new `channels.py`. (Minor channel-score overlap accepted; can unify later.)

## Scope / degradation

- **Degrades gracefully (section hidden):** CWV (no `PAGESPEED_API_KEY`), Keywords-Everywhere/backlinks (no key/error), GDELT, YouTube, AI-queries (network error). The deterministic core (periodic table, channels, SQEG, recirculation, radar) always renders.
- **Omitted:** GSC Discover performance.

## Testing

- **Python:** pytest for every check/scorer — pin weights, thresholds, grade bands, SQEG levels, YMYL classification, recirculation math, CWV grading. Characterize against the original's outputs where practical.
- **Web:** `pnpm --filter @onlinejourno/web type-check` + running app. `/en/scores` is auth-gated; verify what's possible without credentials and flag the visual check.
- No TS test runner is added (out of scope).

## File structure (new/modified)

**Create (Python engine):** `packages/scoring-py/src/onlinejourno_scoring/{__init__,fetch,seo_checks,channels,sqeg,recirculation,potential,cwv,signals_radar,ai_queries,youtube,gdelt,keywords_everywhere,audit,cli}.py` + `packages/scoring-py/tests/test_*.py`. Update `packages/scoring-py/pyproject.toml` (deps: requests, beautifulsoup4, feedparser, lxml; script entry `onlinejourno-scoring`).
**Create (web):** `apps/web/lib/seoAudit.ts`; `apps/web/components/scores/seo-audit/*.tsx`; `infra/migrations/00NN_seo_audit.sql`.
**Modify:** `apps/web/lib/db.ts` (cache read/write), `apps/web/app/[locale]/scores/page.tsx` (trigger + render).

## Branch

`slice/seo-eeat-audit` (off the fusion branch HEAD to carry the in-tree planning WIP cleanly). Keeps audit commits out of the open calendar-fusion PR #102.
