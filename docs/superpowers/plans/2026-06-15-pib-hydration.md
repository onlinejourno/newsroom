# PIB Body + Date Hydration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill `body_text` + `published_at` on existing PIB signals by fetching each PRID page and parsing the release body and posted date.

**Architecture:** A pure `parse_pib_page` parser + a `PibHydrator` that fetches via the Step-1 `CloudflareFetcher`; two `db.py` helpers to select body-less PIB signals and update them; a `hydrate-pib` CLI command that loops with a polite throttle and per-signal error isolation. PIB pages fetch on the header tier (verified); no new crawler.

**Tech Stack:** Python 3.11, `beautifulsoup4`/`lxml`, `requests`, `psycopg` (dict_row), `pytest`.

**Spec:** `docs/superpowers/specs/2026-06-15-pib-hydration-design.md`

---

## File Structure

- **Create** `packages/ingest-py/src/onlinejourno_ingest/hydrate/__init__.py` — package marker.
- **Create** `packages/ingest-py/src/onlinejourno_ingest/hydrate/pib.py` — `PibContent`, `parse_pib_page`, `PibHydrator`.
- **Create** `packages/ingest-py/tests/fixtures/pib_release.html` — trimmed real PIB page for parser tests.
- **Create** `packages/ingest-py/tests/test_pib_hydrate.py` — parser + hydrator tests (no network).
- **Modify** `packages/ingest-py/src/onlinejourno_ingest/db.py` — `pib_signals_needing_hydration`, `set_signal_body_published`.
- **Modify** `packages/ingest-py/src/onlinejourno_ingest/cli.py` — `hydrate-pib` subcommand.

Test commands run from `packages/ingest-py`.

---

## Task 1: Pure parser — `PibContent` + `parse_pib_page`

**Files:**
- Create: `packages/ingest-py/src/onlinejourno_ingest/hydrate/__init__.py`
- Create: `packages/ingest-py/src/onlinejourno_ingest/hydrate/pib.py`
- Create: `packages/ingest-py/tests/fixtures/pib_release.html`
- Test: `packages/ingest-py/tests/test_pib_hydrate.py`

- [ ] **Step 1: Create the package marker**

Create `packages/ingest-py/src/onlinejourno_ingest/hydrate/__init__.py`:

```python
"""Signal hydration — fill body/date on already-discovered signals."""
```

- [ ] **Step 2: Create the test fixture**

Create `packages/ingest-py/tests/fixtures/pib_release.html` (mirrors the live PIB structure):

```html
<!DOCTYPE html>
<html><head><title>Press Release:Press Information Bureau</title></head>
<body>
  <div class="innner-page-main-about-us-content-right-part">
    <h2>NHRC takes suo motu cognizance of reported social ostracisation</h2>
    <div class="ReleaseDateSubHeaddateTime">Posted On:
                15 JUN 2026 2:30PM by PIB Delhi</div>
    <p>The National Human Rights Commission has issued a notice to the State
       government seeking a detailed report within four weeks.</p>
    <p>The Commission observed that the matter raises a serious issue of
       human dignity.</p>
  </div>
</body></html>
```

- [ ] **Step 3: Write the failing tests**

Create `packages/ingest-py/tests/test_pib_hydrate.py`:

```python
"""PIB hydration tests — pure parsing, no network."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from onlinejourno_ingest.hydrate.pib import parse_pib_page

_FIXTURE = (Path(__file__).parent / "fixtures" / "pib_release.html").read_text()


def test_parses_body_and_date():
    content = parse_pib_page(_FIXTURE)
    # 15 JUN 2026 2:30 PM IST == 09:00 UTC
    assert content.published_at == datetime(2026, 6, 15, 9, 0, tzinfo=UTC)
    assert "National Human Rights Commission" in content.body_text
    assert "four weeks" in content.body_text
    # headline and the "Posted On" date must NOT be in the body
    assert "suo motu cognizance" not in content.body_text
    assert "Posted On" not in content.body_text


def test_missing_date_div_yields_none_date_but_keeps_body():
    html = (
        '<div class="innner-page-main-about-us-content-right-part">'
        "<h2>Headline</h2><p>Body sentence here.</p></div>"
    )
    content = parse_pib_page(html)
    assert content.published_at is None
    assert content.body_text == "Body sentence here."


def test_missing_container_yields_empty_content():
    content = parse_pib_page("<html><body>nothing</body></html>")
    assert content.body_text is None
    assert content.published_at is None
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd packages/ingest-py && uv run pytest tests/test_pib_hydrate.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'onlinejourno_ingest.hydrate.pib'`.

- [ ] **Step 5: Write the parser**

Create `packages/ingest-py/src/onlinejourno_ingest/hydrate/pib.py`:

```python
"""Parse a PIB press-release page into body text + posted date.

PIB pages (PressReleaseIframePage.aspx?PRID=…) put the release inside
`.innner-page-main-about-us-content-right-part`, with the headline in an
`<h2>` and the timestamp in `div.ReleaseDateSubHeaddateTime`
("Posted On: 15 JUN 2026 2:30PM by PIB Delhi"). The body is everything in
that container except the headline and the date line.

Dates are PIB Delhi wall-clock = IST (UTC+5:30, no DST), normalised to UTC.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from bs4 import BeautifulSoup

_CONTAINER = ".innner-page-main-about-us-content-right-part"
_DATE_SEL = "div.ReleaseDateSubHeaddateTime"
_IST = timedelta(hours=5, minutes=30)
_BODY_CAP = 20_000

_MONTHS = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}
_DATE_RE = re.compile(
    r"(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)",
    re.IGNORECASE,
)


@dataclass(slots=True)
class PibContent:
    body_text: str | None
    published_at: datetime | None


def _parse_ist_to_utc(text: str) -> datetime | None:
    m = _DATE_RE.search(text)
    if not m:
        return None
    day, mon, year, hh, mm, ap = m.groups()
    month = _MONTHS.get(mon.upper())
    if month is None:
        return None
    hour = int(hh) % 12 + (12 if ap.upper() == "PM" else 0)
    try:
        ist = datetime(int(year), month, int(day), hour, int(mm))
    except ValueError:
        return None
    return (ist - _IST).replace(tzinfo=UTC)


def parse_pib_page(html: bytes | str) -> PibContent:
    soup = BeautifulSoup(html, "lxml")
    container = soup.select_one(_CONTAINER)
    if container is None:
        return PibContent(body_text=None, published_at=None)

    date_el = container.select_one(_DATE_SEL)
    published_at = _parse_ist_to_utc(date_el.get_text(" ", strip=True)) if date_el else None

    # Strip headline + date so only the release body remains.
    for tag in container.select(f"h2, {_DATE_SEL}"):
        tag.decompose()
    text = re.sub(r"\s+", " ", container.get_text(" ", strip=True)).strip()
    body_text = text[:_BODY_CAP] or None

    return PibContent(body_text=body_text, published_at=published_at)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/ingest-py && uv run pytest tests/test_pib_hydrate.py -v`
Expected: PASS (3 passed).

- [ ] **Step 7: Commit**

```bash
git add packages/ingest-py/src/onlinejourno_ingest/hydrate/__init__.py \
        packages/ingest-py/src/onlinejourno_ingest/hydrate/pib.py \
        packages/ingest-py/tests/fixtures/pib_release.html \
        packages/ingest-py/tests/test_pib_hydrate.py
git commit -m "feat(ingest): pure PIB release-page parser (body + IST->UTC date)"
```

---

## Task 2: `PibHydrator` — fetch + parse

**Files:**
- Modify: `packages/ingest-py/src/onlinejourno_ingest/hydrate/pib.py` (append `PibHydrator`)
- Test: `packages/ingest-py/tests/test_pib_hydrate.py` (add a case)

- [ ] **Step 1: Write the failing test**

Append to `packages/ingest-py/tests/test_pib_hydrate.py`:

```python
from onlinejourno_ingest.hydrate.pib import PibHydrator


class _FakeFetcher:
    def __init__(self, payload: bytes):
        self._payload = payload
        self.urls: list[str] = []

    def get_bytes(self, url, *, headers=None):
        self.urls.append(url)
        return self._payload


def test_hydrator_fetches_then_parses():
    fetcher = _FakeFetcher(_FIXTURE.encode("utf-8"))
    hydrator = PibHydrator(fetcher)
    content = hydrator.hydrate("https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1")
    assert fetcher.urls == ["https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1"]
    assert content.published_at == datetime(2026, 6, 15, 9, 0, tzinfo=UTC)
    assert "National Human Rights Commission" in content.body_text
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ingest-py && uv run pytest tests/test_pib_hydrate.py::test_hydrator_fetches_then_parses -v`
Expected: FAIL — `ImportError: cannot import name 'PibHydrator'`.

- [ ] **Step 3: Write the hydrator**

Append to `packages/ingest-py/src/onlinejourno_ingest/hydrate/pib.py`:

```python
from onlinejourno_ingest.fetch.cloudflare import Fetcher


class PibHydrator:
    """Fetch a PIB PRID page through a `Fetcher` and parse it."""

    def __init__(self, fetcher: Fetcher) -> None:
        self.fetcher = fetcher

    def hydrate(self, url: str) -> PibContent:
        return parse_pib_page(self.fetcher.get_bytes(url))
```

(Place the `import` with the other imports at the top of the file when implementing.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/ingest-py && uv run pytest tests/test_pib_hydrate.py -v`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add packages/ingest-py/src/onlinejourno_ingest/hydrate/pib.py \
        packages/ingest-py/tests/test_pib_hydrate.py
git commit -m "feat(ingest): PibHydrator — fetch PRID page via the Cloudflare fetcher"
```

---

## Task 3: DB helpers — select + update

**Files:**
- Modify: `packages/ingest-py/src/onlinejourno_ingest/db.py`

> No unit test: these are thin SQL helpers over Postgres, and this package
> has no DB test harness (collectors are tested with fakes). They are
> exercised by the live verification in Task 5. Keep them minimal and correct.

- [ ] **Step 1: Add both helpers**

Append to `packages/ingest-py/src/onlinejourno_ingest/db.py`:

```python
def pib_signals_needing_hydration(
    conn: psycopg.Connection, tenant_id: UUID, *, limit: int = 200
) -> list[dict[str, Any]]:
    """PIB signals (by url domain) still missing body_text or published_at."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, url
              from signals
             where tenant_id = %s
               and url like %s
               and (body_text is null or body_text = '' or published_at is null)
             order by fetched_at desc
             limit %s
            """,
            (tenant_id, "%pib.gov.in%", limit),
        )
        return list(cur.fetchall())


def set_signal_body_published(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    signal_id: UUID,
    body_text: str | None,
    published_at: datetime | None,
) -> None:
    """Update only the fields that were successfully parsed (non-None)."""
    sets: list[str] = []
    params: list[Any] = []
    if body_text is not None:
        sets.append("body_text = %s")
        params.append(body_text)
    if published_at is not None:
        sets.append("published_at = %s")
        params.append(published_at)
    if not sets:
        return
    params.extend([tenant_id, signal_id])
    with conn.cursor() as cur:
        cur.execute(
            f"update signals set {', '.join(sets)} where tenant_id = %s and id = %s",
            params,
        )
```

(The `set {', '.join(sets)}` interpolates only fixed column-name literals from
the whitelist above — never user input — so it is injection-safe.)

- [ ] **Step 2: Verify the module imports cleanly**

Run: `cd packages/ingest-py && uv run python -c "from onlinejourno_ingest import db; print(db.pib_signals_needing_hydration, db.set_signal_body_published)"`
Expected: prints both function objects, no ImportError.

- [ ] **Step 3: Commit**

```bash
git add packages/ingest-py/src/onlinejourno_ingest/db.py
git commit -m "feat(ingest): db helpers to select + update PIB signals for hydration"
```

---

## Task 4: CLI — `hydrate-pib` command

**Files:**
- Modify: `packages/ingest-py/src/onlinejourno_ingest/cli.py`

> No unit test: this is I/O + DB + network orchestration over already-tested
> units. Exercised by Task 5. Keep it thin.

- [ ] **Step 1: Add the command function**

In `packages/ingest-py/src/onlinejourno_ingest/cli.py`, add these imports near the top (alongside the existing `from onlinejourno_ingest.db import (...)` block — add the two new names to it):

```python
import time
from onlinejourno_ingest.collectors.base import http_session
from onlinejourno_ingest.fetch.cloudflare import CloudflareFetcher
from onlinejourno_ingest.hydrate.pib import PibHydrator
```

Add `pib_signals_needing_hydration` and `set_signal_body_published` to the existing `from onlinejourno_ingest.db import (...)` import list.

Add the command function (above `build_parser`):

```python
def cmd_hydrate_pib(args: argparse.Namespace) -> int:
    """Fetch PIB release pages to fill body_text + published_at on signals."""
    hydrator = PibHydrator(CloudflareFetcher(http_session()))
    with connect() as conn:
        tenant_id = tenant_id_for_slug(conn, args.tenant)
        rows = pib_signals_needing_hydration(conn, tenant_id, limit=args.limit)

    if not rows:
        print("No PIB signals need hydration.")
        return 0

    hydrated = 0
    skipped = 0
    last = 0.0
    for row in rows:
        wait = args.min_interval - (time.monotonic() - last)
        if wait > 0:
            time.sleep(wait)
        last = time.monotonic()
        try:
            content = hydrator.hydrate(row["url"])
            if content.body_text is None and content.published_at is None:
                skipped += 1
                continue
            with connect() as conn:
                set_signal_body_published(
                    conn,
                    tenant_id=tenant_id,
                    signal_id=row["id"],
                    body_text=content.body_text,
                    published_at=content.published_at,
                )
            hydrated += 1
        except Exception as exc:  # robust: one bad page never aborts the batch
            skipped += 1
            print(f"  skip {row['url']}: {exc}", file=sys.stderr)

    print(f"hydrated {hydrated}, skipped {skipped} of {len(rows)}")
    return 0
```

- [ ] **Step 2: Register the subparser**

In `build_parser`, after the `collect.set_defaults(func=cmd_collect)` line and before `return parser`:

```python
    hydrate = subparsers.add_parser(
        "hydrate-pib",
        help="Fetch PIB release pages to fill body_text + published_at",
    )
    hydrate.add_argument("--tenant", required=True, help="Tenant slug, e.g. 'self'")
    hydrate.add_argument("--limit", type=int, default=200, help="Max signals per run")
    hydrate.add_argument(
        "--min-interval", type=float, default=2.0, help="Seconds between page fetches"
    )
    hydrate.set_defaults(func=cmd_hydrate_pib)
```

- [ ] **Step 3: Verify the CLI wires up**

Run: `cd packages/ingest-py && uv run onlinejourno-ingest hydrate-pib --help`
Expected: usage text showing `--tenant`, `--limit`, `--min-interval`.

- [ ] **Step 4: Confirm the whole suite still passes**

Run: `cd packages/ingest-py && uv run pytest -q`
Expected: PASS (all prior tests + the 4 PIB parser/hydrator tests; the Step-1 browser test still skipped).

- [ ] **Step 5: Commit**

```bash
git add packages/ingest-py/src/onlinejourno_ingest/cli.py
git commit -m "feat(ingest): hydrate-pib CLI command (throttled, per-signal isolated)"
```

---

## Task 5: Live verification (manual — DB + network)

**Files:** none (verification only)

- [ ] **Step 1: Hydrate a small batch**

Run: `cd packages/ingest-py && uv run onlinejourno-ingest hydrate-pib --tenant self --limit 5`
Expected: `hydrated N, skipped M of T` with N ≥ 1.

- [ ] **Step 2: Confirm body + date landed**

Run:
```bash
psql "$DATABASE_URL" -c "select count(*) filter (where body_text is not null and body_text <> '') as with_body, count(*) filter (where published_at is not null) as with_date from signals where url like '%pib.gov.in%' and (body_text is not null or published_at is not null);"
```
Expected: `with_body` ≥ 1 and `with_date` ≥ 1.

- [ ] **Step 3: Spot-check one signal**

Run:
```bash
psql "$DATABASE_URL" -c "select left(body_text, 160) as body, published_at, url from signals where url like '%pib.gov.in%' and body_text is not null order by published_at desc nulls last limit 1;"
```
Expected: `body` is real release prose; `published_at` matches the page's "Posted On" date (in UTC). Records spec success criteria 1–3.

---

## Self-Review

- **Spec coverage:** parser body+IST→UTC date (Task 1), hydrator reusing the Step-1 `Fetcher` (Task 2), domain-based selection + non-None update (Task 3), throttled per-signal-isolated `hydrate-pib` (Task 4), live success-criteria check (Task 5). All spec sections covered. (Spec mentions `zoneinfo`; the plan uses a fixed +5:30 offset instead — IST has no DST — which is strictly more robust and dependency-free.)
- **Placeholder scan:** none — every code/edit step shows complete content; `$DATABASE_URL` in Task 5 is a runtime env value, not a code placeholder.
- **Type consistency:** `parse_pib_page(html) -> PibContent(body_text, published_at)` defined in Task 1 and used identically by `PibHydrator.hydrate` (Task 2) and `cmd_hydrate_pib` (Task 4). `pib_signals_needing_hydration(conn, tenant_id, *, limit) -> list[dict]` and `set_signal_body_published(conn, *, tenant_id, signal_id, body_text, published_at)` defined in Task 3 and called with matching kwargs in Task 4. Rows are dicts (`dict_row`), accessed as `row["id"]` / `row["url"]`.
