"""Render a reporter-feed line that surfaces trend momentum + the why/urgency.

`cmd_trends` writes trend_score (0-100) and trend_reason (e.g.
"still building — peak not yet reached · SEBI") onto signals. This layer turns
that into an act-now prompt so the feed *educates* the reporter (shows why this
is worth chasing now), rather than only routing an item.
"""

from __future__ import annotations

from typing import Any


def urgency_cue(trend_reason: str | None) -> str:
    """Map the trajectory vocabulary in trend_reason to an act-now label.

    Keys off the fixed phrases from trend_score.predict_trajectory. Unknown /
    steady / absent reasons yield no cue.
    """
    if not trend_reason:
        return ""
    r = trend_reason.lower()
    if "building" in r:
        return "act now — still rising"
    if "near peak" in r:
        return "move fast — near peak"
    if "at peak" in r:
        return "now or never — at peak"
    if "cooling" in r or "fading" in r:
        return "likely late — cooling"
    return ""


def format_feed_signal(signal: dict[str, Any]) -> str:
    """One reporter-feed line. Trending signals lead with score + cue + why;
    non-trending signals keep the plain routed format."""
    beat = signal.get("beat") or "-"
    region = signal.get("region") or "-"
    headline = (signal.get("headline") or signal.get("url") or "")[:54]

    score = signal.get("trend_score")
    if score is not None:
        cue = urgency_cue(signal.get("trend_reason"))
        cue_part = f" {cue}" if cue else ""
        reason = signal.get("trend_reason") or ""
        why = f" · why: {reason}" if reason else ""
        return f"  [{beat}/{region}] 🔥{score:.0f}{cue_part} · {headline}{why}"

    ents = ", ".join((signal.get("entities") or [])[:3])
    return f"  [{beat}/{region}] {headline}  · {ents}"
