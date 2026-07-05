-- Tenant isolation, defence-in-depth (ADR 0005) — RLS, second attempt.
--
-- Supersedes optional/0025_tenant_rls.sql (kept for history) and reverses
-- 0026_disable_rls.sql. 0025 was parked because it shipped before the app had
-- tenant-context wiring; that wiring now exists everywhere:
--   * apps/web: every tenant-scoped helper in lib/db.ts + lib/workflow.ts
--     routes through withTenant()/tquery(), which set app.current_tenant
--     per transaction.
--   * workers: packages/{agents-py,ingest-py} pin the connection via
--     pin_tenant() — inside tenant_id_for_slug() for slug-resolving runs,
--     or connect(tenant_id) where the tenant is already known.
--
-- Policy: rows on a scoped table are visible/writable only when tenant_id
-- matches current_setting('app.current_tenant'). The explicit
-- `where tenant_id = $1` in every query stays as the belt (enforced by the
-- static scan in apps/web/lib/tenant-isolation.test.ts); RLS is the
-- suspenders — a forgotten filter now returns zero rows instead of another
-- newsroom's data.
--
-- Table list = the scan's SCOPED list, i.e. every tenant_id-bearing domain
-- table the app queries. thread_links is excluded (no tenant_id column —
-- junction table; its tenant scoping rides on threads/signals). users is
-- excluded by design: auth reads users by signed-session PK before any
-- tenant is known (see the scan's header).
--
-- Caveats, deliberately documented:
--   * RLS does NOT apply to superusers or roles with BYPASSRLS. For the
--     backstop to be live in prod, DATABASE_URL must use a non-superuser
--     role. FORCE binds the table owner, so an owner (non-superuser) role
--     IS covered. Verified live by apps/web/lib/rls-live.test.ts.
--   * Seed files (infra/seeds/*.sql) insert scoped rows without pinning a
--     tenant; run them as superuser (local dev default) or set
--     app.current_tenant first.
--   * current_setting('app.current_tenant', true): `true` = missing_ok, so
--     an unset tenant yields NULL (→ zero rows), never an error.
-- Rollback: re-run 0026's body (drop policy + disable RLS per table).

do $$
declare t text;
  scoped text[] := array[
    'stories','signals','distribution_fit_scores','story_leads','leads',
    'connectors','sources','optimization_surfaces','journalist_profiles',
    'entities','entity_coverage','calendar_event','briefs','beats',
    'threads','shortlist_items','seo_audit','topic_domains',
    'outlet_keywords','channel_affinity_log'
  ];
begin
  foreach t in array scoped loop
    if to_regclass(t) is not null
       and exists (select 1 from information_schema.columns
                    where table_name = t and column_name = 'tenant_id') then
      execute format('alter table %I enable row level security', t);
      execute format('alter table %I force row level security', t);  -- bind the owner too
      execute format('drop policy if exists tenant_isolation on %I', t);
      execute format(
        'create policy tenant_isolation on %I using (tenant_id = current_setting(''app.current_tenant'', true)::uuid)',
        t
      );
    end if;
  end loop;
end $$;
