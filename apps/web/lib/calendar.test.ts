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
    ev(new Date(2026, 5, 19), "day", null, "L1"),
    ev(new Date(2026, 5, 20), "day", null, null),
    ev(new Date(2026, 5, 16), "day", null, "L2"),
    ev(new Date(2026, 8, 1), "month", null, null),
    ev(new Date(2026, 5, 19), "day", "delivered", "L3"),
  ];
  const s = calendarSummary(events, today);
  assert.equal(s.promisesThisWeek, 3);
  assert.equal(s.atRisk, 1);
  assert.equal(s.unassigned, 2);
  assert.equal(s.readyToFile, 1);
});
