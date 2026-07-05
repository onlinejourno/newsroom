-- 0008 — Data-source admin model (sub-project B). Extends `sources` with the
-- Part-3 descriptor fields (docs/architecture/editorial-ia-and-sources.md) and
-- adds the mcp + scrape ingest types. Additive, tenant-scoped, non-breaking.

alter table sources
  add column if not exists family       text,          -- government/political/international/institutional/wire/social/own
  add column if not exists tier         int,            -- 1..4
  add column if not exists sections_fed text[] not null default '{}',
  add column if not exists auth         jsonb,          -- {method, secret_ref} — never the raw key
  add column if not exists params       jsonb,          -- per-ingest_type config (api params, scrape selectors, mcp tool/args)
  add column if not exists geo          text,           -- country/region/district scope
  add column if not exists frequency    text;           -- poll cadence label

-- `kind` is the Part-3 ingest_type; add mcp + scrape.
alter table sources drop constraint if exists sources_kind_check;
alter table sources add constraint sources_kind_check
  check (kind in ('rss','gdelt','sitemap','homepage','article','robots',
                  'social','api','manual','mcp','scrape'));

create index if not exists idx_sources_tenant_tier on sources (tenant_id, tier);
