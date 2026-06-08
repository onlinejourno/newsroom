# ADR 0044 — Connector framework for newsroom data tools (API or MCP, with OSS fallbacks)

**Status:** Accepted (2026-06-08). Sub-project C.

## Context

OnlineJourno's "data sources" layer (PRODUCT.md) — analytics, keywords, search-console, trends, subscription, social — must be **pluggable**: a newsroom brings the tools it already pays for (Chartbeat, Piano, GA4, Newzdash, Keywords Everywhere, GSC, …), wires them via **API or MCP** as it prefers, and a newsroom that pays for none must still run on **open-source fallbacks**. This is the open-source/customizable posture (the product is downloadable; every aspect configurable) applied to the data-tools layer.

We already have the template: the LLM is provider-agnostic behind one seam (ADR 0040), and content sources are a configurable registry + admin (ADR 0042 / sub-project B). Connectors extend the same idea to data tools. (Connectors are distinct from sources: sources bring *content in* — the Collect pillar; connectors bring *data about performance/audience* — the optimization + analytics side.)

## Decision

A **connector** is a pluggable integration with an external data tool, behind a per-**category capability contract**.

1. **Categories** — each defines a small capability contract the rest of the platform calls, provider-agnostic:
   - `analytics` → `page_performance(url, range)`
   - `keywords` → `keyword_data(terms)`
   - `search_console` → `performance(url, range)`
   - `trends` → `momentum(terms, geo)`
   - `subscription` → `conversion(range)`
   - `social` → `reach(url)`
   - (`archive` is its own pluggable seam, `m-archive`, ADR 0042.)

2. **Providers** implement a category in one of two **modes** — both first-class:
   - **API** — bespoke client to the tool's REST/HTTP API.
   - **MCP** — call a tool exposed by an MCP server (a newsroom can stand up a pipeline as MCP instead of a bespoke client).

3. **OSS fallback is mandatory per category** — every category ships at least one open-source provider so no newsroom is excluded for lacking paid tools: Matomo (analytics), SEO Panel (keywords/rank), pytrends/Google Trends (trends), and `custom` (API/MCP) escape hatches.

4. **Registry + admin** — a tenant-scoped `connectors` table; an admin panel (`/admin/connectors`) mirrors the source panel: add a connector → pick category → pick provider from a built-in **catalog** (OSS marked) → pick mode → fill the provider's config fields. Secrets stored as an env reference (`secret_ref`), never the raw key.

5. **Adapter seam** — `make_connector(category, config) → CapabilityClient`, analogous to `make_completer` (ADR 0040). API adapters call the service; MCP adapters call the MCP tool. Callers depend on the contract, not the provider.

## Consequences

- **Bring-your-own-tools.** Any newsroom plugs in its stack; switching Chartbeat→Matomo is config, not code.
- **API or MCP, newsroom's choice** — the MCP mode lets non-engineers wire pipelines without bespoke clients.
- **No newsroom excluded** — OSS fallback per category.
- **The scorer/analytics call contracts, not vendors** — provider churn is absorbed at the seam.
- **C1 ships the framework** (registry + admin + catalog + seam interface); **per-category adapters are follow-on slices** (e.g. C2 = keywords via Keywords Everywhere — already wired — + SEO Panel OSS), exactly as the LLM seam preceded each provider.
- Catalog is static config (category→providers→fields→mode→oss); extending it for a new tool is a small data change.

## Anti-patterns refused

- Hardcoding a single analytics/keywords/search vendor.
- API-only (forcing bespoke clients) or MCP-only.
- A category with no open-source option (excluding under-resourced newsrooms).
- Storing raw API keys in the DB (env `secret_ref` only).

## References

- ADR 0040 (provider-agnostic LLM — the seam template)
- ADR 0042 (source registry + admin — the registry/admin template)
- ADR 0043 (configurable optimization surfaces — sibling extensibility)
- `docs/architecture/editorial-ia-and-sources.md` (sources, the content side)
