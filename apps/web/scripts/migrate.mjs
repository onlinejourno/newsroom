// Apply infra/migrations/*.sql to DATABASE_URL, in order, once each.
//
// Run by Fly's [deploy] release_command on every deploy, and locally:
//   DATABASE_URL=postgres://… node apps/web/scripts/migrate.mjs
//
// Tracking table `schema_migrations` records applied versions, so re-runs are
// idempotent. Each migration runs in its own transaction; a failure rolls that
// migration back and exits non-zero (Fly aborts the release, keeps the old
// version). Pure-SQL migrations only (no psql meta-commands).
//
// Note: 0001 enables the `vector` extension — the target Postgres must have
// pgvector available (Fly: use a pgvector-enabled Postgres image).

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const HERE = dirname(fileURLToPath(import.meta.url));
// apps/web/scripts → ../../../ = repo root (matches the image: /app/apps/web/scripts → /app).
const MIGRATIONS_DIR = join(HERE, "..", "..", "..", "infra", "migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `create table if not exists schema_migrations (
         version text primary key,
         applied_at timestamptz not null default now()
       )`,
    );
    const { rows } = await client.query("select version from schema_migrations");
    const done = new Set(rows.map((r) => r.version));

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let applied = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      process.stdout.write(`applying ${file} ... `);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into schema_migrations (version) values ($1)", [file]);
        await client.query("commit");
        applied += 1;
        console.log("ok");
      } catch (err) {
        await client.query("rollback");
        console.error(`FAILED\n${file}: ${err.message}`);
        process.exit(1);
      }
    }
    console.log(`done — ${applied} applied, ${files.length - applied} already current`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
