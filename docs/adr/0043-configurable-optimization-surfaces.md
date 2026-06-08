# ADR 0043 — Content-optimization surfaces are a configurable, extensible registry (incl. AI surfaces)

**Status:** Accepted (2026-06-08).

## Context

The content-optimization half of OnlineJourno (the back engine; `m-distribution-fit`, ported from `discover-dashboard`) scores each story for its fair-chance across **distribution surfaces**. The original engine scored three Google surfaces — Discover, News, Search — and PRODUCT.md added Subscription and Direct.

But surfaces are proliferating and will keep emerging:

- **AI Overviews (AIO)** — Google's generative answers, now a primary surface a story must be built for.
- **Generative-AI search / answer engines** — ChatGPT Search, Perplexity, Gemini, Copilot, and others not yet launched. Being cited/surfaced here is fast becoming as important as classic Search.
- Newsroom-specific surfaces — a regional aggregator, an app feed, a partner syndication, a homepage module.

Hardcoding a fixed set of surfaces (as the original three-channel scorer did) is the same mistake we avoided for sources: it bakes one newsroom's / one moment's reality into code. A newsroom in 2027 will need surfaces that don't exist today; a newsroom in one market won't care about Google News at all.

## Decision

**Surfaces are a configurable, tenant-scoped registry — exactly mirroring the data-source admin model (ADR 0042 / sub-project B), not a hardcoded enum.**

1. **Built-in seeds** ship enabled by default: Google Discover, Google Search, Google News, **AI Overviews (AIO)**, Subscription, Direct. Generative-AI surfaces (ChatGPT Search, Perplexity, Gemini, Copilot) ship as built-in seeds too, marked emerging.
2. **Newsrooms can add** custom surfaces and **delete/disable** any surface (built-in included). A newsroom that doesn't publish to Google News disables it; one that cares about a regional answer engine adds it.
3. **Each surface carries its own readiness-signal definition** — the set of checks + weights the scorer applies for that surface (e.g. Discover → large image + freshness + structured data; AIO/generative → answer-shaped passages, citation-worthiness, entity clarity, schema). Content-based signals need no external API; surface-specific performance signals (where an API exists, e.g. GSC for Search/Discover) attach per surface.
4. **The scorer iterates the enabled surfaces**, scoring + explaining each. Adding a surface for which only content-based signals are defined requires **no code change**; adding bespoke performance signals for a new surface is a connector (ADR-0042-style).
5. **Managed in an admin panel** alongside sources — add / edit / enable / delete, per tenant.

## Consequences

- **Future-proof.** New AI/answer surfaces are added as configuration + (optionally) a signal definition, not a code rewrite. "As they emerge" is handled by the registry, not by us shipping a release per surface.
- **Per-newsroom.** Surfaces are tenant-scoped; each newsroom curates the surfaces that matter in its market.
- **The scorer must be surface-driven** from the start — it reads the registry, not a constant. This is why we record the decision *before* building the back engine, so it is built correctly (the original three-channel hardcode is not ported as-is).
- **Signal definitions are the real work** per surface; the registry is the cheap part. Generative-AI surface signals (citation-worthiness, answer-shaped passages) are newer and less settled than Discover/Search — expect them to evolve; the per-surface definition makes that safe.
- Mirrors sources (ADR 0042) — same admin pattern, same extensibility ethos, reinforcing the open-source/customizable posture.

## Anti-patterns refused

- A hardcoded surface enum (Discover/News/Search) in the scorer.
- Google-only surfaces; ignoring AIO + generative-AI answer engines.
- Requiring a code change / release to track a newly-emerged surface.
- One global surface set instead of per-newsroom configuration.

## References

- `docs/plans/m-distribution-fit.md` (the back-engine plan — surfaces section)
- ADR 0042 (the source registry / admin model this mirrors)
- `docs/PRODUCT.md` (the loop step 5: the fair-chance cue across surfaces)
