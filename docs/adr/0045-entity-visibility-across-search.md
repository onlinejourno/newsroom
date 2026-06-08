# ADR 0045 — Entity visibility across search (editorial-native search performance) + analytics provider clarification

**Status:** Accepted (2026-06-08).

## Context

Two related points came up while extending the connector catalog (ADR 0044):

1. A request to add **Umami, Matomo, Plausible, GoAccess** as Search Console alternatives. These are **web-analytics** tools (traffic, referrers, audience), not search-performance tools (query impressions / clicks / average position). They answer "who read this and from where," not "how does this rank in search." They belong under the `analytics` category, not `search_console`. (Matomo was already an analytics provider.) The true open alternative to Google Search Console is **Bing Webmaster Tools**.

2. A sharper product idea: **stop surfacing raw "query performance" and instead track "entity visibility across search."** Reporters and editors think in **editorial entities** (the people, organisations, places, schemes, topics they cover) and **beats** — not in SEO query strings. The platform already extracts entities + IPTC + geo on every signal (the Analyse pillar) and carries a beat taxonomy. Search-performance data should be rolled up to *that* vocabulary.

## Decision

### A. Categorise correctly + extend OSS coverage
- **`analytics`** gains **Umami**, **Plausible**, **GoAccess** (all open-source / self-hostable), alongside the existing Matomo + GA4 / Chartbeat / Piano. This deepens the "no newsroom excluded" OSS fallback (ADR 0044).
- **`search_console`** gains **Bing Webmaster Tools** as a real GSC alternative.

### B. Reshape the `search_console` capability from query-centric to entity-centric
The contract becomes **entity-visibility-first**:

- `entity_visibility(*, entities | beat, range) -> { per entity: impressions, clicks, avg_position, top_queries, trend }` — the **primary, editorial-native** view. Raw query rows from GSC/Bing are aggregated **up** to the editorial entities (matched against the entities Analyse extracted) and the beats a reporter owns. Queries that map to no known entity fall into an `unmapped` bucket (a discovery signal in itself).
- `performance(url, range)` remains available underneath for per-URL drill-down, but it is not the headline.

This is the inversion (PRODUCT.md) applied to search data: the reporter sees how *RBI* or *land acquisition* or *her district* is doing across search — her beat's entities — not a spreadsheet of query strings. It extends naturally to AI surfaces (ADR 0043): "entity citation in AI answers" is the same idea for AIO / generative search.

## Consequences

- **Editorial-native.** Search performance speaks the newsroom's language (entities + beats), the only framing a reporter can act on without an SEO analyst.
- **Leverages what exists.** Entity extraction (Analyse) + beat taxonomy + the entity data on `signals.enrichment` are the inputs; the search_console adapter rolls query rows up to them.
- **Adapter work, when it lands.** GSC / Bing adapters (a future slice) must implement entity roll-up: fuzzy/alias-match query strings → extracted entities; maintain the `unmapped` bucket. The contract is reshaped now so the adapter is built entity-first, not retrofitted.
- **Catalog-only change today.** Adding the analytics/Bing providers is config (connectors-catalog); the contract reshape is an interface change in `connectors.py`. No DB/UI change (the admin form is catalog-driven).
- Privacy-analytics tools (Umami/Plausible/GoAccess/Matomo) reinforce the probity principle (first-party, no third-party trackers).

## Anti-patterns refused

- Filing web-analytics tools under `search_console` (wrong contract).
- Making raw SEO query tables the reporter's primary search view.
- Building the search_console adapter query-first and bolting entities on later.

## References

- ADR 0044 (connector framework — categories, contracts, OSS fallback)
- ADR 0043 (configurable surfaces incl. AI — entity citation extends there)
- `docs/PRODUCT.md` (the inversion; entities + beats as first-class)
- `docs/plans/m-distribution-fit.md` (Search surface — now entity-visibility framed)
