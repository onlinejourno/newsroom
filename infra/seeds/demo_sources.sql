-- demo_sources.sql — demo / test corpus sources (The Hindu).
--
-- Prod is seeded with primary_sources.sql (the public record: PIB/SEBI/RBI…),
-- which fills the *inflow* (signals). It has no own-published-story corpus, so
-- the back-engine surfaces (Story Scores /potential, Hidden Gems /gems, the
-- home dashboard) render empty. This seed adds The Hindu — the canonical demo
-- source (ADR 0013 / calendar_demo) — so those surfaces have published stories
-- to rank, across the site's section IA.
--
-- The Hindu is Cloudflare-guarded, so the GDELT path (metadata: headline + URL
-- + date) is the reliable ingest; the direct RSS is a secondary path (the
-- cloudflare-aware fetch handles it where it can).
--
-- Apply to the demo/pilot DB, then:
--   1. set  OJ_DEMO_HOST=thehindu.com  in the pipeline (worker) env
--   2. run one pipeline cycle:
--        collect → enrich → frame →
--        stories-from-signals --host thehindu.com → score-stories → site-crawl
--   → /potential, /gems and the dashboard populate with Hindu stories.

-- The Hindu (via GDELT) — broad, cross-section: powers the demo corpus across
-- the site's IA (national, business, sport, …), not only markets. beat_tags is
-- left empty so the Classify layer assigns a beat per signal.
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select t.id, 'gdelt', 'The Hindu (GDELT — demo)',
       'https://api.gdeltproject.org/api/v2/doc/doc',
       'domainis:thehindu.com sourcelang:english',
       'mainstream', '{}', '{en}', true
from tenants t
where t.slug = 'self'
on conflict (tenant_id, name) do nothing;

-- The Hindu — Business (via GDELT) — markets/regulatory wedge focus.
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select t.id, 'gdelt', 'The Hindu — Business (GDELT)',
       'https://api.gdeltproject.org/api/v2/doc/doc',
       'domainis:thehindu.com (sebi OR rbi OR nifty OR sensex OR rupee OR markets OR IPO OR economy) sourcelang:english',
       'mainstream', '{markets-regulatory}', '{en}', true
from tenants t
where t.slug = 'self'
on conflict (tenant_id, name) do nothing;

-- The Hindu — Business (direct RSS, secondary; Cloudflare-guarded).
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select t.id, 'rss', 'The Hindu — Business',
       'https://www.thehindu.com/business/',
       'https://www.thehindu.com/business/feeder/default.rss',
       'mainstream', '{markets-regulatory}', '{en}', true
from tenants t
where t.slug = 'self'
on conflict (tenant_id, name) do nothing;
