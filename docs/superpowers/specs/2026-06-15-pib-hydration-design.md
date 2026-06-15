# PIB body + date hydration (Source Roadmap Phase 3, revised)

- **Date:** 2026-06-15
- **Status:** Approved design — ready for implementation plan
- **Scope:** `packages/ingest-py` only. No agents/scoring/calendar changes.
- **Depends on:** Step 1 (`fetch/cloudflare.py`) — reuses `CloudflareFetcher`.

## Problem

PIB ingestion already works for *discovery*: the "PIB — All Ministries"
RSS source (`RssMain.aspx` + browser UA) produced **175 fresh signals**
(last fetch 2026-06-15), each at a PRID-level URL
(`https://pib.gov.in/PressReleaseIframePage.aspx?PRID=…`). But the RSS feed
carries only metadata, so those signals have:

- **no `body_text`** — claim-extraction and the SEO/E-E-A-T audit need the
  release body, not just a headline.
- **no `published_at`** — `published_at` comes back NULL, so date-relative
  ranking and the calendar reference date fall back to `fetched_at`.

The roadmap's original Phase 3 (a Playwright `AllRelease.aspx` PRID-walker)
assumed RSS was dead. It is not. Re-crawling for discovery would duplicate
working RSS. The minimal, correct fix is to **hydrate** the existing signals:
fetch each PRID page and fill `body_text` + `published_at`.

## Goal

A `hydrate-pib` step that, for PIB signals missing body/date, fetches the PRID
page (via the Step-1 `CloudflareFetcher`), parses the release body and posted
date, and updates the signal in place.

## Non-goals

- No new discovery crawler (RSS already discovers).
- No PIB translations / regional-language fanout (English canonical only).
- No Playwright-specific code here — `CloudflareFetcher` already has the
  browser fallback; PIB pages fetch on the header tier (verified 2026-06-15).
- No changes to collectors, agents, scoring, or calendar.

## Page structure (verified on a live PRID page)

- Headline: `<h2>` inside `.innner-page-main-about-us-content-right-part`.
- Date: `div.ReleaseDateSubHeaddateTime` → text `"Posted On: 15 JUN 2026 2:30PM by PIB Delhi"`.
- Body: the paragraphs inside `.innner-page-main-about-us-content-right-part`,
  excluding the `<h2>` and the date `<div>`.

## Architecture

### `ingest-py/src/onlinejourno_ingest/hydrate/__init__.py` + `hydrate/pib.py` (new)

- `@dataclass PibContent: body_text: str | None; published_at: datetime | None`.
- `parse_pib_page(html: bytes | str) -> PibContent` — **pure**, no I/O.
  - Body: select `.innner-page-main-about-us-content-right-part`; drop the
    `<h2>` and `div.ReleaseDateSubHeaddateTime`; `get_text(" ", strip=True)`
    on the remainder; collapse whitespace; `None` if empty; cap at 20 000
    chars (defensive against pathological pages).
  - Date: regex-extract `\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{1,2}:\d{2}\s*[AP]M`
    from the date div; `strptime("%d %b %Y %I:%M%p")` on the title-cased month;
    localise to `Asia/Kolkata` (`zoneinfo`) then convert to **UTC**. `None` if
    absent/unparseable.
- `PibHydrator(fetcher: Fetcher)` with `hydrate(url: str) -> PibContent` —
  `parse_pib_page(self.fetcher.get_bytes(url))`. Uses the Step-1 `Fetcher`
  contract, so it is unit-testable with a fake and inherits the
  header→Playwright tiers for free.

### `db.py` (extend)

- `pib_signals_needing_hydration(conn, tenant_id, *, limit) -> list[dict]` —
  `select id, url from signals where tenant_id = %s and url like '%pib.gov.in%'
   and (body_text is null or body_text = '' or published_at is null)
   order by fetched_at desc limit %s`. (Domain-based — source-agnostic.)
- `set_signal_body_published(conn, *, tenant_id, signal_id, body_text, published_at)`
  — updates only the non-None fields provided.

### `cli.py` (extend)

- New subcommand `hydrate-pib --tenant <slug> [--limit N] [--min-interval S]`.
  - Resolves tenant; loads candidates; for each: throttle (monotonic, default
    `2.0` s/req — roadmap suggests 4 s, configurable), fetch+parse, update,
    commit. Per-signal `try/except` → on fetch/parse failure, skip + count,
    never abort the batch. Prints `hydrated N, skipped M of T`.

### Reuse

`CloudflareFetcher` (Step 1). Header tier handles PIB; the Playwright tier is
the automatic fallback if PIB ever raises the challenge.

## Error handling

| Condition | Behaviour |
|-----------|-----------|
| Fetch raises (`CloudflareBlocked`/`RequestException`) | Skip signal, increment `skipped`, continue. |
| Parse yields neither body nor date | Skip, increment `skipped`. |
| Parse yields body and/or date | Update the field(s) present; count `hydrated`. |
| DB update error mid-batch | Log, increment `skipped`, continue (next signal in its own txn). |

## Testing

**Default CI — no network:**

- `parse_pib_page` on a saved trimmed PIB fixture (`tests/fixtures/pib_release.html`):
  asserts `body_text` contains the release text and excludes the headline/date;
  asserts `published_at == datetime(2026, 6, 15, 9, 0, tzinfo=UTC)` (15 JUN 2026
  2:30 PM IST → 09:00 UTC).
- `parse_pib_page` on HTML with no date div → `published_at is None`, body still
  parsed.
- `PibHydrator` with a fake `Fetcher` returning the fixture → returns the parsed
  `PibContent`.

**Manual live verify (DB + network):**

- `uv run onlinejourno-ingest hydrate-pib --tenant self --limit 5`, then query
  that those signals now have non-null `body_text` + `published_at`.

## Success criteria

1. `parse_pib_page` extracts body + correct UTC `published_at` from a real page.
2. A live `hydrate-pib --tenant self` run populates `body_text` + `published_at`
   on PIB signals; the count of body-less PIB signals drops toward zero (modulo
   genuinely unparseable pages, which are logged).
3. Spot-check: one hydrated signal's `body_text` matches the article body and
   `published_at` matches the page's "Posted On" date.
4. Default CI green with no network.

## Risks & judgment calls

- **PIB markup drift:** selectors (`.innner-page-main-about-us-content-right-part`,
  `div.ReleaseDateSubHeaddateTime`) may change. Parse failures degrade to
  skipped + logged, never a crash or a wrong write.
- **Throttle:** default 2 s/req (≈6 min for the 175 backlog). Configurable;
  roadmap suggests 4 s. `--limit` allows incremental runs.
- **Domain-based selection** intentionally catches any PIB signal regardless of
  which source row produced it.
- **English only:** translations deferred; not needed for the demo or the audit.
