create table if not exists outlet_keywords (
  tenant_id   uuid        not null,
  domain      text        not null,
  keywords    jsonb       not null,
  computed_at timestamptz not null default now(),
  primary key (tenant_id, domain)
);
