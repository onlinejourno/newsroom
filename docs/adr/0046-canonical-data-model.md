# ADR 0046 — Canonical data model (the backbone): signal ≠ story; Deuze + PEJ first-class

**Status:** Accepted (2026-06-09).

## Context

The product is being assembled **bottom-up** from the founder's existing projects (platform, editorial-intelligence-demo / EIP, discover-dashboard / thgp, news-intel, web-bloat-checker, subscriptions) rather than as more top-down slices. The foundation is the data model — the backbone everything plugs into. Four data models were reconciled:

- **platform** (multi-tenant Postgres) — the most complete; the canonical base.
- **EIP** (SQLite) — Collect + signal enrichment (already merged, migration 0007).
- **discover-dashboard** (Story/Trend dataclasses + score dicts) — the per-article Channel Audit.
- **news-intel** (SQLite) — a competitive-intelligence + framing model: `entities` = *other* newsrooms (tier india/global/peer, Deuze-typed), `articles`, `coded_articles` (frame/topic), `observations`/`events`/`benchmark_scores`.

Two things surfaced:

1. **The platform conflates `signal` and `story`.** Distribution-fit was applied to external signals (wire/GDELT/other outlets) — but you cannot give *another outlet's* article a fair chance. The fix belongs at the data layer.
2. **Theory grounding must be preserved.** `deuze_type` (Mark Deuze's typology of online journalism) classifies every source/newsroom, and PEJ framing (the 14-frame/16-topic taxonomy + goldset) codes every story. Both already exist in the schemas; the canonical model keeps them first-class.

## Decision

The canonical model is defined in `docs/architecture/canonical-data-model.md`. Key points:

1. **`signal` ≠ `story`.** `signal` = external discovery (from a source) → *what to cover*; `story` (new) = the newsroom's **own** article (draft → published) → *give my story a fair chance*. **Distribution-fit, the Channel Audit, and post-publish hang off `story`**, not `signal`. Discovery, the brief, and threads hang off `signal`.

2. **The platform's Postgres schema is the canonical base** (multi-tenant, most complete). Other projects' models reconcile into it; no second schema, no per-engine store.

3. **Deuze typology first-class** — `deuze_type` (mainstream | index_category | meta_comment | share_discussion) on `source` and `competitor_entity`.

4. **PEJ framing first-class** — `framing_coding` (frame, topic, frame_group, confidence) targets story | signal | competitor_article; the m-framing-pej goldset is the eval.

5. **The competitive/landscape layer from news-intel** (`competitor_entity`, `competitor_article`, `observation`/`event`, `benchmark_score`) folds in as the strategic axis, Deuze + PEJ typed.

6. **Bottom-up build order:** L0 canonical model → migrations (stories + distribution_fit repoint; framing target generalise; competitive layer) → L1 Collect → L2 Analyse → L3 Score → L4 Surfaces.

## Consequences

- **The distribution-fit-target bug is fixed structurally** — scores attach to own stories, not external signals. The misplaced `/shortlist` badges are removed (migration #1).
- **One foundation for every engine.** EIP Collect, discover-dashboard Score, news-intel framing/benchmark, web-bloat probity all read/write the canonical model.
- **The founder's theory (Deuze, PEJ) is carried, not lost** — the academic grounding that makes this "by a journalist, for journalists."
- **Migrations are sequenced** so nothing breaks: stories first, then framing generalisation, then the competitive layer.
- **Cost:** introducing `story` + repointing distribution_fit touches the agents (db helpers, CLI) and the web (remove badges); the competitive layer is net-new tables.

## Anti-patterns refused

- Distribution-fit / Channel Audit on external signals (someone else's content).
- Dropping `deuze_type` or PEJ framing to "simplify."
- A second schema or per-engine datastore instead of the one canonical model.
- Building L4 surfaces before L0 is set.

## References

- `docs/architecture/canonical-data-model.md` (the model)
- ADR 0042 (consolidation — EIP + discover-dashboard + news-intel as modules on the spine)
- ADR 0043 (configurable surfaces — distribution_fit scores per surface)
- ADR 0044 (connector framework — data tools)
- `docs/reports/framing-india-2026/` (PEJ frames/topics + goldset)
- Source models: platform `infra/schema.sql`, EIP `lib/db.ts`, news-intel `schema.sql`, discover-dashboard `analyze/`
