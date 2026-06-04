# Developer Setup

Captures everything learned bringing the Wk 1 vertical slice live on macOS.
Runs the platform end-to-end locally: Postgres → Python ingest → Next.js
view of signals.

The platform's runtime targets and version pins are:

- **Postgres** 17 (with pgvector extension)
- **Node** ≥ 20 (managed via `pnpm`)
- **Python** ≥ 3.11 (managed via `uv`)
- **pnpm** ≥ 9
- **uv** latest

## 0. macOS prerequisites

Homebrew. If you don't have it: <https://brew.sh>.

### Anaconda warning (read this first)

Anaconda installs its own `python`, `pg_config`, `psql`, and other tooling
and puts them on `PATH` ahead of Homebrew. Symptoms include:

- `pnpm ingest:install` builds against Anaconda's Python, not uv's venv.
- `pg_config` returns Anaconda's path; pgvector source builds land in the
  wrong directory; the `signals` table fails to create because `vector`
  extension control files are missing.

If you actively use Anaconda, ensure `/opt/homebrew/bin` and the
`postgresql@17/bin` directory appear in your `PATH` before
`/opt/anaconda3/bin`. If you don't actively use Anaconda, uninstall it:

```bash
sudo rm -rf /opt/anaconda3
sed -i '' '/# >>> conda initialize >>>/,/# <<< conda initialize <<</d' ~/.zshrc
rm -rf ~/.conda ~/.condarc ~/.continuum ~/.anaconda
exec zsh
```

## 1. Install runtime tooling

```bash
brew install postgresql@17 pgvector node pnpm uv
brew services start postgresql@17
echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
exec zsh
```

Verify:

```bash
which pg_config        # should be /opt/homebrew/opt/postgresql@17/bin/pg_config
pg_config --version    # PostgreSQL 17.x
which psql             # /opt/homebrew/opt/postgresql@17/bin/psql
which pnpm             # /opt/homebrew/bin/pnpm
which uv               # /opt/homebrew/bin/uv
```

### pgvector path note

Homebrew's `pgvector` formula installs the extension files in
`/opt/homebrew/share/postgresql@17/extension/` and the library in
`/opt/homebrew/lib/postgresql@17/`. Postgres 17 reads from those
directories directly via `pg_config --sharedir` and `--pkglibdir`, so no
symlinks are required.

If you're on an older Postgres (15 or 16), Homebrew's prebuilt pgvector is
not available; build from source against your `pg_config`:

```bash
PG_CONFIG=/opt/homebrew/opt/postgresql@15/bin/pg_config \
  brew install --build-from-source pgvector
```

You can verify the extension is installed before running any migrations:

```bash
createdb tmp_check
psql tmp_check -c "CREATE EXTENSION vector;"   # should succeed
dropdb tmp_check
```

## 2. Clone + environment

```bash
git clone https://github.com/onlinejourno/platform.git
cd platform
cp .env.local.example .env
```

`apps/web/` (Next.js) loads `.env` from its own directory, not the repo
root. Symlink so Node and Python share one file:

```bash
ln -s ../../.env apps/web/.env
```

Edit `.env` if your local `DATABASE_URL` differs from the default
`postgres://localhost:5432/onlinejourno_dev`.

## 3. Database

```bash
createdb onlinejourno_dev
DATABASE_URL=onlinejourno_dev pnpm db:migrate
DATABASE_URL=onlinejourno_dev pnpm db:seed:dev
```

`db:migrate` applies the schema in `infra/migrations/`. `db:seed:dev`
applies the development fixtures in `infra/seeds/dev.sql` (founder `self`
tenant + markets-regulatory beat + 6 RSS sources). Both are idempotent.

Verify:

```bash
psql onlinejourno_dev -c "\dt"
psql onlinejourno_dev -c "select slug, name from tenants;"
psql onlinejourno_dev -c "select name from sources where enabled;"
```

## 4. Python ingest

```bash
pnpm ingest:install
```

This runs `uv sync` inside `packages/ingest-py/`, which creates a
`.venv` there and installs the package in editable mode.

Run a collection:

```bash
pnpm ingest collect --tenant self --beat markets-regulatory
```

**Do not insert `--` between `pnpm ingest` and `collect`.** pnpm passes
arguments straight through; the npm-style `--` separator is unnecessary
and is interpreted as an argparse subcommand name.

Expected output is one line per source, each printing either
`+N (M parsed)` on success or `FAILED: <reason>`. Some Indian government
RSS endpoints intermittently return non-XML or block bots; this is
acceptable for the dev fixture set.

## 5. Next.js

```bash
pnpm install
pnpm dev
```

Open the URL `next dev` prints (typically <http://localhost:3000>,
falling back to 3001 / 3002 if other processes hold those ports). The
signals view is at `/en/signals`.

If you see "DATABASE_URL is not set" at runtime, the symlink from step 2
is missing or pointed at the wrong file.

If you see "Module not found: pg", `pnpm install` did not run since the
last `package.json` change. Re-run `pnpm install` from the repo root.

## 6. Stale-port cleanup (when ports linger)

When `next dev` reports `Port 3000 is in use`, find the holder:

```bash
lsof -i :3000 -i :3001 -i :3002
```

Kill if appropriate:

```bash
kill <pid>
```

Old EIP-demo `next-server` processes from prior projects are the usual
culprits in this repo's history.

## 7. Common errors at a glance

| Symptom | Cause | Fix |
|---------|-------|-----|
| `extension "vector" is not available` | pgvector not built against the active Postgres | Switch to `postgresql@17` (Homebrew prebuilt) or build pgvector from source. |
| `Module not found: pg` | `pnpm install` not run after a dep was added | `pnpm install` at repo root. |
| `DATABASE_URL is not set` | `.env` missing in `apps/web/` | Symlink `apps/web/.env -> ../../.env`. |
| `command not found: db:migrate` | `pnpm` prefix omitted | `pnpm db:migrate`. |
| `python: command not found` / module errors | Anaconda intercepting `python` | Uninstall Anaconda or fix `PATH`. |
| `pgvector source build` failed | `PG_CONFIG` pointed at Anaconda Postgres | `PG_CONFIG=/opt/homebrew/opt/postgresql@17/bin/pg_config brew install --build-from-source pgvector` |
| `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` | running pnpm from wrong directory | `cd ~/projects/platform` first |
| `invalid choice: '--'` | npm-style `--` between `pnpm ingest` and the subcommand | drop the `--` |

## 8. Sanity checks

When in doubt, the following commands establish whether each layer is
healthy:

```bash
# Postgres + pgvector
psql onlinejourno_dev -c "select extname from pg_extension;"
# expect: pgcrypto, vector (plus plpgsql)

# Schema present
psql onlinejourno_dev -c "\dt" | wc -l
# expect: 17+ tables

# Seed applied
psql onlinejourno_dev -c "select count(*) from sources where enabled;"
# expect: 6

# Ingest landed
psql onlinejourno_dev -c "select count(*) from signals;"
# non-zero after a successful ingest

# Web layer can read
curl -s http://localhost:3000/en/signals | head -1
# should not error
```

That's the full bottom-up: Postgres extensions → schema → seed → ingest →
web.
