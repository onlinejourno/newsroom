-- 0003_sources_unique.sql
--
-- Add a unique constraint on (tenant_id, name) for the sources table so
-- that dev seeds (and any future automated source registration) can use
-- ON CONFLICT (tenant_id, name) DO NOTHING for idempotent inserts.
--
-- Without this constraint, the dev seed in infra/seeds/dev.sql would
-- duplicate the same source row on every run.

begin;

alter table sources
  add constraint sources_tenant_name_unique unique (tenant_id, name);

commit;
