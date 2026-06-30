"""Connector seam + Keywords Everywhere adapter (C2, ADR 0044)."""

from __future__ import annotations

import pytest

from onlinejourno_agents import keywords as kw
from onlinejourno_agents.connectors import (
    CMSClient,
    ConnectorConfig,
    KeywordsClient,
    NlpClient,
    SpacyNlpClient,
    make_connector,
)


@pytest.fixture(autouse=True)
def _stub_ssrf_guard(monkeypatch):
    # CMS tests use reserved/example hosts to exercise parsing; the SSRF guard
    # (real DNS) is tested separately in scoring-py. No-op it here.
    import onlinejourno_agents.connectors as c

    monkeypatch.setattr(c, "validate_url", lambda url: None)


def test_ke_adapter_shapes_response(monkeypatch):
    fake = {
        "india news": kw.KeywordVolume(
            keyword="India news", volume=1234, competition=0.4, trend=[]
        )
    }
    monkeypatch.setattr(kw, "fetch_volumes", lambda terms, **k: fake)

    client = make_connector(
        ConnectorConfig(
            category="keywords",
            provider="keywords_everywhere",
            mode="api",
            config={},
            secret_ref="KE_KEY",
        )
    )
    assert isinstance(client, KeywordsClient)  # satisfies the contract

    out = client.keyword_data(["India news"])
    assert out["india news"]["volume"] == 1234
    assert out["india news"]["keyword"] == "India news"
    assert out["india news"]["trend_direction"] == "flat"


def test_unknown_category_raises():
    with pytest.raises(ValueError):
        make_connector(ConnectorConfig(category="nope", provider="x", mode="api"))


def test_bad_mode_raises():
    with pytest.raises(ValueError):
        make_connector(
            ConnectorConfig(category="keywords", provider="keywords_everywhere", mode="ftp")
        )


def test_unimplemented_adapter_raises():
    with pytest.raises(NotImplementedError):
        make_connector(ConnectorConfig(category="analytics", provider="ga4", mode="api"))


def test_wordpress_cms_parses(monkeypatch):
    import requests

    class FakeResp:
        def raise_for_status(self):
            return None

        def json(self):
            return [{
                "id": 7, "link": "https://x/post", "date_gmt": "2026-06-01T00:00:00",
                "title": {"rendered": "Hello World"},
                "content": {"rendered": "<p>Body text here</p>"},
                "_embedded": {"wp:term": [[{"taxonomy": "category", "name": "Tech"}]]},
            }]

    monkeypatch.setattr(requests, "get", lambda *a, **k: FakeResp())
    client = make_connector(ConnectorConfig(
        category="cms", provider="wordpress", mode="api", config={"base_url": "https://x"},
    ))
    assert isinstance(client, CMSClient)
    rows = client.stories(limit=5)
    assert rows[0]["cms_ref"] == "7"
    assert rows[0]["section"] == "Tech"
    assert "Body text" in rows[0]["body_text"]


def test_drupal_cms_parses(monkeypatch):
    import requests

    class FakeResp:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": [{
                "id": "uuid-1",
                "attributes": {
                    "title": "Drupal news", "created": "2026-06-01T00:00:00",
                    "body": {"processed": "<p>Article body</p>"},
                    "path": {"alias": "/news/1"},
                },
            }]}

    monkeypatch.setattr(requests, "get", lambda *a, **k: FakeResp())
    client = make_connector(ConnectorConfig(
        category="cms", provider="drupal", mode="api", config={"base_url": "https://d"},
    ))
    rows = client.stories(limit=5)
    assert rows[0]["cms_ref"] == "uuid-1"
    assert rows[0]["url"] == "https://d/news/1"
    assert "Article body" in rows[0]["body_text"]


def test_ghost_cms_parses(monkeypatch):
    import requests

    class FakeResp:
        def raise_for_status(self):
            return None

        def json(self):
            return {"posts": [{
                "id": "g1", "url": "https://g/post", "title": "Ghost news",
                "html": "<p>Ghost body</p>", "published_at": "2026-06-01T00:00:00",
                "primary_tag": {"name": "Media"},
            }]}

    monkeypatch.setattr(requests, "get", lambda *a, **k: FakeResp())
    client = make_connector(ConnectorConfig(
        category="cms", provider="ghost", mode="api",
        config={"base_url": "https://g", "content_key": "k"},
    ))
    rows = client.stories(limit=5)
    assert rows[0]["cms_ref"] == "g1"
    assert rows[0]["section"] == "Media"
    assert "Ghost body" in rows[0]["body_text"]


def test_spacy_nlp_client_shapes():
    # Inject a fake pipeline so the parsing logic is tested without spaCy installed.
    class FakeEnt:
        def __init__(self, text, label):
            self.text = text
            self.label_ = label

    class FakeDoc:
        ents = [FakeEnt("RBI", "ORG"), FakeEnt("New Delhi", "GPE")]

    client = SpacyNlpClient(
        ConnectorConfig(category="nlp", provider="spacy", mode="api")
    )
    client._nlp = lambda text: FakeDoc()  # bypass model load
    assert isinstance(client, NlpClient)
    res = client.analyse("whatever text")
    assert "RBI" in res["entities"]
    assert "New Delhi" in res["entities"]
    assert res["geo"]["region"] == "New Delhi"
