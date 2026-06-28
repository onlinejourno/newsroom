# Scored Pitch — Design Spec

> **Status:** approved design, pre-implementation. Next step: `writing-plans`.
> **Date:** 2026-06-28 · **Repo:** `onlinejourno/arena` (`~/projects/platform`)

## Goal

Give reporters a clear, prominent way to **pitch stories**, where prominence is
driven by **engine merit** (not who shouts loudest), and where **topic +
semantic entities + archival weight** feed the workflow. A pitch is scored the
moment it is written, the reporter sees *why*, and the weighted pitch surfaces
wherever it is relevant — the newslist, the calendar, and the entity it touches.

Attribution is always to the **journalist** who pitched (never the desk/admin).

## Current state (verified, not assumed)

- **Pitch path exists but thin.** `newslist/page.tsx` has a "Pitch a story…"
  composer → `origin='pitched'`, a Pitched column, "pitched by [journalist]"
  attribution; `feed/[journalist]/page.tsx` has "pitch to desk". A pitch is
  effectively a `title + note` card. No weight, no entities, no prominence.
- **Scoring engine exists, pitch not plugged in.** `scoring-py/.../potential.py`:
  `potential = 0.35·merit + 0.65·reach`, `reach = f(trend_momentum,
  content_alignment, domain_authority, freshness)`; `merit_gap = reach − merit`.
- **Lead schema** (`infra/migrations/0015_story_leads.sql`) carries
  `importance, trend_score, keywords[], topic, note` — none wired to pitches; no
  entities, no merit/reach/potential, no archival columns.
- **No `entities` table.** The RLS reference to `entities` is stale — no such
  table is created in any migration. Entity **names** live only inside
  per-signal `signals.enrichment` jsonb (`enrich.py` writes
  `enrichment.entities=[…]`). The only cross-signal aggregate,
  `channel_affinity_log` (`0023`), is keyed by entity **type**
  (Person|Location|Organisation|Topic|Named Entity), **not name** — so it cannot
  answer "how much have we covered Person:X". **There is no name-grained entity
  index anywhere.**
- **Web↔Python bridge already synchronous.** `apps/web/lib/{analyze,seoAudit,
  topicDomains,outletKeywords}.ts` call Python via `execFile("uv", …)` and parse
  stdout JSON. Hybrid compose-time scoring reuses this — no new bridge needed.
- **Reference patterns to mirror:** `agents-py/.../claim_extract.py` (Gate →
  cost-capped LLM → pure validator/builder) and the merged `calendar_fuse.py`
  slice (pure `decide()` + thin wiring, test-first).

## Locked decisions

| Question | Decision |
|---|---|
| Prominence spine | **Engine merit.** `potential.py` drives the base weight. |
| Human modifier | **Conviction only** (`low\|normal\|high`), bounded so it cannot invert merit order. |
| Archival weight | **authority × staleness** of the specific entity — "we own this and went quiet → revive". |
| Entities source | **Hybrid** — auto-extract from pitch text, reporter confirms/edits before submit. |
| Surfaces | Newslist Pitched column · Calendar Gantt · **Entity page + signal page** (no longer deferred). |
| Approach | **A — Scored-pitch slice (reuse-max).** No new lead table; additive columns. |

## Architecture

A pitch reuses the existing `story_leads` state machine. Scoring is a **pure
Python decision** layered on the existing engine, invoked **synchronously at
compose time** via the existing `execFile("uv", …)` bridge so the reporter sees
entities **and** weight before submitting (the ground-up principle: the surface
educates the reporter).

The one genuinely new primitive is a **name-grained entity index**
(`entity_coverage`), derived from `signals.enrichment`. Both archival weight and
the entity page read it; it is built once, first.

```
reporter writes title+note
        │  (TS server action → execFile uv pitch-scan)
        ▼
pitch_scan.py  ── extract entities/topic (LLM, gated, cost-capped)
        │       ── score: potential_score(merit,reach)            [reuse potential.py]
        │       ── archival = authority×staleness(entity_coverage) [reuse index]
        │       ── pitch_weight.decide(merit,reach,archival,conviction) → (weight, why)
        ▼
returns {entities, topic, merit, reach, potential, archival_weight,
         pitch_weight, pitch_why}  → reporter confirms/edits chips
        │  (TS server action: createLead, origin='pitched', status='pitched')
        ▼
story_leads row (+ entities jsonb, scores, conviction, pitch_weight, pitch_why)
        │
        ├── Newslist Pitched column   — sort by pitch_weight, badge + why-chip
        ├── Calendar Gantt            — pitched lead w/ eta shows weight badge
        └── Entity / signal page      — "reporters pitched on this entity"
```

## Components

### C1 — Entity coverage index (new primitive)
- **Migration** `0027_entity_coverage.sql`: `entity_coverage` (table refreshed by
  a step, or a view — chosen in planning) with
  `(tenant_id, entity_type, entity_name) → appearance_count, last_seen, story_ids[]`,
  derived from `signals.enrichment.entities`.
- **Read helper** (agents-py + a `db.ts` query): `coverage_for(name, type)` →
  `{count, last_seen}`. Pure aggregation logic unit-tested.

### C2 — Weight engine (pure, test-first)
- `scoring-py/.../pitch_weight.py`:
  - `archival_weight(count, days_since_last) -> int` — pure authority×staleness.
  - `decide(merit, reach, archival, conviction) -> (pitch_weight:int, why:str)`:
    `potential = potential_score(merit, …)` as spine; conviction nudges ±, archival
    boosts; result **clamped so modifiers cannot invert merit order beyond a fixed
    cap**; `why` is a one-line human string.
- `tests/test_pitch_weight.py` — mirrors `test_calendar_fuse.py`.

### C3 — Pitch scan (extract + score)
- `agents-py/.../pitch_scan.py`, mirrors `claim_extract.py`: Gate (skip empty) →
  cost-capped LLM entity/topic extraction → pure `coerce_entities()` validator →
  call C1 + C2. Entity vocab matches enrichment (Location|Person|Organisation|
  Topic|Named Entity).
- CLI `pitch-scan --tenant <id> --text "<title+note>"` → JSON on stdout
  (`{entities, topic, merit, reach, potential, archival_weight, pitch_weight,
  pitch_why}`). Pure parts unit-tested; LLM path gated + cost-capped.

### C4 — Data model (additive)
`0027` (same migration as C1) adds to `story_leads`:
`entities jsonb default '[]'`, `merit int`, `reach int`, `potential int`,
`archival_weight int`, `conviction text check(low|normal|high) default 'normal'`,
`pitch_weight int`, `pitch_why text`. No new lead table; no change to existing
columns or the status/origin checks.

### C5 — Compose + confirm + ranked column (web)
- `newslist/page.tsx` + composer: "Scan" action → `lib/pitchScan.ts`
  (`execFile uv pitch-scan`) → render entity chips + weight + why; reporter
  edits chips, sets conviction; "Submit" → server action `createLead` persists
  entities + scores + conviction + weight.
- Pitched column sorts by `pitch_weight desc`, shows score badge + why-chip +
  existing "pitched by [journalist]".

### C6 — Calendar + entity/signal surfaces
- `CalendarApp.tsx`: a pitched lead with an `eta` renders on the Gantt with its
  weight badge (reuses the fusion lead link).
- `signal/[id]/page.tsx`: "Reporters pitched on this" — leads whose `entities`
  intersect the signal's entities.
- **Entity page** `app/[locale]/entity/[type]/[name]/page.tsx`: coverage history
  (from `entity_coverage`) + open pitches on that entity — a thin view on C1.

## Data flow & error handling

- **Empty/low-signal pitch:** Gate returns no entities → `pitch_weight` from
  merit/reach only; UI still submits (entities optional, weight present).
- **LLM failure / cost cap hit:** `pitch-scan` returns entities=`[]` with a
  `degraded:true` flag; reporter can submit (manual chips) or retry. Never blocks
  the pitch.
- **Unknown entity (no coverage rows):** `archival_weight = 0` (authority 0) — a
  brand-new entity gets no archival boost, which is correct.
- **execFile timeout:** server action surfaces a retry; pitch can still be
  submitted unscored (`pitch_weight = potential` fallback computed in TS from
  stored merit/reach if present, else null + "scoring…" chip).

## Testing

- **Python:** test-first (pytest) for all pure logic — `archival_weight`,
  `decide`, `coerce_entities`, `coverage_for` aggregation. Mirrors the 8-test
  `test_calendar_fuse.py`.
- **TS:** no test runner exists; verify via
  `pnpm --filter @onlinejourno/web type-check` + running the `pitch-scan` CLI and
  loading `/en/newslist`, `/en/calendar`, an entity page. (Adding a TS runner is
  out of scope.)
- **Security/DoD:** run `/caveman-review` (security focus) before deploy per the
  deploy gate; verify tenant isolation on `entity_coverage` + new lead columns.

## Slices (each independently shippable)

1. **Entity coverage index** — `0027` + `entity_coverage` + read helpers + tests.
2. **Weight engine** — `pitch_weight.py` (archival + decide) + tests.
3. **Pitch scan** — `pitch_scan.py` + `pitch-scan` CLI + `lib/pitchScan.ts` execFile.
4. **Compose + confirm + ranked Pitched column.**
5. **Calendar weight badge.**
6. **Entity page + signal-page "pitched on this".**

## Out of scope

- New TS test runner.
- Re-scoring cron to decay staleness over time (core path scores at submit;
  optional later).
- Normalising entities into a first-class relational model beyond
  `entity_coverage` (jsonb-derived index is sufficient for this work).
- Daily brief / rundown surface (explicitly excluded by the surface decision).
- Reporter-conviction analytics, desk-feedback threads, pitch revisions
  (Approach B territory — deferred).
