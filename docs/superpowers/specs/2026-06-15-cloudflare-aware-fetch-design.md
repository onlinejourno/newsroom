# Cloudflare-aware fetch (Source Roadmap Phase 2)

- **Date:** 2026-06-15
- **Status:** Approved design — ready for implementation plan
- **Scope:** `packages/ingest-py` only. No SEO-audit, calendar, or scoring changes.
- **Roadmap:** `docs/SOURCE-ROADMAP.md` Phase 2; precedes Phase 3 (PIB scraper),
  which reuses the seam built here.

## Problem

The `RSSCollector` fetches feeds with a plain `requests` session. Three seeded
sources sit behind Cloudflare and return `403` / the "Just a moment…" JS
challenge to any non-browser client, so they are seeded `enabled = false`:

- The Hindu — Business (`https://www.thehindu.com/business/feeder/default.rss`)
- Moneycontrol — Business (`https://www.moneycontrol.com/rss/business.xml`)
- Business Standard — Markets (`https://www.business-standard.com/rss/markets-106.rss`)

A browser-UA `curl` still 403s The Hindu (verified 2026-06-15) — it is a real JS
challenge, not mere User-Agent gating. Only a JS-executing browser tier can pass
it. Until then, The Hindu reaches the platform only as GDELT metadata, and the
demo calendar's The Hindu article permalinks (seeded in `calendar_demo.sql`) are
unfetchable by the forthcoming SEO/E-E-A-T audit.

## Goal

Give `RSSCollector` a Cloudflare-aware fetch path so these feeds ingest with
article-level URLs, and **The Hindu becomes the canonical, end-to-end demo
site** — the same publisher Lever A already seeds into the demo calendar.

## Non-goals

- PIB / state-portal scraping (Phase 3 — `ScrapeCollector`, PRID walker).
- Gazette / PDF sources (Phase 4, Class D).
- Changing GDELT, API, or scrape collectors.
- Re-enabling PIB RSS — its endpoint 404s per the roadmap; real PIB is Phase 3.
- Any change to SEO-audit, calendar, or scoring code.

## Architecture

### New module: `packages/ingest-py/src/onlinejourno_ingest/fetch/cloudflare.py`

Ported from the reference `…/eip-handover/…/lib/cloudflare-fetch.ts`.

- `REALISTIC_HEADERS` — desktop-Chrome UA, `Accept`, `Accept-Language: en-IN…`,
  `Sec-CH-UA*`, `Sec-Fetch-*`, `Upgrade-Insecure-Requests`.
- `is_cloudflare_challenge(body: bytes | str) -> bool` — detects the challenge
  page (`"Just a moment…"`, `cf-mitigated`, `cf_chl_`, "Enable JavaScript and
  cookies to continue", or a sub-8KB body mentioning `cloudflare`).
- `CloudflareBlocked(Exception)` — carries `stage: "headers" | "playwright" | "config"`.
- `CloudflareFetcher` — concrete adapter holding the shared `requests.Session`.

### Adapter contract (ADR 0007)

A minimal protocol so collectors depend on an interface, not on Playwright:

```python
class Fetcher(Protocol):
    def get_bytes(self, url: str, *, headers: dict[str, str] | None = None) -> bytes: ...
```

`CloudflareFetcher` implements `Fetcher`. Collectors receive a `Fetcher` by
constructor injection, defaulting to `CloudflareFetcher(session)`. Tests inject a
fake. This keeps the Playwright dependency out of the collector's own logic and
out of unit tests.

### Two tiers (inside `CloudflareFetcher.get_bytes`)

1. **Tier 1 — headers.** `session.get(url, headers=REALISTIC_HEADERS | extra)`.
   On `403`/`503`, or when `is_cloudflare_challenge(body)`, raise
   `CloudflareBlocked("headers")`. Otherwise return `response.content`.
   Optional `CF_COOKIES` env value is sent as the `Cookie` header.
2. **Tier 2 — Playwright (headless Chromium).** Triggered when Tier 1 raised
   `CloudflareBlocked`. Launch Chromium with the reference's stealth flags +
   init-script (patch `navigator.webdriver`, `plugins`, `languages`, `chrome`,
   permissions). Steps:
   1. `context = browser.new_context(...)` with en-IN locale, Asia/Kolkata TZ,
      realistic UA + client-hint headers.
   2. `page.goto(<site root>)` and wait for network idle — this clears the JS
      challenge and **banks the `cf_clearance` cookie** in the context.
   3. `context.request.get(feed_url)` — fetch the **raw feed XML bytes** using
      the now-cleared context. (`page.content()` is **not** used: it returns
      browser-wrapped HTML around an XML document, which feedparser cannot
      parse.)
   4. Still challenged → `CloudflareBlocked("playwright")`.

   Site root is derived from the feed URL (`scheme://netloc/`).

### `RSSCollector` integration

- Constructor gains `fetcher: Fetcher | None = None`, defaulting to
  `CloudflareFetcher(self.session)`.
- Replace the three current `session.get` / `session.head` call sites:
  - `fetch()` feed download → `fetcher.get_bytes(feed_url, headers=ua_headers)`,
    then `feedparser.parse(raw)` as today.
  - `_discover_feed()` homepage GET and the `HEAD` probes → route through the
    fetcher (Cloudflare guards homepages too). The `HEAD` content-type probe
    becomes a lightweight GET via the fetcher, or is dropped in favour of the
    `<link rel=alternate>` discovery path; the plan decides the minimal form.
- `CloudflareBlocked` is caught at the `fetch()` boundary and re-raised as the
  existing `FetchError`, so `cli._run_one_source` marks the source failed and
  finishes the run row exactly as today (no new failure path).

### Sources (`infra/seeds/dev.sql`)

Flip `enabled = true` for The Hindu — Business, Moneycontrol — Business, and
Business Standard — Markets. The GDELT twins stay enabled; `url_hash` dedup
already collapses any article that arrives via both paths. PIB RSS stays
disabled.

## Error handling

| Condition | Behaviour |
|-----------|-----------|
| Tier 1 ok | Return bytes. |
| Tier 1 challenged, Tier 2 ok | Return bytes. |
| Both tiers fail | `CloudflareBlocked` → `FetchError` → run marked failed (existing path). |
| Playwright binary missing | Explicit error naming `playwright install chromium`. |
| Malformed feed after fetch | Existing bozo + no-entries check raises `FetchError`. |

## Testing

**Default CI — no network, no browser:**

- `is_cloudflare_challenge`: challenge bodies, clean XML, empty body, short
  `cloudflare` body.
- Tier-1 escalation: a fake session returning `403` / challenge HTML raises
  `CloudflareBlocked("headers")`; a clean body returns content.
- `RSSCollector` with an injected **fake `Fetcher`** returning canned feed bytes
  — existing `_entry_to_signal` / `_parse_published` assertions hold unchanged.
- `CloudflareBlocked` → `FetchError` mapping at the collector boundary.

**Opt-in only (`@pytest.mark.browser`, skipped unless `PLAYWRIGHT_E2E=1`):**

- One real smoke test: fetch The Hindu Business feed via Tier 2 and assert ≥1
  entry with a `*.ece` article URL. Not part of default CI.

## Dependencies / ops

- Add `playwright` to `packages/ingest-py/pyproject.toml` dependencies (hard
  dependency, per decision — accepts the ~250 MB Chromium download).
- Document `playwright install chromium` in package setup and add a CI step that
  installs the browser before the (opt-in) browser tests.

## Success criteria

1. The Hindu Business feed fetches via Tier 2; resulting signals carry
   article-level (`*.ece`) URLs in `signals.url`.
2. A live `collect` against The Hindu produces article-level stored URLs
   (0 homepage-level), confirmed by the same query used in the Lever-A
   investigation.
3. Moneycontrol and Business Standard re-enabled and fetching.
4. Default CI is green with no browser/network; the browser smoke test passes
   locally with `PLAYWRIGHT_E2E=1`.
5. The Hindu is usable as the demo site end-to-end: the `calendar_demo`
   permalinks resolve through the same fetch path the audit will use.

## Risks & judgment calls

- **XML via Playwright:** solve-challenge-then-`context.request.get` returns raw
  XML; `page.content()` would corrupt it. Documented as the required approach.
- **Cloudflare arms race:** stealth patches may degrade over time. Failures
  surface as `FetchError` (portal-health signal), not silent empties.
- **Reusable seam, single consumer:** `fetch/cloudflare.py` is built reusable but
  wired only into `RSSCollector` now. Phase 3 `ScrapeCollector` reuses it; no
  speculative wiring today.
- **Hard Playwright dep:** chosen over an optional extra for simpler code; the
  cost is install/CI weight.
- **PIB RSS:** intentionally left disabled (endpoint 404s); not a regression.
