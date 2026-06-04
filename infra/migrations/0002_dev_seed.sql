-- 0002_dev_seed.sql
--
-- Seed data for local development only. Creates one tenant, one beat,
-- and one source so the first collector run has something to work with.
-- Do NOT run this on a real customer database.
--
-- The seed tenant slug is 'self' — represents the founder's own
-- OnlineJournalism.in publication acting as its own design partner.

begin;

-- ============================================================
-- Self tenant
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
insert into cost_budgets (tenant_id, daily_cap_usd, shortlist_max_depth, brief_max_depth, thread_max_calls_per_day)
select id, 2.00, 2, 5, 20
from tenants
where slug = 'self'
on conflict (tenant_id) do nothing;

-- ============================================================
-- Markets / Regulatory beat
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
-- One dev source — The Hindu Business RSS
-- (reliable, well-formed RSS; real regulator sources added once verified)
-- ============================================================
insert into sources (
  tenant_id, kind, name, url, rss_url, deuze_type,
  beat_tags, expected_languages, enabled
)
select
  t.id,
  'rss',
  'The Hindu — Business',
  'https://www.thehindu.com/business/',
  'https://www.thehindu.com/business/feeder/default.rss',
  'mainstream',
  '{markets-regulatory}',
  '{en}',
  true
from tenants t
where t.slug = 'self'
on conflict do nothing;

commit;
