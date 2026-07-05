create table if not exists topic_domains (
  tenant_id   uuid not null,
  topic       text not null,
  source      text,                  -- 'GDELT' | 'GoogleNews'
  domains     jsonb not null,        -- [{domain,count}]
  computed_at timestamptz not null default now(),
  primary key (tenant_id, topic)
);
