-- 0007 — Front-engine (EIP) model onto the spine. Phase 0 consolidation
-- (docs/plans/consolidation.md, ADR 0042). Additive + tenant-scoped; non-breaking.
--
-- Ports editorial-intelligence-demo's SQLite signals + journalists model onto
-- the spine's multi-tenant Postgres, generalised off India/masthead specifics:
--   EIP 'state'              -> 'region'        (country-neutral)
--   geneea/claude/sarvajna/  -> one 'enrichment' jsonb keyed by stage
--     ntfy_json columns         (provider-neutral; no vendor names in schema)
--   journalists.teams_webhook-> 'alert_webhook' (channel-neutral)
-- collector_runs already covers EIP's ingestion_runs — no new run table.

-- --- signals: geo + beat + trend + enrichment -------------------------------
alter table signals
  add column if not exists district     text,
  add column if not exists region       text,
  add column if not exists beat         text,
  add column if not exists trend_score  real,
  add column if not exists trend_reason text,
  add column if not exists enrichment   jsonb;  -- {analyse:{}, classify:{}, archive:[], alert:{}}

create index if not exists idx_signals_tenant_district on signals (tenant_id, district);
create index if not exists idx_signals_tenant_region   on signals (tenant_id, region);
create index if not exists idx_signals_tenant_beat     on signals (tenant_id, beat);

-- --- journalist directory (EIP journalists), tenant-scoped -------------------
-- Standalone directory; optional link to an actual platform user. English-first
-- but per-journalist working `language` for the localizable output (ADR 0042).
create table if not exists journalist_profiles (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  user_id       uuid references users(id) on delete set null,
  slug          text not null,
  name          text not null,
  email         text,
  bureau        text,
  city          text,
  region        text,
  beats         jsonb,           -- list[str]
  role          text,
  reports_to    text,
  language      text,            -- preferred working language (English-first; localizable)
  alert_webhook text,            -- generalised from teams_webhook_url
  notes         text,
  claimed_at    timestamptz,
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists idx_journalist_profiles_tenant_region on journalist_profiles (tenant_id, region);
create index if not exists idx_journalist_profiles_tenant_bureau on journalist_profiles (tenant_id, bureau);
