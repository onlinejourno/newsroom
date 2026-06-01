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
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  tier            text not null check (tier in ('tier_1','tier_2','tier_3','self')),
  region          text not null default 'IN',
  config          jsonb not null default '{}'::jsonb,  -- newsroom.yaml materialised
  created_at      timestamptz not null default now(),
  archived_at     timestamptz
);

create table users (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  email           text not null,
  display_name    text,
  role            text not null check (role in ('admin','editor','journalist','viewer')),
  beat_focus      text[] not null default '{}',
  mode            text not null default 'senior' check (mode in ('rookie','senior')),
  created_at      timestamptz not null default now(),
  archived_at     timestamptz,
  unique (tenant_id, email)
);

-- ============================================================
-- Source registry and beats
-- ============================================================

create table sources (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  kind            text not null check (kind in ('rss','sitemap','homepage','article','robots','social','api','manual')),
  name            text not null,
  url             text not null,
  rss_url         text,
  deuze_type      text check (deuze_type in ('mainstream','index_category','meta_comment','share_discussion')),
  beat_tags       text[] not null default '{}',
  enabled         boolean not null default true,
  quality_score   real,                          -- learned over time
  false_alarm_rate real,                         -- learned over time
  created_at      timestamptz not null default now()
);

create index on sources (tenant_id, enabled);
create index on sources using gin (beat_tags);

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
  unique (tenant_id, url_hash)
);

create index on signals (tenant_id, published_at desc);
create index on signals using ivfflat (embedding vector_cosine_ops);

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

-- ============================================================
-- Briefs (composed daily output)
-- ============================================================

create table briefs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  for_user        uuid not null references users(id) on delete cascade,
  beat_id         uuid references beats(id),
  edition_date    date not null,
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
-- Notes
-- ============================================================
-- 1. Row-level security policies are NOT in this draft. Wk 1 adds them per ADR 0005.
-- 2. Module-owned tables (e.g. framing_pej_codings, discover_seo_scores) will be added
--    via per-module migrations under packages/modules/<name>/storage/ — ADR 0006.
-- 3. Vector dimension 1024 is a placeholder; finalise once embedding model is chosen.
