"""Connector seam + Keywords Everywhere adapter (C2, ADR 0044)."""

from __future__ import annotations

import pytest

from onlinejourno_agents import keywords as kw
from onlinejourno_agents.connectors import (
    ConnectorConfig,
    KeywordsClient,
    make_connector,
)


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
