-- Primary-source families (ADR 0050) — the Collect layer's real source map.
-- Disabled rows are registered design: they enable family-by-family as their
-- collector adapter lands (EIP's Collect layer is the reference).
-- Idempotent: on conflict do nothing. Run with :tenant set, e.g.
--   psql "$DATABASE_URL" -v tenant="'<tenant-uuid>'" -f infra/seeds/primary_sources.sql

insert into sources (tenant_id, name, kind, family, tier, sections_fed, url, rss_url, geo, enabled, params) values
-- reg=3 pins PIB to the English (national) region; without it the portal
-- redirects by geography and can serve vernacular items on Lang=1.
(:tenant,'PIB — All Ministries (press releases)','rss','gov_wire',1,'{National,Governance}','https://pib.gov.in','https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3&reg=3','IN',true,'{"user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}'),
(:tenant,'PTI — National wire (GDELT)','gdelt','news_wire',1,'{National,Politics,Business}','https://www.ptinews.com','domainis:ptinews.com sourcelang:english','IN',true,null),
(:tenant,'PTI — Direct (needs scrape adapter)','scrape','news_wire',1,'{National,Politics,Business}','https://www.ptinews.com',null,'IN',false,null),
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

-- PRS bills: configure + enable the scrape. PRS is server-rendered and serves
-- our UA; /billtrack is Drupal Views markup where each bill title lives in
-- .views-field-title-field (category-nav links do not), so ScrapeCollector
-- needs no code change. max_items bounds the first run; url-hash dedup means
-- later runs add only new bills. Date/body land via a later hydration.
update sources
   set url = 'https://prsindia.org/billtrack',
       params = '{"item_selector": ".views-field-title-field", "max_items": 100}',
       enabled = true
 where tenant_id = :tenant and name = 'PRS Legislative Research';

-- MSM feeds are pipeline test fixtures, never the product's source layer.
update sources set family='msm_test', tier=9
 where tenant_id = :tenant
   and name ~ '^(The Hindu|BBC|Guardian|Al Jazeera|Mint|Economic Times|Business Standard|Moneycontrol)';

-- Working primary feeds verified 2026-06-11 (regulators, exchange, think-tank,
-- multilateral). UA param: gov WAFs block bot agents.
insert into sources (tenant_id, name, kind, family, tier, sections_fed, url, rss_url, geo, enabled, params) values
(:tenant,'RBI — Press releases','rss','regulator',1,'{Economy,Markets,Business}','https://rbi.org.in','https://rbi.org.in/pressreleases_rss.xml','IN',true,'{"user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}'),
(:tenant,'RBI — Notifications','rss','regulator',1,'{Economy,Markets}','https://rbi.org.in','https://rbi.org.in/notifications_rss.xml','IN',true,'{"user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}'),
(:tenant,'SEBI — Latest','rss','regulator',1,'{Markets,Business}','https://www.sebi.gov.in','https://www.sebi.gov.in/sebirss.xml','IN',true,'{"user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}'),
(:tenant,'BSE — Notices','rss','exchange',1,'{Markets,Business}','https://www.bseindia.com','https://www.bseindia.com/data/xml/notices.xml','IN',true,'{"user_agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"}'),
(:tenant,'CPR India — Research','rss','think_tank',2,'{Governance,Politics,Economy}','https://cprindia.org','https://cprindia.org/feed','IN',true,null),
(:tenant,'UN News — Asia-Pacific','rss','multilateral',1,'{World}','https://news.un.org','https://news.un.org/feed/subscribe/en/news/region/asia-pacific/feed/rss.xml','UN',true,null)
on conflict do nothing;
