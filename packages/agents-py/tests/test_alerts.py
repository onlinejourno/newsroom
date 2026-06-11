"""m-alerts — pure message-build tests."""

from onlinejourno_agents.alerts import build_message


def test_build_message_shape():
    msg = build_message(
        {"id": "abc", "headline": "Cabinet approves scheme", "beat": "Governance",
         "region": "India", "trend_score": 82, "url": "https://x/y"},
        detail_base="http://localhost:3001/en",
    )
    assert msg["title"] == "Governance - trend 82 - India"
    assert msg["body"] == "Cabinet approves scheme"
    assert msg["click"] == "http://localhost:3001/en/signal/abc"


def test_build_message_falls_back_to_source_url():
    msg = build_message({"id": "z", "headline": None, "url": "https://x/y",
                         "beat": None, "region": None, "trend_score": 71}, None)
    assert msg["title"].startswith("Signal - trend 71")
    assert msg["click"] == "https://x/y"
