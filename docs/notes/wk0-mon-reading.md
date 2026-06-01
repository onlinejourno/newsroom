# Wk 0 Mon Jun 1 — Reading notes

7 docs read. Net: existing strategy work is rich; one prior project (EIP for The Hindu) has a hard-won premortem; one prior product (discover-dashboard for THGP) has a fully scoped architecture and 10 ADRs to harvest. The plan as written in `docs/` mostly survives, but needs five concrete additions before Wk 1.

---

## Per-doc summary

### 1. `editorial-intelligence-demo/premortem.md` — EIP for The Hindu (most valuable read)

A pre-mortem on the THGP EIP project (the platform pitched to The Hindu around the donor exit). 18 failure modes ranked. The eight must-resolve-before-Q1 items at the bottom are the real signal.

The Hindu-specific items (Sarvajna integration, Cue/Geneea vendors, Editor's town-hall slot, donor exit) are not directly relevant to OnlineJourno; the cross-cutting ones are.

**Cross-cutting failure modes that apply to OnlineJourno platform:**

- **#1 Adoption stalled at month 6** — push notifications stop working once novelty fades; the reach feedback loop is the value proof. OnlineJourno's equivalent: the brief must show its own value within 60 days, not after Phase 3.
- **#3 AI cost overran 2.5×** — initial estimates anchored on headline ranges, not stress-tested at scale. OnlineJourno equivalent: ₹15–60K/mo AI cost per newsroom is a 4× range; at the top of the range Tier 1 newsrooms are underwater. Build cost simulator BEFORE first paying customer.
- **#6 Govt portal scrapers broke and weren't maintained** — assumed 0.2 FTE, actually 0.5 FTE permanent. For OnlineJourno solo Wk 1–8 = 4–8 hrs/week scraper babysitting. Real labour cost, not optional.
- **#9 Talent attrition mid-project** — Indian newsroom-tech talent is thin. Solo founder mitigation: documentation discipline from Wk 1 (matches CLAUDE.md), pair-program through eventual hires.
- **#10 Legal exposure on personal uploads** — defaults must be legally vetted before P1. For OnlineJourno equivalent: any user upload (reporter notes, doc attachments) needs legal opinion before enabling. **Recommendation: defer all user uploads to post-MVP.**
- **#12 Capability creep without a product owner** — 73 skills, 412 triggers, no triage. For OnlineJourno: auto-deactivate modules with zero use for 30 days per newsroom. Quarterly capability-bundle review with each customer.
- **#14 Editor (top sponsor) turnover** — customer-side risk for B2B. Design partner's signing Editor may leave. Mitigation: champion identification at signing (not just signer), 30-min "what is OnlineJourno value?" visible to any incoming editor.
- **#17 Adopted third-party dependency goes unmaintained** — OCCRP Aleph is the cautionary tale. ADR 0006 already implies adapter contracts; need to make this an explicit rule: every external dependency must be wrapped in an adapter.

### 2. `journalism agents/docs/hindu_implementation_priority.md`

16-week, 3-FTE, $337K plan for The Hindu. Heavy stack: Superdesk + spaCy + GENRE + Loki + RDFLib + FrOG + Wikibase + DSpace. This is the *pre-`founder_honest_assessment`* thinking. Useful as Hindu-specific reference, but most of its stack choices were corrected later by the scorecard. Treat as REFERENCE not blueprint.

### 3. `journalism agents/docs/integrated_vision_complete.md`

Three-layer model: Infrastructure → Skill Platform → Intelligence Desk. This is OnlineJournalism.in's *publication + training* vision, not OnlineJourno's B2B platform. The flywheel argument (platform data feeds book authority) is for the publication side, not relevant to the product. Confirms `BRAND-DECISION.md`'s separation: OJ.in and OJ.com serve different things.

### 4. `journalism agents/docs/onlinejournalism_platform_rethink.md`

A hard pivot doc: reject over-engineering (spaCy/Loki/Superdesk), adopt WordPress + Airtable + Figma + Discourse + YouTube. Pricing model: free → $9/mo individual → $500–2K/mo newsroom license. This is the OJ.in publication's commercial layer, not OJ.com product. Useful design wisdom (journalist-first, no PM bloat), confirms the product brand split.

### 5. `journalism agents/docs/newsroom_agentic_stack_toolkit.md`

The 145-tool landscape. This is the input that `founder_honest_assessment.md` later corrected. Most of these tools scored 🔴 or 🟡 in the scorecard. Treat the scorecard as canon, this doc as catalogue.

### 6. `~/Data Protection/discover-dashboard/CLAUDE.md`

The product-architecture target for the discover-dashboard (THGP work, owned by founder per confirmation):
- React (TS strict) + FastAPI (Python) + Postgres + pgvector.
- Geneea **replaces spaCy** for NER + IPTC classification + event classification.
- Claude Haiku with prompt caching for RAG synthesis + angle suggestions + daily brief.
- OpenAI `text-embedding-3-small` for archive embeddings.
- Scrapy + Playwright for scraping.

Conflict with OnlineJourno ADR 0002 (Next.js, not React + Vite): **our choice is for product UX; the discover-dashboard's React + FastAPI was for internal analyst tooling.** OnlineJourno's web app is customer-facing and editorial; Next.js wins for App Router + RSC + SEO basics. Workers in Python is the same in both.

The NLP decision (Geneea over spaCy) is interesting and matters:
- Geneea is a paid SaaS. Per-newsroom cost. Indian English handled well. IPTC-native.
- For OnlineJourno MVP wedge (markets/regulatory shortlist), entity extraction is *not* needed in Wk 1. Defer the decision to Wk 9+ when archive search / framing / discover-seo modules ship.

### 7. `~/Data Protection/discover-dashboard/CONTEXT.md`

Ten ADRs already documented for discover-dashboard. Patterns to harvest into OnlineJourno:
- **AD-001 Two protocols, not one** — `StoryFetcher` returns `Story`, `TrendFetcher` returns `Trend`. Don't union return types into a single fake-shared protocol.
- **AD-003 Construction-time config, parameterless fetch** — pass `max_per_feed` etc. to constructors, not `fetch()`. Keeps protocol clean.
- **AD-004 is_excluded in adapter, not pipeline** — per-source exclusion logic stays with the adapter.
- **AD-005 FetchError not silent []** — adapters raise on unrecoverable failure; pipeline catches per-fetcher and logs. Broken API keys become visible.
- **AD-009 analyse_story accepts Story, not raw rss_entry** — no feedparser object leaks past the fetcher seam.
- **AD-010 Design system tokens** — all colour and spacing values as named constants. No bare hex / px. Worth porting to TS/Tailwind too.

These are *all* worth carrying into OnlineJourno. Will add as ADRs in this repo (numbered 0007+) during Wk 0 or Wk 1.

---

## Tensions surfaced

1. **OJ.in (publication+training) vs OJ.com (product)** — three of the strategy docs treat the publication as the centre of gravity. The OnlineJourno platform deliberately does not. `BRAND-DECISION.md` already locks this; reinforce it in Fri reconciliation and don't let publication ideas creep into the product scope.

2. **discover-dashboard chose Geneea over spaCy** — OnlineJourno hasn't made that call. The pragmatic answer: **defer NER entirely until Wk 9+.** Markets/regulatory shortlist doesn't need entity extraction; the source-level metadata (issuer, filing type, dated reference) is structured by the source. When NER lands, evaluate Geneea vs. self-hosted (spaCy + Stanza) at that point.

3. **The 145-tool stack vs the 9-tool scorecard** — already resolved in `founder_honest_assessment.md`. Reaffirm: refuse any tool scoring 🔴 in the canon unless a module makes a concrete case for it (ADR).

4. **Generative drafting in any Y1 timeframe** — both the premortem (vernacular quality) and the scorecard (GPT-J = 🟡, only for brainstorming) argue against. `MVP-SCOPE.md` already excludes drafting. Reinforce.

5. **Heavy archive infrastructure (RDFLib/FrOG/Wikibase) shipping in Year 1** — every doc except the scorecard recommends it. Scorecard says defer 18+ months. Side with the scorecard for OnlineJourno; archive intelligence is a Phase 3 module, not MVP.

---

## Plan changes triggered (to apply Thu–Fri)

Five concrete additions before Wk 1:

### A. Cost simulator before first paying customer

Add `docs/COST-MODEL.md` Thu Jun 4. Inputs: signals/day per source, % shortlisted, brief composition cost, brief length, vector embedding cost, cache hit rate. Outputs: per-newsroom $/day at typical and worst-case volumes. Stress-test at 2× current estimate. If margin negative at 2×, revise pricing or refuse the module.

Bake `cost_budgets` table in `infra/schema.sql` (already present). Add daily hard cap enforced at the gateway, not just in app logic.

### B. Portal-health monitoring as a first-class module

Source rot is real (premortem #6). Add `m-portal-health` to the module list. Lifecycle: every collector run records latency + parse-success; an agent flags any source silent or failing for 24 hrs. Editorial alert (in the brief itself), not just engineering alert. This is *labour* protected by *automation*.

### C. Documentation as first deliverable

Already aligned with `CLAUDE.md` discipline, but make it explicit: every module's `README.md` must ship in the same PR that ships the module's code, not after.

### D. Adapter contracts on every external dependency

Add a Wk 1 ADR (0007) making this binding: anything we depend on (Anthropic, Postgres extensions, source-specific APIs, future Geneea) is accessed through a typed adapter in `packages/spine/adapters/`. When a dependency goes dormant, the swap is a new adapter implementation, not a project-wide refactor.

### E. Module auto-deactivation policy

Per premortem #12. Modules with zero shortlist contribution / zero journalist interaction for 30 days at a tenant flag for review. Either re-tune or unmount. Capture in ADR 0006 amendment or new ADR 0008.

### F. Harvest discover-dashboard ADRs

Carry over (or adapt) AD-001, AD-003, AD-004, AD-005, AD-009, AD-010 from `~/Data Protection/discover-dashboard/CONTEXT.md`. These are battle-tested patterns. Will become OnlineJourno ADRs 0009–0014 during Wk 1.

---

## Open questions for Fri reconcile

1. **Do we need cost simulator before signing design partner, or before they pay?** Recommend before signing (free pilot still costs us API).
2. **Is the 30-day module auto-deactivation across the whole tenant or per beat?** Probably per beat; markets desk uses different modules than politics desk.
3. **What's our adapter rule for Anthropic outage?** Per premortem #17. Do we have an Anthropic-down degraded mode (cached briefs only)?
4. **Source-rot SLA to customers** — when MCA portal changes overnight, what's the customer-facing promise? "Source restored in 24 hrs" vs. "best-effort"?
5. **Champion identification clause in design-partner LOI** — does our outreach message include "introduce me to two stakeholders not just the signer"?

---

## Risk reassessment

The premortem changes my prior risk ordering. New top-3 risks for OnlineJourno:

1. **AI cost runaway** (premortem #3). Mitigation: structural caps, model routing rules in manifest, gateway enforcement.
2. **Scraper rot eats founder time** (premortem #6). Mitigation: `m-portal-health` module + editorial alerts + rotating maintenance day per week.
3. **Customer editor turnover** (premortem #14). Mitigation: champion + 30-min visible value.

Cost ladder Mon Jun 1: $0 spent. Cost ladder so far this session: ~$0.20 (Anthropic). Acceptable.

---

## Reading time

About 90 min total. Not over-budget for Mon. Tue ledger work next.
