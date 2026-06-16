"""PRS hydration tests — pure parsing, no network."""

from __future__ import annotations

from datetime import UTC, datetime

from onlinejourno_ingest.hydrate.prs import PrsHydrator, parse_prs_page

_HTML = """
<html><body>
  <div class="region region-content">
    <h1>The Cinematograph (Amendment) Bill, 2023</h1>
    <p>The Cinematograph (Amendment) Bill, 2023 was introduced in Rajya Sabha on
       July 20, 2023. It seeks to curb film piracy.</p>
    <div class="status">Introduced Rajya Sabha Jul 20, 2023 · Passed Jul 31, 2023</div>
  </div>
</body></html>
"""


def test_parses_summary_and_earliest_date():
    content = parse_prs_page(_HTML)
    # earliest date across the page = the introduced date
    assert content.published_at == datetime(2023, 7, 20, tzinfo=UTC)
    assert "introduced in Rajya Sabha" in content.body_text
    assert "curb film piracy" in content.body_text


def test_missing_content_region():
    content = parse_prs_page("<html><body>nope</body></html>")
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
    fetcher = _FakeFetcher(_HTML.encode("utf-8"))
    content = PrsHydrator(fetcher).hydrate("https://prsindia.org/billtrack/the-cinematograph-amendment-bill-2023")
    assert fetcher.urls == ["https://prsindia.org/billtrack/the-cinematograph-amendment-bill-2023"]
    assert content.published_at == datetime(2023, 7, 20, tzinfo=UTC)
    assert content.body_text
