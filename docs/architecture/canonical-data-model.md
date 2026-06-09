# Canonical Data Model — the backbone (L0)

**Status:** Draft 2026-06-09. The foundation the whole product plugs into, reconciled bottom-up from the founder's existing projects (platform · editorial-intelligence-demo / EIP · discover-dashboard / thgp · news-intel · web-bloat-checker · subscriptions). The platform's multi-tenant Postgres schema is the base; this doc defines the canonical objects and the reconciliations needed. See ADR 0046.

Theory grounding is first-class, not decoration: **Mark Deuze's typology** classifies every source/newsroom; **PEJ framing** (Project for Excellence in Journalism) codes every story's frame + topic. By a journalist, for journalists — academically grounded.

## The one structural decision: signal ≠ story

The platform currently conflates two different objects on one `signals` table. The canonical model separates them — this is the fix, at the data layer, for "distribution-fit on someone else's wire copy."

| Object | What it is | Sourced from | Scored for | Answers |
|--------|-----------|--------------|-----------|---------|
| **signal** | external **discovery** — an event / story-idea / filing / wire item from a source | wire, govt, gazette, GDELT, other outlets | trend, relevance, framing-of-others, thread | *what should we cover?* |
| **story** | the newsroom's **own** article — draft → published | the `own` source (CMS / sitemap / own feed) | **distribution-fit** (Channel Audit), framing(own), post-publish performance | *give MY story a fair chance* |

Distribution-fit, the Channel Audit, and post-publish all hang off **story**. Discovery, the brief, and threads hang off **signal**.

## The bridge: CMS ↔ outside world

The platform connects the newsroom's **CMS** (inside) to the **outside world**, and makes the two ends talk. Two inbound boundaries, two outbound, one feedback:

| Direction | Boundary | Carries |
|-----------|----------|---------|
| world → in | **sources** (Collect) | external signals (the public record) → `signal` |
| inside → in | **CMS adapter** (read-only) | the newsroom's own drafts + published → `story` (anchored by `story.cms_ref`) |
| out → world | **surfaces** | the story pushed for a fair chance (distribution-fit / Channel Audit) |
| out → reporter | **alert channels** | ranked signals to the reporter's phone |
| world → back | **analytics / GSC / probity** | post-publish truth (engagement, AIO, tracker cost) → the chain |

The **CMS is a first-class connector** (category `cms`: WordPress / Ghost / Méthode / custom), **read-only** — the platform is a companion, never the publish surface. It is the *inside* end, mirroring sources/surfaces (the *outside* ends). `story.cms_ref` is the anchor between the two.

## Core objects

```
tenant                 newsroom (multi-tenant root; ADR 0005)
user                   platform account (admin/editor/journalist/viewer)
journalist_profile     the directory entry — name, bureau, region, beats, language

source                 where signals come from. kind: rss|api|mcp|scrape|social|own
                       family: government|political|international|institutional|wire|social|own
                       tier: 1..4 · deuze_type ← Mark Deuze typology
signal                 external discovery (from a source). geo/beat/enrichment.
story  (NEW)           own article: status draft|published, cms_ref, published_url,
                       headline, body_text, author=journalist, section/beat, enrichment

enrichment (jsonb on signal + story)
                       entities[] · geo(district/region) · IPTC topic · beat · summary

— scores —
distribution_fit_score   on STORY × surface (Discover/Search/News/AIO/…): score, grade,
                         signals[], top_fix   ← discover-dashboard / analyze_url
framing_coding           on story|signal: frame, topic, frame_group, confidence ← PEJ
trend                    on signal/topic: momentum, direction, prediction
benchmark_score          on competitor_entity × dimension ← news-intel (strategic)
probity_audit            on story/site: trackers, consent, bloat ← web-bloat-checker
subscription_fit         on story: conversion signals ← subscriptions

— graph / output —
thread / thread_link     story-thread continuity (velocity)
brief                    composed editorial brief (from signals)
calendar_event           forward editorial calendar — an extracted promise /
                         scheduled event from the public record (Predictive
                         Editorial Calendar). who(person/org) · promise_text ·
                         beat · due_date · lead_time · confidence · source(PIB…) ·
                         status(upcoming|due|past_due|fulfilled) · from_signal ·
                         story_potential. Derived from signals via promise
                         extraction; past_due drives accountability coverage.

— strategic / landscape (news-intel) —
competitor_entity        OTHER newsrooms being benchmarked. tier india|global_benchmark|peer
                         · deuze_type ← Deuze · country · category
competitor_article       their coverage (for framing-balance + gap analysis)
observation / event      competitive metrics + change detection
```

## Deuze typology (first-class)

Mark Deuze's four types of online journalism classify every `source` and `competitor_entity`:
- `mainstream` — editorial content + moderate participation (most news sites).
- `index_category` — aggregators / categorised links.
- `meta_comment` — journalism about journalism / media criticism.
- `share_discussion` — platforms for connectivity / public discussion.

Carried on `sources.deuze_type` (exists) and `competitor_entity.deuze_type`. Used for source weighting + understanding the ecosystem a signal came from.

## PEJ framing (first-class)

Project for Excellence in Journalism framing — the **14 frames** + **16 topics** taxonomy (`docs/reports/framing-india-2026/`, the m-framing-pej goldset). `framing_coding` carries `frame`, `topic`, `frame_group`, `confidence`, `coder_model`, `coder_version`. Applies to a **story** (the newsroom's own framing) and to **competitor_article**/signal (framing-of-others, for balance audits). The strategic "fair-chance audit" + framing-balance views read this.

## Project → canonical mapping

| Project | Fills |
|---------|-------|
| **platform** (Postgres) | the canonical base: tenant/user/journalist_profile, source(+deuze), signal(+geo/beat/enrichment), connectors, optimization_surfaces, distribution_fit_score, framing_pej_codings, thread, brief, collector_runs |
| **EIP** (editorial-intelligence-demo) | Collect (189 adapters) → signal; enrichment (geo/beat/entities) |
| **discover-dashboard / thgp** | distribution_fit_score on **story** (analyze_url ported) + trend |
| **news-intel** | framing_coding (PEJ) + competitor_entity/competitor_article/observation/event/benchmark_score (Deuze + PEJ) |
| **web-bloat-checker** | probity_audit |
| **subscriptions** | subscription_fit |
| **Predictive Editorial Calendar** | `calendar_event` — forward promises + accountability (`m-editorial-calendar`) → L4 Forward-Calendar (Gantt) / Event-feed / Past-due / Pipeline surfaces |

## Reconciliations needed (the L0 migrations)

1. **Add `stories`** (own content) + repoint `distribution_fit_scores` from `signal_id` → `story_id`. Remove the misplaced `/shortlist` badges (signal-keyed). *The signal-vs-story fix.*
2. **Generalise `framing_pej_codings`** to target story|signal|competitor_article (keep PEJ frame/topic).
3. **Add the competitive layer** (`competitor_entity` + `benchmark_score` + `observation`/`event`), Deuze-typed — the strategic/landscape module from news-intel.
4. probity_audit + subscription_fit score tables (when those modules land).
5. **Add `calendar_event`** + the past-due accountability loop — `m-editorial-calendar`, derived from signals via promise extraction (a forward axis distinct from discovery/own-story).

## Build order (bottom-up)

L0 (this) canonical model → migration #1 (stories + distribution_fit repoint) → migration #2 (framing target generalise) → migration #3 (competitive layer). Then L1 Collect writes signals + own-source writes stories; L2 enrich; L3 score (distribution_fit on stories, framing PEJ, trend, benchmark); L4 surfaces.
