-- 0006_trust_primitives.sql
--
-- ADR 0029 trust primitives: AI-use disclosure on briefs + off-record signal
-- flag. The columns are in infra/schema.sql (PR #2) but had no migration to
-- apply them to an existing database; this closes that drift. Idempotent.

alter table briefs
  add column if not exists ai_disclosure jsonb not null default jsonb_build_object(
    'models_used', '[]'::jsonb,
    'agents_invoked', '[]'::jsonb,
    'human_edited', false,
    'human_editor_id', null,
    'human_reviewed_at', null,
    'disclosure_text', null,
    'schema_version', 1
  );

alter table signals
  add column if not exists off_record boolean not null default false;

create index if not exists signals_off_record_idx
  on signals (tenant_id, off_record) where off_record = true;

create table if not exists signal_off_record_log (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  signal_id       uuid not null references signals(id) on delete cascade,
  action          text not null check (action in ('marked','unmarked')),
  actor_user_id   uuid references users(id),
  occurred_at     timestamptz not null default now(),
  reason          text
);

create index if not exists signal_off_record_log_tenant_signal_idx
  on signal_off_record_log (tenant_id, signal_id, occurred_at desc);
