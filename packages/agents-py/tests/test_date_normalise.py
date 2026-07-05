"""Date Normaliser — turn a fuzzy deadline phrase + the date the claim was made
into a concrete target date (ADR 0057). Pure, edge-case-heavy: officials promise
in natural language ("by June", "within 90 days", "next financial year") and we
must resolve that against the reference date with no LLM and no I/O.
"""

from __future__ import annotations

from datetime import date

from onlinejourno_agents.date_normalise import normalise

REF = date(2026, 1, 15)  # the day the claim was made, for relative phrasings


def test_blank_or_unparseable_is_precision_none():
    assert normalise("", REF).precision == "none"
    assert normalise("soon, hopefully", REF).precision == "none"
    assert normalise("", REF).target is None


def test_explicit_iso_date_is_day_precision():
    n = normalise("by 2026-09-15", REF)
    assert n.target == date(2026, 9, 15)
    assert n.precision == "day"


def test_within_n_days():
    n = normalise("within 90 days", REF)
    assert n.target == date(2026, 4, 15)  # +90
    assert n.precision == "day"


def test_in_n_weeks():
    assert normalise("in 2 weeks", REF).target == date(2026, 1, 29)  # +14


def test_in_n_months_uses_calendar_months():
    n = normalise("within three months", REF)  # number word
    assert n.target == date(2026, 4, 15)
    assert n.precision == "day"


def test_tomorrow_and_next_week():
    assert normalise("tomorrow", REF).target == date(2026, 1, 16)
    assert normalise("by next week", REF).target == date(2026, 1, 22)


def test_month_name_resolves_to_month_end_this_year_if_still_ahead():
    n = normalise("by June", REF)  # June is ahead of Jan
    assert n.target == date(2026, 6, 30)
    assert n.precision == "month"


def test_month_name_already_passed_rolls_to_next_year():
    n = normalise("by March", date(2026, 7, 1))  # March already gone
    assert n.target == date(2027, 3, 31)


def test_month_name_with_explicit_year():
    n = normalise("by June 2027", REF)
    assert n.target == date(2027, 6, 30)
    assert n.precision == "month"


def test_quarter_with_year_resolves_to_quarter_end():
    n = normalise("by Q2 2026", REF)
    assert n.target == date(2026, 6, 30)
    assert n.precision == "quarter"


def test_end_of_year():
    n = normalise("by end of 2026", REF)
    assert n.target == date(2026, 12, 31)
    assert n.precision == "year"


def test_bare_year_is_year_end():
    assert normalise("by 2027", REF).target == date(2027, 12, 31)


def test_end_of_this_month():
    n = normalise("by the end of the month", date(2026, 2, 10))
    assert n.target == date(2026, 2, 28)  # Feb 2026, not a leap year
    assert n.precision == "month"


def test_financial_year_end_is_march_31_india():
    # Jan 2026 sits in FY2025-26, which ends 31 Mar 2026.
    n = normalise("by the end of the financial year", REF)
    assert n.target == date(2026, 3, 31)
    assert n.precision == "fiscal_year"


def test_next_financial_year_adds_a_year():
    # June 2026 sits in FY2026-27 (ends Mar 2027); "next" FY ends Mar 2028.
    n = normalise("by next financial year", date(2026, 6, 10))
    assert n.target == date(2028, 3, 31)
    assert n.precision == "fiscal_year"


def test_next_year_is_year_end():
    n = normalise("next year", REF)
    assert n.target == date(2027, 12, 31)
    assert n.precision == "year"
