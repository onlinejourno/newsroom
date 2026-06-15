"""feed_view tests — pure rendering, no I/O."""

from __future__ import annotations

from onlinejourno_agents.feed_view import format_feed_signal, urgency_cue


def test_urgency_cue_maps_each_trajectory():
    assert urgency_cue("still building — peak not yet reached · SEBI") == "act now — still rising"
    assert urgency_cue("near peak — may plateau · RBI") == "move fast — near peak"
    assert urgency_cue("at peak — watch for plateau · NSE") == "now or never — at peak"
    assert urgency_cue("cooling — interest declining · X") == "likely late — cooling"
    assert urgency_cue("fading fast — post-peak · Y") == "likely late — cooling"
    assert urgency_cue("momentum holding steady · Z") == ""
    assert urgency_cue("no signal yet · Q") == ""
    assert urgency_cue(None) == ""


def test_format_trending_signal_shows_score_cue_why():
    sig = {
        "beat": "Markets", "region": "Mumbai",
        "headline": "SEBI tightens IPO disclosure norms",
        "trend_score": 82.0,
        "trend_reason": "still building — peak not yet reached · SEBI",
    }
    line = format_feed_signal(sig)
    assert "[Markets/Mumbai]" in line
    assert "🔥82" in line
    assert "act now — still rising" in line
    assert "why: still building — peak not yet reached · SEBI" in line


def test_format_non_trending_signal_is_plain():
    sig = {
        "beat": "Markets", "region": "Mumbai",
        "headline": "Some routed headline",
        "entities": ["Alpha", "Beta", "Gamma", "Delta"],
    }
    line = format_feed_signal(sig)
    assert "🔥" not in line
    assert "why:" not in line
    assert "Alpha, Beta, Gamma" in line  # first 3 entities only
    assert "Delta" not in line
