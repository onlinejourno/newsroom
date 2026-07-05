# Seeds

Per-environment data fixtures. Separated from `infra/migrations/` so that
running `pnpm db:migrate` on production never silently inserts dev fixtures.

## Layout

| File | When to run | What it does |
|------|-------------|--------------|
| `dev.sql` | Local development | Creates the founder `self` tenant, a markets-regulatory beat, and one known-good RSS source (The Hindu Business) for first-ingest validation. |
| `test.sql` | CI (Y2+) | Deterministic minimal fixtures for automated tests. Not present yet. |
| `prod.sql` | Production bootstrap (Y2+) | Minimum data the platform needs to operate: admin user, default cost budget, etc. Not present yet. |

## Convention

- **Idempotent.** Every seed uses `ON CONFLICT (<columns>) DO NOTHING` so
  re-running is safe and never duplicates rows. The migration `0003_sources_unique.sql`
  added the unique constraint that makes the dev seed's source insert
  idempotent.
- **Wrapped in a transaction.** `begin; ... commit;` so a partial seed
  leaves the database untouched.
- **Single-purpose.** A seed inserts data only; it does not alter schema.
  Schema changes go in `infra/migrations/`.

## Applying

```bash
# From repo root, after migrations are applied:
pnpm db:seed:dev
```

The script runs `psql "$DATABASE_URL" -f infra/seeds/dev.sql`. Re-runs are safe.

## Adding new sources to the dev seed

Append to `dev.sql`:

```sql
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select
  t.id,
  'rss',
  'NEW SOURCE NAME',                                       -- unique per tenant
  'https://example.com/',
  'https://example.com/feed.rss',
  'mainstream',
  '{markets-regulatory}',
  '{en}',
  true
from tenants t
where t.slug = 'self'
on conflict (tenant_id, name) do nothing;
```

The `(tenant_id, name)` conflict target is satisfied by the unique
constraint added in migration `0003_sources_unique.sql`.

## What never goes in a seed

- Schema changes (use a migration instead).
- Real customer data (use a customer-specific bootstrap process).
- Anything that requires manual founder review per environment (use the
  admin UI instead).
