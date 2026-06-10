"""m-distribution-fit Phase 1 — the content-based channel scorer."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from onlinejourno_agents.distribution_fit import (
    Story,
    channel_score,
    grade,
)


def test_grade_bands():
    assert grade(85) == "A"
    assert grade(70) == "B"
    assert grade(55) == "C"
    assert grade(20) == "F"


def test_strong_story_scores_well():
    s = Story(
        title="Central bank holds repo rate as inflation cools to 4%",  # ~53 chars
        published=datetime.now(UTC) - timedelta(hours=2),
        word_count=800,
        image="https://cdn/x/photo_1200.jpg",
        schema_types=["NewsArticle"],
        has_byline=True,
        author="A Reporter",
        named_sources=["Central Bank"],
        url="https://x/a",
        trend_alignment=16,
    )
    res = channel_score(s)
    assert res["discover"]["grade"] in ("A", "B")
    assert res["google_search"]["score"] >= 65
    assert res["google_news"]["score"] >= 65
    # a strong story still returns signals; top_fix may be None or minor
    assert res["discover"]["signals"]


def test_bare_story_gets_fixes():
    s = Story(title="x", published=None, word_count=50, url="http://x")  # http, thin, no title
    res = channel_score(s)
    assert res["discover"]["score"] < 50
    assert res["discover"]["top_fix"]  # there is an actionable fix
    # the missing image fix surfaces for Discover
    assert any("image" in sig["note"].lower() for sig in res["discover"]["signals"])


def test_surfaces_filter():
    res = channel_score(Story(title="hello"), surfaces=["discover"])
    assert set(res) == {"discover"}
    # an AI/unknown surface is skipped (no content scorer yet)
    res2 = channel_score(Story(title="hello"), surfaces=["discover", "ai_overviews"])
    assert set(res2) == {"discover"}


def test_need_weighted_composite_steers_by_need():
    from onlinejourno_agents.distribution_fit import need_weighted_composite

    channels = {
        "discover": {"score": 90, "signals": [
            {"name": "Image", "value": 25, "max": 25, "note": "image ok"}]},
        "google_news": {"score": 80, "signals": [
            {"name": "Schema", "value": 25, "max": 25, "note": "schema ok"}]},
        "google_search": {"score": 30, "signals": [
            {"name": "Depth", "value": 0, "max": 30, "note": "add depth"}]},
    }
    # Know: Discover/News weighted up -> composite above the plain average.
    plain = round((90 + 80 + 30) / 3)
    know = need_weighted_composite(channels, "know")
    assert know["composite"] > plain
    assert set(know["priority_surfaces"]) == {"discover", "google_news"}
    # Understand: Search weighted up -> composite below plain; fix from Search.
    und = need_weighted_composite(channels, "understand")
    assert und["composite"] < plain
    assert und["priority_surfaces"] == ["google_search"]
    assert und["top_fix"] == "add depth"
    # Know's fix comes from its priority pool, not the globally weakest surface.
    assert know["top_fix"] != "add depth"


def test_need_weighted_composite_no_need_is_plain_average():
    from onlinejourno_agents.distribution_fit import need_weighted_composite

    channels = {
        "discover": {"score": 60, "signals": []},
        "google_search": {"score": 40, "signals": []},
    }
    res = need_weighted_composite(channels, None)
    assert res["composite"] == 50
    assert res["priority_surfaces"] == []
