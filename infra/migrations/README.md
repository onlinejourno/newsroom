# Migrations

Numbered SQL files run sequentially against the OnlineJourno Postgres database.
**Schema only.** Data fixtures live in `infra/seeds/`.

## Convention

- `0001_init.sql` — initial schema (full DDL).
- `NNNN_<name>.sql` — incremental migrations (ALTER, CREATE, etc.). Schema only — no INSERTs of fixtures.
- Files are append-only after they are merged to `main`. Never edit a committed migration; write a new one.
- `infra/schema.sql` at repo root mirrors the current consolidated state for documentation and IDE auto-completion. Source of truth is the migration files; schema.sql is regenerated.
- Dev / test / prod data fixtures live under `infra/seeds/` and run via separate scripts (`pnpm db:seed:dev`, etc.). Migrations never insert fixtures.

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

The initial migration assumes the `pgcrypto` and `vector` extensions are available.

### macOS (Homebrew)

```bash
brew install postgresql@17 pgvector
brew services start postgresql@17
echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
exec zsh
```

**Postgres version note.** Homebrew's `pgvector` formula ships prebuilt
binaries for Postgres 17 and 18 only as of 2026-06. Postgres 15 or 16 work
with pgvector but require a source build (`PG_CONFIG=/opt/homebrew/opt/postgresql@15/bin/pg_config brew install --build-from-source pgvector`).
The path of least resistance on macOS is `postgresql@17`; the platform's
production target is also `postgresql@17` for parity.

**Anaconda warning.** Anaconda ships its own `pg_config`, `psql`, and
`python` and silently intercepts the corresponding binaries. If you have
Anaconda installed, either uninstall it or ensure your shell `PATH` puts
`/opt/homebrew/opt/postgresql@17/bin` and the platform's `uv`-managed
virtualenv ahead of `/opt/anaconda3/bin`. Without this, migrations may
appear to work but bind to the wrong Postgres install.

### Debian / Ubuntu

```bash
sudo apt install postgresql-17 postgresql-17-pgvector
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
