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
-- One dev source — The Hindu Business RSS
-- (reliable, well-formed RSS feed used as a dev fixture; real
-- regulator sources are added once their feeds are verified)
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
on conflict (tenant_id, name) do nothing;

commit;
