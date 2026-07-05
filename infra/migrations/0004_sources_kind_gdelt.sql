-- 0004_sources_kind_gdelt.sql
--
-- Add 'gdelt' to the sources.kind vocabulary so GDELT DOC 2.0 sources can be
-- ingested by the GDELTCollector (packages/ingest-py). GDELT reaches outlets
-- whose RSS is Cloudflare/JS-blocked (The Hindu, Moneycontrol, Business
-- Standard, PIB) without scrapers — see docs/SOURCE-ROADMAP.md.
--
-- Idempotent: drops and re-adds the check constraint with the extended set.

alter table sources drop constraint if exists sources_kind_check;

alter table sources
  add constraint sources_kind_check
  check (kind in ('rss','gdelt','sitemap','homepage','article','robots','social','api','manual'));
