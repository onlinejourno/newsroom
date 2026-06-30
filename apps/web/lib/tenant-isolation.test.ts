import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Multi-tenant data isolation guard (P0). Rows in these tables belong to a
// tenant — every query that reads or writes them MUST filter by tenant_id, or
// one newsroom can reach another's data. This is a static scan of the data
// layer that fails CI on a regression (a new query that forgets the filter).
//
// This guard IS the defence (the explicit `where tenant_id = $1` is the sole
// tenant boundary — DB-level RLS is intentionally NOT enabled; the product is
// one-DB-per-install, so the isolation boundary is the install, see migrations
// 0025/0026). A seeded integration test complements it.
//
// NOTE: auth.ts user queries are out of scope for this scan by design — they are
// keyed by the primary-key id from a signed session token, or by globally-unique
// email (one-newsroom-per-install), not by tenant_id, and they interpolate a
// shared SELECT const that defeats static extraction.
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
  "entity_coverage",
  "calendar_event",
  "briefs",
  "beats",
  "threads",
  "thread_links",
  "shortlist_items",
  "seo_audit",
  "topic_domains",
  "outlet_keywords",
  "channel_affinity_log",
];
const FILES = ["lib/db.ts", "lib/workflow.ts"];

// A real tenant filter/join predicate (`tenant_id = $1`, `s.tenant_id = $1`,
// `d.tenant_id = st.tenant_id`) — NOT merely selecting tenant_id as a column.
const TENANT_FILTER = /tenant_id\s*=/;
// An INSERT is scoped when tenant_id is in its column list (`insert into t
// (tenant_id, …) values …`) — there is no `=` predicate to match.
const TENANT_INSERT = /insert\s+into[\s\S]*?\([\s\S]*?\btenant_id\b[\s\S]*?\)\s*values/;
// Escape hatch for an intentional cross-tenant read; must justify inline:
//   `-- tenant-ok: <reason>` inside the SQL string.
const ESCAPE = /tenant-ok/;

// Pull the first string-literal argument (template, double-, or single-quoted)
// of each `.query(...)` / `.query<...>(` call. Earlier this scanned only
// template literals, so every double-quoted query was invisible to the guard.
export function extractQueries(src: string): string[] {
  const out: string[] = [];
  for (const part of src.split(/\.query\s*[<(]/).slice(1)) {
    const m = part.match(/`([\s\S]*?)`|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/);
    if (m) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return out;
}

function touchedScopedTables(sql: string): string[] {
  return SCOPED.filter((t) => new RegExp(`\\b(from|join|into|update)\\s+${t}\\b`).test(sql));
}

export function offendersIn(src: string): string[] {
  const offenders: string[] = [];
  for (const q of extractQueries(src)) {
    const ql = q.toLowerCase();
    const tables = touchedScopedTables(ql);
    const scoped = TENANT_FILTER.test(ql) || TENANT_INSERT.test(ql) || ESCAPE.test(ql);
    if (tables.length && !scoped) {
      offenders.push(`[${tables.join(",")}] ${q.trim().replace(/\s+/g, " ").slice(0, 140)}`);
    }
  }
  return offenders;
}

for (const file of FILES) {
  test(`tenant isolation: every scoped query in ${file} filters tenant_id`, () => {
    assert.deepEqual(
      offendersIn(readFileSync(file, "utf8")),
      [],
      "Queries on tenant-scoped tables missing a tenant_id filter (add `where tenant_id = $1`, " +
        "or `-- tenant-ok: <reason>` for an intentional cross-tenant read).",
    );
  });
}

// Meta-tests: prove the detector catches what the old template-only scan missed.
test("guard flags a double-quoted query that forgets tenant_id", () => {
  const bad = `await pool.query("delete from sources where id = $1", [id]);`;
  assert.deepEqual(offendersIn(bad), ["[sources] delete from sources where id = $1"]);
});

test("guard flags tenant_id present only as a SELECT column, not a filter", () => {
  const bad = "pool.query(`select tenant_id, name from connectors order by name`)";
  assert.equal(offendersIn(bad).length, 1);
});

test("guard passes a properly filtered double-quoted query", () => {
  const ok = `pool.query("delete from sources where tenant_id = $1 and id = $2", [t, id]);`;
  assert.deepEqual(offendersIn(ok), []);
});

test("guard passes an insert that carries tenant_id in its column list", () => {
  const ok = "pool.query(`insert into story_leads (tenant_id, title) values ($1, $2)`)";
  assert.deepEqual(offendersIn(ok), []);
});

test("guard flags an insert into a scoped table that omits tenant_id", () => {
  const bad = "pool.query(`insert into story_leads (title, beat) values ($1, $2)`)";
  assert.equal(offendersIn(bad).length, 1);
});

test("guard honours the -- tenant-ok escape hatch", () => {
  const ok = "pool.query(`select id from signals -- tenant-ok: cross-tenant maintenance\n`)";
  assert.deepEqual(offendersIn(ok), []);
});
