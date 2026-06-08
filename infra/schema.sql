-- OnlineJourno Platform — initial schema draft
-- Wk 0 sketch. Refined Thu Jun 4. First migration shipped Wk 1.
--
-- Conventions:
--   * Every domain table has tenant_id (multi-tenant row-level — ADR 0005).
--   * timestamps in UTC, type timestamptz.
--   * surrogate primary keys: uuid v7 (sortable) where supported, else bigserial.
--   * No vendor-lock features; standard Postgres + pgvector extension only.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ============================================================
-- Tenancy and identity
-- ============================================================

create table tenants (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  name               text not null,
  tier               text not null check (tier in ('tier_1','tier_2','tier_3','self')),
  region             text not null default 'IN',
  primary_locale     text not null default 'en-IN',     -- e.g. en-IN, ta-IN, pt-BR, sv-SE
  supported_locales  text[] not null default '{en-IN}', -- UI + brief output locales
  data_residency     text not null default 'IN',        -- region for storage adapter (ADR 0023)
  config             jsonb not null default '{}'::jsonb,  -- newsroom.yaml materialised
  created_at         timestamptz not null default now(),
  archived_at        timestamptz
);

create table users (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  email           text not null,
  display_name    text,
  role            text not null check (role in ('admin','editor','journalist','viewer')),
  beat_focus      text[] not null default '{}',
  locale          text not null default 'en-IN',     -- per-user UI + brief locale; falls back to tenant primary_locale
  mode            text not null default 'senior' check (mode in ('rookie','senior')),
  created_at      timestamptz not null default now(),
  archived_at     timestamptz,
  unique (tenant_id, email)
);

-- ============================================================
-- Source registry and beats
-- ============================================================

create table sources (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  kind               text not null check (kind in ('rss','gdelt','sitemap','homepage','article','robots','social','api','manual','mcp','scrape')),
  name               text not null,
  url                text not null,
  rss_url            text,
  deuze_type         text check (deuze_type in ('mainstream','index_category','meta_comment','share_discussion')),
  beat_tags          text[] not null default '{}',
  expected_languages text[] not null default '{en}',   -- ISO 639-1 codes; agents check ingestion-language matches
  -- data-source admin model (0008): the Part-3 source descriptor
  family             text,                              -- government/political/international/institutional/wire/social/own
  tier               int,                               -- 1..4 (editorial weight / effort)
  sections_fed       text[] not null default '{}',      -- IA sections this feeds
  auth               jsonb,                             -- {method, secret_ref} — never the raw key
  params             jsonb,                             -- per-ingest_type config (api params, scrape selectors, mcp tool/args)
  geo                text,                              -- country/region/district scope
  frequency          text,                              -- poll cadence label
  enabled            boolean not null default true,
  quality_score      real,                              -- learned over time
  false_alarm_rate   real,                              -- learned over time
  last_seen_at       timestamptz,                       -- portal-health: when last successful ingest
  consecutive_failures integer not null default 0,      -- portal-health: rises until threshold triggers editorial alert
  created_at         timestamptz not null default now(),
  constraint sources_tenant_name_unique unique (tenant_id, name)
);

create index on sources (tenant_id, enabled);
create index on sources using gin (beat_tags);
create index on sources (tenant_id, tier);

-- Connector registry (sub-project C, ADR 0044): pluggable newsroom data tools
-- (analytics/keywords/search_console/trends/subscription/social) via API or MCP.
create table connectors (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  category    text not null,
  provider    text not null,
  mode        text not null check (mode in ('api','mcp')),
  config      jsonb,
  auth        jsonb,                               -- {method, secret_ref} — never the raw key
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, category, provider)
);
create index on connectors (tenant_id, category);

create table beats (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  slug            text not null,
  name            text not null,
  description     text,
  unique (tenant_id, slug)
);

create table beat_assignments (
  tenant_id       uuid not null references tenants(id) on delete cascade,
  beat_id         uuid not null references beats(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  primary key (tenant_id, beat_id, user_id)
);

-- ============================================================
-- Collector runs and raw signals
-- ============================================================

create table collector_runs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  collector       text not null,
  source_id       uuid references sources(id) on delete set null,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  status          text not null default 'running' check (status in ('running','success','partial','failed')),
  items_count     integer,
  notes           text
);

create table signals (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  source_id       uuid not null references sources(id),
  run_id          uuid references collector_runs(id) on delete set null,
  external_id     text,                          -- canonical id from source
  url             text not null,
  url_hash        text not null,
  headline        text,
  body_text       text,
  published_at    timestamptz,
  fetched_at      timestamptz not null default now(),
  language        text default 'en',
  raw_payload     jsonb,
  embedding       vector(1024),                  -- pgvector for semantic dedup + retrieval
  -- front-engine (EIP) model, generalised off masthead/India specifics (0007)
  district        text,
  region          text,                          -- EIP 'state', country-neutral
  beat            text,
  trend_score     real,
  trend_reason    text,
  enrichment      jsonb,                          -- {analyse:{}, classify:{}, archive:[], alert:{}}
  unique (tenant_id, url_hash)
);

create index on signals (tenant_id, published_at desc);
create index on signals using ivfflat (embedding vector_cosine_ops);
create index on signals (tenant_id, district);
create index on signals (tenant_id, region);
create index on signals (tenant_id, beat);

-- Journalist directory (EIP journalists), tenant-scoped; optional link to a
-- platform user. Per-journalist working `language` for localizable output.
create table journalist_profiles (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  user_id       uuid references users(id) on delete set null,
  slug          text not null,
  name          text not null,
  email         text,
  bureau        text,
  city          text,
  region        text,
  beats         jsonb,
  role          text,
  reports_to    text,
  language      text,
  alert_webhook text,                            -- channel-neutral (was teams_webhook)
  notes         text,
  claimed_at    timestamptz,
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index on journalist_profiles (tenant_id, region);
create index on journalist_profiles (tenant_id, bureau);

-- ============================================================
-- Shortlist + editorial decisions
-- ============================================================

create table shortlist_items (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  signal_id       uuid not null references signals(id) on delete cascade,
  for_user        uuid references users(id) on delete set null,  -- null = whole desk
  beat_id         uuid references beats(id) on delete set null,
  score           real not null,
  rank            integer,
  rationale       text,
  shortlisted_at  timestamptz not null default now(),
  decision        text check (decision in ('kept','rejected','deferred','published')),
  decision_at     timestamptz,
  decision_by     uuid references users(id),
  decision_reason text                            -- why journalist rejected; the moat dataset
);

create index on shortlist_items (tenant_id, shortlisted_at desc);
create index on shortlist_items (tenant_id, decision);
-- Backs the FK to signals + the scorer's anti-join (candidate_signals); the FK
-- itself does not index the referencing column.
create index on shortlist_items (signal_id);

-- ============================================================
-- Briefs (composed daily output)
-- ============================================================

create table briefs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  for_user        uuid not null references users(id) on delete cascade,
  beat_id         uuid references beats(id),
  edition_date    date not null,
  locale          text not null default 'en-IN',  -- output locale; brief composed in this language
  composed_at     timestamptz not null default now(),
  delivery_status text not null default 'pending' check (delivery_status in ('pending','delivered','failed')),
  delivery_channel text not null default 'email' check (delivery_channel in ('email','web','both')),
  content         jsonb not null,                 -- structured: { sections: [{ heading, body, signals: [id...] }] }
  unique (tenant_id, for_user, edition_date)
);

-- ============================================================
-- Story threads
-- ============================================================

create table threads (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  slug            text not null,
  title           text not null,
  beat_id         uuid references beats(id),
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz,
  unique (tenant_id, slug)
);

create table thread_links (
  thread_id       uuid not null references threads(id) on delete cascade,
  signal_id       uuid not null references signals(id) on delete cascade,
  linked_at       timestamptz not null default now(),
  link_reason     text,
  primary key (thread_id, signal_id)
);

-- ============================================================
-- Agent traces + cost
-- ============================================================

create table agent_traces (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  agent_name      text not null,
  path            text not null check (path in ('shortlist','brief','thread','feedback','other')),
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  model           text not null,
  tool_calls      integer not null default 0,
  prompt_tokens   integer,
  output_tokens   integer,
  cost_usd        numeric(10,6),
  status          text not null check (status in ('success','partial','failed','escalated')),
  reasoning       jsonb,                          -- structured trace
  related_signal_id uuid references signals(id),
  related_brief_id  uuid references briefs(id)
);

create index on agent_traces (tenant_id, started_at desc);
create index on agent_traces (tenant_id, agent_name);

-- ============================================================
-- Cost ceilings (per-tenant daily caps)
-- ============================================================

create table cost_budgets (
  tenant_id       uuid primary key references tenants(id) on delete cascade,
  daily_cap_usd   numeric(10,2) not null default 8,
  shortlist_max_depth integer not null default 2,
  brief_max_depth integer not null default 5,
  thread_max_calls_per_day integer not null default 20
);

-- ============================================================
-- Eval / replay
-- ============================================================

create table eval_runs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade,
  goldset_version text not null,
  prompt_version  text not null,
  model           text not null,
  agent_name      text not null,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  f1_score        real,
  precision_score real,
  recall_score    real,
  cost_usd        numeric(10,6),
  notes           text
);

-- ============================================================
-- Tenant audit (cross-tenant attempts, admin actions)
-- ============================================================

create table tenant_audit (
  id              uuid primary key default gen_random_uuid(),
  occurred_at     timestamptz not null default now(),
  actor_user_id   uuid,
  actor_tenant_id uuid,
  target_tenant_id uuid,
  action          text not null,
  detail          jsonb
);

-- ============================================================
-- Beats — language config per beat (ADR 0019)
-- ============================================================

alter table beats
  add column if not exists locale text not null default 'en-IN';   -- output locale for briefs on this beat

-- ============================================================
-- Portal-health alerts (premortem #6 — scraper rot, ADR 0014 m-portal-health)
-- ============================================================

create table portal_health_alerts (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  source_id       uuid not null references sources(id) on delete cascade,
  raised_at       timestamptz not null default now(),
  severity        text not null check (severity in ('info','warning','critical')),
  reason          text not null,                  -- e.g. 'no signal for 24h', 'parse failure 3x', 'redirect detected'
  acknowledged_at timestamptz,
  acknowledged_by uuid references users(id),
  resolved_at     timestamptz
);

create index on portal_health_alerts (tenant_id, raised_at desc) where resolved_at is null;

-- ============================================================
-- Eval gates (per-language launch gating, ADR 0020)
-- ============================================================

create table eval_gates (
  tenant_id       uuid not null references tenants(id) on delete cascade,
  capability      text not null,                   -- e.g. 'brief_composer'
  locale          text not null,                   -- e.g. 'hi-IN'
  passed          boolean not null default false,
  f1_score        real,
  reviewed_at     timestamptz,
  reviewer_email  text,
  notes           text,
  primary key (tenant_id, capability, locale)
);

-- ============================================================
-- Trust primitives — AI-use disclosure on briefs (ADR 0029)
-- ============================================================
-- Every brief carries a structured AI-use disclosure: which models composed it,
-- which agents were invoked, whether a human editor reviewed before delivery,
-- and an optional human-readable disclosure string surfaced to readers when
-- the brief is shared. Disclosure is part of trust-ladder, not optional metadata.

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

-- ============================================================
-- Trust primitives — off-record signal flag (ADR 0029)
-- ============================================================
-- A journalist can mark a signal off-record. Off-record signals:
--   * are excluded from shortlist composition (ingest-score skips).
--   * are excluded from brief composition (brief-compose skips).
--   * are visible only to the marker and to the beat's editor.
--   * remain stored in the signals table for audit; the flag is reversible.
--   * never leave the tenant boundary (per ADR 0005 + ADR 0025).
-- The reversal trail lives in signal_off_record_log for accountability.

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
  reason          text                                  -- optional free text from the journalist
);

create index if not exists signal_off_record_log_tenant_signal_idx
  on signal_off_record_log (tenant_id, signal_id, occurred_at desc);

-- ============================================================
-- Notes
-- ============================================================
-- 1. Row-level security policies are NOT in this draft. Wk 1 adds them per ADR 0005.
-- 2. Module-owned tables (e.g. framing_pej_codings, discover_seo_scores) will be added
--    via per-module migrations under packages/modules/<name>/storage/ — ADR 0006.
-- 3. Vector dimension 1024 is a placeholder; finalise once embedding model is chosen.
-- 4. Multilingual support: locale fields on tenants, users, briefs, beats; expected_languages
--    on sources; language detection on signals — together cover ADRs 0018-0020.
-- 5. Portal-health alerts surface scraper-rot as editorial signal, not silent engineering
--    alert (premortem #6, ADR 0014).
-- 6. AI-use disclosure on briefs + off-record signal flag are first-class trust
--    primitives (ADR 0029); brief composer must populate disclosure; ingest-score
--    and brief-compose must filter out off-record signals.
