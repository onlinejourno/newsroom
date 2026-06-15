# PRS Legislative Research source (config-only scrape)

- **Date:** 2026-06-15
- **Status:** Approved design — ready for implementation plan
- **Scope:** `infra/seeds` config + a ScrapeCollector test. **No `scrape.py` change.**

## Problem

PRS Legislative Research (`prsindia.org`) publishes bill trackers, summaries, and
committee reports — real legislative story leads (politics/governance beat). It's
seeded (`'PRS Legislative Research'`, `kind=scrape`, `enabled=false`) but never
configured. Verified: PRS is server-rendered and returns **HTTP 200 to the
collector's own User-Agent**, and `/billtrack` is clean Drupal Views markup:

```
div.views-row
  └ div.views-field.views-field-title-field
      └ h3.cate
          └ a[href="/billtrack/<bill-slug>"]  → the bill title + link
```

So the **existing `ScrapeCollector` handles it with config alone** — no Cloudflare
tier, no code change.

## Goal

Enable PRS as a live source: a `collect` run produces bill-level signals
(`prsindia.org/billtrack/<bill>` URL + bill title), via seed config only.

## Non-goals

- **No `scrape.py` change** (PRS serves the collector UA; static markup).
- **No `published_at`/`body_text`** — `ScrapeCollector` captures `url` + `headline`
  + `fetched_at` only. Date/body is a **later hydration step** (same pattern as
  PIB Step 2), not this slice.
- Bills only for now — policy reviews / committee reports are a later listing.

## Architecture (config-only)

Update the seeded PRS row:
- `url` = `https://prsindia.org/billtrack` (the listing the collector fetches).
- `params` = `{"item_selector": ".views-field-title-field", "max_items": 100}`.
  - `.views-field-title-field` matches only bill title fields (not the category
    nav), so each matched element's `<a>` is a bill link.
  - `ScrapeCollector` resolves the relative `/billtrack/<slug>` href against `url`
    → absolute bill URL; headline = the link text (the bill title); `external_id`
    = the URL; `fetched_at` = now.
  - `max_items` bounds the first run (the register is ~900 bills); subsequent
    runs add only new bills (url-hash dedup).
- `enabled` = `true`.

No other files change.

## Data flow

`collect --tenant self` → `ScrapeCollector.fetch(PRS row)` → GET `/billtrack`
(200, OnlineJourno UA) → `select(".views-field-title-field")[:100]` → per item:
`url = urljoin(billtrack, href)`, `headline = link text` → `Signal` → `upsert_signal`
(dedup on `url_hash`).

## Error handling

Unchanged — `ScrapeCollector` raises `FetchError` on fetch failure (run marked
failed), skips items with no `href`, dedups repeats. No new paths.

## Testing

**Default CI — no network:**

- New `ScrapeCollector` test: inject a **fake fetcher / fixture** of the PRS
  `.views-row` / `.views-field-title-field` markup → assert it yields signals
  with absolute `https://prsindia.org/billtrack/<slug>` URLs and the bill titles,
  and that category-nav rows are excluded.

> Note: `ScrapeCollector` currently builds its own `requests` session internally.
> If it isn't already injectable for tests, the test uses a fake `Session`
> (monkeypatched) returning the fixture HTML — no production code change beyond
> what the existing tests already do.

**Manual live verify (DB + network):**

- `uv run onlinejourno-ingest collect --tenant self --source-name "PRS Legislative Research"`,
  then query that the new signals are `prsindia.org/billtrack/...` (article-level,
  zero homepage collapse), titles populated.

## Success criteria

1. PRS row enabled + configured; `collect` returns ≥1 bill signal.
2. Stored signal URLs are bill-level (`/billtrack/<slug>`), 0 domain-only.
3. Titles populated from the listing.
4. Default CI green (the parsing test); no DB/network in unit tests.

## Risks & judgment calls

- **Full register, not "recent":** `/billtrack` lists ~900 bills, not just new
  ones. `max_items` + url-hash dedup bound it; `published_at` is absent so the
  first batch is dated by `fetched_at` (looks "fresh") — acceptable for now;
  real dates come with the deferred hydration.
- **Selector fragility:** `.views-field-title-field` is Drupal Views markup; a
  PRS redesign would require re-pinning (documented; the parsing test guards it).
- **Bills only:** policy reviews / committee reports (also on PRS) are a
  follow-up listing, not this slice.
