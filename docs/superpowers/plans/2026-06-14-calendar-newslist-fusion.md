
> **STATUS: ✅ SHIPPED — merged to main (slice/calendar-newslist-fusion, 2026-06-18). Unchecked boxes below are historical.**
# Calendar → Newslist Fusion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Predictive Editorial Calendar feed the Newslist — due promises become `requested` leads in a new "Suggested" column, past-due promises become accountability leads, and an editor can commission any event manually.

**Architecture:** Auto path = a Python `calendar-fuse` cron step (pure `decide` + DB writes), mirroring `claim_extract.py`. Manual path = a TS server action reusing `createLead`. Shared contract = the DB schema (`calendar_event.lead_id`, `story_leads.origin='requested'`/`status='idea'`); no migration. Spec: `docs/superpowers/specs/2026-06-14-calendar-newslist-fusion-design.md` (ADR 0057 §2).

**Tech Stack:** Python 3.11 + psycopg + pytest (agents-py); Next.js 15 App Router + pg (web). No TS test runner exists, so TS tasks verify with `pnpm --filter @onlinejourno/web type-check` + the running app.

**Testing note:** Python logic is built test-first (pytest). TS changes are verified by `type-check` and by running the cron step + loading `/en/newslist`. Adding a TS test runner is out of scope.

---

## File Structure

**Part A — auto fusion + Suggested column (independently shippable):**
- Create: `packages/agents-py/src/onlinejourno_agents/calendar_fuse.py` — pure `decide()` + `run_calendar_fusion()`.
- Create: `packages/agents-py/tests/test_calendar_fuse.py` — unit tests for `decide()`.
- Modify: `packages/agents-py/src/onlinejourno_agents/db.py` — `events_for_fusion()`, `create_lead_from_event()`.
- Modify: `packages/agents-py/src/onlinejourno_agents/cli.py` — `calendar-fuse` command + subparser.
- Modify: `infra/cron/pipeline.sh` — add the `calendar-fuse` step.
- Modify: `apps/web/lib/workflow.ts` — `origin='requested'` → `status='idea'`.
- Modify: `apps/web/app/[locale]/newslist/page.tsx` — Suggested column + assign for `idea`.

**Part B — manual Commission button:**
- Modify: `apps/web/lib/db.ts` — `calendarEventById()`, `linkCalendarEventLead()`.
- Modify: `apps/web/lib/workflow.ts` — `commissionFromCalendarEvent()`.
- Modify: `apps/web/app/[locale]/calendar/page.tsx` — `commissionEvent` action, account/canCommission, pass props.
- Modify: `apps/web/components/calendar/CalendarApp.tsx` — `leadId` on `CalEvent`, thread `commission`/`canCommission`, button in `EventDrawer`.

---

## Part A — Auto fusion + Suggested column

### Task 1: Pure fusion decision

**Files:**
- Create: `packages/agents-py/src/onlinejourno_agents/calendar_fuse.py`
- Test: `packages/agents-py/tests/test_calendar_fuse.py`

- [ ] **Step 1: Write the failing tests**

```python
# packages/agents-py/tests/test_calendar_fuse.py
"""Pure fusion decision (ADR 0057 §2): which calendar events become leads."""
from __future__ import annotations

from datetime import date

from onlinejourno_agents.calendar_fuse import (
    FUSE_BAND_DAYS,
    FUSE_MIN_CONFIDENCE,
    decide,
)

TODAY = date(2026, 6, 14)


def _d(**kw):
    base = dict(target_date=date(2026, 6, 18), confidence=0.9, outcome=None, has_lead=False, today=TODAY)
    base.update(kw)
    return decide(**base)


def test_due_within_band_is_a_commission():
    assert _d(target_date=date(2026, 6, 18)).kind == "commission"  # 4 days out


def test_due_today_is_a_commission():
    assert _d(target_date=TODAY).kind == "commission"


def test_edge_of_band_is_a_commission_but_one_day_past_is_skipped():
    assert _d(target_date=date(2026, 6, 21)).kind == "commission"  # exactly 7 days
    assert _d(target_date=date(2026, 6, 22)).kind == "skip"        # 8 days — beyond band


def test_past_due_open_is_accountability():
    assert _d(target_date=date(2026, 6, 1), outcome=None).kind == "accountability"


def test_past_due_already_closed_is_skipped():
    assert _d(target_date=date(2026, 6, 1), outcome="delivered").kind == "skip"


def test_confidence_floor_is_inclusive():
    assert _d(confidence=0.70).kind == "commission"
    assert _d(confidence=0.69).kind == "skip"
    assert _d(confidence=None).kind == "skip"


def test_no_date_or_existing_lead_is_skipped():
    assert _d(target_date=None).kind == "skip"
    assert _d(has_lead=True).kind == "skip"


def test_constants():
    assert FUSE_BAND_DAYS == 7
    assert FUSE_MIN_CONFIDENCE == 0.7
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd packages/agents-py && uv run pytest tests/test_calendar_fuse.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'onlinejourno_agents.calendar_fuse'`

- [ ] **Step 3: Write the module**

```python
# packages/agents-py/src/onlinejourno_agents/calendar_fuse.py
"""m-calendar fusion (ADR 0057 §2): turn calendar events into Newslist leads.

`decide` is pure — given an event's resolved date, confidence, accountability
outcome, and "today", it classifies the event as a commission-ahead lead, an
accountability lead, or skip. The DB query + insert live in `db.py`; the
orchestration is `run_calendar_fusion`. Mirrors `claim_extract.py`.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from zoneinfo import ZoneInfo

from onlinejourno_agents import db

FUSE_BAND_DAYS = 7  # auto-commission events due within a week
FUSE_MIN_CONFIDENCE = 0.7  # below this, leave it on the calendar for manual review


@dataclass(slots=True)
class FuseDecision:
    kind: str  # "commission" | "accountability" | "skip"
    reason: str


def decide(
    *,
    target_date: date | None,
    confidence: float | None,
    outcome: str | None,
    has_lead: bool,
    today: date,
    band_days: int = FUSE_BAND_DAYS,
    min_confidence: float = FUSE_MIN_CONFIDENCE,
) -> FuseDecision:
    """Classify one calendar event for the fusion. Pure."""
    if has_lead:
        return FuseDecision("skip", "already linked to a lead")
    if target_date is None:
        return FuseDecision("skip", "no resolvable date")
    if confidence is None or confidence < min_confidence:
        return FuseDecision("skip", f"confidence below {min_confidence}")
    days_out = (target_date - today).days
    if days_out < 0:
        if outcome is not None:
            return FuseDecision("skip", "past due but already closed")
        return FuseDecision("accountability", "promise past due, outcome open")
    if days_out <= band_days:
        return FuseDecision("commission", f"due within {band_days} days")
    return FuseDecision("skip", "beyond the commission-ahead band")


@dataclass(slots=True)
class FuseResult:
    scanned: int
    commissioned: int
    accountability: int
    skipped: int
    status: str


def _ist_today() -> date:
    """Newsroom 'today' in IST — matches the /calendar view's day boundary."""
    return date.fromisoformat(
        __import__("datetime").datetime.now(ZoneInfo("Asia/Kolkata")).date().isoformat()
    )


def run_calendar_fusion(*, tenant_slug: str, today: date | None = None) -> FuseResult:
    """Create Suggested (`idea`/`requested`) leads from due + past-due calendar
    events. Idempotent: events already linked to a lead are filtered out."""
    today = today or _ist_today()
    commissioned = accountability = skipped = 0
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        cutoff = today + timedelta(days=FUSE_BAND_DAYS)
        rows = db.events_for_fusion(
            conn, tenant_id, min_confidence=FUSE_MIN_CONFIDENCE, cutoff=cutoff
        )
        for ev in rows:
            d = decide(
                target_date=ev["target_date"],
                confidence=ev["confidence"],
                outcome=ev["outcome"],
                has_lead=False,  # the query already filters lead_id is null
                today=today,
            )
            if d.kind == "skip":
                skipped += 1
                continue
            db.create_lead_from_event(conn, tenant_id=tenant_id, event=ev, kind=d.kind)
            if d.kind == "commission":
                commissioned += 1
            else:
                accountability += 1
        conn.commit()
    return FuseResult(len(rows), commissioned, accountability, skipped, "success")
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd packages/agents-py && uv run pytest tests/test_calendar_fuse.py -v`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/agents-py/src/onlinejourno_agents/calendar_fuse.py packages/agents-py/tests/test_calendar_fuse.py
git commit -m "calendar-fuse: pure decision for event→lead (ADR 0057 §2)"
```

---

### Task 2: DB helpers for fusion

**Files:**
- Modify: `packages/agents-py/src/onlinejourno_agents/db.py` (append near the m-calendar store section, after `upsert_calendar_event`)

- [ ] **Step 1: Add `events_for_fusion` and `create_lead_from_event`**

```python
# packages/agents-py/src/onlinejourno_agents/db.py — append after upsert_calendar_event

def events_for_fusion(
    conn: psycopg.Connection,
    tenant_id: UUID,
    *,
    min_confidence: float,
    cutoff: date,
) -> list[dict[str, Any]]:
    """Calendar events eligible for fusion: not yet linked to a lead, with a
    resolvable date at/below `cutoff` (today + band — captures the commission
    window AND all past-due), above the confidence floor. The pure `decide`
    makes the final commission/accountability/skip call per row."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, who, what, target_date, outcome, confidence, topic,
                   signal_id, source_link
              from calendar_event
             where tenant_id = %s
               and lead_id is null
               and target_date is not null
               and confidence >= %s
               and target_date <= %s
             order by target_date asc
            """,
            (tenant_id, min_confidence, cutoff),
        )
        return list(cur.fetchall())


def create_lead_from_event(
    conn: psycopg.Connection, *, tenant_id: UUID, event: dict[str, Any], kind: str
) -> UUID:
    """Insert a Suggested lead (origin='requested', status='idea') from a calendar
    event, then link the event to it. `kind` is 'commission' or 'accountability';
    accountability leads carry a 'delivered?' note and higher importance."""
    note = None
    importance = "normal"
    if kind == "accountability":
        importance = "high"
        who = event.get("who") or "—"
        note = f"Promised by {who}, due {event['target_date']:%d %b %Y} — delivered?"
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into story_leads
              (tenant_id, title, beat, origin, status, importance,
               signal_id, topic, eta, note)
            values (%s, %s, %s, 'requested', 'idea', %s, %s, %s, %s, %s)
            returning id
            """,
            (
                tenant_id,
                event["what"][:300],
                event.get("topic"),
                importance,
                event.get("signal_id"),
                event.get("topic"),
                event["target_date"],
                note,
            ),
        )
        lead_id = cur.fetchone()["id"]
        cur.execute(
            "update calendar_event set lead_id = %s where tenant_id = %s and id = %s",
            (lead_id, tenant_id, event["id"]),
        )
    return lead_id
```

- [ ] **Step 2: Verify `date` is imported in db.py**

Run: `grep -nE "^from datetime|^import datetime" packages/agents-py/src/onlinejourno_agents/db.py`
Expected: a line importing `date`. If `date` is absent, add `from datetime import date` near the top imports (next to the existing datetime import).

- [ ] **Step 3: Sanity-check it imports**

Run: `cd packages/agents-py && uv run python -c "from onlinejourno_agents import db; print(db.events_for_fusion, db.create_lead_from_event)"`
Expected: prints two function objects, no ImportError.

- [ ] **Step 4: Commit**

```bash
git add packages/agents-py/src/onlinejourno_agents/db.py
git commit -m "calendar-fuse: db helpers — select eligible events, create lead from event"
```

---

### Task 3: CLI command + cron step

**Files:**
- Modify: `packages/agents-py/src/onlinejourno_agents/cli.py` (add `cmd_calendar_fuse` near `cmd_claim_extract`; register subparser near the `claim-extract` one)
- Modify: `infra/cron/pipeline.sh`

- [ ] **Step 1: Add the command handler** (after `cmd_claim_extract`, ~line 257)

```python
def cmd_calendar_fuse(args: argparse.Namespace) -> int:
    """Turn due/past-due calendar events into Newslist leads (ADR 0057 §2)."""
    from onlinejourno_agents.calendar_fuse import run_calendar_fusion

    res = run_calendar_fusion(tenant_slug=args.tenant)
    print(
        f"scanned {res.scanned} events · {res.commissioned} commissioned · "
        f"{res.accountability} accountability · {res.skipped} skipped"
    )
    return 0
```

- [ ] **Step 2: Register the subparser** (in `main`, after the `claim-extract` parser block)

```python
    p_fuse = sub.add_parser(
        "calendar-fuse",
        help="turn due/past-due calendar events into Newslist leads (ADR 0057 §2)",
    )
    p_fuse.add_argument("--tenant", default="self")
    p_fuse.set_defaults(func=cmd_calendar_fuse)
```

- [ ] **Step 3: Verify the command is wired**

Run: `cd packages/agents-py && uv run onlinejourno-agents calendar-fuse --help`
Expected: help text for `calendar-fuse` with `--tenant`.

- [ ] **Step 4: Add the cron step** in `infra/cron/pipeline.sh`, immediately after the `claim-extract` line (line 25)

```bash
  uv run --package onlinejourno-agents onlinejourno-agents calendar-fuse --tenant "$TENANT" 2>&1 | tail -1
```

- [ ] **Step 5: Run it end-to-end against the dev DB**

Run: `cd packages/agents-py && DATABASE_URL=onlinejourno_dev uv run onlinejourno-agents calendar-fuse --tenant self`
Expected: a line like `scanned N events · X commissioned · Y accountability · Z skipped`. Re-run immediately; expected `scanned 0 … 0 commissioned` (idempotent — linked events are filtered out).

- [ ] **Step 6: Commit**

```bash
git add packages/agents-py/src/onlinejourno_agents/cli.py infra/cron/pipeline.sh
git commit -m "calendar-fuse: CLI command + pipeline cron step"
```

---

### Task 4: Suggested column on the Newslist (TS)

**Files:**
- Modify: `apps/web/lib/workflow.ts:159-162` (status/stamp mapping in `createLead`)
- Modify: `apps/web/app/[locale]/newslist/page.tsx` (COLUMNS, grid, column label, assign-for-idea)

- [ ] **Step 1: Map `origin='requested'` → `status='idea'`** in `createLead` (replace lines 161-162)

```typescript
  const status =
    args.origin === "pitched"
      ? "pitched"
      : args.origin === "requested"
        ? "idea"
        : "assigned";
  const tsCol =
    status === "pitched" ? "pitched_at" : status === "idea" ? "created_at" : "assigned_at";
```

(`requested` leads — calendar auto, calendar manual, the signal "Commission", and the desk quick-add — now all land in the Suggested column instead of as unassigned `assigned` leads. `self`/`assigned` unchanged. `created_at` as the stamp for `idea` is a harmless no-op vs its default.)

- [ ] **Step 2: Add the Suggested column** in `newslist/page.tsx` — replace line 21

```typescript
const COLUMNS: Status[] = ["idea", "pitched", "assigned", "filed", "approved", "published"];
// "idea" renders as the "Suggested" intake lane (calendar + commission origin).
const COLUMN_LABEL: Record<string, string> = { idea: "Suggested" };
```

- [ ] **Step 3: Widen the grid + label the column** in `newslist/page.tsx`

Replace `<div className="grid gap-3 md:grid-cols-5">` (line 356) with:

```tsx
      <div className="grid gap-3 md:grid-cols-6">
```

Replace the column header text (line 364) `{STATUS_META[s].label} · {byStatus(s).length}` with:

```tsx
              {COLUMN_LABEL[s] ?? STATUS_META[s].label} · {byStatus(s).length}
```

- [ ] **Step 4: Let desk assign an `idea` lead** in `newslist/page.tsx`

Replace the two `l.status === "pitched"` conditions that gate the assign form (line 203 and line 205) with `(l.status === "pitched" || l.status === "idea")`:

```tsx
        {((l.status === "pitched" || l.status === "idea") && isDesk) || moves.length ? (
```
```tsx
            {(l.status === "pitched" || l.status === "idea") && isDesk ? (
```

(`assignLead` already accepts `status in ('idea','pitched')`; kill already shows for any non-published lead when desk.)

- [ ] **Step 5: Type-check**

Run: `pnpm --filter @onlinejourno/web type-check`
Expected: no errors.

- [ ] **Step 6: Verify in the running app**

With the dev server up and after running Task 3 Step 5, load `http://localhost:3001/en/newslist`. Expected: a leftmost **Suggested** column populated with the commissioned + accountability leads; each desk-visible card shows an "assign to…" dropdown and "kill".

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/workflow.ts "apps/web/app/[locale]/newslist/page.tsx"
git commit -m "Newslist: Suggested intake column for requested/idea leads"
```

**Checkpoint — Part A is shippable:** the Calendar now feeds the Newslist automatically. Part B adds the manual button.

---

## Part B — Manual "Commission →" button

### Task 5: DB helpers for a single event + linking

**Files:**
- Modify: `apps/web/lib/db.ts` (after `fetchCalendarEvents`, ~line 469)

- [ ] **Step 1: Add `calendarEventById` and `linkCalendarEventLead`**

```typescript
export async function calendarEventById(
  tenantId: string,
  id: string,
): Promise<CalendarEventRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<CalendarEventRow>(
    `select id, who, what, deadline_text, date_claimed, target_date, precision,
            source_link, original_claim_text, confidence, topic, signal_id,
            lead_id, outcome
       from calendar_event
      where tenant_id = $1 and id = $2`,
    [tenantId, id],
  );
  return rows[0] ?? null;
}

export async function linkCalendarEventLead(
  tenantId: string,
  eventId: string,
  leadId: string,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    "update calendar_event set lead_id = $3 where tenant_id = $1 and id = $2",
    [tenantId, eventId, leadId],
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @onlinejourno/web type-check`
Expected: no errors (`CalendarEventRow` is already defined above `fetchCalendarEvents`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/db.ts
git commit -m "calendar: db helpers — fetch one event, link its lead"
```

---

### Task 6: `commissionFromCalendarEvent` (TS)

**Files:**
- Modify: `apps/web/lib/workflow.ts` (add at end; imports from `@/lib/db`)

- [ ] **Step 1: Add the function**

```typescript
import { calendarEventById, linkCalendarEventLead } from "@/lib/db";

// Commission a calendar event into a Suggested lead (ADR 0057 §2, manual path).
// Mirrors the auto cron: requested→idea lead, then links the event. Desk only;
// no-ops if the event is missing, undated, or already linked.
export async function commissionFromCalendarEvent(
  tenantId: string,
  actor: Account,
  eventId: string,
): Promise<string | null> {
  const ev = await calendarEventById(tenantId, eventId);
  if (!ev || !ev.target_date || ev.lead_id) return null;
  const pastDue = new Date(ev.target_date) < new Date();
  const leadId = await createLead({
    tenantId,
    actor,
    title: ev.what,
    origin: "requested",
    beat: ev.topic,
    importance: pastDue ? "high" : "normal",
    signalId: ev.signal_id,
    eta: typeof ev.target_date === "string" ? ev.target_date : ev.target_date.toISOString(),
    topic: ev.topic,
    note: pastDue ? `Promised by ${ev.who ?? "—"} — delivered?` : null,
  });
  if (leadId) await linkCalendarEventLead(tenantId, eventId, leadId);
  return leadId;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter @onlinejourno/web type-check`
Expected: no errors. (If a circular import warning arises between `workflow.ts` and `db.ts`, move the two helpers from Task 5 into `workflow.ts` instead and drop the import.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/workflow.ts
git commit -m "calendar: commissionFromCalendarEvent — manual event→lead"
```

---

### Task 7: Wire the button through the Calendar UI

**Files:**
- Modify: `apps/web/app/[locale]/calendar/page.tsx` (account + action + props)
- Modify: `apps/web/components/calendar/CalendarApp.tsx` (`CalEvent.leadId`, thread props, button in `EventDrawer`)

- [ ] **Step 1: Add `leadId` to `CalEvent`** in `CalendarApp.tsx` (inside the `CalEvent` type, ~line 16)

```typescript
  leadId: string | null;
```

- [ ] **Step 2: Map `leadId` + add the action in `calendar/page.tsx`**

Add imports at the top:

```typescript
import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAccount } from "@/lib/auth";
import { commissionFromCalendarEvent } from "@/lib/workflow";
```

In the `events` map (after `outcome: ...`, line 85), add:

```typescript
    leadId: r.lead_id,
```

In `CalendarPage`, after `if (!tenantId) return <SetupNotice />;` (line 67), add:

```typescript
  const me = await getAccount();
  const canCommission = !!me && ["admin", "editor", "desk"].includes(me.role);

  async function commissionEvent(formData: FormData) {
    "use server";
    const tid = await tenantIdForSlug(TENANT_SLUG);
    const who = await getAccount();
    if (!tid || !who) return;
    await commissionFromCalendarEvent(tid, who, String(formData.get("eventId")));
    redirect(`/${locale}/newslist` as Route);
  }
```

Replace the render (lines 100-107) to pass the new props:

```tsx
  return (
    <CalendarApp
      events={events}
      beats={[...beatMap.values()]}
      todayISO={todayISO}
      locale={locale}
      canCommission={canCommission}
      commission={commissionEvent}
    />
  );
```

- [ ] **Step 3: Thread the props through `CalendarApp`** (`CalendarApp.tsx` line 657)

```typescript
export default function CalendarApp({
  events,
  beats,
  todayISO,
  locale,
  canCommission,
  commission,
}: {
  events: CalEvent[];
  beats: Beat[];
  todayISO: string;
  locale: string;
  canCommission: boolean;
  commission: (formData: FormData) => void;
}) {
```

At the `EventDrawer` usage (line 776), pass them down:

```tsx
      {selected && (
        <EventDrawer
          event={selected}
          beats={beats}
          todayISO={todayISO}
          locale={locale}
          canCommission={canCommission}
          commission={commission}
          onClose={() => setSelected(null)}
        />
      )}
```

- [ ] **Step 4: Update `EventDrawer` signature** (`CalendarApp.tsx` line 529)

```typescript
function EventDrawer({ event, beats, todayISO, locale, canCommission, commission, onClose }: { event: CalEvent; beats: Beat[]; todayISO: string; locale: string; canCommission: boolean; commission: (formData: FormData) => void; onClose: () => void }) {
```

- [ ] **Step 5: Replace the CTA** in `EventDrawer` (lines 632-634) with the commission form / linked state

```tsx
          {event.leadId ? (
            <a href={`/${locale}/newslist`} style={{ display: "block", textAlign: "center", fontFamily: UI, fontSize: 12, fontWeight: 700, background: C.iojGreen, color: "#fff", textDecoration: "none", padding: "11px 0", letterSpacing: ".04em" }}>
              On the Newslist →
            </a>
          ) : canCommission ? (
            <form action={commission}>
              <input type="hidden" name="eventId" value={event.id} />
              <button type="submit" style={{ display: "block", width: "100%", textAlign: "center", fontFamily: UI, fontSize: 12, fontWeight: 700, background: C.ink, color: "#fff", border: "none", padding: "11px 0", cursor: "pointer", letterSpacing: ".04em" }}>
                {isPast ? "Commission an accountability story →" : "Commission this to the Newslist →"}
              </button>
            </form>
          ) : (
            <a href={`/${locale}/newslist`} style={{ display: "block", textAlign: "center", fontFamily: UI, fontSize: 12, fontWeight: 700, background: C.ink, color: "#fff", textDecoration: "none", padding: "11px 0", letterSpacing: ".04em" }}>
              Open the Newslist →
            </a>
          )}
```

- [ ] **Step 6: Type-check**

Run: `pnpm --filter @onlinejourno/web type-check`
Expected: no errors.

- [ ] **Step 7: Verify in the running app**

Load `http://localhost:3001/en/calendar`, open an event with no linked lead → the drawer shows "Commission this to the Newslist →"; click it → redirected to `/en/newslist` with the new lead in **Suggested**. Re-open the same event → it now shows "On the Newslist →".

- [ ] **Step 8: Commit**

```bash
git add "apps/web/app/[locale]/calendar/page.tsx" apps/web/components/calendar/CalendarApp.tsx
git commit -m "Calendar: manual Commission → Newslist button on the event drawer"
```

---

## Self-review checklist (done while writing)

- **Spec coverage:** hybrid trigger — auto (Tasks 1-3) + manual (Tasks 5-7) ✓; Suggested column (Task 4) ✓; accountability leads (Task 1 `decide` + Task 2 note) ✓; band/confidence constants (Task 1) ✓; dedup via `lead_id is null` + idempotency check (Task 3 Step 5) ✓; no migration ✓; out-of-scope items untouched ✓.
- **Placeholders:** none — every step has real code/commands.
- **Type consistency:** `decide(...)` keyword args match between module and tests; `create_lead_from_event(kind=...)` matches `run_calendar_fusion`; `commissionFromCalendarEvent` / `calendarEventById` / `linkCalendarEventLead` signatures match across Tasks 5-7; `CalEvent.leadId` added before use.
- **Known assumption:** `db.connect()` yields dict-row cursors (confirmed by `signals_needing_claims` returning dicts), so `cur.fetchone()["id"]` is valid.
