# Wk 0 Asset Ledger — Tue Jun 2

Status of each existing asset relative to the OnlineJourno Platform build. Walked all five existing repos plus the EIP handover archive. Confidentiality flags and risky deps captured at the bottom.

## Tags

- **REUSE** — code or doc adopted as-is (with namespace rename / `tenant_id` injection only).
- **REWRITE** — concept and design carried over; code rewritten in the new repo because of language switch, scope shift, or fragility.
- **REFERENCE** — read-only source of truth. Not migrated; consulted during build.
- **RETIRE** — superseded; will be archived once the migration is complete.
- **CONFIDENTIAL** — must not be carried over (third-party data, vendor IP, named individuals).

---

## 1. `~/projects/news-intel`

Python pipeline + dual UI (Streamlit and a more recent Vite React static site). The Python pipeline is the strongest reuse candidate; the UI layer retires.

### Python pipeline

| Path | Tag | Destination | Notes |
|------|-----|-------------|-------|
| `SPEC.md` | REFERENCE | — | The framing/Deuze/PEJ system spec. Anchors `m-framing-pej` design. |
| `CLAUDE.md` | REFERENCE | — | Light project notes; superseded by platform's. |
| `src/__init__.py` | REUSE | `packages/ingest-py/__init__.py` | Trivial port. |
| `src/collect_rss.py` | REUSE | `packages/ingest-py/collectors/rss.py` | Plus `tenant_id` injection. |
| `src/collect_sitemap.py` | REUSE | `packages/ingest-py/collectors/sitemap.py` | Same. |
| `src/collect_homepage.py` | REUSE | `packages/ingest-py/collectors/homepage.py` | Same. |
| `src/collect_articles.py` | REUSE | `packages/ingest-py/collectors/article.py` | Uses `trafilatura`. |
| `src/collect_robots.py` | REUSE | `packages/modules/platform-dep/collectors/robots.py` | Powers PDI module. |
| `src/collect_pagespeed.py` | REUSE | `packages/modules/platform-dep/collectors/pagespeed.py` | Same. |
| `src/code_frames.py` | REUSE | `packages/modules/framing-pej/coder.py` | PEJ frame classifier. |
| `src/db.py` | REWRITE | `packages/ingest-py/db.py` | SQLite → Postgres. Drop sqlite3 import. |
| `src/diff.py` | REUSE | `packages/spine/events/diff.py` | Add tenant scoping. |
| `src/metrics.py` | REUSE | `packages/spine/metrics.py` | Add tenant scoping. |
| `src/validate.py` | REUSE | `packages/spine/eval/validate.py` | Foundation for eval harness. |
| `src/export_json.py` | RETIRE | — | Static JSON export. Platform serves dynamic API instead. |
| `tools/verify_feeds.py` | REUSE | `packages/ingest-py/tools/verify_feeds.py` | Useful operations tool. |
| `entities.yaml` | REUSE | `packages/spine/sources/default-registry.yaml` | Default source registry. |
| `goldset.csv` | REUSE | `packages/modules/framing-pej/goldset.csv` | Eval data. |
| `schema.sql` | REFERENCE | — | Merged ideas into `infra/schema.sql` already. |
| `docs/framing-coding-guide.md` | REUSE | `packages/modules/framing-pej/README.md` | The PEJ codebook. |
| `docs/dashboard-design-brief.md` | REFERENCE | — | UI design inspiration. |
| `docs/frontend-rebuild-spec.md` | REFERENCE | — | Confirms our prior decision: Next.js > Vite static. |
| `docs/agents/*` | REUSE | `docs/agents/*` (selective) | Agent skill docs; port the issue-tracker + triage. |

### Dual UI layers (both retire)

| Path | Tag | Notes |
|------|-----|-------|
| `dashboard/app.py` | RETIRE | Streamlit; replaced by Next.js `apps/web`. |
| `web/index.html` | RETIRE | Vite shell; replaced by Next.js. |
| `web/package.json` | RETIRE | Vite + React 18. Next.js stack now. |
| `web/vite.config.js` | RETIRE | Same. |
| `web/src/App.jsx` | REFERENCE | UI design reference for entity profile pages. |
| `web/src/views.jsx` | REFERENCE | UI design reference for story-leads view. |
| `web/src/components.jsx` | REFERENCE | Components were small; will rebuild in shadcn. |
| `web/src/tweaks-panel.jsx` | REFERENCE | Admin panel pattern. |
| `web/src/styles.css` | RETIRE | Tailwind in new stack. |
| `web/public/data/entities.json` | REUSE | Bootstrap source registry for `tier='global_benchmark'` and `tier='peer'`. |
| `web/public/data/entity/*.json` | REFERENCE | 36 entity files (Hindu, ToI, NDTV, etc.). Use as Y1 seed examples. |
| `web/public/data/framing.json` | REFERENCE | Sample framing fingerprint output. |
| `web/public/data/story_leads.json` | REFERENCE | Sample story-leads feed output. |
| `web/public/data/landscape.json` | REFERENCE | Sample. |
| `web/public/data/meta.json` | REFERENCE | Sample. |

### Data

| Path | Tag | Notes |
|------|-----|-------|
| `data/news_intel.db` | REFERENCE | 3 MB SQLite. Useful for local dev seed. Do not migrate the schema as-is. |

---

## 2. `~/projects/editorial-intelligence-demo`

Next.js 16 demo. The repo at this path is a small, current demo (5 component files, simple data JSON). The substantive code lives in `~/Desktop/eip-handover.zip`, which contains the EIP donor handover and many more files.

### Current `editorial-intelligence-demo/`

| Path | Tag | Destination | Notes |
|------|-----|-------------|-------|
| `package.json` | REFERENCE | — | Next 16, React 19, shadcn 4, Tailwind 4. Modern stack — copy versions into `apps/web/package.json`. |
| `tsconfig.json` (implicit) | REUSE | `apps/web/tsconfig.json` | Strict TS settings. |
| `app/layout.tsx` | REUSE | `apps/web/app/layout.tsx` | Adapt for multi-tenant. |
| `app/page.tsx` | REUSE | `apps/web/app/page.tsx` | Landing entry. |
| `app/globals.css` | REUSE | `apps/web/app/globals.css` | Tailwind v4 base. |
| `app/pipeline/page.tsx` | REUSE | `apps/web/app/(admin)/pipeline/page.tsx` | Pipeline status view. |
| `app/reporter/page.tsx` | REUSE | `apps/web/app/(journalist)/feed/page.tsx` | Journalist feed. Multi-tenant adaptation. |
| `app/reporter/layout.tsx` | REUSE | `apps/web/app/(journalist)/layout.tsx` | Same. |
| `app/reporter/signal/[id]/page.tsx` | REUSE | `apps/web/app/(journalist)/signal/[id]/page.tsx` | Signal detail. |
| `app/editor/page.tsx` | REUSE | `apps/web/app/(editor)/page.tsx` | Editor dashboard. |
| `app/api/auth/route.ts` | REWRITE | `apps/web/app/api/auth/[...nextauth]/route.ts` | Real multi-tenant auth. |
| `components/ui/*.tsx` | REUSE | `apps/web/components/ui/*` | shadcn primitives. |
| `components/reporter/NavBar.tsx` | REUSE | `apps/web/components/journalist/NavBar.tsx` | |
| `components/reporter/SignalCard.tsx` | REUSE | `apps/web/components/signal/SignalCard.tsx` | Core list item. |
| `components/reporter/SignalDetail.tsx` | REUSE | `apps/web/components/signal/SignalDetail.tsx` | Detail view. |
| `components/reporter/OnboardingBanner.tsx` | REUSE | `apps/web/components/onboarding/Banner.tsx` | |
| `components/editor/*` | REUSE | `apps/web/components/editor/*` | |
| `components/pipeline/*` | REUSE | `apps/web/components/admin/pipeline/*` | |
| `data/signals.json` | REUSE (dev only) | `apps/web/dev-fixtures/signals.json` | Local-dev seed. |
| `data/trending.json` | REUSE (dev only) | `apps/web/dev-fixtures/trending.json` | Local-dev seed. |
| `EIP-Presentation.pdf` / `.pptx` | REFERENCE | — | Sales artifact. |
| `build-pptx.js` | RETIRE | — | One-off generator. |

### `eip-handover.zip` extracted (`.scratch/eip-handover/`)

This archive holds the larger EIP build. Higher-value reuse but also confidential material.

| Path | Tag | Notes |
|------|-----|-------|
| `premortem.md` | REFERENCE | Already digested in Mon notes. |
| `pitch.md` | REFERENCE | Sales narrative. |
| `handover.md` | REFERENCE | Architecture-decision retrospect. |
| `skills.md` | REFERENCE | Five-registry extensibility model — anchors our ADR 0006 amendment. |
| `DEPLOY.md` | REFERENCE | Deployment notes. |
| `MCP_SERVER.md` | REFERENCE | MCP exposure of adapters — interesting Y2+. |
| `app/onboarding/page.tsx` | REUSE | `apps/web/app/(journalist)/onboarding/page.tsx` | Three-question onboarding. |
| `app/pulse/page.tsx` | REUSE | `apps/web/app/(editor)/pulse/page.tsx` | Newsroom Pulse. |
| `app/journalists/page.tsx` | REUSE (template) | `apps/web/app/(admin)/journalists/page.tsx` | Multi-tenant version. |
| `app/journalists/[slug]/view.tsx` | REUSE | Same scope. | |
| `app/data/page.tsx` | REUSE | `apps/web/app/(admin)/sources/page.tsx` | Source admin. |
| `lib/db.ts` (better-sqlite3) | RETIRE | Replaced by Postgres + Drizzle/Prisma in spine. |
| `lib/source-adapter.ts` | REUSE | `packages/spine/adapters/SourceAdapter.ts` | The adapter contract pattern. ADR 0007 anchor. |
| `lib/sources/*` | REUSE (selective) | `packages/ingest-py/adapters/*` | 15 adapters. Port Python-side where possible. |
| `lib/cause-list/` | REUSE | `packages/modules/courts-cause-list/` | Y2 module candidate. |
| `lib/state-catalogue.ts` | REUSE | `packages/spine/catalogues/states-india.ts` | 28 states + 8 UTs. Public data. |
| `lib/rera-catalogue.ts` | REUSE | `packages/spine/catalogues/rera-india.ts` | 32 state RERA portals. Public. |
| `lib/international-catalogue.ts` | REUSE | `packages/spine/catalogues/international.ts` | 20 embassies + multilaterals. |
| `lib/anthropic.ts` | REWRITE | `packages/spine/llm/anthropic.ts` | Adapter contract, no business logic. |
| `lib/iptc.ts` | REUSE | `packages/spine/catalogues/iptc-media-topics.ts` | IPTC codes — public. |
| `lib/cloudflare-fetch.ts` | REUSE | `packages/ingest-py/fetch/cloudflare.py` | Two-tier (headers → Playwright). Real combat code. |
| `lib/scoring.ts` | REWRITE | `packages/spine/scoring/trend.ts` | Percentile-mapped trend_score. |
| `lib/hindu-coverage.ts` | RETIRE | Newsroom-specific (NewsAPI + Google News for Hindu coverage check). Out of scope. |
| `lib/teams.ts` | REFERENCE | Teams webhook poster. Replace with platform-native delivery channels. |
| `lib/sarvajna-stub.ts` | RETIRE | Hindu's internal vector store — replaced by pgvector. |
| `data/seed.db` | REFERENCE | 267 signals + 166 sources. Useful for local-dev seed shape. |
| `data/signals.json` | REFERENCE | 12 hand-crafted demo rows. |
| `data/journalists.json` | **CONFIDENTIAL** | 501 named Hindu journalists with emails + bureaus. **Do not carry.** |
| `data/trending.json` | RETIRE | Scenario fixtures. |
| `data/state-catalogue.json` | REUSE | Public data. |
| `data/rera-catalogue.json` | REUSE | Public data. |
| `data/international-catalogue.json` | REUSE | Public data. |
| `data/sources.config.json` | REUSE (review) | 60 sources. Verify each is generic + relevant before importing. |
| `data/schedule.json` | REUSE (template) | Cadence config schema. |
| `mcp-server/*` | REFERENCE | Adapter-as-MCP-tool. Y2 distribution play. |
| `scripts/build-seed-db.ts` | REUSE (template) | Pattern for local-dev seed. |
| `proxy.ts` | RETIRE | One-off proxy. |
| `EIP-Board-Deck.pptx` | REFERENCE | Pitch reference. |

---

## 3. `~/Data Protection/discover-dashboard`

The "Newsroom Intelligence Dashboard" (NID) — internal name "Dhristi". Python + Streamlit, ~2700-line `dashboard/app.py`. Founder-confirmed clean IP. Target arch (React + FastAPI + Postgres) declared in CLAUDE.md but not built.

### Scoring + analysis (core reusable)

| Path | Tag | Destination | Notes |
|------|-----|-------------|-------|
| `predict/scorer.py` | REUSE | `packages/scoring-py/discover/scorer.py` | Composite Discover score: 0.40 trend momentum + 0.30 content alignment + 0.20 domain authority + 0.10 freshness. Title guard at word boundary. |
| `analyze/scoring_utils.py` | REUSE | `packages/scoring-py/discover/utils.py` | |
| `analyze/channel_scorer.py` | REUSE | `packages/modules/discover-seo/scoring.py` | Discover / News / Search surface scoring. |
| `analyze/seo_eeat.py` | REUSE | `packages/modules/discover-seo/eeat.py` | SEO + E-E-A-T audit engine. Accepts `Story` dataclass. |
| `analyze/sqeg.py` | REUSE | `packages/modules/discover-seo/sqeg.py` | SQEG (YMYL / Page Quality / Needs Met). |
| `analyze/recirculation.py` | REUSE | `packages/modules/recirculation/scoring.py` | Reader-behaviour engine. |
| `analyze/__init__.py` | REUSE | `packages/modules/discover-seo/__init__.py` | |

### Data fetchers

| Path | Tag | Destination | Notes |
|------|-----|-------------|-------|
| `data/fetcher.py` | REUSE | `packages/ingest-py/protocols.py` | `Story`, `Trend` dataclasses + `StoryFetcher`, `TrendFetcher` protocols + `FetchError`. ADR 0009 anchor. |
| `data/pipeline.py` | REWRITE | `packages/ingest-py/pipeline.py` | 30-min pickle cache → Postgres-backed cache. Remove `asdict()` migration artefact. |
| `data/rss_fetcher.py` | REUSE | `packages/ingest-py/fetchers/rss.py` | The Hindu + Google News RSS. Note: 403 from Cloudflare → graceful empty list. |
| `data/newsapi_fetcher.py` | REUSE | `packages/ingest-py/fetchers/newsapi.py` | Requires `NEWS_API_KEY`. Optional. |
| `data/trends_fetcher.py` | REUSE | `packages/ingest-py/fetchers/pytrends.py` | Google Trends via pytrends. Rate-limited. YouTube enrichment inside (AD-008). |
| `data/gdelt_fetcher.py` | REUSE | `packages/ingest-py/fetchers/gdelt.py` | Domain topic authority. |
| `data/youtube_fetcher.py` | REUSE | `packages/ingest-py/fetchers/youtube.py` | No key; capped at 5 topics. |
| `data/gsc_fetcher.py` | REUSE | `packages/ingest-py/fetchers/gsc.py` | OAuth2 desktop flow. Per-newsroom GSC integration. |
| `data/keywords_fetcher.py` | REUSE | `packages/ingest-py/fetchers/keywords.py` | Wraps KE client. |
| `data/ke_client.py` | REUSE | `packages/ingest-py/fetchers/ke_client.py` | Keywords Everywhere API. Falls back to pytrends. |
| `data/ai_queries_fetcher.py` | REUSE | `packages/modules/ai-visibility/fetcher.py` | AI search probe. |
| `data/local_trends.py` | REUSE | `packages/modules/trends-local/fetcher.py` | State/city trend signals. |
| `data/performance_log.py` | REUSE | `packages/scoring-py/performance/log.py` | |
| `data/performance_log.json` | REFERENCE | — | Sample performance data. |
| `data/gem_finder.py` | REUSE | `packages/modules/hidden-gems/finder.py` | Hidden-gems module. |
| `data/eip_fetcher.py` | REFERENCE | — | EIP integration adapter. May be Hindu-specific. |
| `data/amplitude_client.py` | RETIRE | — | Deprecated per NID-HANDOFF. Piano MCP replacing. |
| `data/__init__.py` | REUSE | | |

### UI + scheduling

| Path | Tag | Notes |
|------|-----|-------|
| `dashboard/app.py` | RETIRE | 160 KB Streamlit; replaced by Next.js. |
| `scheduler.py` | REFERENCE | Job-scheduling sketch. We will use a different pattern (Postgres jobs table). |
| `append_scoring_detail.py` | REFERENCE | Documentation tool. |
| `gen_scoring_doc.py` | REFERENCE | Documentation tool. |
| `Discover_Dashboard_Scoring_Mechanisms.docx` | REFERENCE | Full scoring methodology. |

### Docs

| Path | Tag | Notes |
|------|-----|-------|
| `CLAUDE.md` | REFERENCE | Target arch + design rules. Six ADRs to harvest. |
| `CONTEXT.md` | REFERENCE | Ten ADRs documented. Six to harvest into platform ADRs 0009–0014. |
| `README.md` | REFERENCE | |
| `docs/NID-HANDOFF.md` | REFERENCE | The 7-tab handover. Useful map of what each module measures. |
| `docs/PRD-phase-1.md` | REFERENCE | Phase 1 PRD. |
| `docs/agents/*` | REUSE (selective) | Issue-tracker + triage label specs. Already aligned with platform. |

### Config

| Path | Tag | Notes |
|------|-----|-------|
| `config.example.py` | REUSE (template) | Becomes per-newsroom config schema seed. |
| `config.py` | **CONFIDENTIAL** | Contains API keys (per spec, blanked locally). Do not commit. |
| `requirements.txt` | REFERENCE | Python dep list (see risky-deps below). |
| `setup.sh` | REFERENCE | Local setup pattern. |
| `.cache.pkl` | RETIRE | Pickle cache; Postgres replaces. |

---

## 4. `~/projects/journalism agents`

Docs-only. All twelve files are REFERENCE for the strategy + scorecard layer.

| Path | Tag | Notes |
|------|-----|-------|
| `docs/founder_honest_assessment.md` | REFERENCE | Tool scorecard — canon for skip/use decisions. |
| `docs/hindu_implementation_priority.md` | REFERENCE | Hindu-specific (pre-scorecard). |
| `docs/integrated_vision_complete.md` | REFERENCE | OJ.in publication vision, not product. |
| `docs/onlinejournalism_platform_rethink.md` | REFERENCE | OJ.in workbench design wisdom. |
| `docs/newsroom_agentic_stack_toolkit.md` | REFERENCE | 145-tool catalogue (scorecard already filtered). |
| `docs/agentic_task_orchestration_FINAL.md` | REFERENCE | Orchestration design. |
| `docs/digital_news_desk_intelligence.md` | REFERENCE | |
| `docs/onlinejournalism_week_by_week.md` | REFERENCE | |
| `docs/temporal_event_extraction_calendar_NEW.md` | REFERENCE | |
| `docs/skill_platform_layer_NEW.md` | REFERENCE | |
| `docs/tool_scorecard.md` | REFERENCE | |
| `docs/MASTER_INDEX_complete_vision.md` | REFERENCE | |
| `docs/agents/*` | REUSE (selective) | Agent skill specs. |

---

## 5. `~/projects/Goldrush`

PHP newsroom resource management (attendance, duty, inventory, staff, users, webhook). 21 files. Out of MVP scope; tagged as a future Y2 module.

| Path | Tag | Notes |
|------|-----|-------|
| All PHP files | DEFER | Y2 module candidate: newsroom resource management. Will rewrite in TS, not port PHP. |
| `setup.sql` | REFERENCE | Schema design reference for Y2 module. |
| `.htaccess` | RETIRE | Apache config; OnlineJourno hosts on Fly.io / Render. |
| `assets/*` | RETIRE | UI rebuilt in Next.js + shadcn. |

---

## 6. `~/projects/subscriptions`

Empty directory. RETIRE.

---

## 7. `~/Desktop/EIP-Tour/`

| Path | Tag | Notes |
|------|-----|-------|
| `EIP-pitch.html` | REFERENCE | Pitch HTML. Copy informs marketing site. |
| `EIP-pitch.pdf` | REFERENCE | |
| `tour.html` | REFERENCE | Interactive tour. UX inspiration. |
| `assets/*` | REVIEW | Some logos/illustrations may be reusable; check Hindu-branding. |

---

## 8. `~/Documents/TH Analytics/`

| Path | Tag | Notes |
|------|-----|-------|
| Drishti briefing PDFs (multiple) | REFERENCE | Brief format quality bar. Use as voice + structure reference for `brief-composer` agent. |

---

## Cross-cutting reusable assets

These data files are pure public information and are reused across modules.

| Asset | Source | Destination |
|-------|--------|-------------|
| 28 Indian states + 8 UTs + districts | EIP `lib/state-catalogue.ts` | `packages/spine/catalogues/states-india.ts` |
| 32 state RERA portals | EIP `lib/rera-catalogue.ts` | `packages/spine/catalogues/rera-india.ts` |
| 20 embassies + multilaterals | EIP `lib/international-catalogue.ts` | `packages/spine/catalogues/international.ts` |
| IPTC Media Topic codes (17 top-level + ~80 sub) | EIP `lib/iptc.ts` | `packages/spine/catalogues/iptc-media-topics.ts` |
| 30-outlet entity registry (Indian + global) | news-intel `web/public/data/entities.json` | `packages/spine/sources/default-registry.yaml` (merge) |
| PEJ framing codebook + 13 frames + groups | news-intel `docs/framing-coding-guide.md` | `packages/modules/framing-pej/codebook.md` |
| Deuze typology | news-intel `SPEC.md` §6 | `packages/spine/catalogues/deuze-types.ts` |

---

## Risky dependency inventory

Survey of every notable third-party dependency across the existing code. Risk grade applies a premortem #17 lens (maintenance status, vendor capacity, bus factor).

### Python deps

| Dep | Source repo | Risk | Action |
|-----|-------------|------|--------|
| `anthropic` | news-intel | Low | Adapter layer (`packages/spine/llm/anthropic.ts`). Per-newsroom cost-tagged usage. |
| `feedparser` | both | Low | Maintained. Wrap in adapter. |
| `requests` | both | Low | Standard. |
| `beautifulsoup4` + `lxml` | both | Low | Standard. |
| `trafilatura` | news-intel | Low–Med | Active maintenance; news-article extraction. Wrap. |
| `streamlit` | both | High | Retire — wrong product surface. |
| `PyYAML` | news-intel | Low | Standard. |
| `pandas` + `numpy` | both | Low | Standard. |
| `scikit-learn` | discover | Low | Used in TF-IDF cosine. Keep. |
| `plotly` | discover | Low | Streamlit dependency; retires with Streamlit. |
| `pytrends` | discover | **Med–High** | Unofficial scraper of Google Trends. Brittle. Wrap behind adapter; document fallback if API breaks. |
| `python-dotenv` | both | Low | Standard. |
| `google-auth*` + `google-api-python-client` | discover | Med | Per-newsroom OAuth flows are heavy. GSC integration is opt-in module. |

### Node/TS deps (EIP handover)

| Dep | Source | Risk | Action |
|-----|--------|------|--------|
| `next` 16, `react` 19 | EIP demo | Low | Adopt. |
| `@base-ui/react` | EIP demo | Low | shadcn family. |
| `tailwindcss` 4 | EIP demo | Low | Adopt. |
| `lucide-react` | EIP demo | Low | Adopt. |
| `better-sqlite3` | EIP handover | **High** | Retire. Postgres-only. |
| `playwright` (via cloudflare-fetch) | EIP handover | Med | Heavy dep. Behind two-tier fetch contract — only loaded when first tier fails. |
| Anthropic SDK | EIP handover | Low | Adopt with adapter. |

### Vendor / external services

| Service | Used by | Status | Action |
|---------|---------|--------|--------|
| Anthropic Claude API | both | Active | Production dependency. Adapter. Per-newsroom cost cap. |
| Geneea NLP | EIP design only | Commercial, paid | **Defer.** No MVP need. Re-evaluate Wk 9+ when archive / framing modules ship. |
| Sarvajna (Hindu in-house vector store) | EIP design | Internal to Hindu | **Inapplicable.** OnlineJourno uses pgvector. |
| Cue CMS (Escenic) | EIP design | Vendor | **Inapplicable** — OnlineJourno does not embed in customer CMS in Y1. |
| Amplitude | discover-dashboard (deprecated) | Deprecated | Retire. |
| Piano | discover-dashboard (planned via MCP) | Vendor | Defer Y2+ (subscription intelligence module). |
| NewsAPI | discover | Paid | Optional per-newsroom. |
| Keywords Everywhere | discover | Paid | Optional per-newsroom. |
| Google Search Console | discover | Free w/ OAuth | Opt-in module. OAuth complexity flagged. |
| GDELT | discover | Free | Adopt. |
| Google Trends (pytrends) | discover | Unofficial | Brittle; flagged High risk. |

### Dormant / cautionary references (from EIP skills.md)

| Project | Status | OnlineJourno stance |
|---------|--------|---------------------|
| OCCRP Aleph | Dormant since ~2023 | Do not adopt. EIP composed MinIO + Tika + Tesseract instead. |
| OpenAleph fork | Volunteer | Do not adopt. |

---

## Confidentiality flags (do not carry)

- `eip-handover/data/journalists.json` — 501 named Hindu journalists, emails, bureaus.
- `discover-dashboard/config.py` — API keys (already blanked locally; keep gitignored).
- Hindu-specific source URLs that reveal internal practice (review case by case before importing).
- Anything referring to "Sarvajna", "Cue", "Dhristi" as Hindu IP — keep concepts, drop names.
- Anything referring to "THGP" or "The Hindu Group" branding.

---

## ADR triggers for Wk 1

Decisions surfaced by this audit that need ADRs (in addition to the 5 plan additions from Mon notes):

| Proposed ADR | What it decides | Source |
|--------------|-----------------|--------|
| **0007 Adapter contracts on every external dep** | Already planned from Mon notes. Reinforced — EIP handover uses this pattern (`SourceAdapter` interface, `lib/anthropic.ts` adapter, `lib/teams.ts`, `lib/sarvajna-stub.ts`). | Mon notes + skills.md §9 |
| **0008 Module auto-deactivation policy** | Already planned. | Mon notes |
| **0009 Two protocols (Story + Trend), not one Fetcher** | Direct port from discover-dashboard AD-001. | discover-dashboard CONTEXT.md |
| **0010 Construction-time config; parameterless `fetch()`** | Direct port from discover-dashboard AD-003. | discover-dashboard CONTEXT.md |
| **0011 `FetchError` not silent `[]`** | Direct port from discover-dashboard AD-005. | discover-dashboard CONTEXT.md |
| **0012 Domain types past fetcher seam** | Direct port from discover-dashboard AD-009. No raw `rss_entry` leaks. | discover-dashboard CONTEXT.md |
| **0013 Design-system tokens — no bare hex or px** | Port AD-010 to TS / Tailwind. Define `theme.ts` from Day 1. | discover-dashboard CONTEXT.md |
| **0014 Plug-in five-registry extensibility** | Sources, skills, beats, triggers, capabilities as DB rows + manifest-driven plugin discovery. Amends ADR 0006. | EIP skills.md §4 |
| **0015 Catalogues live in spine, not modules** | Public-data catalogues (states, RERA, IPTC, Deuze) shared across modules. | This ledger §Cross-cutting |
| **0016 Two-tier fetch: headers first, Playwright fallback** | Cloudflare-aware fetch pattern, port from EIP `lib/cloudflare-fetch.ts`. | EIP handover |

---

## Migration sequence (Wk 1 first cuts)

Order in which ported code should arrive in the new repo, lowest-risk first:

1. **Wk 1 Mon**: Spine scaffolding + ADRs 0007–0016 + auth scaffold.
2. **Wk 1 Tue**: Catalogues (states, RERA, international, IPTC). Pure data, no logic risk.
3. **Wk 1 Wed**: `packages/ingest-py/protocols.py` (Story, Trend, FetchError, StoryFetcher, TrendFetcher). Foundation for everything else.
4. **Wk 1 Thu**: Port `collect_rss.py` + `rss_fetcher.py`. Confirms Python worker + Postgres write path.
5. **Wk 1 Fri**: First end-to-end thread — one source ingest → Postgres → minimal Next.js view. The "hello world" of the platform.
6. **Wk 2**: Port remaining collectors and the framing coder.
7. **Wk 3+**: Brief composer agent and editorial DNA capture.

---

## Open questions for Fri reconcile

1. Does `eip-handover/lib/sources/*` (15 source adapters) include anything specific to Indian markets/regulatory? If yes, those map directly into the MVP source list.
2. Is `eip-handover/data/sources.config.json` (60 sources) public-data-only, or does it embed Hindu-specific paths? Review row-by-row.
3. The two-tier fetch (`cloudflare-fetch.ts`) — does it use a paid Playwright proxy service, or self-hosted Playwright? Affects ops cost.
4. `eip-handover/scripts/build-seed-db.ts` — does it bootstrap a fully-functional demo DB? If yes, the equivalent for OnlineJourno is a useful Day-1 dev experience.
5. Hindu's `Sarvajna` was the EIP's primary vector store; OnlineJourno uses `pgvector`. Is there any embedding-model standardisation we should adopt from that work?

---

## Counts

- Total existing files inventoried: ~300+
- Tagged REUSE: ~80
- Tagged REWRITE: ~12
- Tagged REFERENCE: ~120
- Tagged RETIRE: ~25
- Tagged CONFIDENTIAL (do not carry): ~5
- Tagged DEFER (Y2 module): ~21 (Goldrush)

Net: enough proven code in REUSE + REWRITE to build a credible MVP in Wk 1–8 without writing collectors, scorers, or Next.js scaffolding from scratch. The biggest single porting risk is `dashboard/app.py` (160 KB Streamlit) — but it RETIREs entirely; we keep only the scoring lib it sits on.
