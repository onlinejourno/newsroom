# ADR 0057 — Predictive Editorial Calendar: the anticipatory backbone

**Status:** Accepted (2026-06-13). Absorbs the standalone PEC PRD (2026-05-17) into the platform.

## Context

Newsrooms run reactively — they discover most stories the morning they break.
But much important news is **foreseeable**: officials make time-bound promises
("highway by June", "report tabled next session"). The Predictive Editorial
Calendar extracts those dated claims from the inflow and places them on a
forward calendar with lead-time markers, so an editor sees a story coming
while there is still time to report it — and flags past-due promises for
accountability ("promised by X — delivered?"). The founder calls this
"practically the backbone." It is seared in here, not a separate product.

## How the PRD's eight modules map onto this platform (reuse, don't rebuild)

| PRD module | Platform |
|------------|----------|
| Sources (one adapter per source) | ✅ exists — the source registry + collectors (ADR 0050) |
| Gate (cheap pre-filter for dated claims) | new: a keyword/heuristic prefilter before the LLM (mirrors the English script-gate pattern) |
| **Claim Extractor (the one real LLM agent)** | new agents-py module `m-calendar`; the provider-agnostic completer (ADR 0040), batched + cost-capped like enrich/frame |
| Date Normaliser (pure, edge-case-heavy) | new pure module, exhaustively unit-tested (no I/O, no LLM) |
| Calendar Engine (lead-time markers 90/60/30/14/7/1, status) | new pure module, unit-tested |
| Store | ✅ `calendar_event` is already in the canonical model (ADR 0046); extend it to the PRD event shape |
| Pipeline Runner | ✅ the cron (`infra/cron/pipeline.sh`) gains a calendar step |
| Web View (Forward calendar · Event feed · Past-due · Pipeline) | new `/calendar` surface; IOJ broadsheet design |

Event shape (the contract): `who · what · deadline · date_claimed ·
source_link · original_claim_text · confidence · topic/beat`.

## Decision

1. **Build `m-calendar` as a dedicated slice** (not squeezed in): the Date
   Normaliser + Calendar Engine (pure, test-first), then the Claim Extractor
   (LLM agent, reusable), wired to the cron and a `/calendar` view with the
   four PRD views + the lead-time markers.
2. **It fuses with the workflow (ADR 0056):** a calendar deadline coming due
   auto-creates a `requested` story_lead (commission-ahead); a **past-due**
   promise creates an accountability lead. The calendar feeds the Newslist —
   anticipatory journalism becomes assignable work.
3. **LLM-first, agents surgical** (PRD's headline): the LLM does only the
   judgment task (extracting fuzzy dated claims); fetch/parse/date-math/
   filter/store/schedule/render stay deterministic code. This is the
   product's cost+reliability story.
4. **Clean-room note honoured in spirit, adapted:** the PRD's standalone
   product is Hindu-free + IOJ-only. On the consolidated platform the
   calendar is a module of OnlineJourno (vendor-neutral, ADR 0042); the
   reusable assets (Claim Extractor, Date Normaliser) stay liftable.

## Build order (the dedicated slice, when picked)
1. Date Normaliser + Calendar Engine (pure, exhaustive tests).
2. `calendar_event` migration to the PRD event shape + Store helpers.
3. Claim Extractor (LLM) + Gate; cron step.
4. `/calendar` view (forward calendar · feed · past-due · pipeline).
5. Calendar ↔ Newslist fusion (due → requested lead; past-due → accountability lead).

## Out of scope (per PRD)
Social ingestion, fulfilment adjudication (human task — we only flag past-due),
vector dedup/knowledge-graph, production hardening.

## References
- The PEC PRD (2026-05-17); ADR 0046 (calendar_event), 0056 (Newslist),
  0040 (LLM), 0050 (sources), 0049 (user needs).
