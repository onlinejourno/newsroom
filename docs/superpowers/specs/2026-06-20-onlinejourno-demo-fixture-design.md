# Design spec — Rich demo fixture (Slice 2a)

**Status:** Drafted 2026-06-20. **Sub-slice 2a** of the demo slice. Extends the demo-tenant
fixture (`infra/seeds/import_newsintel_peers.py`) so the `demo` tenant looks **fleshed out across
every main surface**, not just FRAME·Analyse. The same fixture serves both later tiers — the
public `/showcase` (2b) and invited 3-day demo accounts (2c). Zero LLM; idempotent; demo-tenant-only.

## Why

The demo tenant currently seeds only peers + framing-coded signals + a few own stories → only
`/trends` looks populated; Calendar, Brief·Today, Scores, Journalists, Signals are empty. A casual
visitor (2b) and an invited tester (2c) must see a **complete, believable newsroom**. One rich
fixture, built once, satisfies both.

## Constraints (carry over)

- **Vendor-neutral:** the demo's *own* identity is generic **"Demo Newsroom"**; real outlets
  (The Hindu, TOI, …) appear only as **peers** (the competitive set — the point of the intel),
  never as the demo's own masthead.
- **Zero LLM/API cost:** all data synthesized deterministically in the seed (no pipeline, no
  enrichment calls).
- **Idempotent, demo-tenant-only:** delete-and-reseed the demo tenant's rows each run; never
  touches `self` or any real tenant.

## Surface coverage (what to add to the fixture)

| Surface | Current | Add |
|---|---|---|
| FRAME·Analyse | ✅ peers + framing signals + own stories | — |
| PLAN·Calendar | ❌ empty | ~10 `calendar_event` promises — varied `who`/`what`/`target_date` across `precision` (day/month/quarter) + urgencies (overdue / due-soon / horizon); unique `claim_key`; a few with `lead_id` linked |
| BRIEF·Today | ❌ empty | ~8 open `story_leads` — varied `importance` (urgent→low) + `trend_score` + `beat` + `note`, status in idea/pitched/assigned → exercises the "what to chase" ladder |
| SCORE·Audit / Potential / Gems | ⚠️ stories exist, unscored | `distribution_fit_scores` rows for the demo own-stories (so the scores join renders) + a few published stories shaped for `scorePotential` |
| IN·Sources / Signals | ⚠️ signals exist | add `enrichment.classify` (user_need, region) to the seeded peer signals so signal lists + filters look full |
| Journalists | ❌ empty | ~5 `journalist_profiles` (the demo newsroom's reporters: slug/name/beats/bureau/region/role) → journalists surface + commission assignees |

## Approach

Extend `import_newsintel_peers.py` with one new seed step per surface (mirroring the existing
delete-then-insert, idempotent pattern; all on the `demo` tenant). Synthesized data is keyed to
the existing `ALLOWED_TOPICS` / `TOPIC_POLICY` so the surfaces tell a coherent story (the same
topics that trend also have promises, leads, and coverage). A small deterministic helper builds
each row set; no randomness that breaks idempotency (fixed seeds / index-derived values).

Print a summary line (peers, signals, own-stories, promises, leads, journalists, scored) so a
re-run is verifiable.

## Components & files

| File | Change |
|---|---|
| `infra/seeds/import_newsintel_peers.py` | **EXTEND** — new steps: calendar promises, story leads, journalist profiles, distribution-fit scores, classify on signals. Keep existing steps + idempotency. |

No web/app code changes in 2a (data only). No migration (all tables exist).

## Testing & success criteria

- Run against the **local dev DB** + verify row counts per table (promises ~10, leads ~8,
  journalists ~5, scored stories present, signals carry classify).
- Re-run → idempotent (counts stable, no duplicate-key errors).
- `OJ_TENANT_SLUG=demo pnpm dev` → spot-check each surface renders fleshed-out: Calendar shows
  promises (now-block + grid + at-risk), Brief·Today shows ranked leads, Scores/Potential/Gems
  render scored stories, Journalists lists reporters, Trends unchanged.
- Vendor-neutral: demo masthead = "Demo Newsroom"; real outlets only as peers. Zero LLM calls.
- `self` untouched (the script only writes the `demo` tenant).

## Out of scope (2b / 2c)

- Public `/showcase` anon read-only route (2b).
- Invited 3-day accounts: `expires_at` migration, invite flow, prune, admin access (2c).
- Running the fixture on **prod** (an ops step after 2a builds + verifies locally).

## References

- `infra/seeds/import_newsintel_peers.py` (the fixture builder being extended).
- Schemas: `infra/migrations/0016_calendar_event.sql` (promises), `0015_story_leads.sql` (leads),
  `0007_front_engine_signal_model.sql` (journalist_profiles), `0011_distribution_fit_scores.sql`
  (scores). `apps/web/lib/db.ts` (the scores/potential/gems queries the fixture must satisfy).
- Memory: [[onlinejourno-oss-mission]] (configure-your-own; demo shows capability at zero cost).
