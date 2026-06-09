-- 0013 — unique (tenant_id, cms_ref) on stories, so CMS pulls are idempotent
-- (re-pull updates the same row). NULL cms_ref (manual stories) stays unconstrained.
alter table stories add constraint stories_tenant_cms_ref_unique unique (tenant_id, cms_ref);
