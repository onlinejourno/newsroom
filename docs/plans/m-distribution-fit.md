# Plan — `m-distribution-fit` (generalise discover-dashboard)

**Status:** Draft 2026-06-07. The first real build target after the PRODUCT.md redraw (ADR 0041). This is the product's heart: per-story, per-reporter distribution intelligence — *give every story a fair chance*.

## What it is

For any story (a draft in the newsroom's CMS, or a published URL), score and explain its fair-chance across the four surfaces, and surface that to the reporter (pre-publish) and the desk (at placement), plus the post-publish "why it landed / died."

- **Discover** — Discover-card readiness (large image, freshness, structured data).
- **Search** — query targeting, on-page SEO / E-E-A-T, schema.
- **Subscription** — value-promise of the opening, depth signals.
- **Direct** — byline pull / loyalty fit (later).

## The gift: discover-dashboard already does most of this

`/Users/subhashrai/Data Protection/discover-dashboard` (Python) is a near-complete distribution-intelligence engine built for The Hindu. We **port + generalise**, not rebuild.

| discover-dashboard | What it gives | Maps to |
|--------------------|---------------|---------|
| `analyze/channel_scorer.py` | per-article channel score `{score, grade, signals:[{name,value,max,note}]}` — freshness decay, og:image/Discover-card detection, … (content-based, no API) | **Pre-publish Discover/Search cue** |
| `analyze/seo_eeat.py` | `analyse_story()` — fetches page, checks title / meta / headings / images / canonical / schema / open-graph → E-E-A-T findings + **recommendations** | **Pre-publish "what to fix"** |
| `analyze/sqeg.py` | Search Quality Evaluator Guidelines scoring | Search depth/quality |
| `analyze/recirculation.py` | recirculation signals | Direct/loyalty (later) |
| `data/gsc_fetcher.py` | `get_discover_performance(site_url, …)`, `get_discover_top_queries(site_url, …)` — **already parameterised by site_url** | **Post-publish diagnostic (multi-tenant ready)** |
| `data/trends_fetcher.py` (pytrends), `data/gem_finder.py` | trend momentum, coverage gaps | Strategic: trending + gaps |
| `data/keywords_fetcher.py`, `ke_client.py` | Keywords Everywhere | Search volume (we already wired this) |

`predict/scorer.py` adds trajectory prediction; `analyze/scoring_utils.py` has the grade bands.

## Where it lives

`packages/scoring-py` — its stated purpose is exactly *"PEJ framing, EEAT, SQEG, recirculation"* (currently a stub). The ported deterministic analysers go here; the platform's agent layer (`agents-py`) calls them. Module config / enable-per-newsroom follows ADR 0006 (`m-distribution-fit`).

## Build phases (smallest, highest-value first)

### Phase 1 — pre-publish per-story distribution-fit (port `channel_scorer` + `seo_eeat`)
- Port `channel_scorer.py` + `seo_eeat.py` into `scoring-py`, dropping Hindu-specifics (generalise the CDN image patterns to a config-driven list).
- Input: a story's content (headline, body, image, URL/draft). Output: per-surface `{score, grade, signals, fixes}`.
- **No external API keys** — content-based + deterministic. Ships to any newsroom immediately.
- Store in `cap_distribution_fit_scores` (already specced in INTEGRATION-SPEC) keyed by signal/story.
- Surface on `/en/shortlist` + the brief: replace the thin Keywords-Everywhere "Search-fit" line with the real channel score + the top fix ("Discover: C — no ≥1200px image; Search: B — H2 missing target term").
- **This is the reporter's pre-publish cue — the heart. Build first.**

### Phase 2 — post-publish diagnostic (port `gsc_fetcher`)
- Port `gsc_fetcher.py`; per-tenant Search Console credentials in `tenants.config` (secret ref).
- For a published URL: real Discover impressions + Search queries/positions → plain-English "why it landed / died + the fix," surfaced **to the reporter directly** (no digital-desk gatekeeping).
- The thing reporters never get today.

### Phase 3 — strategic + the rest
- `trends_fetcher` + `gem_finder` → trending topics + coverage gaps (strategic axis).
- Subscription-fit (from the `subscriptions` project), Direct/loyalty (`recirculation`).
- `sqeg`, `predict/scorer` trajectory.

## Principles carried in (PRODUCT.md)

- Decision-support, not autopilot — score + recommend; the reporter/editor acts.
- Reporter-first + information symmetry — the reporter sees the same scores as the desk.
- Companion to the CMS — read draft/published state; never publish.
- Eval-gated where there's ground truth (e.g. GSC actuals validate the pre-publish Search prediction over time).

## First concrete step

Port `channel_scorer.py` into `scoring-py` as `distribution_fit.channel_score(story) -> dict`, generalised + unit-tested against a couple of real signals, and swap it into the `/en/shortlist` + brief surface in place of the keyword-only Search-fit line. That replaces a thin proxy with your real engine — Phase 1, slice 1.
