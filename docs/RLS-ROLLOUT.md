# Tenant RLS — rollout (P0, ADR 0005)

Database-enforced tenant isolation as **defence-in-depth** over the app-level
`where tenant_id = $1` (already audited sound + guarded by
`apps/web/lib/tenant-isolation.test.ts`). If any query ever forgets its filter,
RLS makes the database itself return no cross-tenant rows.

## Mechanism (lib/db.ts)
- `withTenant(tenantId, fn)` / `tquery(tenantId, sql, params)` — open a txn,
  `set_config('app.current_tenant', id, true)` (**LOCAL** → cannot leak to the
  next request on a pooled connection), run, commit.
- Migration `infra/migrations/0025_tenant_rls.sql` — `ENABLE` + **`FORCE`** RLS
  + policy `using (tenant_id = current_setting('app.current_tenant', true)::uuid)`
  on each tenant-scoped table.

## Why it must be staged
With **FORCE** RLS on, ANY tenant-scoped query NOT run through `withTenant`
sees the tenant as unset → **zero rows**. So the refactor must be **complete and
deployed** before the migration is applied.

## Steps
1. **[done] Foundation** — `withTenant`/`tquery` + `0025` (NOT applied) on `main`. No-op while RLS is off.
2. **Refactor** — route ALL 64 tenant-scoped queries in `lib/db.ts` (+ `workflow.ts` mutations) through `tquery`/`withTenant`. Keep the explicit `where tenant_id = $1`. Do it in batches; type-check each; the isolation guard test stays green.
3. **Deploy** the refactor to prod (still a no-op — RLS off). Verify every surface still returns data.
4. **Neon-branch test** (needs DB access): branch prod → apply `0025` on the branch → point a test deploy at the branch `DATABASE_URL` → with two tenants, prove A can't read/write B AND every surface still works (catches any query missed in step 2).
5. **Prod cutover**: apply `0025` to prod (`DATABASE_URL=… node apps/web/scripts/migrate.mjs`).
6. **Rollback** (instant): `alter table <t> disable row level security;` per table.

## Done =
app-level filter present (guard test green) · RLS forced · Neon-branch isolation test passed · all prod surfaces return data post-cutover.
