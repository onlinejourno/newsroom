"""Date Normaliser — resolve a fuzzy deadline phrase against the date a claim was
made, into a concrete target date + a precision label (ADR 0057).

Officials promise in natural language: "by June", "within 90 days", "next
financial year", "by Q2 2026", "by year-end". The LLM Claim Extractor upstream
pulls out that deadline phrase; this module — pure, no I/O, no LLM — turns it
into a date the Calendar Engine can schedule. India fiscal year (Apr 1–Mar 31).

The input is the *extracted deadline phrase*, not raw prose, so plain keyword
matching is enough; ambiguity resolves to the soonest sensible future date.
"""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass
from datetime import date, timedelta

_NUM_WORDS = {
    "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
}

# month name + abbreviation -> month number (full names first so they win on tie)
_MONTHS: dict[str, int] = {m.lower(): i for i, m in enumerate(calendar.month_name) if m}
_MONTHS.update({m.lower(): i for i, m in enumerate(calendar.month_abbr) if m})

_QUARTER_END = {1: (3, 31), 2: (6, 30), 3: (9, 30), 4: (12, 31)}


@dataclass(slots=True)
class NormalisedDate:
    target: date | None  # the resolved deadline (period end for fuzzy spans), None if unparsable
    precision: str  # "day" | "month" | "quarter" | "year" | "fiscal_year" | "none"
    note: str  # how it was interpreted — kept for the audit trail


def _last_day(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def _month_end(year: int, month: int) -> date:
    return date(year, month, _last_day(year, month))


def _add_months(d: date, n: int) -> date:
    total = (d.month - 1) + n
    year = d.year + total // 12
    month = total % 12 + 1
    return date(year, month, min(d.day, _last_day(year, month)))


def _fy_end(ref: date) -> date:
    """End of the Indian financial year (31 Mar) that `ref` falls within."""
    return date(ref.year if ref.month <= 3 else ref.year + 1, 3, 31)


def normalise(phrase: str, reference: date) -> NormalisedDate:
    text = (phrase or "").strip().lower()
    if not text:
        return NormalisedDate(None, "none", "empty")

    # 1. explicit ISO date
    m = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", text)
    if m:
        try:
            return NormalisedDate(date(int(m[1]), int(m[2]), int(m[3])), "day", "iso date")
        except ValueError:
            pass

    # 2. named relatives
    if "tomorrow" in text:
        return NormalisedDate(reference + timedelta(days=1), "day", "tomorrow")
    if "next week" in text:
        return NormalisedDate(reference + timedelta(days=7), "day", "next week")

    # 3. fiscal year (before any generic 'year' handling)
    if "financial year" in text or "fiscal year" in text or re.search(r"\bfy\b", text):
        end = _fy_end(reference)
        if "next" in text:
            end = date(end.year + 1, 3, 31)
        return NormalisedDate(end, "fiscal_year", "india FY end (31 Mar)")

    if "next month" in text:
        nm = _add_months(reference.replace(day=1), 1)
        return NormalisedDate(_month_end(nm.year, nm.month), "month", "next month")
    if "next year" in text:
        return NormalisedDate(date(reference.year + 1, 12, 31), "year", "next year")

    # 4. relative offset: "in/within/after N <unit>"
    m = re.search(
        r"\b(?:in|within|after)\s+(\d+|" + "|".join(_NUM_WORDS) + r")\s+(day|week|month|year)s?",
        text,
    )
    if m:
        n = int(m[1]) if m[1].isdigit() else _NUM_WORDS[m[1]]
        unit = m[2]
        if unit == "day":
            return NormalisedDate(reference + timedelta(days=n), "day", f"+{n} days")
        if unit == "week":
            return NormalisedDate(reference + timedelta(days=7 * n), "day", f"+{n} weeks")
        if unit == "month":
            return NormalisedDate(_add_months(reference, n), "day", f"+{n} months")
        return NormalisedDate(_add_months(reference, 12 * n), "day", f"+{n} years")

    # 5. quarter: "Q2 [2026]"
    m = re.search(r"\bq([1-4])\b(?:\s*(?:of\s*)?(\d{4}))?", text)
    if m:
        q = int(m[1])
        yr = int(m[2]) if m[2] else reference.year
        mm, dd = _QUARTER_END[q]
        target = date(yr, mm, dd)
        if not m[2] and target < reference:  # bare quarter already gone -> next year
            target = date(yr + 1, mm, dd)
        return NormalisedDate(target, "quarter", f"Q{q} end")

    # 6. month name, optional explicit year
    for name, idx in _MONTHS.items():
        if re.search(rf"\b{name}\b", text):
            ym = re.search(rf"\b{name}\b\s*(\d{{4}})", text)
            if ym:
                yr = int(ym[1])
            else:
                yr = reference.year + (1 if idx < reference.month else 0)
            return NormalisedDate(_month_end(yr, idx), "month", f"{name} end")

    # 7. bare year / year-end
    m = re.search(r"\b(\d{4})\b", text)
    if m:
        return NormalisedDate(date(int(m[1]), 12, 31), "year", "year end")
    if "year-end" in text or "end of the year" in text or "end of year" in text:
        return NormalisedDate(date(reference.year, 12, 31), "year", "year end")

    # 8. end of the current month
    if "end of the month" in text or "end of month" in text or "this month" in text:
        return NormalisedDate(_month_end(reference.year, reference.month), "month", "month end")

    return NormalisedDate(None, "none", "unparsed")
