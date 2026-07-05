"""Pitch weight (spec 2026-06-28 §C2): merit-spine + bounded modifiers.

base   = potential (merit blends in at _W_MERIT; reach is the pre-composited
         reach scalar produced by pitch_scan via reach_score()).
archival = authority × staleness — high only when we own the entity AND have
           gone quiet on it.
modifiers (conviction + archival) are clamped to ±MOD_CAP so they can nudge,
never invert, the merit ordering.
"""
from __future__ import annotations

from dataclasses import dataclass

from onlinejourno_scoring.potential import _W_MERIT, label

MOD_CAP = 12                 # max total swing from base, in points
_ARCHIVAL_GAIN = 0.12        # archival(0–100) → up to +12
_CONVICTION = {"low": -5, "normal": 0, "high": 8}
_AUTHORITY_PER_HIT = 12      # appearances → authority, capped at 100
_STALE_PER_DAY = 1.8         # days quiet → staleness, capped at 100


def _clamp(x: float, lo: float, hi: float) -> int:
    return int(round(max(lo, min(hi, x))))


def archival_weight(*, appearance_count: int, days_since_last: int | None) -> int:
    """authority × staleness, both 0–100, combined so BOTH must be high (0–100)."""
    if appearance_count <= 0 or days_since_last is None:
        return 0
    authority = min(100.0, appearance_count * _AUTHORITY_PER_HIT)
    staleness = min(100.0, days_since_last * _STALE_PER_DAY)
    return _clamp(authority * staleness / 100.0, 0, 100)


@dataclass(slots=True)
class PitchWeight:
    weight: int
    why: str
    base: int
    archival: int


def decide(*, merit: int | None, reach: int, archival: int, conviction: str) -> PitchWeight:
    base = reach if merit is None else _W_MERIT * merit + (1.0 - _W_MERIT) * reach
    base_i = _clamp(base, 0, 100)

    mod = _CONVICTION.get(conviction, 0) + archival * _ARCHIVAL_GAIN
    mod = max(-MOD_CAP, min(MOD_CAP, mod))
    weight = _clamp(base_i + mod, 0, 100)

    parts = [label(weight)]
    if merit is not None and merit >= reach:
        parts.append("strong merit")
    if archival >= 40:
        parts.append("we own this, gone quiet — revive")
    if conviction == "high":
        parts.append("reporter conviction high")
    why = " · ".join(parts)
    return PitchWeight(weight=weight, why=why, base=base_i, archival=archival)
