# OnlineJourno Editorial Optimisation Platform — Design Spec

**Product:** OnlineJourno Editorial Optimisation Platform
**Tagline:** From a Journalist, for Journalists
**Status:** Design — approved in brainstorming, pre-plan
**Date:** 2026-06-21
**Owner:** Subhash Rai (OnlineJourno)

---

## 1. Intent

A **standalone, vendor-neutral, downloadable** tool that any newsroom — big or small — grabs from GitHub, points at its own site, and uses to **optimise its stories across every discovery surface**: Google Discover, Search, News, AI Overviews, generative-AI answer engines (ChatGPT/Perplexity/Gemini), YouTube, and any surface the newsroom adds.

It listed under "Projects" on onlinejourno.com. It is **fully independent and self-contained**: it runs for newsrooms that do **not** use the hosted OnlineJourno Platform, and it has **no inter-project dependencies whatsoever** — the scoring engine is **vendored into the repo** (`src/onlinejourno_scoring/`), not consumed as a shared package. A newsroom clones it and runs it alone (all deps are public PyPI). (See the Architecture update in §4.)

Lineage: the scoring brain is ported and decoupled from an earlier single-tenant Streamlit prototype into `packages/scoring-py`. **Brand-neutrality is a hard rule:** no outlet — including any demo origin — is named or hardcoded anywhere: not in source, config defaults, fixtures, tests, or docs. All examples use fictional outlets (e.g. `meridian.example`).

Every score and finding must **teach the journalist** — show the *why* and the *how to fix*, not just a number. (Ground-up principle.)

---

## 2. Goals & success criteria

A newsroom can:

1. **Download and run in minutes** — `docker compose up`, open localhost, complete a first-run wizard that writes a `newsroom.yaml`. No platform account, no Postgres, no API key required for the core.
2. **Audit any story by URL** and get, per configured surface: a readiness score, the SEO/E-E-A-T findings (Google QRG-based), a Schema.org check **with corrected JSON-LD suggested**, Core Web Vitals, and a prioritised, effort/impact-ranked fix list — each with a plain-language *why*.
3. **See beat-scoped trending topics** enriched with Wikidata entities, with Interest-Trajectory and Topic-Momentum charts, and each topic's surface affinity.
4. **Configure surfaces, sources, beats, market, and connectors** through config + UI, with **no hardcoded outlet** anywhere.
5. **Connect its existing tools easily** — inbound (RSS, sitemap, GSC, CMS read adapters) and outbound (REST API, opt-in MCP server).
6. **Opt into an AI tier** by adding an LLM provider of its choice (no privileged vendor; local/Ollama supported) to unlock the 8 User Needs classification, LLM Schema suggestions, and the agentic GEO/SEO assistant.

**Done means:** the v1 Core loop above works end-to-end on a real newsroom site, keyless; the AI tier lights up cleanly when a key is added; CI is green including a Core Web Vitals budget gate; and the tool ships as a public Apache-2.0 repo with onboarding docs.

---

## 3. Non-goals (v1) / YAGNI

- **Not** multi-tenant. One newsroom per install. (Multi-tenant is the hosted platform's job.)
- **Not** a CMS replacement. Read-only adapters only; never writes to the newsroom's CMS.
- **Deferred to phase 2:** Hidden Gems, Domain Intelligence, Subscription Strategy, Local Pulse (IA-depth + crawl-budget integration), webhooks, embeddable CUE-style widget.
- **No** archive/RAG, no pgvector, no auth/RBAC in v1 (single-user local tool).
- **No** bespoke design system — adopt the existing OnlineJournalism.in / platform tokens verbatim.

---

## 4. Relationship to the OnlineJourno Platform

| Concern | This tool (standalone) | Hosted Platform |
|---------|------------------------|-----------------|
| Tenancy | Single newsroom | Multi-tenant (row-level) |
| Store | SQLite default / Postgres optional | Postgres + pgvector |
| Scoring brain | **vendored** into the repo (`src/onlinejourno_scoring/`) | its own in-tree `packages/scoring-py` |
| Surfaces | Config-driven registry from `newsroom.yaml` | DB registry per tenant (ADR 0043) |
| AI tier | `ai-tier` package (store-pluggable, decoupled `agents-py`) | `agents-py` on Postgres |
| Distribution | Public GitHub, download & run | Hosted at app.onlinejourno.com |

**Architecture update (2026-06-23) — self-contained products, no shared core.** The earlier "shared core, no fork" plan is **superseded**. Per the product principle (each product independently downloadable + installable, **zero inter-project dependencies**), the scoring engine is **vendored** into each product: editorial-optimiser carries its own copy at `src/onlinejourno_scoring/` (all deps public PyPI), and the platform keeps its own in-tree `packages/scoring-py`. A standalone repo `onlinejourno/onlinejourno-scoring` (private, v0.1.0) is **kept as the canonical upstream to vendor from**, but nothing depends on it at runtime. **Trade-off accepted:** the engine is duplicated per product and must be re-vendored when it changes — the deliberate cost of fully independent products.

**Upstream work:** the one piece of `agents-py` reuse the AI tier needs — decoupling it from Postgres into a store-pluggable form — is done **upstream in the platform repo** so both products benefit and drift is avoided. (Confirmed default; revisit only if coordination cost proves too high, in which case vendor a copy.)

---

## 5. Architecture

### 5.1 Repo shape

New **public** repo, Apache-2.0, "Projects" family. Working name `editorial-optimiser` (final name TBD).

```
onlinejourno/editorial-optimiser
  apps/
    api/      FastAPI — wraps onlinejourno-scoring (+ optional AI tier); REST + opt-in MCP
    web/      Next.js (App Router, RSC) — friendly, CWV-grade, single-newsroom UI
  packages/
    ai-tier/      decoupled agents (8-needs · distribution-fit · schema-suggest), store-pluggable
    connectors/   light ingest: RSS · sitemap · GSC · Wikidata · Trends · YT · KE · CMS-read (no Postgres)
  newsroom.example.yaml
  docker-compose.yml      `docker compose up` → open localhost
  .env.example            optional: LLM provider+key · GSC creds · KE key
  store/                  SQLite (default) | Postgres (optional)

  src/onlinejourno_scoring/   vendored engine — no external dep (all deps public PyPI)
```

### 5.2 Two tiers (the locked "hybrid" decision)

- **Tier 0 — keyless, always on.** Trends, configurable surface scoring, audit (SEO/E-E-A-T via QRG/SQEG), CWV, Schema *detect*, rule-based fix advice, rule-based Schema *templates*, heuristic user-need read. Runs on `docker compose up` with no keys.
- **Tier 1 — lights up with an LLM key.** Real BBC-Smartocto 8 User Needs (`need_mix`), LLM Schema *suggestion*, agentic GEO/SEO assistant. **Provider-agnostic, no default vendor** (ADR 0040); local/Ollama supported.

### 5.3 Stack & runtime

- Backend: **FastAPI** (Python) wrapping `onlinejourno-scoring` + `ai-tier`.
- Frontend: **Next.js** (TypeScript, App Router + RSC) — CWV-grade.
- Store: **SQLite** default (zero-install, file-based); **Postgres** optional via the same store interface.
- Packaging: **Docker Compose** one-liner (primary, journalist-friendly) + from-source path (devs).
- Config: `newsroom.yaml` + `.env`.

---

## 6. Components (bounded units)

Each unit has one purpose, a clear interface, and is testable alone.

| Unit | Responsibility | Tier | Interface (sketch) | Reuse/new |
|------|----------------|------|--------------------|-----------|
| `config` | Load + validate `newsroom.yaml`/`.env` → typed config. **Zero hardcoded outlet.** Fail-fast on bad config. | 0 | `load() -> Config` | new (thin) |
| `connectors` | Uniform source adapters: RSS, sitemap, GSC, Trends, Wikidata, YouTube, KE, CMS-read. | 0 | `fetch() -> list[Signal|Story]`; raises `ConnectorError` | mostly reuse; Wikidata + CMS-read new |
| `scoring-core` | Thin adapter over `onlinejourno-scoring`: audit, sqeg, channels (surfaces), cwv, potential, advisory, affinity, signals_radar. Surface-driven from config. Pure/deterministic. | 0 | `audit(story, surfaces) -> StoryReport` | **reuse** |
| `schema-suggester` | Detect structured-data state + story type → emit suggested JSON-LD + diff. T0 = deterministic templates per type; T1 = LLM refine. | 0/1 | `suggest(story) -> SchemaSuggestion` | new |
| `ai-tier` | 8 User Needs (`need_mix`), agentic GEO/SEO assistant. Gated on LLM key; degrades to heuristic when absent. Store-pluggable. | 1 | `classify_needs(...)`, `assist(...)` | reuse (decouple `agents-py`) |
| `store` | Persistence: signals, stories, reports, history. SQLite default / Postgres optional. | 0 | `save/get` behind one interface | new (thin) |
| `api` | FastAPI orchestration + opt-in MCP server exposing audit/trends/surface-score/schema-suggest as tools. | 0 | `POST /audit` · `GET /trends` · `GET /surfaces` · `GET /report/{id}` | new |
| `web` | Next.js single-newsroom UI; report, trends, surfaces, settings, onboarding; **education layer**. | 0 | — | new |

---

## 7. Configuration model — `newsroom.yaml`

The vendor-neutral heart. Nothing about any outlet is hardcoded in source.

```yaml
outlet:
  name: "Acme News"                 # demo/placeholder only; never hardcoded in code
  domain: "acme.example"
  locale: en-IN
  market: IN

sources:
  rss: ["https://acme.example/feed", "https://news.google.com/rss/..."]
  sitemap: "https://acme.example/sitemap.xml"

surfaces:                           # configurable registry (ADR 0043), editable
  - google-discover
  - google-search
  - google-news
  - ai-overviews
  - chatgpt-search
  - perplexity
  - gemini
  - youtube
  # add-your-own: { id, label, signal-definition }

beats: [politics, cinema, business, sport]   # drives locale-relative, market-aware scoring

connectors:                         # easy to add; uniform contract
  - { type: rss,     url: "..." }
  - { type: sitemap, url: "..." }
  - { type: gsc,     creds_path: "..." }       # optional
  - { type: cms, kind: wordpress, base: "...", token: "..." }   # read-only adapter (ADR 0036)

llm:                                # Tier 1 — user chooses, NO privileged vendor
  provider: ""                      # claude | openai | gemini | mistral | ollama | custom
  endpoint: ""                      # for local / self-hosted / custom
  api_key: ${LLM_API_KEY}

integrations:                       # this tool is connectable BY newsroom tools
  api: true                         # REST
  mcp: false                        # expose as MCP tools (opt-in)
  webhooks: []                      # phase 2
```

Maps the brief: vendor-neutral · configurable surfaces · beats + market (market-aware, competitor-relative scoring) · connect-newsroom-tech · keyless-by-default · user-chosen LLM.

---

## 8. Surfaces registry

Surfaces are a **configurable, extensible registry**, not a hardcoded enum (ADR 0043). Built-in seeds ship enabled: Google Discover, Search, News, AI Overviews, ChatGPT Search, Perplexity, Gemini, YouTube. A newsroom adds/disables any. Each surface carries its own readiness-signal definition (checks + weights); the scorer iterates the **enabled** surfaces and explains each. Adding a content-only surface needs no code change; bespoke performance signals (e.g. GSC for Search/Discover) attach as connectors.

---

## 9. Connectivity (both directions — "newsroom tools connect easily")

**Inbound — their stack feeds the optimiser** (connector framework, ADR 0044). Adding a source = drop a connector + one config line; no core change. Ships: RSS, sitemap, GSC, Trends, Wikidata, YouTube, KE. **CMS read adapters** (WordPress, Escenic/CUE, Ghost, Arc) so a newsroom audits its own content with no copy-paste (read-only, ADR 0036).

**Outbound — their tools call the optimiser:**
- **REST API** (FastAPI).
- **MCP server** (opt-in) — exposes `audit`, `trends`, `surface-score`, `schema-suggest` as MCP tools so the newsroom's AI assistants/agents connect natively.
- **Webhooks + embeddable widget** (CUE-sidebar style) — seam designed now, built phase 2.

---

## 10. Data flow

```
A · Audit a story
  URL (or pick from sitemap/RSS)
    → connectors fetch page + signals (GSC if keyed)
    → scoring-core: audit + per-surface scores + CWV + advice      [Tier 0, keyless]
    → [Tier 1 if key] 8 User Needs · LLM schema-suggest · agent narrative
    → store report
    → web renders: per-surface scores · QRG findings · schema diff · fixes · the why

B · Find / shape stories
  beats + market (config)
    → Trends connector + Wikidata entities + YT/KE signals
    → signals_radar: momentum + surface affinity
    → web renders trend board: Interest-Trajectory + Topic-Momentum charts · surface affinity
```

---

## 11. LLM provider model (Tier 1)

**No default LLM; the newsroom chooses.** A thin provider-agnostic interface (`complete()` / `chat()`), with per-provider adapters (Claude, OpenAI, Gemini, Mistral, **Ollama/local**, custom endpoint). Configured in `newsroom.yaml` (`llm.provider`, `llm.endpoint`, key in `.env`). On first Tier-1 use the user selects a provider; nothing is assumed. Local/offline keeps Tier 1 possible with zero cost and zero vendor lock. (ADR 0040.)

---

## 12. Reuse vs net-new (v1 Core loop)

| Capability | Status | Where |
|------------|--------|-------|
| Trends & Signals (Trends/YT/KE/GDELT/AI-queries) | reuse | `scoring-py`: signals_radar · youtube · keywords_everywhere · gdelt · ai_queries |
| Configurable surface scoring | reuse | `scoring-py`: channels · affinity (ADR 0043) |
| Per-story Audit — SEO/E-E-A-T via QRG | reuse | `scoring-py`: audit · sqeg · seo_checks |
| Core Web Vitals | reuse | `scoring-py`: cwv |
| Fix advice | reuse + extend | `scoring-py`: advisory |
| Schema.org **detect** | reuse | `scoring-py`: seo_checks/sqeg |
| BBC-Smartocto **8 User Needs** | reuse (decouple) | `agents-py`: need_mix → store-pluggable |
| Schema.org **suggest** (corrected JSON-LD) | **net-new** | templates (T0) + LLM (T1) |
| Wikidata entity enrichment | **net-new** | new connector |
| Agentic GEO/SEO assistant | reuse (decouple) | `agents-py`: distribution_fit · client · prompts |
| App shell (FastAPI + Next.js + SQLite + Docker) | **net-new** | this repo |

---

## 13. Error handling & graceful degradation

| Failure | Behaviour |
|---------|-----------|
| No LLM key | Tier-1 features fall back to Tier-0 (heuristic needs, rule schema templates). Never hard-fail; UI shows "add a key to unlock". |
| Connector fails | Isolated. Typed `ConnectorError`, caught per-connector, logged, skipped. Report still renders; that source shows "unavailable". (= platform `_safe_fetch` pattern.) |
| LLM provider outage / rate-limit | Adapter retries with backoff; persistent failure → degrade to Tier-0 + non-blocking notice. Bounded timeouts. |
| Missing signal (e.g. no GSC) | Deterministic core still computes audit + surface scores; performance fields show "not connected". |
| Bad `newsroom.yaml` | Fail fast at boot; name the field and why. Never run half-valid. |
| Target site 403 / Cloudflare | Try → fall back → tell the user. Respect robots.txt + rate limits (good-citizen crawl). |
| Secrets | `.env` only. Never logged, never persisted to the store. |

---

## 14. Testing & robustness

- **Inherit `scoring-py`'s suite** — already deterministic + golden-tested.
- **Golden fixtures** — snapshot real article HTML → assert audit/surface/schema outputs stable (regression catch).
- **Connector contract tests** — recorded fixtures (`vcrpy`/`respx`); no live network in CI.
- **Degradation tests** — keyless path yields a full report; Tier-1-absent degrades, never crashes.
- **Schema-suggester tests** — per type (Article, NewsArticle, VideoObject, Interview); output validated via `extruct` / schema.org shape.
- **API contract tests** (FastAPI TestClient); **web e2e** (Playwright).
- **Core Web Vitals as a CI gate** — Lighthouse-CI budgets; pipeline fails if LCP/CLS/INP regress. (The tool that preaches CWV must pass CWV.)
- **Brand-neutrality gate** — a CI check greps source, config, fixtures, and docs for forbidden outlet strings (any demo origin and its domains); the build fails if any appear. Demo data and fixtures use fictional outlets only (e.g. `meridian.example`).
- **OSS tooling:** ruff + mypy (Py); eslint + tsc (TS); pytest + vcrpy; Playwright; Lighthouse-CI / web-vitals; pydantic / zod (config); extruct (schema validate); trafilatura (robust extraction); Renovate (deps).
- **CI:** GitHub Actions — lint → type-check → unit → contract → e2e → CWV budget → brand-neutrality grep.

---

## 15. UI / UX

**Adopt the OnlineJournalism.in / platform design system verbatim** (ADR 0013): broadsheet, journalist-coded, dense-not-heavy. Fonts: Playfair Display (display), Noto Serif (body), Source Sans 3 (UI). Palette: paper `#f0ece4`, ink `#1A1A1A`, brand green `#2D7A4F`, urgency red `#D32B2B`, amber `#b35d00`, warm rule `#d4cfc6`. Reuse platform `ui-kit` + `components/charts` (Plotly, ADR 0061) where extractable; else replicate via shared tokens. Single-newsroom (no tenant switcher).

**Screens (v1)** — mirror existing platform routes so it reads as one family:

| Screen | Mirrors | Does |
|--------|---------|------|
| Onboarding | `onboarding` | First-run wizard: point at site → pick surfaces · beats · market → optional keys. Writes `newsroom.yaml`. |
| Story Audit ⭐ | `story-analyser` | URL → per-surface scores · SEO/E-E-A-T (QRG) · Schema diff + suggested JSON-LD · CWV · 8 User Needs (T1) · prioritised fixes. |
| Trends / Signals | `trends` | Beat-scoped topics · Wikidata entities · Interest-Trajectory + Topic-Momentum charts · surface affinity · YT/KE. |
| Surfaces | `potential`/`scores` | Score across configured surfaces; manage the registry. |
| Settings | `admin` | Connectors · surfaces · LLM provider · keys — config as UI. |

**Education layer** (cross-cutting): every score/finding carries plain-language *what it means · why it matters · how to fix* — not a bare number. Surfaces teach the reporter.

**Core Web Vitals** (a constraint, not an aspiration): Next.js App Router + RSC, minimal client JS, image discipline; Lighthouse-CI budgets gate CI.

A faithful mockup of the Story Audit screen (platform tokens) was produced and approved during brainstorming.

---

## 16. Phasing

- **v1 — Core loop:** Trends & Signals (Wikidata) → configurable Surface scoring → per-story Audit (SEO/E-E-A-T QRG + Schema detect/suggest + 8 User Needs + CWV + fixes). Tier 0 keyless; Tier 1 opt-in. Docker one-liner, onboarding wizard, public repo.
- **Phase 2:** Hidden Gems · Domain Intelligence (external perception + internal strength→content impact) · Subscription Strategy · Local Pulse (IA-depth from sitemap/AI + crawl-budget tool integration) · webhooks · embeddable widget.

---

## 17. Open decisions (flag before/early in planning)

1. **Repo name** — `editorial-optimiser`? `optimise`? something else.
2. ~~Shared-core distribution~~ — **resolved (2026-06-23): vendored.** No external distribution; the engine is copied into the repo. Canonical upstream kept at `onlinejourno/onlinejourno-scoring`.
3. **`agents-py` decoupling** — confirmed default is upstream-in-platform; reconfirm at planning time.

---

## 18. References

- Repos: `onlinejourno/platform` (shared core, ADRs), `onlinejourno/news-crawl-budget-analyzer` (phase-2 Local Pulse integration).
- Packages: `packages/scoring-py` (`onlinejourno-scoring`), `packages/agents-py`, `packages/connectors` (new).
- ADRs: 0006 (module plugin), 0013 (design tokens), 0036 (CMS read-only), 0040 (LLM provider-agnostic), 0043 (configurable surfaces), 0044 (connector framework), 0045 (entity visibility), 0047 (fair-chance audit), 0049 (user-needs model), 0061 (charting/Plotly).
- Prior spec: `2026-06-14-seo-eeat-audit-port-design.md` (the audit port to scoring-py).
