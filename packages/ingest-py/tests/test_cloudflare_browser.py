"""Opt-in: real headless-browser fetch of a live Cloudflare feed.

Skipped by default. Enable with:
    PLAYWRIGHT_E2E=1 uv run pytest tests/test_cloudflare_browser.py -v
Requires `uv run playwright install chromium`.
"""

from __future__ import annotations

import os
from uuid import uuid4

import pytest

from onlinejourno_ingest.collectors.rss import RSSCollector

pytestmark = [
    pytest.mark.browser,
    pytest.mark.skipif(
        os.environ.get("PLAYWRIGHT_E2E") != "1",
        reason="set PLAYWRIGHT_E2E=1 to run the real-browser smoke test",
    ),
]


def test_the_hindu_business_feed_yields_article_urls():
    source = {
        "id": uuid4(),
        "tenant_id": uuid4(),
        "kind": "rss",
        "name": "The Hindu — Business",
        "url": "https://www.thehindu.com/business/",
        "rss_url": "https://www.thehindu.com/business/feeder/default.rss",
        "expected_languages": ["en"],
    }
    signals = RSSCollector().fetch(source)
    assert signals, "expected at least one signal from The Hindu feed"
    assert any(".ece" in (s.url or "") for s in signals), "expected article-level .ece URLs"
