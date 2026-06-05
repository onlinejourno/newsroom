"""GDELT collector tests. Pure parsing — no network (injected fake session)."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from onlinejourno_ingest.collectors.gdelt import GDELTCollector, _parse_seendate
from onlinejourno_ingest.protocols import FetchError


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class _FakeSession:
    def __init__(self, payload):
        self._payload = payload
        self.calls = []

    def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return _FakeResponse(self._payload)


def _source():
    return {
        "id": uuid4(),
        "tenant_id": uuid4(),
        "kind": "gdelt",
        "name": "The Hindu — Business (GDELT)",
        "url": "https://api.gdeltproject.org/api/v2/doc/doc",
        "rss_url": "domainis:thehindu.com (sebi OR rbi) sourcelang:english",
        "expected_languages": ["en"],
    }


def test_parse_seendate():
    assert _parse_seendate("20260605T103000Z") == datetime(2026, 6, 5, 10, 30, 0, tzinfo=UTC)
    assert _parse_seendate(None) is None
    assert _parse_seendate("garbage") is None


def test_fetch_maps_articles_to_signals():
    payload = {"articles": [
        {"url": "https://www.thehindu.com/business/sebi-order/article1.ece",
         "title": "SEBI passes interim order", "seendate": "20260605T090000Z",
         "domain": "thehindu.com", "language": "English", "sourcecountry": "India"},
        {"url": "", "title": "no url -> skipped"},
    ]}
    sess = _FakeSession(payload)
    collector = GDELTCollector(session=sess)
    signals = collector.fetch(_source())

    assert len(signals) == 1
    s = signals[0]
    assert s.headline == "SEBI passes interim order"
    assert s.language == "en"
    assert s.body_text is None  # GDELT gives metadata only
    assert s.raw_payload["via"] == "gdelt" and s.raw_payload["domain"] == "thehindu.com"
    # query passed through as the GDELT 'query' param
    _, kwargs = sess.calls[0]
    assert kwargs["params"]["query"].startswith("domainis:thehindu.com")
    assert kwargs["params"]["format"] == "json"


def test_missing_query_raises():
    src = _source()
    src["rss_url"] = ""
    try:
        GDELTCollector(session=_FakeSession({})).fetch(src)
        raise AssertionError("expected FetchError")
    except FetchError:
        pass
