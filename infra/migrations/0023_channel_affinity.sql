-- 0023_channel_affinity.sql
-- Append-only log of entity appearances across distribution channels.
-- Ported from discover-dashboard/data/performance_log.py (affinity_stats seed data).

create table if not exists channel_affinity_log (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null,
  entity_type text not null,            -- Location | Person | Organisation | Topic | Named Entity
  channel     text not null,            -- google_news | discover | search | trending_match
  section     text,
  momentum    real,
  story_id    uuid,
  logged_at   timestamptz not null default now()
);

create index if not exists idx_affinity_tenant_logged on channel_affinity_log (tenant_id, logged_at desc);
