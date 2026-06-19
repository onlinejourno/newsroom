# PLAN · Calendar Editorial Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give PLAN·Calendar (`/calendar`) its editorial "Promises ahead." design — a serif lead, a promise-health summary, and a live "now" block of the next due promises — above the existing interactive board, faithful to the founder's mockup and honest to the promise data.

**Architecture:** Server-render an editorial header (`CalendarHeader`) above the existing client `CalendarApp` (untouched workflow). Two new pure helpers in `lib/calendar.ts` (precision-honest countdown + promise-health summary) feed the header; a tiny client `LiveClock` ticks the IST time. No DB columns added.

**Tech Stack:** Next.js 15 (App Router, server + client components), TypeScript, existing `lib/calendar.ts` (`classify`, `istToday`, `toCalendarDate`, `URGENCY_COLOR`). Tests via `node:test` + `tsx` (added in Phase B).

**Spec:** `docs/superpowers/specs/2026-06-19-onlinejourno-calendar-surface-design.md`.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/lib/calendar.ts` | **MODIFY.** Add pure `deadlineCountdown()` + `calendarSummary()` (+ internal `weekStart`/`addDays`/`MONTHS`). Pure logic only. |
| `apps/web/lib/calendar.test.ts` | **NEW.** `node:test` golden cases for both helpers. |
| `apps/web/components/calendar/LiveClock.tsx` | **NEW.** Client component: ticking IST `HH:MM:SS`. Nothing else. |
| `apps/web/components/calendar/CalendarHeader.tsx` | **NEW.** Server component: label + lead + stats line + now-block. Composition only. |
| `apps/web/lib/db.ts` | **MODIFY.** Add `tenantCity()` (mirrors `tenantOutletDomain`). |
| `apps/web/app/[locale]/calendar/page.tsx` | **MODIFY.** Compute summary + nextDue from rows; render `CalendarHeader` above `CalendarApp`. |

`CalendarApp.tsx` is **not** modified in this plan (it already uses ADR 0013 tokens). A board visual-polish pass is a separate follow-up.

---

## Task 1: Pure helpers + tests

**Files:**
- Modify: `apps/web/lib/calendar.ts`
- Test: `apps/web/lib/calendar.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/calendar.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { deadlineCountdown, calendarSummary } from "./calendar";

const today = new Date(2026, 5, 18); // Thu 18 Jun 2026 (local midnight)

test("deadlineCountdown — day precision", () => {
  assert.equal(deadlineCountdown("day", new Date(2026, 5, 18), today), "today");
  assert.equal(deadlineCountdown("day", new Date(2026, 5, 19), today), "tomorrow");
  assert.equal(deadlineCountdown("day", new Date(2026, 5, 25), today), "in 7 days");
  assert.equal(deadlineCountdown("day", new Date(2026, 5, 16), today), "overdue by 2 days");
});

test("deadlineCountdown — coarse precisions are honest (no day count)", () => {
  assert.equal(deadlineCountdown("month", new Date(2026, 5, 30), today), "by end of June");
  assert.equal(deadlineCountdown("quarter", new Date(2026, 7, 1), today), "this quarter");
  assert.equal(deadlineCountdown("fiscal_year", new Date(2026, 11, 1), today), "this fiscal year");
  assert.equal(deadlineCountdown("year", new Date(2026, 11, 1), today), "in 2026");
  assert.equal(deadlineCountdown("none", new Date(2026, 11, 1), today), "date TBD");
  assert.equal(deadlineCountdown("month", new Date(2026, 4, 1), today), "overdue"); // past, coarse
});

test("calendarSummary — counts open promises by health", () => {
  const ev = (target: Date | null, precision: string, outcome: string | null, lead_id: string | null) =>
    ({ target_date: target, precision, outcome, lead_id });
  const events = [
    ev(new Date(2026, 5, 19), "day", null, "L1"),   // this week, assigned, due in 1 -> ready to file
    ev(new Date(2026, 5, 20), "day", null, null),   // this week, unassigned
    ev(new Date(2026, 5, 16), "day", null, "L2"),   // overdue -> at risk (also assigned, but daysOut<0 not ready)
    ev(new Date(2026, 8, 1), "month", null, null),  // far future, unassigned
    ev(new Date(2026, 5, 19), "day", "delivered", "L3"), // closed -> ignored
  ];
  const s = calendarSummary(events, today);
  assert.equal(s.promisesThisWeek, 3); // Jun 18 week (Mon15–Sun21): 19, 20, 16
  assert.equal(s.atRisk, 1);           // the overdue one
  assert.equal(s.unassigned, 2);       // Jun20 + Sep1
  assert.equal(s.readyToFile, 1);      // Jun19 assigned, daysOut 1
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd /Users/subhashrai/projects/platform/apps/web && pnpm test`
Expected: FAIL — `deadlineCountdown`/`calendarSummary` not exported.

- [ ] **Step 3: Implement the helpers**

Append to `apps/web/lib/calendar.ts`:
```ts
// ── Editorial Calendar surface helpers (PLAN·Calendar) ───────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  return x;
}

/** Monday (local midnight) of the week containing `d`. */
function weekStart(d: Date): Date {
  const off = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -off);
}

/** A precision-honest deadline label. Promises carry day/month/quarter/… precision
 * and no time-of-day, so coarse precisions never get a fake day count. */
export function deadlineCountdown(precision: string, target: Date, today: Date): string {
  const s = classify(target, today);
  if (s.status === "past_due") {
    if (precision === "day") {
      return s.daysOverdue === 1 ? "overdue by 1 day" : `overdue by ${s.daysOverdue} days`;
    }
    return "overdue";
  }
  if (s.status === "due_today") return "today";
  switch (precision) {
    case "day":
      return s.daysOut === 1 ? "tomorrow" : `in ${s.daysOut} days`;
    case "month":
      return `by end of ${MONTHS[target.getMonth()]}`;
    case "quarter":
      return "this quarter";
    case "fiscal_year":
      return "this fiscal year";
    case "year":
      return `in ${target.getFullYear()}`;
    default:
      return "date TBD";
  }
}

export type CalSummaryInput = {
  target_date: Date | string | null;
  precision: string;
  outcome: string | null;
  lead_id: string | null;
};
export type CalSummary = {
  promisesThisWeek: number;
  atRisk: number;
  unassigned: number;
  readyToFile: number;
};

/** Promise-health counts for the Calendar summary line. Open = outcome null. */
export function calendarSummary(events: CalSummaryInput[], today: Date): CalSummary {
  const ws = weekStart(today);
  const we = addDays(ws, 6);
  let promisesThisWeek = 0;
  let atRisk = 0;
  let unassigned = 0;
  let readyToFile = 0;
  for (const e of events) {
    if (e.outcome !== null) continue; // closed promise
    if (e.lead_id === null) unassigned++;
    if (!e.target_date) continue;
    const t = toCalendarDate(e.target_date);
    const s = classify(t, today);
    if (t >= ws && t <= we) promisesThisWeek++;
    if (s.status === "past_due" || s.status === "due_today") atRisk++;
    if (e.lead_id !== null && s.daysOut >= 0 && s.daysOut <= 7) readyToFile++;
  }
  return { promisesThisWeek, atRisk, unassigned, readyToFile };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd /Users/subhashrai/projects/platform/apps/web && pnpm test`
Expected: PASS (all calendar + framing-position tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/subhashrai/projects/platform
git add apps/web/lib/calendar.ts apps/web/lib/calendar.test.ts
git commit -m "feat(calendar): precision-honest deadline countdown + promise-health summary"
```

---

## Task 2: LiveClock client component

**Files:**
- Create: `apps/web/components/calendar/LiveClock.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/components/calendar/LiveClock.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";

function istClock(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** Ticking IST HH:MM:SS for the Calendar now-block. Clock only — promise
 * countdowns are day-grained and computed server-side. */
export default function LiveClock() {
  const [t, setT] = useState(istClock());
  useEffect(() => {
    const id = setInterval(() => setT(istClock()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span suppressHydrationWarning>{t}</span>;
}
```

- [ ] **Step 2: Verify type-check**

Run: `cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/LiveClock.tsx
git commit -m "feat(calendar): LiveClock — ticking IST clock for the now-block"
```

---

## Task 3: `tenantCity` db helper

**Files:**
- Modify: `apps/web/lib/db.ts`

- [ ] **Step 1: Add the helper (mirrors `tenantOutletDomain`)**

Append near `tenantOutletDomain` in `apps/web/lib/db.ts`:
```ts
/** The newsroom's city from tenant config (vendor-neutral; empty when unset). */
export async function tenantCity(tenantId: string): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query<{ city: string | null }>(
    "select config->>'city' as city from tenants where id = $1",
    [tenantId],
  );
  return rows[0]?.city ?? "";
}
```

- [ ] **Step 2: Verify type-check**

Run: `cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/db.ts
git commit -m "feat(calendar): tenantCity config reader (vendor-neutral)"
```

---

## Task 4: CalendarHeader server component

**Files:**
- Create: `apps/web/components/calendar/CalendarHeader.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/components/calendar/CalendarHeader.tsx`:
```tsx
import LiveClock from "./LiveClock";
import { URGENCY_COLOR } from "@/lib/calendar";
import type { CalSummary } from "@/lib/calendar";

export type NextDue = {
  what: string;
  who: string;
  countdown: string;
  overdue: boolean;
};

/** Editorial header for PLAN·Calendar: "Promises ahead." lead, promise-health
 * summary, and the live now-block of the next due promises. Server-rendered;
 * only the clock is client-side. */
export default function CalendarHeader({
  summary,
  nextDue,
  dateLabel,
  city,
}: {
  summary: CalSummary;
  nextDue: NextDue[];
  dateLabel: string;
  city: string;
}) {
  return (
    <header className="mb-8">
      <p className="ds-label mb-2" style={{ color: "var(--color-brand)" }}>
        Calendar · The planning spine
      </p>
      <h1 className="ds-lead mb-3">Promises ahead.</h1>
      <p className="ds-deck">
        {summary.promisesThisWeek} promises this week
        {" · "}
        <span style={{ color: URGENCY_COLOR.high }}>{summary.atRisk} at risk</span>
        {" · "}
        <span>{summary.unassigned} unassigned</span>
        {" · "}
        <span style={{ color: URGENCY_COLOR.elevated }}>{summary.readyToFile} ready to file</span>
      </p>

      <section
        className="mt-6 p-5"
        style={{ background: "var(--color-frame)", color: "var(--color-paper)" }}
      >
        <div className="flex items-baseline gap-3" style={{ fontFamily: "var(--font-mono)" }}>
          <span className="text-3xl font-bold tabular-nums">
            <LiveClock />
          </span>
          <span style={{ opacity: 0.7 }}>IST</span>
          <span style={{ opacity: 0.7 }}>
            · {dateLabel}{city ? ` · ${city}` : ""}
          </span>
        </div>

        {nextDue.length === 0 ? (
          <p className="mt-4" style={{ opacity: 0.7 }}>No open promises due.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {nextDue.map((p, i) => (
              <div key={i}>
                <p className="ds-label" style={{ opacity: 0.6 }}>
                  {i === 0 ? "Next due" : "Then"}
                </p>
                <p className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  {p.what}
                </p>
                {p.who && <p className="text-sm" style={{ opacity: 0.7 }}>{p.who}</p>}
                <span
                  className="inline-block mt-1 text-sm font-semibold"
                  style={{ color: p.overdue ? URGENCY_COLOR.overdue : "var(--color-paper)" }}
                >
                  {p.countdown}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </header>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/CalendarHeader.tsx
git commit -m "feat(calendar): editorial CalendarHeader (lead + summary + now-block)"
```

---

## Task 5: Wire the header into the page

**Files:**
- Modify: `apps/web/app/[locale]/calendar/page.tsx`

- [ ] **Step 1: Add imports**

At the top of `apps/web/app/[locale]/calendar/page.tsx`, extend the existing imports:
```ts
import { istToday, toCalendarDate, classify, deadlineCountdown, calendarSummary } from "@/lib/calendar";
import { fetchCalendarEvents, tenantIdForSlug, tenantCity } from "@/lib/db";
import CalendarHeader, { type NextDue } from "@/components/calendar/CalendarHeader";
```
(Remove the old `import { istToday, toCalendarDate } from "@/lib/calendar";` and the old `import { fetchCalendarEvents, tenantIdForSlug } from "@/lib/db";` lines they replace.)

- [ ] **Step 2: Compute summary + nextDue + city**

In `CalendarPage`, after `const [rows, reporters] = await Promise.all([...])` (the existing fetch), add:
```ts
  const today = istToday();
  const summary = calendarSummary(rows, today);
  const city = await tenantCity(tenantId);
  const nextDue: NextDue[] = rows
    .filter((r) => r.outcome === null && r.target_date !== null)
    .slice(0, 3)
    .map((r) => {
      const t = toCalendarDate(r.target_date!);
      return {
        what: r.what,
        who: r.who ?? "",
        countdown: deadlineCountdown(r.precision, t, today),
        overdue: classify(t, today).status === "past_due",
      };
    });
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(new Date());
```
(`rows` is already ordered by `target_date asc`, so the slice is the most imminent/overdue promises.)

- [ ] **Step 3: Render the header above the board**

Replace the final `return (` block — currently:
```tsx
  return (
    <CalendarApp
      events={events}
      beats={[...beatMap.values()]}
      todayISO={todayISO}
      locale={locale}
      canCommission={canCommission}
      commission={commissionEvent}
      reporters={reporters}
    />
  );
```
with:
```tsx
  return (
    <main className="min-h-screen max-w-6xl mx-auto p-6 md:p-10">
      <CalendarHeader summary={summary} nextDue={nextDue} dateLabel={dateLabel} city={city} />
      <CalendarApp
        events={events}
        beats={[...beatMap.values()]}
        todayISO={todayISO}
        locale={locale}
        canCommission={canCommission}
        commission={commissionEvent}
        reporters={reporters}
      />
    </main>
  );
```

- [ ] **Step 4: Verify type-check + build**

Run: `cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build`
Expected: type-check clean; build completes.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[locale]/calendar/page.tsx"
git commit -m "feat(calendar): render editorial header above the planning board"
```

---

## Task 6: Verification

**Files:** none.

- [ ] **Step 1: Gates**

Run:
```bash
cd /Users/subhashrai/projects/platform
pnpm --filter @onlinejourno/web test          # calendar + framing-position helpers
pnpm --filter @onlinejourno/web type-check
pnpm --filter @onlinejourno/web build
```
Expected: all green.

- [ ] **Step 2: Headless data check (real local calendar, 105 events)**

Confirm the summary + nextDue compute on real data without auth. Run:
```bash
cd /Users/subhashrai/projects/platform/apps/web
export DATABASE_URL="postgres://localhost:5432/onlinejourno_dev"
cat > _verify_cal.ts <<'TS'
import { tenantIdForSlug, fetchCalendarEvents, tenantCity } from "./lib/db";
import { istToday, toCalendarDate, classify, calendarSummary, deadlineCountdown } from "./lib/calendar";
const id = await tenantIdForSlug("self"); if (!id) throw new Error("no self");
const rows = await fetchCalendarEvents(id); const today = istToday();
console.log("summary", calendarSummary(rows, today), "city", JSON.stringify(await tenantCity(id)));
for (const r of rows.filter((r) => r.outcome === null && r.target_date).slice(0, 3))
  console.log("-", r.what, "·", deadlineCountdown(r.precision, toCalendarDate(r.target_date!), today),
              classify(toCalendarDate(r.target_date!), today).status === "past_due" ? "[overdue]" : "");
process.exit(0);
TS
node --import tsx _verify_cal.ts && rm -f _verify_cal.ts
```
Expected: a `summary {...}` line with real counts + three next-due promises with precision-honest countdowns. (Delete the throwaway after.)

- [ ] **Step 3: Live verify (optional, authed)**

If verifying in-browser: `pnpm --filter @onlinejourno/web dev`, sign in, open `/en/calendar`. Confirm the "Promises ahead." lead, the summary line, the ticking clock, the next-due cards, and that **the board below still commissions** (assign a reporter → newslist). Capture a screenshot.

- [ ] **Step 4: Done-line check**

Confirm the spec's success criteria: lead + summary + now-block render from real promise data; coarse-precision promises show honest labels ("by end of June"), not fake day counts; commissioning intact; `type-check` + `build` + helper tests green.

---

## Notes for the executor
- DRY/YAGNI: the editorial logic is the two pure helpers; `CalendarHeader` composes; `page.tsx` wires; `CalendarApp` is untouched. Don't duplicate the countdown logic in the component.
- `CalendarApp.tsx` already uses ADR 0013 tokens — a board visual-polish pass (today-column tint, promise pills carrying `deadlineCountdown`) is a **separate follow-up slice**, not part of this plan.
- Vendor-neutral: city from `tenants.config`, omitted when unset; never hardcode a city.
