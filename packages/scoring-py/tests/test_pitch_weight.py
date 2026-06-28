"""Pure pitch-weight decision (spec 2026-06-28 §C2)."""
from __future__ import annotations

from onlinejourno_scoring.pitch_weight import (
    MOD_CAP,
    archival_weight,
    decide,
)


def test_archival_needs_both_authority_and_staleness():
    # Deep archive but covered today -> no revive signal.
    assert archival_weight(appearance_count=20, days_since_last=0) == 0
    # Deep archive AND long quiet -> strong revive signal.
    assert archival_weight(appearance_count=20, days_since_last=60) > 50
    # Never covered (no authority) -> zero regardless of staleness.
    assert archival_weight(appearance_count=0, days_since_last=None) == 0


def test_merit_is_the_spine():
    hi = decide(merit=90, reach=40, archival=0, conviction="normal").weight
    lo = decide(merit=20, reach=40, archival=0, conviction="normal").weight
    assert hi > lo  # merit drives ordering


def test_modifiers_are_bounded():
    base = decide(merit=50, reach=50, archival=0, conviction="normal").weight
    boosted = decide(merit=50, reach=50, archival=100, conviction="high").weight
    assert 0 < boosted - base <= MOD_CAP  # cannot exceed the cap


def test_merit_none_falls_back_to_reach():
    assert decide(merit=None, reach=70, archival=0, conviction="normal").weight == 70


def test_why_is_human_readable():
    why = decide(merit=80, reach=50, archival=70, conviction="high").why
    assert "HIGH" in why or "MEDIUM" in why
    assert "own" in why.lower()
