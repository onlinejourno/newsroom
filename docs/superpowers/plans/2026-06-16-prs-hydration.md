# PRS bill-page Hydration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `parse_prs_page` fill `published_at` (the bill's latest status date, IST→UTC) and `body_text` (the bill summary) so PRS signals stop being dated by `fetched_at` and old bills stop surfacing as "fresh".

**Architecture:** The shared hydration loop (`cli._run_hydration`, `db.signals_needing_hydration`, `db.set_signal_body_published`) and `hydrate-prs` CLI command are already committed and correct — left untouched. This plan **rewrites only the `prs.py` parser** to scope dates to the Drupal status-timeline field, take the latest date, convert IST→UTC at a noon anchor, and source the body from `field-name-body`; and **replaces the synthetic unit test with a saved real-page fixture**.

**Tech Stack:** Python 3.11, `beautifulsoup4`/`lxml`, `psycopg` (dict_row), `pytest`, `uv`.

**Spec:** `docs/superpowers/specs/2026-06-16-prs-hydration-design.md`

---

## File Structure

- **Create** `packages/ingest-py/tests/fixtures/prs_bill.html` — trimmed real PRS bill page (Drupal field markup; multi-event status timeline; `field-name-body` summary; a decoy `date-display-single` outside the status field to prove scoping).
- **Modify** `packages/ingest-py/tests/test_prs_hydrate.py` — load the fixture; assert latest date at `06:30Z`, decoy not picked, body from the summary field; keep edge-case + fake-fetcher tests.
- **Modify** `packages/ingest-py/src/onlinejourno_ingest/hydrate/prs.py` — rewrite `parse_prs_page` (scoped selector, `max`, noon IST→UTC, `field-name-body` body). `PrsContent` + `PrsHydrator` unchanged.
- **No change** to `cli.py`, `db.py`.

Test commands run from `packages/ingest-py`.

---

## Task 1: Saved real-page fixture + corrected parser (TDD)

**Files:**
- Create: `packages/ingest-py/tests/fixtures/prs_bill.html`
- Modify: `packages/ingest-py/tests/test_prs_hydrate.py`
- Modify: `packages/ingest-py/src/onlinejourno_ingest/hydrate/prs.py`

- [ ] **Step 1: Create the fixture**

Create `packages/ingest-py/tests/fixtures/prs_bill.html` — trimmed from a live PRS bill page, keeping the real Drupal field wrappers. Status timeline holds three events (Introduced → Passed RS → Passed LS); the decoy `Jan 02, 2030` sits in a related-bills block *outside* `field-name-field-own-status-date`, so a correct, scoped parser must ignore it and return the latest *status* date (Dec 18, 2023).

```html
<!DOCTYPE html>
<html><head>
  <title>The Post Office Bill, 2023</title>
  <meta property="og:updated_time" content="Jun 16, 2026, 12:11:03 AM">
</head>
<body>
  <div class="region region-content">
    <h2 class="mt-0 mb-1">The Post Office Bill, 2023</h2>
    <div class="field field-name-field-ministry"><div class="field-items"><div class="field-item even">Communications</div></div></div>

    <div class="field field-name-field-own-status-date field-type-datestamp field-label-hidden">
      <div class="field-items">
        <div class="field-item even"><span class="date-display-single">Aug 10, 2023</span></div>
        <div class="field-item odd"><span class="date-display-single">Dec 04, 2023</span></div>
        <div class="field-item even"><span class="date-display-single">Dec 18, 2023</span></div>
      </div>
    </div>

    <div class="field field-name-body field-type-text-with-summary field-label-hidden">
      <div class="field-items"><div class="field-item even">
        <p>Highlights of the Bill The Bill replaces the Indian Post Office Act, 1898.
           The Act regulates India Post, a departmental undertaking of the central government.</p>
        <p>The Bill removes all offences and penalties, except one: a user not paying
           postage charges will be liable to pay the amount due plus a penalty.</p>
      </div></div>
    </div>

    <div class="related-bills">
      <h3>Related</h3>
      <span class="date-display-single">Jan 02, 2030</span>
      <a href="/billtrack/some-other-bill">A different bill</a>
    </div>
  </div>

  <div class="region region-footer">Follow Us</div>
</body></html>
```

- [ ] **Step 2: Rewrite the tests against the fixture**

Replace the contents of `packages/ingest-py/tests/test_prs_hydrate.py` with:

```python
"""PRS hydration tests — pure parsing on a saved real-page fixture, no network."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from onlinejourno_ingest.hydrate.prs import PrsHydrator, parse_prs_page

_FIXTURE = (Path(__file__).parent / "fixtures" / "prs_bill.html").read_text()


def test_parses_latest_status_date_ist_to_utc():
    content = parse_prs_page(_FIXTURE)
    # Latest status date Dec 18, 2023 at noon IST == 06:30 UTC same day.
    assert content.published_at == datetime(2023, 12, 18, 6, 30, tzinfo=UTC)


def test_ignores_dates_outside_the_status_field():
    content = parse_prs_page(_FIXTURE)
    # The decoy Jan 02, 2030 in the related-bills block must NOT be picked,
    # nor the earliest status date.
    assert content.published_at != datetime(2030, 1, 2, 6, 30, tzinfo=UTC)
    assert content.published_at.year == 2023


def test_body_is_the_summary_field_only():
    content = parse_prs_page(_FIXTURE)
    assert "Highlights of the Bill" in content.body_text
    assert "Indian Post Office Act, 1898" in content.body_text
    # body comes from field-name-body — not the status timeline, ministry, or nav
    assert "Dec 18, 2023" not in content.body_text
    assert "Communications" not in content.body_text
    assert "Follow Us" not in content.body_text
    assert "2030" not in content.body_text


def test_missing_status_field_yields_none_date_but_keeps_body():
    html = (
        '<div class="field field-name-body"><div class="field-items">'
        '<div class="field-item even"><p>Body sentence here.</p></div></div></div>'
    )
    content = parse_prs_page(html)
    assert content.published_at is None
    assert content.body_text == "Body sentence here."


def test_missing_both_fields_yields_empty_content():
    content = parse_prs_page("<html><body>nothing</body></html>")
    assert content.body_text is None
    assert content.published_at is None


class _FakeFetcher:
    def __init__(self, payload: bytes):
        self._payload = payload
        self.urls: list[str] = []

    def get_bytes(self, url, *, headers=None):
        self.urls.append(url)
        return self._payload


def test_hydrator_fetches_then_parses():
    fetcher = _FakeFetcher(_FIXTURE.encode("utf-8"))
    url = "https://prsindia.org/billtrack/the-post-office-bill-2023"
    content = PrsHydrator(fetcher).hydrate(url)
    assert fetcher.urls == [url]
    assert content.published_at == datetime(2023, 12, 18, 6, 30, tzinfo=UTC)
    assert "Highlights of the Bill" in content.body_text
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/ingest-py && uv run pytest tests/test_prs_hydrate.py -v`
Expected: FAIL — the current parser uses `min` (returns Aug 10, 2023), does no IST→UTC (returns `00:00Z`), scans the whole region (would see `Jan 02, 2030`), and reads `.region-content` for the body (so `Dec 18, 2023`/`Communications`/`Follow Us` leak in). Multiple assertions fail; `FileNotFoundError` will not occur because the fixture exists.

- [ ] **Step 4: Rewrite the parser**

Replace the contents of `packages/ingest-py/src/onlinejourno_ingest/hydrate/prs.py` with:

```python
"""Parse a PRS bill page into body (summary) + latest status date.

PRS bill pages (prsindia.org/billtrack/<slug>) are Drupal: the bill summary is
in `div.field-name-body`, and the legislative status timeline is in
`div.field-name-field-own-status-date`, one `span.date-display-single` per
event ("Aug 10, 2023" … "Dec 18, 2023"). We use the latest such date — the most
recent legislative action — as published_at.

Status dates are wall-clock IST (UTC+5:30, no DST) with no time component, so we
anchor each at noon IST before converting to UTC; the noon anchor keeps the
calendar date stable in both zones (a midnight anchor would roll it back a day).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from bs4 import BeautifulSoup

from onlinejourno_ingest.fetch.cloudflare import Fetcher

_BODY_SEL = "div.field-name-body"
# Scoped to the bill's own status timeline — not sidebars / related-bill blocks.
_DATE_SEL = "div.field-name-field-own-status-date span.date-display-single"
_IST = timedelta(hours=5, minutes=30)
_NOON = timedelta(hours=12)
_BODY_CAP = 20_000
_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
# "Jul 20, 2023" or "July 20, 2023"
_DATE_RE = re.compile(r"([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})")


@dataclass(slots=True)
class PrsContent:
    body_text: str | None
    published_at: datetime | None


def _parse_ist_date(text: str) -> datetime | None:
    """Parse a single 'Mon DD, YYYY' date as a noon-IST instant, in UTC."""
    m = _DATE_RE.search(text)
    if not m:
        return None
    month = _MONTHS.get(m.group(1)[:3].lower())
    if month is None:
        return None
    try:
        ist = datetime(int(m.group(3)), month, int(m.group(2))) + _NOON
    except ValueError:
        return None
    return (ist - _IST).replace(tzinfo=UTC)


def parse_prs_page(html: bytes | str) -> PrsContent:
    soup = BeautifulSoup(html, "lxml")

    body_el = soup.select_one(_BODY_SEL)
    body_text: str | None = None
    if body_el is not None:
        text = re.sub(r"\s+", " ", body_el.get_text(" ", strip=True)).strip()
        body_text = text[:_BODY_CAP] or None

    dates = [
        d
        for el in soup.select(_DATE_SEL)
        if (d := _parse_ist_date(el.get_text(" ", strip=True))) is not None
    ]
    published_at = max(dates) if dates else None

    return PrsContent(body_text=body_text, published_at=published_at)


class PrsHydrator:
    """Fetch a PRS bill page through a `Fetcher` and parse it."""

    def __init__(self, fetcher: Fetcher) -> None:
        self.fetcher = fetcher

    def hydrate(self, url: str) -> PrsContent:
        return parse_prs_page(self.fetcher.get_bytes(url))
```

- [ ] **Step 5: Run the PRS tests to verify they pass**

Run: `cd packages/ingest-py && uv run pytest tests/test_prs_hydrate.py -v`
Expected: PASS (6 passed).

- [ ] **Step 6: Run the full suite (no network)**

Run: `cd packages/ingest-py && uv run pytest -q`
Expected: PASS — all prior tests plus the 6 PRS tests; the opt-in browser test stays skipped.

- [ ] **Step 7: Commit (surgical — ingest-py paths only)**

```bash
git add packages/ingest-py/src/onlinejourno_ingest/hydrate/prs.py \
        packages/ingest-py/tests/test_prs_hydrate.py \
        packages/ingest-py/tests/fixtures/prs_bill.html
git commit -m "fix(ingest): PRS parser — latest status date (IST->UTC), summary body, real fixture"
```

---

## Task 2: Commit the hydration docs

**Files:**
- `docs/superpowers/specs/2026-06-16-prs-hydration-design.md` (already written)
- `docs/superpowers/plans/2026-06-16-prs-hydration.md` (this file)

- [ ] **Step 1: Commit both docs (path-scoped)**

```bash
git add docs/superpowers/specs/2026-06-16-prs-hydration-design.md \
        docs/superpowers/plans/2026-06-16-prs-hydration.md
git commit -m "docs(ingest): PRS hydration spec + plan"
```

---

## Task 3: Live verification (manual — DB + network)

**Files:** none (verification only)

- [ ] **Step 1: Hydrate a small batch**

Run: `cd packages/ingest-py && uv run onlinejourno-ingest hydrate-prs --tenant self --limit 5`
Expected: `hydrated N, skipped M of 5` with N ≥ 1 (assuming PRS signals exist for the tenant; if `No PRS signals need hydration.` prints, run `collect` for the PRS source first or raise `--limit`).

- [ ] **Step 2: Confirm body + date landed, and old bills are dated old**

Run:
```bash
psql "$DATABASE_URL" -c "select count(*) filter (where body_text is not null and body_text <> '') as with_body, count(*) filter (where published_at is not null) as with_date, min(published_at) as oldest from signals where url like '%prsindia.org%';"
```
Expected: `with_body` ≥ 1, `with_date` ≥ 1, and `oldest` predating `fetched_at` (e.g. a 2023 date) — proving the freshness bug is fixed.

- [ ] **Step 3: Spot-check one signal**

Run:
```bash
psql "$DATABASE_URL" -c "select left(body_text, 160) as body, published_at, url from signals where url like '%prsindia.org%' and published_at is not null order by published_at asc limit 1;"
```
Expected: `body` is real bill-summary prose; `published_at` matches that bill page's latest status date (in UTC, at `06:30Z`). Records spec success criteria 1–3.

---

## Self-Review

- **Spec coverage:** latest-status-date + IST→UTC noon anchor + scoped `field-name-field-own-status-date` selector + `field-name-body` summary (Task 1, Step 4); saved real-page fixture with decoy (Task 1, Steps 1–2); edge cases — missing status field, missing both fields (Task 1, Step 2); hydrator-via-fake-fetcher (Task 1, Step 2); docs (Task 2); live success-criteria check incl. old-bill date (Task 3). The CLI/DB generalization is explicitly out of scope and unchanged.
- **Placeholder scan:** none — every code/fixture/test step shows complete content; `$DATABASE_URL` in Task 3 is a runtime env value, not a code placeholder; `N`/`M` are runtime counts.
- **Type consistency:** `parse_prs_page(html) -> PrsContent(body_text, published_at)` defined in Task 1 Step 4 and used identically by `PrsHydrator.hydrate` (same file) and the tests (Task 1 Step 2). Fixture path `tests/fixtures/prs_bill.html` created in Step 1, read in Step 2. The latest-date expectation `datetime(2023, 12, 18, 6, 30, tzinfo=UTC)` is consistent across `test_parses_latest_status_date_ist_to_utc` and `test_hydrator_fetches_then_parses`. Noon-IST math: `datetime(2023,12,18) + 12h − 5h30 = 06:30` same day. ✓
