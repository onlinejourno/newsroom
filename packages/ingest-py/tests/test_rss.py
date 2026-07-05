"""RSSCollector tests via an injected fake Fetcher — no network."""

from __future__ import annotations

from uuid import uuid4

import pytest

from onlinejourno_ingest.collectors.rss import RSSCollector
from onlinejourno_ingest.fetch.cloudflare import CloudflareBlocked
from onlinejourno_ingest.protocols import FetchError

_FEED = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>T</title>
  <item>
    <title>SEBI tightens IPO disclosure norms</title>
    <link>https://www.thehindu.com/business/sebi-ipo/article99.ece</link>
    <description>Markets regulator update.</description>
    <pubDate>Mon, 15 Jun 2026 09:00:00 +0530</pubDate>
  </item>
</channel></rss>"""


class _FakeFetcher:
    def __init__(self, payload=None, exc=None):
        self._payload = payload
        self._exc = exc

    def get_bytes(self, url, *, headers=None):
        if self._exc is not None:
            raise self._exc
        return self._payload


def _source():
    return {
        "id": uuid4(),
        "tenant_id": uuid4(),
        "kind": "rss",
        "name": "The Hindu — Business",
        "url": "https://www.thehindu.com/business/",
        "rss_url": "https://www.thehindu.com/business/feeder/default.rss",
        "expected_languages": ["en"],
    }


def test_fetch_parses_article_url_from_fetcher():
    collector = RSSCollector(fetcher=_FakeFetcher(payload=_FEED))
    signals = collector.fetch(_source())
    assert len(signals) == 1
    assert signals[0].url == "https://www.thehindu.com/business/sebi-ipo/article99.ece"
    assert signals[0].headline == "SEBI tightens IPO disclosure norms"


def test_cloudflare_block_becomes_fetch_error():
    blocked = _FakeFetcher(exc=CloudflareBlocked("https://x.test/feed", "playwright"))
    collector = RSSCollector(fetcher=blocked)
    with pytest.raises(FetchError):
        collector.fetch(_source())
