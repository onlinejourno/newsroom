"""m-calendar fusion (ADR 0057 §2): turn calendar events into Newslist leads.

`decide` is pure — given an event's resolved date, confidence, accountability
outcome, and "today", it classifies the event as a commission-ahead lead, an
accountability lead, or skip. The DB query + insert live in `db.py`; the
orchestration is `run_calendar_fusion`. Mirrors `claim_extract.py`.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from onlinejourno_agents import db

FUSE_BAND_DAYS = 7  # auto-commission events due within a week
FUSE_MIN_CONFIDENCE = 0.7  # below this, leave it on the calendar for manual review


@dataclass(slots=True)
class FuseDecision:
    kind: str  # "commission" | "accountability" | "skip"
    reason: str


def decide(
    *,
    target_date: date | None,
    confidence: float | None,
    outcome: str | None,
    has_lead: bool,
    today: date,
    band_days: int = FUSE_BAND_DAYS,
    min_confidence: float = FUSE_MIN_CONFIDENCE,
) -> FuseDecision:
    """Classify one calendar event for the fusion. Pure."""
    if has_lead:
        return FuseDecision("skip", "already linked to a lead")
    if target_date is None:
        return FuseDecision("skip", "no resolvable date")
    if confidence is None or confidence < min_confidence:
        return FuseDecision("skip", f"confidence below {min_confidence}")
    days_out = (target_date - today).days
    if days_out < 0:
        if outcome is not None:
            return FuseDecision("skip", "past due but already closed")
        return FuseDecision("accountability", "promise past due, outcome open")
    if days_out <= band_days:
        return FuseDecision("commission", f"due within {band_days} days")
    return FuseDecision("skip", "beyond the commission-ahead band")


@dataclass(slots=True)
class FuseResult:
    scanned: int
    commissioned: int
    accountability: int
    skipped: int
    status: str


def _ist_today() -> date:
    """Newsroom 'today' in IST — matches the /calendar view's day boundary."""
    return datetime.now(ZoneInfo("Asia/Kolkata")).date()


def run_calendar_fusion(*, tenant_slug: str, today: date | None = None) -> FuseResult:
    """Create Suggested (`idea`/`requested`) leads from due + past-due calendar
    events. Idempotent: events already linked to a lead are filtered out."""
    today = today or _ist_today()
    commissioned = accountability = skipped = 0
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        cutoff = today + timedelta(days=FUSE_BAND_DAYS)
        rows = db.events_for_fusion(
            conn, tenant_id, min_confidence=FUSE_MIN_CONFIDENCE, cutoff=cutoff
        )
        for ev in rows:
            d = decide(
                target_date=ev["target_date"],
                confidence=ev["confidence"],
                outcome=ev["outcome"],
                has_lead=False,  # the query already filters lead_id is null
                today=today,
            )
            if d.kind == "skip":
                skipped += 1
                continue
            db.create_lead_from_event(conn, tenant_id=tenant_id, event=ev, kind=d.kind)
            if d.kind == "commission":
                commissioned += 1
            else:
                accountability += 1
        conn.commit()
    return FuseResult(len(rows), commissioned, accountability, skipped, "success")
