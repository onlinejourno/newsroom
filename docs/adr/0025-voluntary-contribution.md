# ADR 0025 — Voluntary contribution; no mandatory upload

**Status:** Accepted (2026-06-03).

## Context

An earlier strategic proposal considered an "open core + mandatory upload of customisations" model, in which any customer modification or configuration would be required to be uploaded to the central OnlineJourno repository.

Analysis surfaced several structural problems with that model:

1. **Legal unenforceability.** No standard or non-standard licence in commercial use can compel a customer to upload configuration, data, or local modifications. The closest mechanism (AGPL) only compels source code for network-deployed modifications, not configuration or data. Custom EULA enforcement against newsrooms is not viable.
2. **Customer-confidentiality conflict.** The valuable customisations — editorial DNA, beat configurations, journalist preferences, draft briefs, story-thread memory, rejected-item logs — are exactly the artefacts newsrooms will never agree to upload. The low-value uploads (a single new RSS feed) do not build a moat.
3. **Cultural friction.** Indian newsroom culture is historically guarded with internal data; many global newsroom cultures share that posture. A mandatory-upload clause becomes a refusal trigger for sophisticated customers.
4. **Compliance risk.** Mandating uploads of any data with personal or pre-publication content creates obligations under GDPR (EU customers), India's DPDPA, and similar regimes. The compliance overhead exceeds the value of the data received.
5. **Distortion of contributor relationships.** Mandatory contribution reframes the project from "free tool plus voluntary community" to "free tool with extraction terms." The latter is brittle.

## Decision

Contributions are **voluntary**. No upload is mandated by license, contract, or technical means.

### What the platform invites (and welcomes)

Voluntary contributions are accepted on the following layers, via standard GitHub Issues + Pull Request workflow once those repos go public:

- **Source registry** — new RSS feeds, scrape rules, source metadata. Will live in `packages/spine/catalogues/sources/` (MIT). When a contributor adds a credible new source, their name is recorded in the source's metadata and surfaced in product as "Curated by …".
- **Section IA templates** — newsroom-archetype starter packs (sections, beats, sources). Will live in `packages/spine/templates/` (MIT). Each template carries an attribution field.
- **Public catalogues** — IPTC mappings, state / region catalogues, regulator catalogues. MIT.
- **Plugin SDK ecosystem (Y2+)** — third-party plugins under MIT or their author's chosen permissive license. Marketplace listing + revenue share for paid plugins.
- **Bug fixes and improvements** — direct PRs against the Apache 2.0 core. Reviewed under standard CONTRIBUTING terms.

### What customers retain (always)

The following belong to the customer's tenant and are never uploaded, never aggregated, never analysed across tenants:

- Editorial DNA configuration (style guides, voice rules, taboo topics).
- Beat configurations and journalist assignments.
- Brief drafts and published briefs.
- Signal-level decisions (accept, reject, defer, publish) and the rejection reasons.
- Story-thread memory and per-thread context.
- Journalist-level interaction history (clicks, dwell, edits).
- Per-newsroom cost telemetry beyond aggregate platform billing.
- Any customer-uploaded documents (style guides, briefing samples, training material).

This boundary is enforced architecturally (row-level multi-tenancy per ADR 0005, RLS policies, per-tenant API keys) and contractually (Terms of Service, customer Master Service Agreement).

### Recognition mechanisms

Voluntary contributors are recognised through:

- Contributor name on each source / template page in the product UI.
- Annual community-contributors report published on `onlinejourno.info`.
- Shareable contributor badges (LinkedIn / Twitter format).
- `CONTRIBUTORS.md` in the repository, alphabetised.
- For substantial contributions: named credit in release notes and (where the contributor consents) in the founder's writing.

## Consequences

- Voluntary contribution mirrors the working OpenStreetMap / Wikipedia dynamic: enough people contribute that the platform compounds, but no individual is coerced. The compounding effect is real on the public-data layer and minimal on the core code; that asymmetry is acceptable.
- Customers will not refuse to adopt the platform on confidentiality grounds; the confidentiality boundary is product-architecture-level, not a contractual escape.
- The founder cannot demand contributions back. The trade is "free code and free public data layer" in exchange for "voluntary improvement to the public layer when it serves your work."
- This decision is irreversible in spirit. Adding a mandatory-upload clause in the future would be a breach of the customer-confidentiality promise and would erode trust accumulated up to that point.

## Anti-patterns refused

- Phone-home telemetry as a backdoor "upload."
- Aggregate analytics that re-identify per-newsroom editorial choices.
- License clauses that require upload as a condition of use.
- "Free for non-commercial, mandatory upload for commercial" hybrid clauses.

## Revisit

Only on customer demand, never on operator demand. If a coalition of customers explicitly wants a shared source catalogue exchange, design that as an opt-in feature on top of the existing voluntary public layer.
