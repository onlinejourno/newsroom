# Plan — Consolidation: three codebases → one trunk

**Status:** Draft 2026-06-07. How the front engine + back engine + spine become one OnlineJourno (PRODUCT.md, ADR 0042). No code yet — this is the blueprint.

## The three codebases

| Codebase | Stack | What it is | Role |
|----------|-------|-----------|------|
| **front engine** (`editorial-intelligence-demo`) | Next.js 16 (App Router, PWA) + SQLite + Claude | Collect (189 adapters / 8 families) → Analyse (entities, geo, IPTC) → Score (trend) → Alert (push, reporter PWA) + archive; reporter / editor / pulse surfaces; MCP server | **Trunk** |
| **back engine** (`discover-dashboard`) | Python (+ Streamlit dashboard) | Channel audit (Discover/News/Search), SEO/E-E-A-T/SQEG, GSC performance, hidden gems, subscription conversion, probity | folds in as the **distribution half** |
| **spine** (`platform`, this session) | Next.js + Postgres (RLS) + provider-agnostic agents (Python) + module system | multi-tenant tenancy, provider-agnostic agent runtime, module plugin system, m-framing-pej + goldset eval, design system | contributes its **spine pieces** |

## The trunk decision

**The front engine is the trunk** — it is the most complete, it carries the reporter-at-the-base (the PWA, the alert, the archive, the 189-adapter Collect), and it is already the Next.js app the product needs. The back engine and the spine fold into it. *Not* the other way round: we do not rebuild EIP on the markets-brief platform.

## Stack reconciliation (the real work)

| Concern | Front engine today | Target (trunk) | Why |
|---------|--------------------|----------------|-----|
| **Datastore** | SQLite (`better-sqlite3`) | **Postgres + RLS** (from the spine) | Multi-tenant is non-negotiable; SQLite is single-tenant. Migrate the front-engine schema onto the spine's Postgres tenancy. |
| **Enrichment LLM** | Claude direct (`lib/anthropic.ts`) | **Provider-agnostic** (ADR 0040) | A newsroom must bring its own LLM (incl. self-hosted). Route enrichment through the spine's provider seam. |
| **Distribution scorers** | — | **Python services/workers** (from the back engine) | discover-dashboard's `analyze/*` + `data/gsc_fetcher` are Python; run them as workers the Next.js app calls over HTTP/jobs (ADR 0002 TS↔Python boundary). |
| **Dashboard UI** | Streamlit (back engine) | **Retire** → Next.js pages | The Streamlit views become the editor / pulse / story-score surfaces in the one Next.js app. |
| **Modules** | code-driven adapters | **module plugin system** (ADR 0006) | Per-newsroom enable/config; the back-engine capabilities become `m-distribution-fit`, `m-probity`, `m-archive`, etc. |
| **Alerting** | Teams webhook | keep + generalise (email/push/webhook per tenant) | Reporter-on-phone is the heart; keep the channel adapters, make them per-tenant. |

## Phases

### Phase 0 — decide + scaffold the trunk
- Stand up the front engine (`editorial-intelligence-demo`) as the canonical web app in the OnlineJourno repo, behind the spine's Postgres tenancy + provider-agnostic agent runtime. Migrate its SQLite schema to a tenant-scoped Postgres schema. Vendor-neutralise (no masthead, OnlineJourno mark everywhere).

### Phase 1 — the front loop, multi-tenant
- Collect → Analyse → Classify → Score → Alert running per tenant on Postgres, enrichment provider-agnostic. The reporter PWA gets ranked, geo+beat-scoped signals.
- **`m-archive`** (pluggable): connector for a digitised archive; else online-source archival lookup. Replaces the single hard-wired archive stub.
- Localization: English-first, per-tenant output locale (ADRs 0018–0022).

### Phase 2 — fold in the back engine (distribution)
- Port `analyze/channel_scorer`, `seo_eeat`, `sqeg` + `data/gsc_fetcher`, `gem_finder` into the spine's Python (`scoring-py` / workers) as **`m-distribution-fit`** (per the existing m-distribution-fit plan) + **`m-probity`** (sensitive-story "handle with care", reader-rights) + subscription-fit.
- Surface pre-publish fair-chance cue (reporter/desk) + post-publish GSC diagnostic (reporter) in the Next.js app.

### Phase 3 — the whole loop for one design partner
- One newsroom, end to end: signal on the reporter's phone → archive context → she writes → fair-chance cue → files → post-publish "how it landed."
- **Validate with a real correspondent** (the success test).

### Phase 4 — breadth
- More of the 189 adapters from fixture-stub to live; m-framing-pej (built) on the strategic axis; fair-chance audit; editorial calendar; subscription health.

## What each repo contributes / what retires

- **front engine** → the trunk (Next.js app, PWA, Collect/Analyse/Score/Alert, surfaces, MCP). Kept.
- **back engine** → distribution + probity + subscription modules (Python scorers + GSC). Streamlit UI retired; logic kept.
- **spine** → Postgres tenancy + RLS, provider-agnostic agent runtime, module system, m-framing-pej + goldset eval, design system. The markets ingest→brief is superseded by EIP's deeper Collect; the brief survives as one operational feeder.
- **news-intel / web-bloat-checker / subscriptions / Predictive Calendar** → feed Collect, m-probity, subscription-fit, editorial-calendar respectively.

## Risks (named)

- **Three-codebase merge** is the dominant risk — premortem-class. Do it phased, trunk-first; never a big-bang rewrite.
- **SQLite → Postgres** schema migration of the front engine; tenant-scope every table.
- **189 adapters are mostly fixture-stubbed** with real URLs captured — turning them live (Cloudflare-aware fetch, court/gazette portals) is ongoing work, not a one-shot.
- **Claude → provider-agnostic** enrichment: re-test enrichment quality across providers.
- **Solo-founder bandwidth**: this is large. Sequence ruthlessly; the validation gate (a correspondent uses it) governs pace, not feature count.

## First concrete step

Phase 0: bring `editorial-intelligence-demo` into the OnlineJourno repo as the web trunk, vendor-neutral, and stand it up on the spine's Postgres tenancy with provider-agnostic enrichment — the smallest end-to-end slice that proves the front engine runs multi-tenant on this spine.
