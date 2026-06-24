import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Multi-tenant data isolation guard (P0). Rows in these tables belong to a
// tenant — every query that reads or writes them MUST filter by tenant_id, or
// one newsroom can reach another's data. This is a static scan of the data
// layer that fails CI on a regression (a new query that forgets the filter).
// It complements — does not replace — DB-level RLS + a seeded integration test.
const SCOPED = [
  "stories",
  "signals",
  "distribution_fit_scores",
  "story_leads",
  "leads",
  "connectors",
  "sources",
  "optimization_surfaces",
  "journalist_profiles",
  "entities",
];
const FILES = ["lib/db.ts", "lib/workflow.ts"];

// Pull the first template-literal argument of each `.query(...)` / `.query<...>(`.
function queries(src: string): string[] {
  const out: string[] = [];
  for (const part of src.split(/\.query\s*[<(]/).slice(1)) {
    const m = part.match(/`([\s\S]*?)`/);
    if (m) out.push(m[1]);
  }
  return out;
}

function touchedScopedTables(sql: string): string[] {
  return SCOPED.filter((t) => new RegExp(`\\b(from|join|into|update)\\s+${t}\\b`).test(sql));
}

for (const file of FILES) {
  test(`tenant isolation: every scoped query in ${file} filters tenant_id`, () => {
    const src = readFileSync(file, "utf8");
    const offenders: string[] = [];
    for (const q of queries(src)) {
      const ql = q.toLowerCase();
      const tables = touchedScopedTables(ql);
      if (tables.length && !ql.includes("tenant_id")) {
        offenders.push(`[${tables.join(",")}] ${q.trim().replace(/\s+/g, " ").slice(0, 140)}`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `Queries on tenant-scoped tables missing a tenant_id filter:\n` + offenders.join("\n"),
    );
  });
}
