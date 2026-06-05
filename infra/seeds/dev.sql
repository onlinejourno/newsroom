-- infra/seeds/dev.sql
--
-- Local development seed. Idempotent — safe to re-run.
--
-- Creates the founder's `self` tenant with one beat and one known-good
-- RSS source so the first ingest run has something to work with.
--
-- Apply with:
--   pnpm db:seed:dev
--
-- Do NOT apply this on staging or production databases. Production
-- bootstrap data lives in infra/seeds/prod.sql when that exists.

begin;

-- ============================================================
-- Self tenant — founder's dev tenant, also acts as the first design
-- partner (OnlineJournalism.in publication)
-- ============================================================
insert into tenants (slug, name, tier, region, primary_locale, supported_locales)
values (
  'self',
  'OnlineJournalism.in (founder dev tenant)',
  'self',
  'IN',
  'en-IN',
  '{en-IN,hi-IN}'
)
on conflict (slug) do nothing;

-- ============================================================
-- Default cost budget for the self tenant
-- ============================================================
insert into cost_budgets (
  tenant_id, daily_cap_usd, shortlist_max_depth,
  brief_max_depth, thread_max_calls_per_day
)
select id, 2.00, 2, 5, 20
from tenants
where slug = 'self'
on conflict (tenant_id) do nothing;

-- ============================================================
-- Markets & Regulatory beat
-- ============================================================
insert into beats (tenant_id, slug, name, description, locale)
select
  t.id,
  'markets-regulatory',
  'Markets & Regulatory',
  'India markets and regulatory beat: RBI, SEBI, NSE, BSE, MCA, IBBI, CCI, IRDAI, ministry releases.',
  'en-IN'
from tenants t
where t.slug = 'self'
on conflict (tenant_id, slug) do nothing;

-- ============================================================
-- Desk editor (dev) — brief-compose attributes the desk brief to a user
-- (briefs.for_user is NOT NULL). One editor is enough for the MVP desk brief.
-- ============================================================
insert into users (tenant_id, email, display_name, role, beat_focus, locale, mode)
select t.id, 'editor@onlinejournalism.in', 'Desk Editor (dev)', 'editor',
       '{markets-regulatory}', 'en-IN', 'senior'
from tenants t
where t.slug = 'self'
on conflict (tenant_id, email) do nothing;

insert into beat_assignments (tenant_id, beat_id, user_id)
select t.id, b.id, u.id
from tenants t
join beats b on b.tenant_id = t.id and b.slug = 'markets-regulatory'
join users u on u.tenant_id = t.id and u.email = 'editor@onlinejournalism.in'
where t.slug = 'self'
on conflict (tenant_id, beat_id, user_id) do nothing;

-- ============================================================
-- Markets / Regulatory sources — Indian business journalism RSS
--
-- Reality note: most Indian regulators (RBI, SEBI, NSE, BSE, MCA, IBBI,
-- CCI, IRDAI) either removed their RSS feeds or never had any. NSE / BSE
-- are JS-rendered and anti-bot. Scraping those primary sources is Wk 2+
-- work. For Wk 1, the markets-regulatory beat ingests mainstream
-- business-journalism RSS as a proxy — these outlets cover the same
-- regulator news, validate the multi-source pipeline, and let agent
-- prompting iterate against real text.
--
-- Real regulator sources will be added under kind='scrape' once each
-- portal's collector lands in Wk 2+.
-- ============================================================

-- Reachability classes — see docs/SOURCE-ROADMAP.md
-- A: open RSS, ships now (enabled=true)
-- B: Cloudflare-protected RSS, Wk 2+ (enabled=false until scrape lands)
-- C: ASP.NET / JS-rendered portal, Wk 3+ (enabled=false until scrape lands)

-- ============================================================
-- Class A — Verified open RSS (working as of 2026-06-04)
-- ============================================================

-- Mint — Markets
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select t.id, 'rss', 'Mint — Markets',
       'https://www.livemint.com/market',
       'https://www.livemint.com/rss/markets',
       'mainstream', '{markets-regulatory}', '{en}', true
from tenants t
where t.slug = 'self'
on conflict (tenant_id, name) do nothing;

-- Economic Times — Markets
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select t.id, 'rss', 'Economic Times — Markets',
       'https://economictimes.indiatimes.com/markets',
       'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
       'mainstream', '{markets-regulatory}', '{en}', true
from tenants t
where t.slug = 'self'
on conflict (tenant_id, name) do nothing;

-- ============================================================
-- Class B — Cloudflare-protected RSS (disabled until Wk 2 scrape collector)
-- These return 403 to plain curl, 200 in a real browser. Re-enable
-- after the two-tier fetch lands (header tier + Playwright fallback).
-- ============================================================

-- The Hindu — Business (Class B)
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select t.id, 'rss', 'The Hindu — Business',
       'https://www.thehindu.com/business/',
       'https://www.thehindu.com/business/feeder/default.rss',
       'mainstream', '{markets-regulatory}', '{en}', false
from tenants t
where t.slug = 'self'
on conflict (tenant_id, name) do nothing;

-- Moneycontrol — Business (Class B)
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select t.id, 'rss', 'Moneycontrol — Business',
       'https://www.moneycontrol.com/news/business/',
       'https://www.moneycontrol.com/rss/business.xml',
       'mainstream', '{markets-regulatory}', '{en}', false
from tenants t
where t.slug = 'self'
on conflict (tenant_id, name) do nothing;

-- Business Standard — Markets (Class B)
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select t.id, 'rss', 'Business Standard — Markets',
       'https://www.business-standard.com/markets',
       'https://www.business-standard.com/rss/markets-106.rss',
       'mainstream', '{markets-regulatory}', '{en}', false
from tenants t
where t.slug = 'self'
on conflict (tenant_id, name) do nothing;

-- ============================================================
-- Class C — JS-rendered portals (disabled until Wk 3+ scrape collector)
-- PIB has no working public RSS endpoint (`rss_feeds.aspx` returns 404,
-- `RssMain.aspx` is an ASP.NET WebForm with Akamai). Real ingest path
-- is the Playwright PRID-walker described in docs/SOURCE-ROADMAP.md.
-- ============================================================

-- PIB — Finance Ministry releases (Class C)
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select t.id, 'rss', 'PIB — Finance Ministry',
       'https://pib.gov.in/AllRelease.aspx',
       'https://pib.gov.in/RssMain.aspx?ModId=1&Lang=1&Regid=3',
       'index_category', '{markets-regulatory}', '{en}', false
from tenants t
where t.slug = 'self'
on conflict (tenant_id, name) do nothing;

commit;
