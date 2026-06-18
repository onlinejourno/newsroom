# Design spec — OnlineJourno redesign: lifecycle nav + "where you stand" editorial intelligence

**Status:** Drafted 2026-06-18 from the founder's approved design mockup (claude.ai design project *"IOJ Competitive Intelligence" → OnlineJourno Redesign*). North-star for the design overhaul. Supersedes the flat masthead of ADR 0060; resolves #106 (nav naming overlaps). Implementation deliberately phased — the founder may have the data layer wired separately if needed.

## Why

The live product works but the UI is a flat 9-item masthead (ADR 0060) over generic dashboard surfaces. Founder assessment (recorded): the nav is **flat/overloaded, not context-aware, and feels like a generic admin tool**; and "the design is very crucial for uptake." The reference target is editorial scrollytelling (The Hindu "Saffron Empire"), not a SaaS dashboard.

The mockup answers this on three axes the founder cares about: a **context-sensitive (lifecycle) nav**, an **"educate editorial" intelligence model**, and an **editorial data-design aesthetic**. This spec captures it as the build target.

## The design

### 1. Lifecycle nav — the spine (replaces the flat 9 items)

The masthead becomes the **story lifecycle**, six staged verb·noun pairs, left→right in the order a journalist works:

| Stage | Label | Subsumes today |
|-------|-------|----------------|
| **PLAN** · Calendar | the planning spine (promises ahead) | `/calendar` |
| **BRIEF** · Today | the day's brief / reporter inflow | `/brief`, `/feed`, `/eip-signals` |
| **IN** · Sources | the public-record inflow + source mgmt | `/signals`, `admin/sources`, `admin/connectors` |
| **FRAME** · Analyse | what's moving + framing landscape ("where you stand") | `/trends`, `/topic-domains`, `/local-pulse` |
| **DRAFT** · Compose | draft-assist | (new; Y2 drafting) |
| **SCORE** · Audit | fair-chance / distribution-fit + probity | `/potential`, `/scores`, `/gems`, `/probity`, `/story-analyser` |

Right edge: a vertical **SURFACES** tab (the configurable-surfaces registry, `admin/surfaces`). Top-right: time (IST) + signed-in user. Active stage underlined in accent red.

- **One registry still drives everything** — `apps/web/lib/nav.ts` exports the lifecycle stages; masthead + breadcrumbs + home front-door all consume it (the ADR 0060 single-source rule carries over). Route paths **unchanged** → no link breakage, no redirects.
- This resolves **#106**: the overlapping names (Story Scores / Surface Scores / Hidden Gems; Signals / EIP Signals) collapse under Score·Audit and In/Brief.
- Role/beat/moment axes (the other three the founder picked) layer on later: stages hide by role (reporter sees Brief/Draft; desk+ see Score/Audit), and content scopes to beat/geo + the live moment within each stage.

### 2. "Where you stand" — the editorial-intelligence model (the differentiator)

The fully-designed exemplar is **FRAME · Analyse**: a serif lead *"Where coverage is heading."* + deck *"The framing landscape across 30 tracked outlets, plus what's trending — by topic and by place — measured against your baseline."*

**"Trending now · MOMENTUM · LAST 24H · WHERE YOU STAND"** — topic cards, each carrying:
- momentum (▲212%) + mention volume (1,840 mentions) + a momentum bar;
- a **position tag** — `BEHIND` · `NO ANGLE` · `ON IT` · `PEAK`;
- an **editorial implication** — "Surging since the HC stay. You have a brief ready." · "Peer-led. No angle from you yet." · "Explanatory window still open." · "Steady; local angle live."

This is the heart of it: not a generic trend list, but **the outlet's own position relative to peers + what to do about it** — the ground-up principle (educate the reporter, show the *why*/implication) + locale-relative, competitor-relative scoring, expressed in editorial language. Backed by the **competitive-framing corpus**: ~30 tracked outlets, PEJ combative:explanatory (C:E) ratios, framing "fingerprints," measured against the tenant's own baseline.

### 3. Aesthetic / design language

- **Editorial data-design (FT/Economist feel):** serif display for headlines, a clean sans + mono for UI/data, warm paper ground, restrained red accent, generous scale, narrative leads. Scrollytelling rhythm (a story unfolds down the page), not a grid of widgets.
- **Honest data signals:** every metric/fingerprint carries a confidence indicator; small samples (n<30) flip warning-amber. The product holds itself to the probity bar it audits others against.
- **Builds on, not replaces, the broadsheet kit (ADR 0013):** reconcile the mockup's type direction (Newsreader-style serif + IBM Plex) with the existing tokens (Playfair / Noto Serif / Source Sans) — keep one token system; refine values toward the mockup.

### Scope captured in the mockup
- **Fully designed:** FRAME·Analyse (page 1) + sign-in/onboarding (page 2). The other five lifecycle surfaces are nav labels only — their detailed layouts get designed during build, in this language.
- **It is a mockup** (mock data; nav tabs are static; Classify/Route/source-mgmt represented, not wired).

## Build approach — two phases

**Phase A — IA + visual re-skin (front-end, no new data).**
`lib/nav.ts` → the lifecycle model; re-skin masthead + breadcrumbs + front-door + each surface to the design language; re-skin login/register (page 2). Routes unchanged. Delivers the visible win (intuitive nav + editorial polish) + closes #106. Mostly TypeScript/CSS; verifiable on the live deploy.

**Phase B — "where you stand" competitive-framing intelligence (data + surface).**
Wire the competitive-framing corpus (≈30 outlets, PEJ C:E ratios, fingerprints) + the tenant baseline into the Analyse cards (position tags + implications). The larger lift; gated on the data dependency below.

## Data dependencies (Phase B)
- **Competitive-framing corpus:** the 30-outlet PEJ framing data — `m-framing-pej` (the coder) exists; the multi-outlet competitive *ingest* (the `news-intel` consolidation source) needs wiring into the platform's tenant model.
- **Per-topic momentum:** already have (trends / entity convergence).
- **Outlet baseline + "tracked outlets":** must come from **tenant config**, not hardcoded (vendor-neutral). A real tenant sets its own peer set.

## What changes (code)
- `apps/web/lib/nav.ts` — lifecycle stages (the IA).
- `apps/web/components/Masthead.tsx`, `Breadcrumbs.tsx`, home front-door — consume the new registry.
- `apps/web/app/globals.css` — refine tokens toward the editorial data-design language (one system).
- Each `[locale]/*` surface — re-skin to the language (Phase A); Analyse gains the "where you stand" cards (Phase B).
- `login`/`register` — re-skin to page-2 onboarding.
- New (Phase B): a competitive-framing data layer (`lib/` + a worker step) feeding the Analyse cards.

## Risks / open questions
- **Mockup ≠ full design:** only Analyse + onboarding are drawn. The other surfaces' layouts are designed during build — risk of drift from the founder's intent; mitigate with founder review per surface.
- **Phase B data is the gate:** confirm the news-intel competitive corpus + per-tenant baseline are wire-able before committing Phase B. If not, ship Phase A (nav + reskin) and stage Phase B.
- **Type-system reconciliation:** the mockup's fonts vs ADR 0013's — pick one, avoid two token systems.
- **Effort:** weeks. Phase A is the low-risk, high-visibility start.

## References
- Mockup: claude.ai design — *IOJ Competitive Intelligence / OnlineJourno Redesign* (founder-shared).
- Supersedes the flat masthead of **ADR 0060**; resolves **#106**. Relates to **ADR 0013** (design tokens), **ADR 0049** (user-needs), **ADR 0047** (fair-chance audit), **ADR 0057/0059** (Calendar spine), **m-framing-pej**, and the `news-intel` competitive corpus.
- A follow-on ADR should record the nav-model change (lifecycle spine) once Phase A is agreed.
