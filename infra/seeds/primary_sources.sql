-- Primary-source families (ADR 0050) — the Collect layer's real source map.
-- Disabled rows are registered design: they enable family-by-family as their
-- collector adapter lands (EIP's Collect layer is the reference).
-- Idempotent: on conflict do nothing. Run with :tenant set, e.g.
--   psql "$DATABASE_URL" -v tenant="'<tenant-uuid>'" -f infra/seeds/primary_sources.sql

insert into sources (tenant_id, name, kind, family, tier, sections_fed, url, rss_url, geo, enabled, params) values
(:tenant,'PIB — All Ministries (press releases)','rss','gov_wire',1,'{National,Governance}','https://pib.gov.in','https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3','IN',true,'{"user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}'),
(:tenant,'Parliament — Questions & Debates','scrape','parliament',1,'{National,Politics,Governance}','https://sansad.in',null,'IN',false,null),
(:tenant,'Courts — Cause lists & Judgements','scrape','courts',1,'{Courts,National}','https://ecourts.gov.in',null,'IN',false,null),
(:tenant,'Supreme Court of India','scrape','courts',1,'{Courts,National}','https://www.sci.gov.in',null,'IN',false,null),
(:tenant,'Gazette of India — Notifications','scrape','gazette',1,'{Governance,National}','https://egazette.nic.in',null,'IN',false,null),
(:tenant,'MCA — Corporate filings','scrape','corporate_mca',1,'{Business,Markets}','https://www.mca.gov.in',null,'IN',false,null),
(:tenant,'GeM — Tenders','scrape','tenders',1,'{Governance,Business}','https://gem.gov.in',null,'IN',false,null),
(:tenant,'CPPP — Tenders','scrape','tenders',1,'{Governance,Business}','https://eprocure.gov.in/cppp',null,'IN',false,null),
(:tenant,'RTI Online — Responses','scrape','rti',1,'{Governance,Investigations}','https://rtionline.gov.in',null,'IN',false,null),
(:tenant,'data.gov.in — OGD APIs','api','open_data',1,'{Governance,Economy}','https://data.gov.in',null,'IN',false,null),
(:tenant,'PRS Legislative Research','scrape','think_tank',2,'{Politics,Governance}','https://prsindia.org',null,'IN',false,null),
(:tenant,'BookMyShow — Event announcements','scrape','events',3,'{Culture,Sport}','https://in.bookmyshow.com',null,'IN',false,null),
(:tenant,'PRWire-style press releases','scrape','press_wire',3,'{Business}','https://www.prnewswire.com/in/',null,'IN',false,null)
on conflict do nothing;

-- data.gov.in API key by env reference only (never a raw secret in the DB).
update sources set auth='{"method":"api_key","secret_ref":"DATA_GOV_IN_KEY"}'
 where tenant_id = :tenant and name like 'data.gov.in%';

-- MSM feeds are pipeline test fixtures, never the product's source layer.
update sources set family='msm_test', tier=9
 where tenant_id = :tenant
   and name ~ '^(The Hindu|BBC|Guardian|Al Jazeera|Mint|Economic Times|Business Standard|Moneycontrol)';
