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
