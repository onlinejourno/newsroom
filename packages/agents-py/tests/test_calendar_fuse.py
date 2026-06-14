"""Pure fusion decision (ADR 0057 §2): which calendar events become leads."""
from __future__ import annotations

from datetime import date

from onlinejourno_agents.calendar_fuse import (
    FUSE_BAND_DAYS,
    FUSE_MIN_CONFIDENCE,
    FuseDecision,
    decide,
)

TODAY = date(2026, 6, 14)


def _d(**kw) -> FuseDecision:
    base = dict(target_date=date(2026, 6, 18), confidence=0.9, outcome=None, has_lead=False, today=TODAY)
    base.update(kw)
    return decide(**base)


def test_due_within_band_is_a_commission():
    assert _d(target_date=date(2026, 6, 18)).kind == "commission"  # 4 days out


def test_due_today_is_a_commission():
    assert _d(target_date=TODAY).kind == "commission"


def test_edge_of_band_is_a_commission_but_one_day_past_is_skipped():
    assert _d(target_date=date(2026, 6, 21)).kind == "commission"  # exactly 7 days
    assert _d(target_date=date(2026, 6, 22)).kind == "skip"        # 8 days — beyond band


def test_past_due_open_is_accountability():
    assert _d(target_date=date(2026, 6, 1), outcome=None).kind == "accountability"


def test_past_due_already_closed_is_skipped():
    assert _d(target_date=date(2026, 6, 1), outcome="delivered").kind == "skip"


def test_confidence_floor_is_inclusive():
    assert _d(confidence=0.70).kind == "commission"
    assert _d(confidence=0.69).kind == "skip"
    assert _d(confidence=None).kind == "skip"


def test_no_date_or_existing_lead_is_skipped():
    assert _d(target_date=None).kind == "skip"
    assert _d(has_lead=True).kind == "skip"


def test_constants():
    assert FUSE_BAND_DAYS == 7
    assert FUSE_MIN_CONFIDENCE == 0.7
