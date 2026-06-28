import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { computeReach, type SurfaceSignal } from "./reach.ts";

// The SAME golden the Python suite uses. If TS drifts from Py, this fails.
const goldenPath = fileURLToPath(
  new URL("../../../packages/agents-py/tests/golden/reach.golden.json", import.meta.url),
);
const golden = JSON.parse(readFileSync(goldenPath, "utf8")) as {
  cases: { name: string; signals: SurfaceSignal[]; expect: { reach: number; confidence: number; basis_summary: string } }[];
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

test("reach.ts matches the canonical golden fixtures (Py↔TS parity)", () => {
  for (const c of golden.cases) {
    const got = computeReach(c.signals);
    assert.equal(r1(got.reach), c.expect.reach, `${c.name} reach`);
    assert.equal(r2(got.confidence), c.expect.confidence, `${c.name} confidence`);
    assert.equal(got.basisSummary, c.expect.basis_summary, `${c.name} basis`);
  }
});

test("dark surface is recorded but never scored", () => {
  const r = computeReach([{ surface: "social", value: 99, basis: "unavailable", weight: 5 }]);
  assert.equal(r.reach, 0);
  assert.equal(r.confidence, 0);
});
