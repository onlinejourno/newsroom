# ADR 0050 — Primary sources first: the Collect layer ingests the public record, not the news

**Status:** Accepted (2026-06-10).

## Context

The source registry filled up with mainstream-media RSS (The Hindu, BBC, Guardian, Mint…) because those feeds are instantly pullable — good for exercising the pipeline. But the founder's design (EIP, `EIP-Presentation.pdf`; ADR 0042) is the opposite: **the reporter's edge is the primary source** — the record itself, before it is news anywhere:

- Supreme Court / High Court **cause lists and judgements** (ecourts, sci.gov.in)
- **Parliament** questions and debates (sansad.in, eparlib)
- **Gazette** notifications (egazette.nic.in)
- **Tenders** (GeM, CPPP), **corporate filings** (MCA), **RTI** responses (rtionline)
- **Open data** (data.gov.in's 1,00,000+ APIs, state portals)
- **Think-tank research** (PRS Legislative and peers)
- **Event announcements** (e.g. BookMyShow listings — events of editorial interest)
- **Press wires** (PIB and PRWire-style releases journalists mine)

The EIP problem statement: the state publishes daily across dozens of portals in formats hostile to human reading; almost none of it is monitored by any newsroom; the district reporter never gets the alert. The loop this feeds (the PDF's five stages): primary sources → beat reporters / bureau chiefs / regional editors / the editor → **surface-potential scores + reader-need** to prioritise → contact sources and experts for exclusivity → with **AI-assistant questions** (what readers ask AIs, to answer in copy) and **archive context** (digitised archive, or public search of the masthead's own coverage) attached.

## Decision

1. **Primary sources are the Collect layer's purpose.** MSM feeds are **test fixtures** — kept for pipeline exercise, marked `family='msm_test'`, `tier=9`. They never define the product.

2. **The EIP source families are registered in the source registry** — `parliament`, `courts`, `gazette`, `corporate_mca`, `tenders`, `rti`, `open_data`, `think_tank`, `events`, `gov_wire` — each with its real portal endpoint and the collector kind it needs (`rss` where a feed exists, otherwise `api`/`scrape`). Families without a working collector yet are registered **disabled**: the source map is visible in the product, no scraper is pretended. Adapters land family by family (EIP's 189-adapter Collect layer is the reference).

3. **Geographic tag is mandatory at Collect** (EIP rule): every record carries state/district/bench/constituency where the source exposes it; the Analyse layer fills the rest.

4. **What is enabled today:** PIB (gov_wire) — official ministry releases over RSS, already proven in the pipeline.

## Consequences

- The registry now *shows the design*: primary families first, MSM visibly demoted to test.
- Collector work is named per family (cause-list scraper, gazette watcher, GeM/CPPP poller, data.gov.in API with `secret_ref`), instead of hiding behind generic "add sources".
- The reporter-loop framing (prioritise by surface-potential + reader-need; pursue exclusivity; AI-asked questions; archive context) is on the record as the product's operating loop — `m-archive` (ADR 0042) and the AI-questions feed are named future modules of it.

## Anti-patterns refused

- Treating news-site RSS as the product's source layer.
- Pretending coverage of a family before its adapter exists (placeholders stay disabled).
- Records without a geographic tag when the source provides one.

## References

- `editorial-intelligence-demo/EIP-Presentation.pdf` (the 13 sources; the five stages; the district-reporter user)
- ADR 0042 (EIP = front engine; m-archive)
- ADR 0044 (connector seam), `infra/seeds/` (registry seed)
