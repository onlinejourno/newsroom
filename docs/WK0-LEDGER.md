# Wk 0 Asset Ledger

Status of each existing asset relative to the OnlineJourno Platform build.

## Tags

- **REUSE** — code or doc adopted as-is (with possible namespace rename / tenancy injection).
- **REWRITE** — concept and design carried over; code rewritten in the new repo because of language switch, scope shift, or fragility.
- **REFERENCE** — read-only source of truth. Not migrated; consulted during build.
- **RETIRE** — superseded; will be archived once the migration is complete.

## To be filled Tue Jun 2

### `~/projects/news-intel`

| Path | Tag | Notes |
|------|-----|-------|
| `SPEC.md` | REFERENCE | Source-of-truth framework for editorial intelligence layer |
| `src/collect_rss.py` | REUSE | Move to `packages/ingest-py/collectors/` |
| `src/collect_sitemap.py` | REUSE | Same |
| `src/collect_homepage.py` | REUSE | Same |
| `src/collect_articles.py` | REUSE | Same |
| `src/collect_robots.py` | REUSE | Same; powers `m-platform-dep` |
| `src/collect_pagespeed.py` | REUSE | Same; powers `m-platform-dep` |
| `src/code_frames.py` | REUSE | Powers `m-framing-pej`; needs tenant_id |
| `src/db.py` | REWRITE | SQLite → Postgres |
| `src/diff.py` | REUSE | Move to spine; add tenant scoping |
| `src/validate.py` | REUSE | Eval harness foundation |
| `goldset.csv` | REUSE | Gold-standard for `m-framing-pej` validation |
| `schema.sql` | REFERENCE | Merged into `infra/schema.sql` |
| `entities.yaml` | REUSE | Move to `packages/spine/sources/` as default registry |
| `dashboard/` | RETIRE | Streamlit; replaced by Next.js `apps/web` |

### `~/projects/editorial-intelligence-demo`

| Path | Tag | Notes |
|------|-----|-------|
| `app/pipeline/page.tsx` | _to assess_ | |
| `app/reporter/page.tsx` | _to assess_ | |
| `app/pulse/page.tsx` | _to assess_ | |
| `app/journalists/` | _to assess_ | |
| `app/api/signals/` | _to assess_ | |
| `app/api/auth/` | _to assess_ | |
| `EIP-Presentation.pdf` / `.pptx` | REFERENCE | Sales artifact |
| `build-pptx.js` | RETIRE | One-off |

### `~/Data Protection/discover-dashboard`

| Path | Tag | Notes |
|------|-----|-------|
| `analyze/channel_scorer.py` | REUSE | → `packages/modules/discover-seo/scoring.py` |
| `analyze/seo_eeat.py` | REUSE | → `packages/modules/discover-seo/eeat.py` |
| `analyze/sqeg.py` | REUSE | → `packages/modules/discover-seo/sqeg.py` |
| `analyze/recirculation.py` | REUSE | → `packages/modules/recirculation/` |
| `data/rss_fetcher.py` | _to assess_ | overlaps with news-intel collector |
| `data/local_trends.py` | REUSE | → `packages/modules/trends-local/` |
| `data/ai_queries_fetcher.py` | REUSE | → `packages/modules/ai-visibility/` |
| `data/newsapi_fetcher.py` | _to assess_ | external API; check cost |
| `data/youtube_fetcher.py` | _to assess_ | |
| `data/performance_log.py` | _to assess_ | |
| `dashboard/app.py` | RETIRE | Streamlit; replaced by Next.js |
| `predict/scorer.py` | _to assess_ | |

### `~/projects/journalism agents`

| Path | Tag | Notes |
|------|-----|-------|
| `docs/founder_honest_assessment.md` | REFERENCE | Tool scorecard — canon for skip/use decisions |
| `docs/hindu_implementation_priority.md` | REFERENCE | Hindu-specific patterns |
| `docs/integrated_vision_complete.md` | REFERENCE | |
| `docs/agentic_task_orchestration_FINAL.md` | REFERENCE | |
| `docs/newsroom_agentic_stack_toolkit.md` | REFERENCE | |
| `docs/onlinejournalism_platform_rethink.md` | REFERENCE | |
| `docs/onlinejournalism_week_by_week.md` | REFERENCE | |
| `docs/temporal_event_extraction_calendar_NEW.md` | REFERENCE | |
| `docs/skill_platform_layer_NEW.md` | REFERENCE | |
| `docs/tool_scorecard.md` | REFERENCE | |

### `~/projects/Goldrush`

| Path | Tag | Notes |
|------|-----|-------|
| All PHP | DEFER | Newsroom resource management — Y2 module candidate |

### `~/projects/subscriptions`

| Path | Tag | Notes |
|------|-----|-------|
| (empty) | RETIRE | |

### `~/Desktop/EIP-Tour/`

| Path | Tag | Notes |
|------|-----|-------|
| `EIP-pitch.html` | REFERENCE | Pitch surface; copy edits inform marketing site |
| `tour.html` | REFERENCE | |
| `assets/` | _to assess_ | Logos / illustrations possibly reusable |

### `~/Documents/TH Analytics/`

| Path | Tag | Notes |
|------|-----|-------|
| Drishti briefing PDFs | REFERENCE | Brief format quality bar |

## Risk flags identified

- _filled Tue_

## Decisions to capture in ADRs

- _filled Tue_
