"""DataForSEO connector adapters (keywords + serp) — mocked, NO network, NO spend."""
from __future__ import annotations

from onlinejourno_agents import dataforseo as dfs
from onlinejourno_agents.connectors import (
    ConnectorConfig,
    KeywordsClient,
    SerpClient,
    make_connector,
)


def _cfg(category: str) -> ConnectorConfig:
    return ConnectorConfig(category=category, provider="dataforseo", mode="api", config={})


def test_dataforseo_keywords_adapter(monkeypatch):
    monkeypatch.setenv("DATAFORSEO_LOGIN", "u")
    monkeypatch.setenv("DATAFORSEO_PASSWORD", "p")
    monkeypatch.setattr(dfs, "search_volume", lambda *a, **k: {"available": True, "items": [
        {"keyword": "India news", "search_volume": 1234, "cpc": 0.5, "competition": 0.4}]})

    client = make_connector(_cfg("keywords"))
    assert isinstance(client, KeywordsClient)  # satisfies the contract
    out = client.keyword_data(["India news"])
    assert out["india news"]["volume"] == 1234
    assert out["india news"]["keyword"] == "India news"


def test_dataforseo_serp_adapter(monkeypatch):
    monkeypatch.setenv("DATAFORSEO_LOGIN", "u")
    monkeypatch.setenv("DATAFORSEO_PASSWORD", "p")
    monkeypatch.setattr(dfs, "serp_ai_overview", lambda *a, **k: {
        "available": True, "aio_present": True, "aio_cited_urls": ["https://thehindu.com/x"]})
    monkeypatch.setattr(dfs, "bulk_traffic_estimation", lambda *a, **k: {
        "available": True, "targets": [{"target": "thehindu.com", "organic_etv": 999.0}]})

    client = make_connector(_cfg("serp"))
    assert isinstance(client, SerpClient)
    aio = client.ai_overview("rbi rate decision")
    assert aio["present"] is True
    assert "https://thehindu.com/x" in aio["cited_urls"]
    tr = client.traffic_estimate(["thehindu.com"])
    assert tr["domains"]["thehindu.com"] == 999.0


def test_dataforseo_no_creds_returns_empty(monkeypatch):
    # Real dfs.search_volume gets auth=None -> {available: False}, no HTTP, no spend.
    monkeypatch.delenv("DATAFORSEO_LOGIN", raising=False)
    monkeypatch.delenv("DATAFORSEO_PASSWORD", raising=False)
    client = make_connector(_cfg("keywords"))
    assert client.keyword_data(["x"]) == {}
