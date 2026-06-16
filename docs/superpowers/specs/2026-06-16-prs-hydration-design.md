# PRS bill-page body + date hydration

- **Date:** 2026-06-16
- **Status:** Approved design — ready for implementation plan
- **Scope:** `packages/ingest-py` only. No agents/scoring/calendar changes.
- **Mirrors:** `docs/superpowers/specs/2026-06-15-pib-hydration-design.md` (same hydrate pattern, PRS source).
- **Depends on:** the shared hydration loop already on this branch
  (`cli._run_hydration`, `db.signals_needing_hydration`, `db.set_signal_body_published`)
  and `fetch/cloudflare.CloudflareFetcher`.

## Problem

PRS Legislative Research signals are discovered by the HTML `ScrapeCollector`
from the bill register (`https://prsindia.org/billtrack`). The register slice
yields a `Signal` with **url + headline only** — `ScrapeCollector` leaves
`body_text` and `published_at` NULL. As with PIB, NULL `published_at` falls back
to `fetched_at` for date-relative ranking and the calendar reference date.

That fallback is actively wrong for PRS: the register lists bills across many
years (older 2023 bills sit alongside 2026 ones). With no real date, a dormant
2023 bill is dated by `fetched_at` and surfaces as **"fresh"** in the reporter
feed. The fix is to **hydrate** each PRS signal: fetch the bill page, parse the
bill's real status date and a summary, and update the signal in place.

### State on this branch (why this is a refinement, not a greenfield build)

A first cut of PRS hydration is already committed
(`fb6c7ad`, `c3fe5ca`): a shared `_run_hydration` loop, `hydrate-prs` CLI
subcommand, a domain-generic `signals_needing_hydration`, and a `prs.py`
parser + `PrsHydrator`. The **CLI/DB generalization is correct and is kept
as-is**. The committed `prs.py` parser, however, does not meet this spec:

- it takes the **earliest** date (`min`) — the introduced date — where the
  feed wants the **latest** legislative-action date (truest "freshness");
- it does **not** convert IST→UTC (stores the IST calendar date at `00:00Z`);
- it scans the **entire** `.region-content` for any `Mon DD, YYYY` and takes
  `min`, which can pick up a date from a related-bills sidebar, not the bill's
  own timeline;
- `body_text` is the **whole** content region (headline + ministry + status
  table + "Follow Us"/related nav), not the bill summary;
- its unit test uses **synthetic inline HTML**, not a saved real PRS page, so a
  green test does not prove the parser works against live Drupal markup.

This spec corrects `prs.py` and its test, and adds the hydration docs.

## Goal

`parse_prs_page` extracts, from a real PRS bill page:

1. **`published_at`** — the bill's **latest** status date (most recent
   legislative action), interpreted as IST and converted to UTC.
2. **`body_text`** — the bill summary/brief, cleaned and capped.

`PrsHydrator(fetcher).hydrate(url)` fetches via `CloudflareFetcher` and parses.
The existing `hydrate-prs` command + `_run_hydration` loop then update signals.

## Non-goals

- No new discovery crawler — `ScrapeCollector` already discovers PRS bills.
- No change to `_run_hydration`, `hydrate-prs` wiring, or the `db.py` helpers
  (they are correct and source-agnostic).
- No bill-text/clause extraction, no PDF parsing — page summary only.
- No changes to collectors, agents, scoring, or calendar.

## Page structure (verified live on prsindia.org, 2026-06-16)

PRS bill pages are Drupal 7; field wrappers carry stable machine-name classes
(identical across bill nodes regardless of year — verified on a 2026 bill and a
2023 bill).

- **Status timeline (dates):** `div.field-name-field-own-status-date` contains
  one `span.date-display-single` per legislative event, in chronological order,
  e.g. for *The Post Office Bill, 2023*: `Aug 10, 2023`, `Dec 04, 2023`,
  `Dec 18, 2023` (Introduced → Passed RS → Passed LS). Date text is
  `"%b %d, %Y"` ("Apr 16, 2026") or occasionally the full month name
  ("April 16, 2026"). **No time component.**
- **Summary/brief:** `div.field-name-body` — the analytical brief
  (e.g. "Highlights of the Bill … The Bill replaces the Indian Post Office Act,
  1898 …"), ~12–17 k chars.
- **Trap to avoid:** `<meta property="og:updated_time">` is the page *render*
  time (today), not the bill date — never use it.

## Architecture

### `hydrate/prs.py` (rewrite the parser; keep `PrsContent` + `PrsHydrator` shape)

- `@dataclass(slots=True) PrsContent: body_text: str | None; published_at: datetime | None` — unchanged.
- `parse_prs_page(html: bytes | str) -> PrsContent` — **pure**, no I/O:
  - **Date:** select `div.field-name-field-own-status-date span.date-display-single`;
    parse each as a bare IST calendar date; take the **max** (latest). Convert
    to UTC by anchoring the IST date at **12:00 (noon)** and subtracting +05:30
    → `06:30Z` on the same calendar day. Noon anchor keeps the calendar date
    stable in both IST and UTC (a midnight anchor would roll the date back a
    day). `None` if the status field is absent or holds no parseable date.
  - **Body:** select `div.field-name-body`; `get_text(" ", strip=True)`;
    collapse whitespace; `None` if empty; cap at 20 000 chars (PIB precedent).
    Falls back to `None` (not to the whole region) if the field is absent.
- `PrsHydrator(fetcher: Fetcher)` with `hydrate(url) -> PrsContent` —
  `parse_prs_page(self.fetcher.get_bytes(url))`. Unchanged; uses the `Fetcher`
  contract so it is unit-testable with a fake and inherits the
  header→Playwright tiers.

### `db.py` + `cli.py` — reuse, no change

- `signals_needing_hydration(conn, tenant_id, "prsindia.org", limit=…)` already
  selects PRS signals missing body/date by url domain.
- `set_signal_body_published(...)` already updates only the non-None fields.
- `cmd_hydrate_prs` / `_run_hydration` already throttle, isolate per-signal
  errors, and print `hydrated N, skipped M of T`.

## Error handling

| Condition | Behaviour |
|-----------|-----------|
| Status field absent / no parseable date | `published_at = None`; body still parsed if present. |
| `field-name-body` absent | `body_text = None`; date still parsed if present. |
| Neither found | `PrsContent(None, None)` → `_run_hydration` counts it `skipped`. |
| Fetch raises (`CloudflareBlocked`/`RequestException`) | `_run_hydration` skips + counts, never aborts the batch. |
| Unparseable individual date token | skipped within the date list; other dates still considered. |

## Testing

**Default CI — no network:**

- Save a **trimmed real** PRS bill page to `tests/fixtures/prs_bill.html`
  (real Drupal field markup: `field-name-field-own-status-date` with a
  multi-event timeline, `field-name-body` with summary prose, plus a decoy
  date in a related-bills block to prove scoping).
- `parse_prs_page(fixture)`:
  - `published_at` == the **latest** status date at `06:30Z` (noon-IST → UTC),
    **not** the earliest, and **not** the decoy sidebar date.
  - `body_text` contains the summary prose and **excludes** the status-timeline
    label text and nav.
- `parse_prs_page` on HTML with the body field but no status field →
  `published_at is None`, body still parsed.
- `parse_prs_page` on HTML with neither field → `PrsContent(None, None)`.
- `PrsHydrator` with a fake `Fetcher` returning the fixture → returns the
  parsed `PrsContent` and calls `get_bytes(url)` once.

**Manual live verify (DB + network):**

- `uv run onlinejourno-ingest hydrate-prs --tenant self --limit 5`, then query
  that those signals now have non-null `body_text` + `published_at`, and that
  an old 2023 bill's `published_at` is in 2023 (not `fetched_at`'s 2026).

## Success criteria

1. `parse_prs_page` extracts the summary + the **latest** status date as a
   correct UTC `published_at` from a saved **real** PRS page; the decoy sidebar
   date is not picked.
2. A live `hydrate-prs --tenant self` run populates `body_text` +
   `published_at` on PRS signals; the count of date-less PRS signals drops
   toward zero (modulo genuinely dateless pages, which are logged).
3. Spot-check: a hydrated 2023 bill has `published_at` in 2023, so it no longer
   surfaces as "fresh" by `fetched_at`.
4. Full `ingest-py` suite green with no network.

## Risks & judgment calls

- **`max` vs `min` date:** `max` (latest action) is chosen so a recently-amended
  bill ranks fresh and a dormant one ranks old. Both fix the `fetched_at` bug;
  `max` is the truer freshness signal for the reporter feed.
- **Date-only → UTC:** PRS dates carry no time. Noon-IST anchor (→ `06:30Z`)
  preserves the calendar date across the conversion; chosen over a midnight
  anchor (which rolls the date back one UTC day) and over storing the IST date
  raw at `00:00Z` (which is not actually IST→UTC).
- **Scoped date selector:** extracting dates only from
  `field-name-field-own-status-date` (not the whole region) avoids picking up
  related-bill/sidebar dates. Markup drift degrades to `published_at = None`
  (logged, skipped), never a wrong write.
- **Body source:** `field-name-body` is the editorial brief; the whole
  `.region-content` would inject headline, ministry, status table, and nav into
  `body_text`. If `field-name-body` is ever absent, body is `None` rather than
  page chrome.
- **Domain-based selection** intentionally catches any PRS signal regardless of
  which source row produced it.
