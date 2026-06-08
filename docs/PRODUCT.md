# OnlineJourno — Product North Star

**Status:** Adopted 2026-06-07. This is the binding product definition. It supersedes the tier framing (`MVP-SCOPE.md` is suspended) and folds the former "Xtnd" into one product.

> **OnlineJourno** is editorial-intelligence **by a journalist, for journalists** — a single, integrated companion that plugs into the newsroom's existing CMS and gives **every story a fair chance**.

It is not a CMS, not a replacement, not another dashboard bolted on the side. It is the intelligence layer the CMS never had: it tells the reporter who wrote the story and the desk who places it *exactly what is happening to that story in cyberspace and what to do about it* — before publish and after.

## The problem (in the founder's words)

A reporter files into a fog. She is not — and should not have to be — an authority on SEO, Discover image ratios, schema, page speed, or paywall conversion. When her good story dies an unnatural death, she has no idea why: the site structure, the speed, the wrong keyword, the missing Discover image, the trend she missed. She depends on a digital desk, or no one. The newsroom learns from quarterly analytics decks, too late to change anything.

**Why shouldn't the CMS empower every single journalist to know exactly what is going on with each story, and how to give it a fair chance?** That is the product.

## One product, two axes

The same spine serves two audiences off one canonical story object — no information asymmetry between them.

| Axis | Who | What it does |
|------|-----|--------------|
| **Operational** | Reporter + desk, per story | Beat signals → file → **distribution-fit cue** (is this story built for Discover / Search / Subscription / Direct?) → placement & social decision-support → **post-publish diagnostic** ("why it under-performed, here's the fix") → cross-team commissioning |
| **Strategic** | Newsroom leadership | Editorial calendar & planning, **framing balance** (PEJ), **fair-chance audit** (which stories/bylines were systematically under-served), site-health & **probity** (tracking, consent, bloat vs reader rights) |

## Consolidation — the founder's projects are the modules

OnlineJourno is the integration of work already done. Each prior project becomes a capability of the one product, generalised from one newsroom to any newsroom by the multi-tenant spine.

| Prior project | Becomes | Axis | Status |
|---------------|---------|------|--------|
| **discover-dashboard** (The Hindu) — trending, story performance, Discover/News/Search signals | `m-distribution-fit` — the operational **core** | Operational | **Next build target** |
| **news-intel** — collectors, framing coder, validation | `m-source-intel` (ingest) + feeds `m-framing-pej` | Operational | Built (spine) |
| **framing-india-2026** — PEJ frames + 170-story goldset | `m-framing-pej` (frame/topic scoring, eval-gated) | Strategic | Built |
| **web-bloat-checker** — tracking, consent, ad-tech, bloat, performance vs reader rights | `m-probity` + Discover-speed signal | Strategic | To integrate |
| **subscriptions** — paywall / subscription | `m-subscription-fit` | Operational | To integrate |
| **Predictive Editorial Calendar** — planning prototype + design system | `m-editorial-calendar` + the visual identity (ADR 0013) | Strategic | Design adopted; module to build |
| **editorial-intelligence-demo** — Next.js UI | the `apps/web` surface | Both | Built (spine) |
| **platform** — multi-tenant spine, agents, modules, web | **the spine** that hosts all of the above | — | Built |

What the spine already ships (this session): ingest (RSS + GDELT), Sonnet shortlist + composed brief, provider-agnostic LLM, PEJ framing + goldset eval, trust primitives (AI-disclosure, off-record), story-thread clustering, recency/importance/velocity filters, reasoning trace, the `/en/signals`, `/en/brief`, `/en/shortlist` surfaces, the daily scheduler.

**The morning brief is one feeder feature, not the headline.** It answers "what to write." The product's heart answers "now give that story a fair chance."

## Core principles

1. **By a journalist, for journalists.** The reporter is the expert on the beat; OnlineJourno is the tool. Newsroom-native voice, no patronising, no vendor gloss.
2. **Companion to the CMS, never a replacement.** Reads draft + published state from the newsroom's CMS (Méthode, Cue, WordPress, Ghost, custom); the CMS stays the publish surface. (Read-only; head-mode is a far-future, customer-pulled option only.)
3. **Reporter-first, even when the feature is for the desk.** Every capability passes the test: does the individual reporter benefit, or only the hierarchy? If only the hierarchy — defer or reject.
4. **No information asymmetry.** The reporter sees the same distribution intelligence and fair-chance audit on her stories that the newsroom hierarchy sees. Distribution knowledge is democratised, not gate-kept by the digital desk.
5. **Decision-support, not decision-making.** It surfaces signals; the editor decides. No autopilot for placement, scheduling, commissioning, or publishing.
6. **Privacy + probity.** First-party analytics only, no third-party trackers by design, consent honesty, AI-use disclosure on output. The product measures newsrooms against reader rights (web-bloat-checker) and holds itself to the same bar.
7. **Editorial judgement stays human. AI never invents a source. Source attribution always.**
8. **Give every story a fair chance.** The watch-word and the success test.

## Architecture

- **One repository, one product.** `onlinejourno/platform`. The separate `onlinejourno/xtnd` repo is retired; its intent lives here. No "MVP tier vs Xtnd tier" — one product, capabilities behind per-newsroom config (ADR 0006 modules).
- **Spine** (built): multi-tenant Postgres, agent runtime (provider-agnostic), module plugin system, `apps/web`, the design system.
- **Modules** = the consolidated projects (table above), each enable/disable + config per newsroom.
- **CMS-companion** = read adapters pull draft + published state; OnlineJourno informs alongside.
- **Canonical story object** carries a story from idea → published → diagnosed; every module and surface reads the same object.

## Build sequence (redrawn)

The wedge is no longer "markets morning brief." The wedge is **the fair-chance distribution intelligence** — the thing only this product does.

1. **Generalise `discover-dashboard` → `m-distribution-fit`.** Per-story Discover / Search / Subscription / Direct readiness scoring, surfaced to the reporter pre-publish and to the desk at placement. This is the heart; build it next.
2. **Post-publish diagnostic** — read the published URL's real performance (Search Console, Discover, first-party analytics) → plain-English "why it under-performed + the fix," surfaced to the reporter directly.
3. **Probity + site-health** (`m-probity` from web-bloat-checker) — speed/Discover-readiness + the reader-rights conscience layer.
4. **Strategic surfaces** — fair-chance audit, framing balance (m-framing-pej already built), editorial calendar.
5. **CMS read adapters** — start where the design partner is (WordPress / Ghost / custom), read-only.

Sourcing → brief (already built) remains as the operational feeder, not the centre.

## Relationship to existing docs

- **`MVP-SCOPE.md` is suspended** — useful detail retained for reference, but it is not the spec. This document is.
- ADRs 0001–0040 stand (architecture decisions remain valid); the reframe is recorded in a new ADR.
- `CONTEXT.md` domain language continues to apply; the tier/Xtnd glossary entries are now read as "one product, one set of capabilities."

## Success test

A working reporter, on her own beat, looks at a story she just wrote inside her CMS and sees — without asking anyone — whether it has a fair shot at Discover, Search, Subscription, and Direct, what to fix, and after publish, why it did or didn't land. When that is true and she'd rather not work without it, OnlineJourno is real.
