import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveNavSignals } from "./nav-signals";

test("nowPath = highest-priority non-zero stage (brief before signals)", () => {
  const r = deriveNavSignals({ calendar: 0, brief: 3, signals: 10, newslist: 0, potential: 2 });
  assert.equal(r.nowPath, "brief");
});

test("calendar wins emphasis whenever it has at-risk deadlines", () => {
  const r = deriveNavSignals({ calendar: 2, brief: 5, signals: 9, newslist: 1, potential: 4 });
  assert.equal(r.nowPath, "calendar");
});

test("natural tones — calendar critical, brief warning, rest neutral", () => {
  const r = deriveNavSignals({ calendar: 1, brief: 1, signals: 1, newslist: 1, potential: 1 });
  assert.equal(r.byPath.calendar.tone, "critical");
  assert.equal(r.byPath.brief.tone, "warning");
  assert.equal(r.byPath.signals.tone, "neutral");
  assert.equal(r.byPath.newslist.tone, "neutral");
  assert.equal(r.byPath.potential.tone, "neutral");
});

test("zero-count stages are omitted and a quiet newsroom has no emphasis", () => {
  const r = deriveNavSignals({ calendar: 0, brief: 0, signals: 0, newslist: 0, potential: 0 });
  assert.equal(r.nowPath, null);
  assert.equal(Object.keys(r.byPath).length, 0);
});

test("counts are carried through", () => {
  const r = deriveNavSignals({ calendar: 0, brief: 0, signals: 7, newslist: 0, potential: 0 });
  assert.equal(r.nowPath, "signals");
  assert.equal(r.byPath.signals.count, 7);
});
