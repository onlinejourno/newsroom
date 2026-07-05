create table if not exists seo_audit (
  tenant_id   uuid not null,
  url         text not null,
  story_id    uuid,                 -- set when the audited URL is a known story
  audit       jsonb not null,
  computed_at timestamptz not null default now(),
  primary key (tenant_id, url)
);
create index if not exists idx_seo_audit_tenant_computed on seo_audit (tenant_id, computed_at desc);
