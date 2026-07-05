-- Compensating migration for 0025_tenant_rls.sql (moved to optional/).
--
-- SUPERSEDED by 0029_tenant_rls.sql, which re-enables RLS now that the app
-- (tquery/withTenant) and workers (pin_tenant) pin app.current_tenant.
-- Kept in sequence so fresh installs replay history correctly: 0026 disables,
-- 0029 re-enables with the full table list.
--
-- 0025 was auto-applied by migrate.mjs before the app had withTenant()/tquery()
-- wiring in place. FORCE RLS with no app.current_tenant set → zero rows on all
-- scoped tables. This migration disables RLS on those tables and drops the policy
-- so the app returns data normally.
--
-- Safe to run on installs that never applied 0025 (no-op: disable on a table
-- with no RLS enabled, and drop policy if exists).

do $$
declare t text;
  scoped text[] := array[
    'stories','signals','distribution_fit_scores','story_leads',
    'connectors','sources','optimization_surfaces','journalist_profiles','entities'
  ];
begin
  foreach t in array scoped loop
    if to_regclass(t) is not null then
      execute format('drop policy if exists tenant_isolation on %I', t);
      execute format('alter table %I disable row level security', t);
    end if;
  end loop;
end $$;
