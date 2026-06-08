# ADR 0041 — One product (OnlineJourno); PRODUCT.md is the north star; MVP-SCOPE suspended

**Status:** Accepted (2026-06-07).

## Context

Two problems converged:

1. **The platform / Xtnd split caused confusion.** A separate `onlinejourno/xtnd` repo was created, then merged back as a "capability tier" (ADR 0030), with "MVP tier vs Xtnd tier" language layered on top. That tiering was itself the source of confusion — it implied two products where the founder always intended one.

2. **The build drifted from the founder's vision.** `MVP-SCOPE.md` narrowed the product to a "markets & regulatory morning brief." A great deal was built well (ingest, scoring, brief composition, provider-agnostic LLM, framing eval, trust primitives, thread clustering, filters). But the founder's actual idea — an editorial-intelligence companion inside the CMS that gives *every story a fair chance* across distribution surfaces, for *every reporter*, pre- and post-publish — was barely touched. The "brief" (front of the funnel: what to write) quietly replaced the original heart (back of the funnel: give the written story a fair chance).

The founder reframed: **OnlineJourno + Xtnd is one combined product — the platform, by a journalist for journalists — consolidating the founder's earlier projects into one integrated, smart, comprehensive whole that is a strategic and operational addition to the CMS newsrooms use.**

Crucially, the founder's prior projects already *are* the product's modules: `discover-dashboard` (The Hindu Discover/News/Search intelligence) is the operational core; `news-intel`, `framing-india-2026`, `web-bloat-checker`, `subscriptions`, the Predictive Editorial Calendar, and `editorial-intelligence-demo` are the other capabilities; the `platform` is the multi-tenant spine that generalises them.

## Decision

1. **One product: OnlineJourno.** "Xtnd" is retired as a separate repo and as a tier. It survives only as the ethos / tagline — *"give every story a fair chance."* There is no MVP tier vs Xtnd tier; there is one product with capabilities behind per-newsroom module config (ADR 0006).

2. **`docs/PRODUCT.md` is the binding north star.** It defines the one product, the two axes (operational: reporter/desk per-story distribution-fit + post-publish; strategic: planning, framing, fair-chance audit, probity), the consolidation map (prior projects → modules), the principles, and the redrawn build sequence.

3. **`docs/MVP-SCOPE.md` is suspended.** Banner added; detail retained for reference; it is not the plan.

4. **The wedge is redrawn** from "markets morning brief" to **the fair-chance distribution intelligence** — the thing only this product does. The first real build target is to **generalise `discover-dashboard` into `m-distribution-fit`** (per-story Discover / Search / Subscription / Direct readiness), surfaced to the reporter pre-publish and the desk at placement. The sourcing→brief pipeline already built becomes the operational *feeder*, not the centre.

5. **`onlinejourno/xtnd` repository is retired.** Its content was already merged (ADR 0030); the repo is archived with a pointer to platform. The Xtnd-derived ADRs (0031–0039) remain valid as platform decisions.

## Consequences

- **Clarity restored.** One product, one repo, one spec. No tier confusion. The build sequence points at the founder's actual heart (distribution fairness), not the feeder (the brief).
- **Nothing built is wasted.** The spine, ingest, agents, framing, trust primitives, threads, filters, and surfaces all remain — they are the platform that now hosts the consolidated modules. The reframe is a re-centring, not a teardown.
- **The founder's body of work becomes coherent.** discover-dashboard, news-intel, web-bloat-checker, subscriptions, the Predictive Calendar, and the framing study stop being scattered prototypes and become named modules of one product.
- **Probity returns to the centre.** The founder's first stated value (responsible journalism, privacy and probity) — embodied by web-bloat-checker — was dropped by the markets-brief scope. PRODUCT.md restores it as a core principle and a strategic module.
- **Costs are accepted.** Generalising discover-dashboard (Discover/Search performance signals, GSC/Discover API integration, per-story scoring) is real work and depends on data the markets wedge never needed. The reporter-validation question (would a working journalist use this) remains the gating test — now pointed at the distribution-fit core, not the brief.

## Anti-patterns refused

- Re-introducing a "tier" split between platform and Xtnd.
- Treating the morning brief as the product headline.
- Building more sourcing/brief polish before the distribution-fit core exists.
- A second repo for any part of the one product.

## References

- `docs/PRODUCT.md` (the north star)
- `docs/MVP-SCOPE.md` (suspended)
- ADR 0006 (module plugin architecture — the mechanism for per-newsroom capabilities)
- ADR 0030 (the earlier platform/Xtnd merge — this ADR completes the simplification)
- ADR 0013 (design system, from the Predictive Editorial Calendar)
- Prior projects: `discover-dashboard`, `news-intel`, `framing-india-2026`, `web-bloat-checker`, `subscriptions`, `editorial-intelligence-demo`
