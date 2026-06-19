// Lead-time classification for the Predictive Editorial Calendar (ADR 0057).
//
// This is a faithful TS port of the Python `calendar_engine.classify`
// (packages/agents-py) — which is the unit-tested source of truth. The same
// 90/60/30/14/7/1-day markers and urgency bands are computed here at read time
// so the /calendar view never stores a stale status.

export const MARKERS = [90, 60, 30, 14, 7, 1] as const;

export type Urgency =
  | "horizon"
  | "watch"
  | "elevated"
  | "high"
  | "critical"
  | "due"
  | "overdue";

export type CalendarStatus = {
  daysOut: number; // target - today; negative once overdue
  status: "upcoming" | "due_today" | "past_due";
  band: number | null; // tightest crossed marker (daysOut <= band), null past the horizon
  nextMarker: number | null; // the next marker the event will cross
  daysOverdue: number;
  urgency: Urgency;
  actionable: boolean; // within the 0..90-day commission-ahead window
};

const URGENCY: Record<number, Urgency> = {
  90: "horizon",
  60: "watch",
  30: "watch",
  14: "elevated",
  7: "high",
  1: "critical",
};

export const URGENCY_COLOR: Record<Urgency, string> = {
  horizon: "#6b7280",
  watch: "#4f46e5",
  elevated: "#0d9488",
  high: "#ea580c",
  critical: "#dc2626",
  due: "#dc2626",
  overdue: "#b91c1c",
};

/** Normalise a pg `date` (Date at local midnight, or an ISO string) to a
 * local-midnight Date so calendar-day arithmetic is timezone-stable. */
export function toCalendarDate(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Today" in the newsroom's timezone (IST), as a local-midnight Date. */
export function istToday(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now);
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function epochDay(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

export function classify(target: Date, today: Date): CalendarStatus {
  const daysOut = epochDay(target) - epochDay(today);

  if (daysOut < 0) {
    return {
      daysOut,
      status: "past_due",
      band: null,
      nextMarker: null,
      daysOverdue: -daysOut,
      urgency: "overdue",
      actionable: false,
    };
  }
  if (daysOut === 0) {
    return {
      daysOut: 0,
      status: "due_today",
      band: 1,
      nextMarker: null,
      daysOverdue: 0,
      urgency: "due",
      actionable: true,
    };
  }

  const crossed = MARKERS.filter((m) => daysOut <= m);
  const band = crossed.length ? Math.min(...crossed) : null;
  const remaining = MARKERS.filter((m) => m < daysOut);
  const nextMarker = remaining.length ? Math.max(...remaining) : null;
  const urgency: Urgency = band !== null ? (URGENCY[band] ?? "horizon") : "horizon";

  return {
    daysOut,
    status: "upcoming",
    band,
    nextMarker,
    daysOverdue: 0,
    urgency,
    actionable: daysOut <= 90,
  };
}

// ── Editorial Calendar surface helpers (PLAN·Calendar) ───────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
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
