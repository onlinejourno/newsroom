"""Vendored DataForSEO client — parser tests. NO network, NO spend (fake session)."""
from __future__ import annotations

import pytest

from onlinejourno_agents import dataforseo as dfs

AUTH = ("user", "pass")


class FakeResp:
    def __init__(self, payload, status_code=200):
        self._payload, self.status_code = payload, status_code

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class FakeSession:
    def __init__(self, resp):
        self._resp, self.calls = resp, []

    def post(self, url, json=None, auth=None, timeout=None):
        self.calls.append({"url": url, "json": json, "auth": auth})
        return self._resp


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    monkeypatch.setattr(dfs.time, "sleep", lambda *_: None)
    dfs._last_call = 0.0


def test_no_auth_makes_no_call():
    s = FakeSession(FakeResp({}))
    out = dfs.search_volume(s, ["x"], None)
    assert out["available"] is False
    assert s.calls == []


def test_search_volume_flat_result():
    payload = {"status_code": dfs._OK, "tasks": [{"status_code": dfs._OK, "result": [
        {"keyword": "rbi rate", "search_volume": 880, "cpc": 0.4, "competition": 0.2},
    ]}]}
    out = dfs.search_volume(FakeSession(FakeResp(payload)), ["rbi rate"], AUTH)
    assert out["available"] is True
    assert out["items"][0]["search_volume"] == 880


def test_serp_ai_overview_parses_citations():
    payload = {"status_code": dfs._OK, "tasks": [{"status_code": dfs._OK, "result": [{"items": [
        {"type": "ai_overview", "references": [{"url": "https://www.thehindu.com/a"}]},
        {"type": "organic", "rank_group": 1, "url": "https://x.com", "domain": "x.com"},
    ]}]}]}
    out = dfs.serp_ai_overview(FakeSession(FakeResp(payload)), "rbi rate", AUTH)
    assert out["aio_present"] is True
    assert "https://www.thehindu.com/a" in out["aio_cited_urls"]
    assert dfs.norm_domain("https://www.thehindu.com/a") == "thehindu.com"


def test_bulk_traffic_and_ranked():
    bt = {"status_code": dfs._OK, "tasks": [{"status_code": dfs._OK, "result": [{"items": [
        {"target": "thehindu.com", "metrics": {"organic": {"etv": 999.0, "count": 5000}}},
    ]}]}]}
    out = dfs.bulk_traffic_estimation(FakeSession(FakeResp(bt)), ["thehindu.com"], AUTH)
    assert out["targets"][0]["organic_etv"] == 999.0

    rk = {"status_code": dfs._OK, "tasks": [{"status_code": dfs._OK, "result": [{"items": [
        {"keyword_data": {"keyword": "k", "keyword_info": {"search_volume": 100, "cpc": 0.3}},
         "ranked_serp_element": {"serp_item": {"rank_group": 2, "etv": 50.0, "url": "https://thehindu.com/a"}}},
    ]}]}]}
    out = dfs.ranked_keywords(FakeSession(FakeResp(rk)), "thehindu.com", AUTH)
    assert out["total_etv"] == 50.0
    assert out["keywords"][0]["url"] == "https://thehindu.com/a"
