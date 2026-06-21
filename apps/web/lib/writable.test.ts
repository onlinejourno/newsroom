import { test } from "node:test";
import assert from "node:assert/strict";
import { assertWritable, ReadOnlyDemoError } from "./writable";
import type { Account } from "./auth";

const base: Account = {
  id: "1", tenant_id: "t", demo: false, email: "a@b.c", display_name: null,
  role: "editor", status: "approved", bureau: null, profile_slug: null, beats: [], region: null,
};

test("assertWritable passes for a normal account", () => {
  assert.doesNotThrow(() => assertWritable({ ...base }));
});

test("assertWritable throws for a demo account", () => {
  assert.throws(() => assertWritable({ ...base, demo: true }), ReadOnlyDemoError);
});

test("assertWritable throws for no account", () => {
  assert.throws(() => assertWritable(null), ReadOnlyDemoError);
});
