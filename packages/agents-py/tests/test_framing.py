"""m-framing-pej coder — pure-logic tests (prompt + coercion + groups)."""

from __future__ import annotations

from onlinejourno_agents.framing import FRAME_GROUPS, coerce_coding
from onlinejourno_agents.prompts import PEJ_FRAMES, build_framing_prompt


def test_every_frame_has_a_group():
    assert set(FRAME_GROUPS) == set(PEJ_FRAMES)
    assert FRAME_GROUPS["Institutional Critique"] == "combative"
    assert FRAME_GROUPS["Straight News"] == "straight"


def test_coerce_coding_valid():
    c = coerce_coding({
        "frame": "Conflict", "topic": "Politics/Elections",
        "confidence": 0.9, "rationale": "two sides quoted against each other",
    })
    assert c["frame"] == "Conflict"
    assert c["frame_group"] == "combative"
    assert c["topic"] == "Politics/Elections"
    assert c["confidence"] == 0.9
    assert c["coder_version"]


def test_coerce_coding_rejects_unknown_frame_and_clamps():
    assert coerce_coding({"frame": "Vibes", "topic": "x"}) is None
    assert coerce_coding("not a dict") is None
    c = coerce_coding({"frame": "Trend", "topic": "nope", "confidence": 7})
    assert c["topic"] is None  # unknown topic dropped, frame kept
    assert c["confidence"] == 1.0  # clamped


def test_build_framing_prompt_shape():
    parts = build_framing_prompt([
        {"headline": "Court raps agency", "body_text": "The bench said…"},
        {"headline": "Rains return", "body_text": None},
    ])
    assert "THE 14 FRAMES" in parts.system
    assert "Institutional Critique" in parts.system
    assert '"results"' in parts.system
    assert "[1] Court raps agency" in parts.user
    assert "[2] Rains return" in parts.user
