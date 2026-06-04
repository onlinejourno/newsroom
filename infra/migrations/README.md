# Migrations

Numbered SQL files run sequentially against the OnlineJourno Postgres database.

## Convention

- `0001_init.sql` — initial schema (full DDL).
- `NNNN_<name>.sql` — incremental migrations (ALTER, CREATE, etc.).
- Files are append-only after they are merged to `main`. Never edit a committed migration; write a new one.
- `infra/schema.sql` at repo root mirrors the current consolidated state for documentation and IDE auto-completion. Source of truth is the migration files; schema.sql is regenerated.

## Applying locally

```bash
# Create the dev database (one-time)
createdb onlinejourno_dev

# Apply all migrations in order
for f in infra/migrations/[0-9]*.sql; do
  echo "-- $f --"
  psql onlinejourno_dev -f "$f"
done
```

For the Apache 2.0 spirit: no migration tool is required. A short shell loop and `psql` is enough for Y1. When the project gains contributors and migration coordination becomes painful, swap in [Atlas](https://atlasgo.io) or [dbmate](https://github.com/amacneil/dbmate). Until then, simplicity wins.

## Extensions

The initial migration assumes the `pgcrypto` and `vector` extensions are available. On macOS:

```bash
brew install postgresql@15 pgvector
brew services start postgresql@15
```

On Debian/Ubuntu:

```bash
sudo apt install postgresql-15 postgresql-15-pgvector
sudo systemctl start postgresql
```

The extensions are loaded by the `create extension if not exists` lines at the top of `0001_init.sql`.

## Rolling forward

Each new migration starts with the next four-digit number:

```sql
-- 0003_add_some_table.sql
begin;

create table some_table (
  -- ...
);

commit;
```

Wrap each migration in `begin; ... commit;` so partial application does not leave the schema in a broken state.

## Rolling back

There is no automated rollback. If you ship a bad migration:

1. Write a new migration that undoes it (e.g. `0004_revert_some_table.sql`).
2. Apply the new migration.
3. Document the reason in `docs/notes/`.

This is intentionally low-tech for Y1 (ADR 0028 — FOSS-first, minimal tooling). Solo founder, low schema churn, easy recovery.
