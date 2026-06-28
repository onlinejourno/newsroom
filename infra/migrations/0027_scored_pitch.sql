-- 0027_scored_pitch.sql — Scored Pitch (spec 2026-06-28).
-- (a) name-grained entity coverage index, derived from signals.enrichment.
-- (b) additive pitch-scoring columns on story_leads.

create table if not exists entity_coverage (
  tenant_id        uuid not null references tenants(id) on delete cascade,
  entity_type      text not null,   -- Location|Person|Organisation|Topic|Named Entity
  entity_name      text not null,
  appearance_count integer not null default 0,
  last_seen        timestamptz,
  story_ids        text[] not null default '{}',
  refreshed_at     timestamptz not null default now(),
  primary key (tenant_id, entity_type, entity_name)
);
create index if not exists idx_entity_coverage_name
  on entity_coverage (tenant_id, entity_name);

alter table story_leads
  add column if not exists entities        jsonb   not null default '[]',
  add column if not exists merit           integer,
  add column if not exists reach           integer,
  add column if not exists potential       integer,
  add column if not exists archival_weight integer,
  add column if not exists conviction      text not null default 'normal'
                            check (conviction in ('low','normal','high')),
  add column if not exists pitch_weight    integer,
  add column if not exists pitch_why       text;

create index if not exists idx_leads_pitch_weight
  on story_leads (tenant_id, status, pitch_weight desc);
