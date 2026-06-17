-- 0019 — Planning Phase A (ADR 0059): a lead grows into a plan.
-- A story is a small production: a parent lead + child production tasks
-- (text/video/interactive/graphic…), each routed to a desk with its own ETA.
-- Plus target surfaces, and a plan-approval gate DISTINCT from the editorial
-- filed→approved gate (the hierarchy signs off the *plan* before execution).

create table if not exists production_tasks (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  lead_id     uuid not null references story_leads(id) on delete cascade,
  kind        text not null default 'text'
                check (kind in ('text','video','interactive','graphic','audio','photo','other')),
  desk        text,
  assignee_id uuid references users(id) on delete set null,
  eta         timestamptz,
  status      text not null default 'todo' check (status in ('todo','doing','done')),
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_production_tasks_lead on production_tasks (lead_id);

alter table story_leads
  add column if not exists target_surfaces text[] not null default '{}';
alter table story_leads
  add column if not exists plan_approval text not null default 'draft'
    check (plan_approval in ('draft','submitted','approved','rejected'));
alter table story_leads
  add column if not exists plan_approved_by uuid references users(id) on delete set null;
alter table story_leads
  add column if not exists plan_approved_at timestamptz;
