-- Tenant isolation, defence-in-depth (ADR 0005): row-level security so the
-- DATABASE enforces tenant scoping even if an app query ever forgets its
-- `where tenant_id = $1`. The app pins the tenant per request via
-- set_config('app.current_tenant', <id>, true) inside withTenant() (lib/db.ts).
--
-- DO NOT APPLY to prod until EVERY tenant-scoped query routes through
-- withTenant()/tquery() — otherwise an un-pinned query returns ZERO rows.
-- Test on a Neon branch first. Rollback: `alter table X disable row level security;`.
--
-- current_setting('app.current_tenant', true): the `true` = missing_ok, so an
-- unset tenant yields NULL (→ no rows) instead of an error.

do $$
declare t text;
  scoped text[] := array[
    'stories','signals','distribution_fit_scores','story_leads',
    'connectors','sources','optimization_surfaces','journalist_profiles','entities'
  ];
begin
  foreach t in array scoped loop
    if to_regclass(t) is not null then
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
