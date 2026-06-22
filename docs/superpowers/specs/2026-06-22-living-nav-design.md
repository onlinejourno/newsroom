# Design spec — Living masthead (context-sensitive nav, step 1: the moment axis)

**Status:** Drafted 2026-06-22. First step of the context-sensitive-nav north-star
([[onlinejourno-design-northstar]]). Adds **live, data-driven signals + emphasis** to the existing
role-gated lifecycle masthead. Beat/geo personalization + the full reorder engine are later steps.

## Why

The masthead (`lib/nav.ts` LIFECYCLE + `Masthead.tsx`) is role-gated but otherwise static — it
"feels like a generic admin/SaaS tool." Adding per-stage live counts + emphasis makes it *aware of
the moment*: where attention is needed now rises (vermilion), quiet stages stay muted.

## Architecture

Pure derive + one batched query + render. The masthead is a server component, so it fetches once
per render.

- **`lib/nav-signals.ts`** (pure, unit-tested): `NavTone = "critical" | "warning" | "neutral"`;
  `StageSignal = { count: number; tone: NavTone }`; `deriveNavSignals(counts) → { byPath:
  Record<string, StageSignal>, nowPath: string | null }`. `nowPath` = the single most-urgent
  non-zero stage to emphasize (priority: calendar → brief → signals → newslist → potential).
- **`lib/db.ts` `navStageCounts(tenantId)`**: ONE batched query (subselects, like
  `newsroomNowCounts`) → `{ calendar, brief, signals, newslist, potential: number }`:
  - **calendar** = at-risk deadlines: `calendar_event` where `tenant_id`, `outcome is null`,
    `target_date is not null`, `target_date <= now()+interval '7 days'` (imminent + overdue).
  - **brief** = open leads: `story_leads` status in (`idea`,`pitched`,`assigned`).
  - **signals** = new in 24h: `signals` where `coalesce(published_at,fetched_at) >= now()-24h`.
  - **newslist** = in flight: `stories` status in (`commissioned`,`draft`,`drafting`).
  - **potential** = to review: `stories` status `published` and `published_at >= now()-7d`.
  - (Analyse/trends has no cheap count — no badge in v1.)
- **`Masthead.tsx`**: `await navStageCounts(tenantId)` → `deriveNavSignals` → render a `Badge`
  (count) next to each stage `label` when `count > 0`. The `nowPath` stage's badge uses tone
  `critical` (vermilion); others `neutral`/`warning`. Role-gating + active underline unchanged.

## Tone logic (`deriveNavSignals`)

- `calendar` count > 0 → `critical` (deadlines are time-critical).
- `brief` count > 0 → `warning` (needs a decision).
- `signals` / `newslist` / `potential` count > 0 → `neutral`.
- `nowPath` = first non-zero stage in priority order calendar → brief → signals → newslist →
  potential. Its badge is forced to `critical` (the one place the eye should go).

## Components & files

| File | Change |
|---|---|
| `apps/web/lib/nav-signals.ts` | **NEW** — pure `deriveNavSignals` + types |
| `apps/web/lib/nav-signals.test.ts` | **NEW** — derive/tone/nowPath tests |
| `apps/web/lib/db.ts` | **NEW** `navStageCounts(tenantId)` (batched) |
| `apps/web/components/Masthead.tsx` | fetch counts + render `Badge` per stage + emphasis |

## Testing & success criteria

- `nav-signals.test.ts` passes (tone mapping, nowPath priority, all-zero → no emphasis).
- `type-check` + `build` green.
- Live: the masthead shows counts on the relevant stages; the most-urgent stage reads vermilion;
  a quiet tenant shows no badges (graceful zero). Multilingual + mobile (badges wrap) intact.
- One DB round-trip added per page render (cheap indexed counts).

## Out of scope (later steps)

- Beat/geo personalization (scope counts to the user's beat/region).
- Full reorder/promote/hide context engine + predicted-lifecycle-stage.
- Analyse/trending badge (needs the trends computation).
- A separate "right now" text cue line (badges suffice for v1).

## References

`lib/nav.ts` (LIFECYCLE), `Masthead.tsx`, `newsroomNowCounts` (db.ts — reuse the batched-subselect
pattern), `components/ui/badge.tsx`. Memory: [[onlinejourno-design-northstar]], [[onlinejourno-ia-northstar]].
