# PRS Legislative Research Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable PRS `/billtrack` as a live scrape source — bill-level signals (URL + title) — via seed config on the existing `ScrapeCollector`.

**Architecture:** No production code change. A characterization test proves the chosen selector (`.views-field-title-field`) parses PRS Drupal-Views markup into bill signals; a seed `update` configures + enables the PRS source row.

**Tech Stack:** Python 3.11, `beautifulsoup4`/`lxml`, `requests`, `psycopg`, `pytest`. `ScrapeCollector` accepts an injected `session` (constructor arg), so tests use a fake session.

**Spec:** `docs/superpowers/specs/2026-06-15-prs-source-design.md`

---

## File Structure

- **Create** `packages/ingest-py/tests/test_scrape.py` — ScrapeCollector parses PRS markup (fake session, no network).
- **Modify** `infra/seeds/primary_sources.sql` — add an `update` enabling + configuring the PRS row.

Test commands run from `packages/ingest-py`.

---

## Task 1: ScrapeCollector parses PRS billtrack markup

**Files:**
- Create: `packages/ingest-py/tests/test_scrape.py`

- [ ] **Step 1: Write the test**

Create `packages/ingest-py/tests/test_scrape.py`:

```python
"""ScrapeCollector against PRS billtrack markup — fake session, no network."""

from __future__ import annotations

from uuid import uuid4

from onlinejourno_ingest.collectors.scrape import ScrapeCollector

# Mirrors prsindia.org/billtrack Drupal Views markup: bill rows live in
# .views-field-title-field; category-nav links do not.
_HTML = """
<html><body>
  <div class="view-content">
    <div class="views-row">
      <div class="views-field views-field-title-field"><span class="field-content">
        <h3 class="cate"><a href="/billtrack/the-union-territories-laws-amendment-bill-2026">The Union Territories Laws (Amendment) Bill, 2026</a></h3>
      </span></div>
    </div>
    <div class="views-row">
      <div class="views-field views-field-title-field"><span class="field-content">
        <h3 class="cate"><a href="/billtrack/digital-personal-data-protection-bill-2026">The Digital Personal Data Protection Bill, 2026</a></h3>
      </span></div>
    </div>
  </div>
  <div class="category-nav">
    <a href="/billtrack/category/governance-and-strategic-affairs">Governance and Strategic Affairs</a>
  </div>
</body></html>
"""


class _FakeResponse:
    def __init__(self, text):
        self.text = text

    def raise_for_status(self):
        pass


class _FakeSession:
    def __init__(self, text):
        self._text = text
        self.calls = []

    def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return _FakeResponse(self._text)


def _source():
    return {
        "id": uuid4(),
        "tenant_id": uuid4(),
        "kind": "scrape",
        "name": "PRS Legislative Research",
        "url": "https://prsindia.org/billtrack",
        "params": {"item_selector": ".views-field-title-field", "max_items": 100},
    }


def test_scrapes_bill_items_excluding_category_nav():
    collector = ScrapeCollector(session=_FakeSession(_HTML))
    signals = collector.fetch(_source())

    urls = {s.url for s in signals}
    assert urls == {
        "https://prsindia.org/billtrack/the-union-territories-laws-amendment-bill-2026",
        "https://prsindia.org/billtrack/digital-personal-data-protection-bill-2026",
    }
    # category-nav link is not under .views-field-title-field → excluded
    assert all("/category/" not in u for u in urls)
    titles = {s.headline for s in signals}
    assert "The Digital Personal Data Protection Bill, 2026" in titles
    assert all(s.url.startswith("https://prsindia.org/billtrack/") for s in signals)
```

- [ ] **Step 2: Run the test**

Run: `cd packages/ingest-py && uv run pytest tests/test_scrape.py -v`
Expected: PASS — the existing `ScrapeCollector` + the `.views-field-title-field` selector yield exactly the two bill signals, category nav excluded. (If it fails, the selector/markup assumption is wrong — STOP and re-pin against the live HTML before touching the seed.)

- [ ] **Step 3: Commit**

```bash
git add packages/ingest-py/tests/test_scrape.py
git commit -m "test(ingest): ScrapeCollector parses PRS billtrack markup"
```

---

## Task 2: Enable + configure the PRS source

**Files:**
- Modify: `infra/seeds/primary_sources.sql`

- [ ] **Step 1: Add the configuring update**

In `infra/seeds/primary_sources.sql`, after the existing `update sources set auth=...`
(data.gov.in) block and before the `-- MSM feeds` update, add:

```sql
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
```

- [ ] **Step 2: Sanity-check the SQL parses**

Run: `psql "$DATABASE_URL" -v tenant="(select id from tenants where slug='self')" -c "\\echo ok" 2>/dev/null; grep -n "PRS Legislative Research" infra/seeds/primary_sources.sql`
Expected: the new `update` line shows in the grep (full apply happens in Task 3).

- [ ] **Step 3: Commit**

```bash
git add infra/seeds/primary_sources.sql
git commit -m "feat(seed): enable + configure PRS billtrack scrape source"
```

---

## Task 3: Live verification (manual — DB + network)

**Files:** none (verification only)

- [ ] **Step 1: Apply the config to the dev DB**

Run:
```bash
psql "$DATABASE_URL" -c "update sources set url='https://prsindia.org/billtrack', params='{\"item_selector\": \".views-field-title-field\", \"max_items\": 100}', enabled=true where name='PRS Legislative Research' and tenant_id=(select id from tenants where slug='self');"
```
Expected: `UPDATE 1`.

- [ ] **Step 2: Collect PRS**

Run: `cd packages/ingest-py && uv run onlinejourno-ingest collect --tenant self --source-name "PRS Legislative Research"`
Expected: `PRS Legislative Research   +N (M parsed)` with N ≥ 1 (first run adds up to 100).

- [ ] **Step 3: Confirm bill-level URLs, zero homepage collapse**

Run:
```bash
psql "$DATABASE_URL" -c "select count(*) total, count(*) filter (where url ~ '/billtrack/[^/]+$') as bill_level, count(*) filter (where url ~ '^https?://[^/]+/?$') as homepage from signals sig join sources s on s.id=sig.source_id where s.name='PRS Legislative Research';"
```
Expected: `bill_level` ≥ 1, `homepage` = 0. Records spec success criteria 1–3.

---

## Self-Review

- **Spec coverage:** parsing test for the selector (Task 1), seed `update` to configure+enable (Task 2), live collect + bill-level URL check (Task 3). All spec deliverables covered; no `scrape.py` change (config-only, as specified).
- **Placeholder scan:** none — complete code/SQL in every step; `$DATABASE_URL` / `:tenant` are runtime values.
- **Type consistency:** the source dict keys in Task 1's `_source()` (`id`, `tenant_id`, `kind`, `name`, `url`, `params`) match what `ScrapeCollector.fetch` reads; `params.item_selector` + `params.max_items` match the seed `params` JSON in Tasks 2–3 exactly (`.views-field-title-field`, `100`). The verify regex `/billtrack/[^/]+$` matches the URLs the test asserts.
