-- Demo calendar events for verifying the /calendar view before the live Claim
-- Extractor runs (which needs the tenant's LLM API key). Dated around mid-2026
-- so the forward calendar, the within-14-day band, the past-due accountability
-- queue, and an undated promise are all exercised. Idempotent.
--
-- source_link is the real article permalink the claim would cite — article-level,
-- exactly like signals.url the live extractor copies (claim_extract.py) — never the
-- publisher homepage, so the drawer and the SEO/E-E-A-T audit resolve to the actual
-- story. The Hindu (this demo's canonical source) is Cloudflare-guarded, so these
-- permalinks 403 a plain HTTP client; the audit port fetches such sources headless
-- (see docs/SOURCE-ROADMAP.md and the seo-eeat-audit-port plan).
--
-- Purge with:  delete from calendar_event where extractor_version = 'demo-seed';
insert into calendar_event (
  tenant_id, who, what, deadline_text, date_claimed, target_date, precision,
  source_link, original_claim_text, confidence, topic, claim_key, extractor_version
)
select t.id, v.who, v.what, v.deadline_text, v.date_claimed::date,
       v.target_date::date, v.precision, v.source_link, v.original_claim_text,
       v.confidence::real, v.topic, v.claim_key, 'demo-seed'
  from tenants t
 cross join (values
   ('PWD Minister', 'open the Velachery flyover', 'by end of May',
    '2026-04-10', '2026-05-31', 'month', 'https://www.thehindu.com/news/national/andhra-pradesh/andhra-pradesh-to-fast-track-smart-street-lighting-project-across-urban-local-bodies/article71101219.ece',
    'The flyover will be opened to traffic by the end of May, the minister told the Assembly.',
    0.82, 'Infrastructure', 'demo-cal-1'),
   ('Assembly Speaker', 'table the privileges committee report', 'next week',
    '2026-06-10', '2026-06-20', 'day', 'https://www.thehindu.com/news/national/tamil-nadu/bankers-committee-raises-states-credit-outlay-to-1098-lakh-crore/article71088463.ece',
    'The report will be tabled next week, the Speaker said.',
    0.75, 'Politics', 'demo-cal-2'),
   ('Election Commission', 'announce the Erode bypoll schedule', 'by June 25',
    '2026-06-05', '2026-06-25', 'day', 'https://www.thehindu.com/news/national/west-bengal/around-4000-evms-gutted-as-bengal-govt-building-catches-fire-minister-flags-possibility-of-foul-play/article71094242.ece',
    'The poll panel will announce the bypoll schedule by June 25.',
    0.70, 'Politics', 'demo-cal-3'),
   ('Finance Secretary', 'release Q1 GST collection figures', 'end of June',
    '2026-06-01', '2026-06-30', 'month', 'https://www.thehindu.com/business/22-more-applicants-approved-under-pli-scheme-for-textiles/article71085286.ece',
    'Quarter-one GST figures will be released at the end of June.',
    0.85, 'Economy', 'demo-cal-4'),
   ('Health Ministry', 'roll out the measles–rubella vaccine drive', 'by mid-August',
    '2026-05-20', '2026-08-15', 'month', 'https://www.thehindu.com/news/national/kerala/alert-issued-against-nipah-in-kerala-from-april-to-september/article70772258.ece',
    'The vaccination drive will be rolled out by mid-August across the State.',
    0.65, 'Health', 'demo-cal-5'),
   ('Chennai Metro Rail', 'commission the Phase-2 Madhavaram corridor', 'by Q3 2026',
    '2026-03-15', '2026-09-30', 'quarter', 'https://www.thehindu.com/news/national/andhra-pradesh/apsrtc-to-run-100-electric-buses-in-visakhapatnam-with-focus-on-bhogapuram-airport-link/article71100995.ece',
    'The Phase-2 corridor is expected to be commissioned by the third quarter of 2026.',
    0.60, 'Infrastructure', 'demo-cal-6'),
   ('Chief Secretary', 'digitise all land records statewide', 'in due course',
    '2026-02-01', NULL, 'none', 'https://www.thehindu.com/news/cities/bangalore/bidadi-township-project-final-notification-for-acquiring-lands-sets-stage-for-farmers-government-standoff/article71093986.ece',
    'All land records will be digitised in due course, the Chief Secretary said.',
    0.50, 'Governance', 'demo-cal-7')
 ) as v(who, what, deadline_text, date_claimed, target_date, precision,
        source_link, original_claim_text, confidence, topic, claim_key)
 where t.slug = 'self'
on conflict (tenant_id, claim_key) do nothing;
