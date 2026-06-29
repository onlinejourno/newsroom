import { test } from "node:test";
import assert from "node:assert/strict";
import { letterGrade } from "./grades";

// Canonical grade cases — MUST equal grades.py band behaviour (keep in sync).
// Boundaries are inclusive lower bounds: 80→A, 65→B, 50→C, 35→D, else F.
test("letterGrade matches the canonical bands", () => {
  const cases: Array<[number | null, string]> = [
    [100, "A"], [80, "A"], [79.9, "B"], [65, "B"], [64, "C"],
    [50, "C"], [49, "D"], [35, "D"], [34, "F"], [0, "F"], [null, "F"],
  ];
  for (const [score, expected] of cases) {
    assert.equal(letterGrade(score), expected, `${score}`);
  }
});
