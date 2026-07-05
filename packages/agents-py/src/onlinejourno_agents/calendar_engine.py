"""Calendar Engine — pure lead-time classification for the Predictive Editorial
Calendar (ADR 0057). Given a resolved deadline and "today", it places an event
on the forward calendar: which lead-time marker it has crossed (90/60/30/14/7/1
days, the PRD's bands), how urgent it is, and whether it has slipped past its
deadline into the accountability queue.

No I/O, no LLM — deterministic date arithmetic so it is exhaustively testable.
The LLM only extracts the raw claim upstream; scheduling stays code.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

# The PRD lead-time markers, widest first. We alert as an event crosses each.
MARKERS: tuple[int, ...] = (90, 60, 30, 14, 7, 1)

# Urgency escalates as the tightest crossed band narrows. Bands beyond the
# widest marker (band None) and the 90-day band sit on the horizon.
_URGENCY: dict[int, str] = {
    90: "horizon",
    60: "watch",
    30: "watch",
    14: "elevated",
    7: "high",
    1: "critical",
}


@dataclass(slots=True)
class CalendarStatus:
    days_out: int  # target - today; negative once overdue
    status: str  # "upcoming" | "due_today" | "past_due"
    band: int | None  # tightest lead-time marker crossed (days_out <= band), None past the horizon
    next_marker: int | None  # the next marker the event will cross, None if none remain
    days_overdue: int  # max(0, -days_out)
    urgency: str  # "horizon" | "watch" | "elevated" | "high" | "critical" | "due" | "overdue"
    actionable: bool  # within the 0..90-day commission-ahead window


def classify(target_date: date, today: date) -> CalendarStatus:
    """Place a resolved deadline on the forward calendar relative to `today`."""
    days_out = (target_date - today).days

    if days_out < 0:
        # The promised date has passed — an accountability item, not a commission.
        return CalendarStatus(
            days_out=days_out,
            status="past_due",
            band=None,
            next_marker=None,
            days_overdue=-days_out,
            urgency="overdue",
            actionable=False,
        )

    if days_out == 0:
        return CalendarStatus(
            days_out=0,
            status="due_today",
            band=1,
            next_marker=None,
            days_overdue=0,
            urgency="due",
            actionable=True,
        )

    crossed = [m for m in MARKERS if days_out <= m]
    band = min(crossed) if crossed else None
    remaining = [m for m in MARKERS if m < days_out]
    next_marker = max(remaining) if remaining else None
    urgency = _URGENCY.get(band, "horizon") if band is not None else "horizon"

    return CalendarStatus(
        days_out=days_out,
        status="upcoming",
        band=band,
        next_marker=next_marker,
        days_overdue=0,
        urgency=urgency,
        actionable=days_out <= 90,
    )
