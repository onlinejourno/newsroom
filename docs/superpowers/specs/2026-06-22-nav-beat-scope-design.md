# Design spec — Living masthead, step 2: beat personalization

**Status:** Drafted 2026-06-22. Context-sensitive nav step 2 (step 1 = live counts, live). Scopes the
masthead counts to the signed-in **reporter's beats** so they see *their* load, not the whole
newsroom's. Pre-outlined when step 1 shipped.

## Decision

- **Scope by beat** — `beat` exists on every count table (`signals.beat`, `story_leads.beat`,
  `stories.beat`, `calendar_event.topic`); region only on `signals`, so geo scoping is a partial
  follow-on, not this step.
- **Who:** **reporters with ≥1 beat** get beat-scoped counts. Desk / editor / admin / viewer (and a
  reporter with no beats) stay **newsroom-wide** (unscoped) — leadership needs the whole picture.
- No "my beats ↔ newsroom" toggle yet (follow-on); auto-scope by role.

## Changes

| File | Change |
|---|---|
| `apps/web/lib/db.ts` | `navStageCounts(tenantId, beats?: string[] \| null)` — when `beats?.length`, add a beat filter to each subselect (`topic` for calendar): `and ($2::text[] is null or beat = any($2))`. `null`/empty → unscoped (unchanged behaviour). |
| `apps/web/components/Masthead.tsx` | new `beats?: string[]` prop; `const scope = role === "reporter" && beats?.length ? beats : null;` → `navStageCounts(tenantId, scope)`. |
| `apps/web/app/[locale]/layout.tsx` | pass `beats={account?.beats}` to `<Masthead>` (layout already has `account`). |

`deriveNavSignals` unchanged (still pure over the counts).

## Testing & success criteria

- `type-check` + `build` green.
- Prod: a reporter's scoped counts ≤ the newsroom-wide counts for the same tenant (verify via the
  scoped vs unscoped query). The demo's editor/admin still sees full counts.
- nav-signals unit tests still green (derive unchanged).

## Out of scope

Region/geo scoping (only signals carries region) · the my-beats/newsroom toggle · step 3 (the full
reorder/promote/hide engine + predicted lifecycle stage).

## References

`lib/db.ts navStageCounts` (step 1), `Masthead.tsx`, `auth.ts` Account (`beats`/`region`),
migration `0007_front_engine_signal_model.sql` (beat/region columns). [[onlinejourno-design-northstar]].
