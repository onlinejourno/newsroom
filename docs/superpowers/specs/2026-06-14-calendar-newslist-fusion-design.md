# Calendar → Newslist fusion — design (slice 1)

**Date:** 2026-06-14
**Status:** Approved (design), pre-implementation.
**ADRs:** 0057 §2 (predictive calendar ↔ workflow fusion), 0056 (story lifecycle / Newslist), 0058 (IA spine), 0035 (decision-support, not autopilot), 0059 (planning — later slices).

## Problem

The Predictive Editorial Calendar (ADR 0057) extracts dated promises into `calendar_event`, but nothing turns them into assignable work. The schema is already prepared for the fusion — `calendar_event.lead_id` (commented "fusion (ADR 0057): commission / accountability lead") and `story_leads.origin='requested'` both exist — yet no code populates them. Result: the Calendar is an isolated view, not a feeder of the Newslist. This is the core cohesion gap (Calendar ↛ Newslist) the founder named.

## Goal / success test

A dated promise coming due appears as a `requested` lead in a new **Suggested** intake column on the Newslist, where an editor commissions it (→ assigned) or kills it. A past-due promise appears as an accountability lead. An editor can also manually commission any calendar event early. Re-running the pipeline never creates duplicates.

## Decisions

1. **Trigger = hybrid** (safe under ADR 0035 — `requested` is a *suggestion* state the editor still acts on):
   - **Auto (cron) — commission-ahead:** event with a resolvable `target_date` entering the **≤ 7d** band and `confidence ≥ 0.7` → `requested` lead.
   - **Auto (cron) — accountability:** event past-due (`target_date < today`), `outcome IS NULL`, no `lead_id`, `confidence ≥ 0.7` → accountability lead.
   - **Manual:** a **"Commission →"** button on any calendar event with a resolvable `target_date` → `requested` lead (any band/confidence).

2. **Board placement = new leftmost "Suggested" column** = leads with `status='idea'` and `origin='requested'`. No migration: the `status` enum already includes `idea`; it simply never had a column. New board order: **Suggested → Pitched → Assigned → Filed → Approved → Published.**

3. **Where the logic lives:**
   - **Auto = Python `calendar-fuse` cron step** (agents-py + a step in `infra/cron/pipeline.sh`, after `claim-extract`/`trends`). Batch, scheduled — lives with the rest of the calendar pipeline.
   - **Manual = TS server action** reusing `createLead` in `apps/web/lib/workflow.ts`, then setting `calendar_event.lead_id`.
   - **Shared contract = the DB schema**, not shared code (CLAUDE.md: cross-language IPC is HTTP + Postgres only). Matches the existing split: Python for batch pipeline, TS for interactive board.

4. **Lead fields from the event:** `signal_id`, `topic` → beat/topic, `keywords`, `target_date` → `eta`, `importance` default `normal`; commissioner = `null` (auto) or the clicking editor (manual). Accountability lead carries a note: *"Promised by {who}, due {date} — delivered?"* (and is otherwise an ordinary `requested`/`idea` lead so it sits in Suggested).

5. **Constants:** `FUSE_BAND_DAYS = 7`, `FUSE_MIN_CONFIDENCE = 0.7` as named constants now; per-tenant config deferred (YAGNI).

## Data flow

**Auto (each pipeline pass):**
1. Select `calendar_event` rows where `lead_id IS NULL` and `confidence >= 0.7` and either
   - `target_date BETWEEN today AND today + 7` → commission-ahead, or
   - `target_date < today AND outcome IS NULL` → accountability.
2. For each: insert a `story_lead` (`origin='requested'`, `status='idea'`, fields per Decision 4); set `calendar_event.lead_id` to the new lead.

**Manual:** editor clicks **Commission →** on a calendar event → `createLead(...)` (same field mapping) → set `calendar_event.lead_id`.

**Board / cross-link:** the Suggested column renders leads with `status='idea'`; each card shows the source promise, a "from Calendar" marker, and commission/kill actions. The calendar event detail links to its lead, and the lead links back to the event (both directions).

## Dedup / edge cases

- **One lead per event:** skip any event whose `lead_id` is already set. The auto query's `lead_id IS NULL` filter enforces this.
- **Duplicate events:** already prevented by the existing `unique (tenant_id, claim_key)`.
- **Killing a Suggested lead:** leave `calendar_event.lead_id` pointing at the killed lead (tombstone). Because the auto query filters on `lead_id IS NULL`, a killed-but-linked event is never re-created. The killed lead (`status='killed'`) drops off the board.
- **Unresolvable dates:** events with `target_date IS NULL` (precision `none`) are never auto-created and the manual button is disabled for them — there is no date to act on. They remain on the Calendar.
- **Cross-origin dedup** (a reporter already pitched the same promise) is **out of scope for v1** — the editor kills the duplicate; noted for a later slice.

## Testing (TDD)

- **Pure selection function** — `(events, today, …) → { commission[], accountability[] }` — exhaustively unit-tested: band edges (day 7 vs 8), confidence floor (0.69 vs 0.70), already-fused, past-due, `target_date IS NULL`, precision variants. Mirrors the pure `date_normalise` / `calendar_engine` modules.
- **DB integration** — insert + `lead_id` link + idempotent re-run (a second pass creates nothing new).
- **TS** — server-action test for manual commission (creates the lead, links the event, disabled when no `target_date`).

## Out of scope (v1)

- Cross-origin dedup against reporter pitches.
- Per-tenant band / confidence configuration.
- The wider ADR 0059 planning surface (lead → plan, production tasks) — later slices.
- The nav-grouping decision (time-horizon "Calendar menu set" vs ADR 0058 job-split) — independent of this slice.
