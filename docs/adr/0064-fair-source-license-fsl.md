# ADR 0064 — Fair-source licence: adopt FSL-1.1-ALv2

**Status:** Accepted (2026-06-25). **Supersedes ADR 0024** (Apache-2.0 license model). **Amends ADR 0028** (FOSS-first values).

## Context

The project is pivoting to a fundable, founder-sustainable footing (the Journalistic Agentic Task Orchestration Project). Pure Apache-2.0 (ADR 0024) leaves a solo founder — a journalist productising his own consulting — exposed to commercial free-riding: a well-resourced player could take the code and out-compete him with his own work, capturing the value he created. At the same time the project's values must hold: transparency, self-hostability, no surveillance, eventual openness, and a global community of AI-journalism consultants who deploy it in their engagements. FOSS-first (ADR 0028) protected the values but not the sustainability.

## Decision

Adopt the **Functional Source License, Version 1.1, ALv2 Future License (`FSL-1.1-ALv2`)** for OnlineJourno's source-available products.

- **Source-available + self-hostable from day one.** Anyone may use, copy, modify and redistribute for any Permitted Purpose.
- **Competing Use restricted** (for two years per version): you may not offer the Software as a commercial product/service that substitutes for it or offers substantially similar functionality.
- **Converts to Apache-2.0** on the second anniversary of each version's release (delayed open-source publication) — the work becomes fully open over time.
- **Professional services are an explicit Permitted Purpose** (FSL Permitted Purpose §4) — the global AI-journalism consultant network can deploy it in client engagements with no friction. *This is what makes the "complementary, not competitive" positioning legally true.*

### Scope — which repositories

FSL applies to the source-available OnlineJourno products: `platform`, `onlinejourno-scoring`, `story-optimiser`, `daybook`, `onlinejourno-xtnd`, `masthead-audit`, `news-intel`, `web-bloat-checker`, `news-crawl-budget-analyzer`, `onlinejourno-tools-web`.

- **`onlinejourno-pulse` stays PROPRIETARY** — it is a closed marketing surface, not a source-available product.
- Demos / legacy / archives (`editorial-intelligence-demo`, `discover-dashboard`, `journalism agents`) are out of scope.

## Consequences

- The values of ADR 0028 are preserved in substance — transparent, self-hostable, no surveillance, eventually fully open. Only the "immediately OSI-open" stance is traded for two-year delayed openness plus a competing-use guard. ADR 0028 is **amended, not discarded**.
- The Apache-2.0 future grant means the project still lands in the commons — on a two-year delay per version.
- Existing `LICENSE` files (Apache-2.0 per ADR 0024) are replaced with `FSL-1.1-ALv2` across the in-scope repos.
- Source-file SPDX headers may adopt `SPDX-License-Identifier: FSL-1.1-ALv2` incrementally.
- The connector seam's principle is unchanged: FSL governs OnlineJourno's own code, not the third-party tools a tenant connects.
- **Legal review recommended before external publication.** Relicensing assumes sole authorship/ownership of all in-scope code (true for these solo-founder repos); any third-party contributions would need clearance first. This ADR is a project decision, not legal advice.

## References

- ADR 0024 (Apache-2.0 license model — superseded); ADR 0028 (FOSS-first values — amended); ADR 0042 (one vendor-neutral product).
- FSL: <https://fsl.software/> · SPDX `FSL-1.1-ALv2`: <https://spdx.org/licenses/FSL-1.1-ALv2.html>
- JATO project report: `~/projects/JATO-Project-Report.md`. *(JATO positioning is parked pending review — see the JATO ADR, story-optimiser 0002. This licence decision is unaffected.)*
