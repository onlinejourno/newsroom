-- 0015 — Story leads: the signal→published workflow state machine (ADR 0056).
create table if not exists story_leads (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  title           text not null,
  beat            text,
  bureau          text,
  origin          text not null default 'assigned'
                    check (origin in ('assigned','pitched','requested')),
  status          text not null default 'idea'
                    check (status in ('idea','pitched','assigned','filed','approved','published','killed')),
  importance      text not null default 'normal'
                    check (importance in ('low','normal','high','urgent')),
  signal_id       uuid references signals(id) on delete set null,
  story_id        uuid references stories(id) on delete set null,
  assignee_id     uuid references users(id) on delete set null,
  commissioner_id uuid references users(id) on delete set null,
  eta             timestamptz,
  trend_score     integer,
  keywords        text[] not null default '{}',
  topic           text,
  note            text,
  created_at      timestamptz not null default now(),
  pitched_at      timestamptz,
  assigned_at     timestamptz,
  filed_at        timestamptz,
  approved_at     timestamptz,
  published_at    timestamptz
);
create index if not exists idx_leads_tenant_status on story_leads (tenant_id, status);
create index if not exists idx_leads_assignee on story_leads (assignee_id);
