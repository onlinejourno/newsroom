# Design spec — PLAN · Calendar editorial surface

**Status:** Drafted 2026-06-19 from the founder's approved mockup (claude.ai *OnlineJourno
Redesign* → the "Promises ahead." Calendar page). First surface of **Phase C** — implementing
the full editorial design across the lifecycle surfaces, one slice each (Calendar is the
IA spine). Builds on Phase A (lifecycle nav + tokens) and the ADR 0013 design system.

## Why

Phase A gave every lifecycle surface the new masthead, but only FRAME·Analyse + sign-in got
their per-surface editorial design. PLAN·Calendar — the **planning spine** (IA north-star) —
is still a functional beat×day grid. The mockup redesigns it in the editorial language:
a serif "Promises ahead." lead, a live "now" block, a promise-health summary, and a reskinned
beat×day grid. This spec implements that surface faithfully **to the real promise data**.

## What the Calendar is (grounding)

`calendar_event` rows are **promises** — public-record commitments ("table the privileges
committee report", "open the Velachery flyover") with `who`, `what`, `target_date`,
`precision` (`day`/`month`/`quarter`/`fiscal_year`/`year`/`none`), `outcome`
(`delivered`/`broken`/`dropped`/null=open), and `lead_id` (commissioned or not). The existing
`lib/calendar.ts` `classify(target, today)` computes `daysOut` / `status` / urgency `band`;
`CalendarApp` renders the beat×day board + the commission workflow (assign reporter → newslist).

## Decisions (this brainstorm)

1. **Now-block adapts to real promise data.** The mockup's three cards
   (NEXT DEADLINE / NEXT PUBLISH WINDOW / NEXT FIXED EVENT) and minute countdowns exceed the
   model (promises only; no publish-windows, no fixed-event type, day/month precision, no
   time-of-day). Build the now-block from **the next 1–3 open promises due**, with
   precision-honest countdowns. Publish-windows / fixed-events are a later slice once modeled.
2. **Approach A — editorial header above a reskinned board.** Server-render the editorial
   header (lead + stats + now-block) above the existing `CalendarApp`; reskin the board's
   visuals in place. The commission workflow + interactivity are preserved (not a 799-line
   rewrite).
3. **"Ready to file"** = open + assigned (`lead_id` set) + due within the lead-time window
   (≤7 days). A real, actionable count.
4. **No minute-level countdowns** (no time-of-day in the data); the clock ticks, promise
   countdowns are day-grained and precision-honest.
5. **Drop the mockup's "FIXED EVENTS" grid row** (no fixed-event data).

## Architecture & data flow

```
calendar/page.tsx (server)
   fetchCalendarEvents(tenantId)            ← existing
   calendarSummary(events, today)           ← NEW pure helper (lib/calendar.ts)
      promisesThisWeek  open & target_date in current IST week
      atRisk            open & overdue or due-today        (classify().urgency)
      unassigned        open & lead_id is null
      readyToFile       open & lead_id set & daysOut in 0..7
   nextDue = open promises sorted by target_date, top 3
        │
        ▼
   <CalendarHeader> (server)   label + ds-lead "Promises ahead." + summary stats + now-block
        └ <LiveClock> (client) ticking IST HH:MM:SS only
        │
        ▼
   <CalendarApp> (client, existing)   reskinned beat×day board; commission workflow untouched
```

No new DB columns — everything from `calendar_event` + `classify()`. Vendor-neutral: city
in the now-block comes from `tenants.config` (omitted if unset; never hardcoded).

## The now-block

- **Top row:** `LiveClock` (ticking IST `HH:MM:SS`) · `Wed 18 Jun 2026` · city (tenant config,
  omitted if unset). Dark editorial block per the mockup.
- **Cards:** the next 1–3 open promises (`what`, `who`, precision-honest countdown). Overdue
  promises styled with `URGENCY_COLOR.overdue` (red). Empty state when no open promises.

### Precision-honest countdown (`deadlineCountdown`, new pure helper)

| precision | label |
|---|---|
| `day`, past due | "overdue" (+ "by N days" when N≥1) |
| `day`, due today / tomorrow / soon | "today" · "tomorrow" · "in N days" |
| `month` | "by end of {Month}" (no day count) |
| `quarter` | "this quarter" / "by {Qn}" |
| `fiscal_year` | "in FY{yy}" |
| `year` | "in {year}" |
| `none` | "date TBD" |

## Summary stats line

`N promises this week · N at risk · N unassigned · N ready to file`, computed by
`calendarSummary` (above). Each count links/scrolls to the matching board filter where one
already exists; otherwise it is display-only. Zero-states render plainly ("No promises due
this week").

## Beat×day grid reskin

Reskin `CalendarApp`'s existing board to the editorial language:
- serif beat-row headers, mono times, generous rule lines (ADR 0013 tokens);
- the **TODAY column** highlighted (warm tint per the mockup);
- per-cell promise pills carrying the `deadlineCountdown` label + overdue-red;
- the mockup's "FIXED EVENTS" row is **dropped** (no data).
- **Preserve:** commission interaction (promise → assign reporter → newslist), beat filter,
  lead-time markers, all existing props/server-action wiring.

## Components & files

| File | Change |
|---|---|
| `apps/web/lib/calendar.ts` | **+** `deadlineCountdown(precision, status)` and `calendarSummary(events, today)` — pure, unit-tested |
| `apps/web/components/calendar/CalendarHeader.tsx` | **NEW** (server) — label + lead + stats + now-block |
| `apps/web/components/calendar/LiveClock.tsx` | **NEW** (client) — ticking IST clock only |
| `apps/web/app/[locale]/calendar/page.tsx` | compute summary + nextDue; render `CalendarHeader` above `CalendarApp` |
| `apps/web/components/calendar/CalendarApp.tsx` | reskin board visuals to ds tokens; **workflow untouched** |
| `apps/web/app/globals.css` | reuse existing ADR 0013 tokens; add classes only if unavoidable |

**Unit boundaries:** the two new helpers are pure (data in → label/counts out), no DB/React.
`CalendarHeader` composes them + the clock. `CalendarApp` keeps its single responsibility (the
interactive board) and only gets a visual reskin.

## Testing & success criteria

- **Pure helpers** (`deadlineCountdown`, `calendarSummary`) → `node:test` golden cases (runner
  added in Phase B): every precision band, overdue, week-boundary, and each stat count.
- **type-check + build**; live-verify on the seeded local calendar (105 events): the lead, the
  stats line, the now-block countdowns, the TODAY column, and that **commissioning still works**.
- Vendor-neutral: city from config; beats from data; no hardcoded outlet.

## Out of scope (this slice)

- Publish-windows and fixed-events (the two unmodeled now-block cards) + minute countdowns —
  a later slice once those concepts are modeled.
- The other lifecycle surfaces (Brief / Sources / Compose / Audit) — separate slices, mockups
  to be supplied by the founder.
- Any change to the commission workflow or the calendar data model.

## References

- Mockup: claude.ai *OnlineJourno Redesign* — the "Promises ahead." Calendar page (founder-shared).
- Redesign north-star: `docs/superpowers/specs/2026-06-18-onlinejourno-redesign-design.md`.
- `apps/web/lib/calendar.ts` (`classify`, `MARKERS`, `URGENCY_COLOR`, `istToday`);
  `apps/web/components/calendar/CalendarApp.tsx` (board + `daysOutLabel` + phase buckets).
- `infra/migrations/0016_calendar_event.sql` (promise model). ADR 0013 (tokens), 0057/0059
  (Calendar spine).
