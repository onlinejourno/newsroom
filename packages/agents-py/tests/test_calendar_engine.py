"""Calendar Engine — pure lead-time classification (ADR 0057).

Given a resolved deadline and "today", place an event on the forward calendar:
which lead-time marker (90/60/30/14/7/1) it has crossed, how urgent it is, and
whether it has slipped into the past-due accountability queue. No I/O, no LLM.
"""

from __future__ import annotations

from datetime import date

from onlinejourno_agents.calendar_engine import MARKERS, classify


def test_markers_are_the_prd_lead_times_descending():
    assert MARKERS == (90, 60, 30, 14, 7, 1)


def test_far_horizon_beyond_90_days_has_no_band_but_is_not_actionable():
    s = classify(date(2026, 12, 31), today=date(2026, 1, 1))  # 364 days out
    assert s.status == "upcoming"
    assert s.days_out == 364
    assert s.band is None          # past the widest marker — still just over the horizon
    assert s.next_marker == 90     # the first marker it will cross
    assert s.actionable is False   # outside the 90-day commission-ahead window
    assert s.urgency == "horizon"


def test_crossing_a_marker_sets_the_tightest_crossed_band():
    s = classify(date(2026, 3, 1), today=date(2026, 1, 15))  # 45 days out
    assert s.days_out == 45
    assert s.band == 60            # crossed 90 and 60; not yet 30
    assert s.next_marker == 30
    assert s.actionable is True
    assert s.urgency == "watch"


def test_inside_a_week_is_high_urgency():
    s = classify(date(2026, 1, 20), today=date(2026, 1, 15))  # 5 days out
    assert s.band == 7
    assert s.next_marker == 1
    assert s.urgency == "high"


def test_exactly_at_the_widest_marker_is_band_90():
    s = classify(date(2026, 4, 1), today=date(2026, 1, 1))  # 90 days out
    assert s.days_out == 90
    assert s.band == 90
    assert s.urgency == "horizon"


def test_due_today_is_its_own_status():
    s = classify(date(2026, 1, 15), today=date(2026, 1, 15))
    assert s.days_out == 0
    assert s.status == "due_today"
    assert s.band == 1
    assert s.next_marker is None   # nothing tighter than the day itself
    assert s.urgency == "due"
    assert s.actionable is True


def test_one_day_out_is_critical():
    s = classify(date(2026, 1, 16), today=date(2026, 1, 15))  # 1 day out
    assert s.band == 1
    assert s.urgency == "critical"


def test_past_due_falls_into_the_accountability_queue():
    s = classify(date(2026, 1, 1), today=date(2026, 1, 15))  # 14 days overdue
    assert s.status == "past_due"
    assert s.days_out == -14
    assert s.days_overdue == 14
    assert s.band is None
    assert s.next_marker is None
    assert s.urgency == "overdue"
    assert s.actionable is False   # the promise is broken; it's an accountability item, not a commission
