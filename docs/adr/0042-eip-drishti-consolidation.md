# ADR 0042 — OnlineJourno = EIP (front) + Drishti (back); vendor-neutral, English-first, pluggable archive

**Status:** Accepted (2026-06-07). Expands ADR 0041.

## Context

ADR 0041 reframed to one product (OnlineJourno) and named the founder's prior projects as the modules, with `discover-dashboard` as the operational core. Two further artefacts then surfaced that change the picture materially:

1. **EIP** (`editorial-intelligence-demo`, with its handover/pitch/board deck) — a near-complete **front-of-funnel** engine: 189 source adapters across 8 families (courts, gazettes, RTI, tenders, RERA, ministries, embassies, newswires), Claude enrichment (entities, geo-on-every-signal, IPTC, editorial brief), trend scoring, push-to-phone alerting, a reporter-first PWA, a 501-journalist directory, an MCP server, and archive integration (Sarvajna). It is the founder's most-evolved articulation of the vision and is pitched to The Hindu's board. Its hero test is the **Kalaburagi district correspondent** receiving, on her phone, a signal from the public record with her newsroom's archive context attached.

2. **Drishti** (`discover-dashboard`) — a near-complete **back-of-funnel** engine: Discover/News/Search channel audit, GSC performance, Hidden Gems with desk action-chips, subscription conversion (per-desk SCI), and a probity layer ("handle with care" on sensitive stories).

Together, EIP + Drishti **are the founder's whole vision, already built** across two codebases — the front (find + contextualise + alert the reporter at the base) and the back (give the story a fair chance + close the post-publish loop). The "platform" built this session is a thinner third codebase that overlaps EIP's Collect→Score but is less complete; its lasting value is the multi-tenant spine, the provider-agnostic agent runtime, the module system, and m-framing-pej + its goldset eval.

## Decision

1. **OnlineJourno is the product — one, vendor-neutral.** No tenant or masthead branding ("Drishti", "The Hindu") in the product. It serves any newsroom in any country.

2. **The product = EIP (front engine) + Drishti (back engine) + the platform spine,** consolidated. EIP is the proposed **trunk** (most complete; carries the reporter-at-base, the archive, the PWA, the 189-adapter Collect); Drishti folds in as the distribution half; the platform contributes multi-tenant tenancy, the agent runtime, the module system, and m-framing-pej where it is stronger. The trunk-vs-spine merge is the first implementation decision (build-planning step).

3. **English-first, localizable per newsroom.** EIP's hardcoded 4-Indian-language vernacular is dropped as a built-in. The product is built and operated in English; **output language is configurable per newsroom** so it serves the non-Anglo-Saxon world. This aligns with the platform's existing multilingual readiness (ADRs 0018–0022) — capability, not hardcoded Indian-language feature.

4. **Pluggable archive (`m-archive`).** The Sarvajna (The Hindu archive) integration generalises to a pluggable archive backend: connect a **digitised archive** where it exists; otherwise derive **archival value from online sources** (the newsroom's own published web, the open record). No newsroom is excluded for lacking a digitised archive.

5. **`docs/PRODUCT.md` is rewritten** as the true north-star: the full loop (Collect→Analyse→Classify→Score→Alert→distribution-fit→post-publish), the inversion (irrigation by role; reporter as source *and* recipient), sources as a first-class layer, the two engines, the consolidation map, and these decisions.

## Consequences

- **The vision is finally captured accurately.** The product is the reporter-at-the-base, archive-powered, fair-chance loop — not a markets morning brief.
- **Most of the product already exists.** The work is consolidation + generalisation off The Hindu, not greenfield. EIP + Drishti are the engines; the platform is the spine.
- **The platform built this session is re-positioned** as the spine + framing eval, not the product. Its ingest→brief overlaps EIP's front and is largely superseded by EIP's far deeper Collect layer; what survives is multi-tenancy, the agent runtime, the module system, m-framing-pej.
- **Three generalisations are now requirements:** vendor-neutral branding, English-first + per-tenant localization, pluggable archive (connector | online lookup).
- **Costs/risks named:** consolidating three codebases (EIP front, Drishti back, platform spine) into one trunk is real integration work; the Sarvajna→m-archive generalisation and the online-archival-lookup path are new; the validation gate (does a real correspondent use it) now points at the full loop.

## Anti-patterns refused

- Tenant/masthead branding in the product.
- Hardcoded Indian-language vernacular instead of configurable localization.
- Requiring a digitised archive (excluding newsrooms without one).
- Treating "platform" (the markets-brief) as the product rather than the spine.
- A tier split, or more than one product.

## References

- `docs/PRODUCT.md` (rewritten north-star)
- ADR 0041 (one product; PRODUCT.md north-star; MVP-SCOPE suspended)
- `docs/plans/m-distribution-fit.md` (the Drishti back-engine port plan — still valid as the distribution half)
- EIP: `editorial-intelligence-demo` (handover.md, pitch.md, board deck)
- Drishti: `discover-dashboard`
- ADRs 0018–0022 (multilingual readiness — the basis for per-tenant localization)
