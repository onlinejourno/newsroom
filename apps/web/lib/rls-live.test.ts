import { test } from "node:test";
import assert from "node:assert/strict";

import { Client } from "pg";

// Live proof of the RLS backstop (migration 0029): two tenants in one
// database, and a NON-superuser role can only ever see the tenant pinned in
// app.current_tenant — even when a query's explicit predicate asks for the
// other tenant's rows. Complements the static scan in
// tenant-isolation.test.ts, which guards the belt (explicit tenant_id
// filters); this guards the suspenders.
//
// Needs a real database: skipped without DATABASE_URL, and skipped until
// migration 0029 is applied. Everything (tenants, sources, signals, the
// probe role) happens inside one transaction that is rolled back — the
// database is left untouched.

const url = process.env.DATABASE_URL;

test("RLS: a pinned tenant cannot read another tenant's rows", { skip: !url }, async (t) => {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    // Gate on the policies themselves (works for both migrate.mjs installs
    // and local psql-loop installs, which have no schema_migrations table).
    const { rows: pols } = await client.query(
      `select tablename from pg_policies
        where policyname = 'tenant_isolation'
          and tablename in ('signals','stories','story_leads','sources')`,
    );
    if (pols.length === 0) {
      t.skip("migration 0029_tenant_rls.sql not applied to this database");
      return;
    }
    assert.equal(pols.length, 4, "tenant_isolation policy missing on a core table");

    await client.query("begin");
    const probe = `rls_probe_${process.pid}_${Date.now()}`;

    try {
      // Two throwaway tenants, one signal each. Inserts pin the tenant they
      // write, so this works whether or not the connecting role bypasses RLS.
      const { rows: tenants } = await client.query(
        `insert into tenants (slug, name, tier)
         values ('rls-probe-a', 'RLS probe A', 'self'),
                ('rls-probe-b', 'RLS probe B', 'self')
         returning id, slug`,
      );
      const a = tenants.find((r) => r.slug === "rls-probe-a")!.id as string;
      const b = tenants.find((r) => r.slug === "rls-probe-b")!.id as string;

      for (const [tid, tag] of [[a, "a"], [b, "b"]] as const) {
        await client.query("select set_config('app.current_tenant', $1, true)", [tid]);
        const { rows: src } = await client.query(
          `insert into sources (tenant_id, name, kind, url)
           values ($1, 'rls probe source', 'rss', 'https://example.invalid/rls')
           returning id`,
          [tid],
        );
        await client.query(
          `insert into signals (tenant_id, source_id, url, url_hash, headline)
           values ($1, $2, 'https://example.invalid/rls-story', $3, $4)`,
          [tid, src[0].id, `rls-probe-${tag}`, `unpublished plan of tenant ${tag}`],
        );
      }

      // A role that RLS actually applies to (not superuser, not table owner).
      await client.query(`create role ${probe}`);
      await client.query(`grant select on signals to ${probe}`);
      await client.query(`set role ${probe}`);

      const count = async (sql: string, params: unknown[] = []) => {
        const { rows } = await client.query(`select count(*)::int as n from (${sql}) q`, params);
        return rows[0].n as number;
      };
      // Deliberately tenant-unfiltered: observes both probe tenants so RLS
      // alone decides visibility.
      const probeSignals = "select id from signals where url_hash like 'rls-probe-%'";

      // Pinned to A: sees exactly A's row.
      await client.query("select set_config('app.current_tenant', $1, true)", [a]);
      assert.equal(await count(probeSignals), 1, "tenant A should see exactly its own row");
      // …and an explicit predicate for B's rows (a forgotten/hostile filter)
      // still yields nothing — the backstop overrides the belt.
      assert.equal(
        await count("select id from signals where tenant_id = $1", [b]),
        0,
        "tenant A must not reach tenant B's rows even when asked directly",
      );

      // Pinned to B: sees exactly B's row.
      await client.query("select set_config('app.current_tenant', $1, true)", [b]);
      assert.equal(await count(probeSignals), 1, "tenant B should see exactly its own row");

      // Pinned to a tenant that doesn't exist: sees nothing.
      await client.query(
        "select set_config('app.current_tenant', '00000000-0000-0000-0000-000000000000', true)",
      );
      assert.equal(await count(probeSignals), 0, "an unknown tenant pin must see zero rows");

      await client.query("reset role");
    } finally {
      await client.query("rollback").catch(() => {});
    }
  } finally {
    await client.end();
  }
});
