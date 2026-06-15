"""
Discover Potential Score.

Ported verbatim from:
  predict/scorer.py  — composite formula, _label, _freshness_score
  config.py          — WEIGHT_* constants

Score = 0.40 × trend_momentum
      + 0.30 × content_alignment
      + 0.20 × domain_authority
      + 0.10 × freshness

Inputs are pre-computed component scores (0–100). No live trend fetch here.
"""
from __future__ import annotations

# ── Weights (from config.py) ──────────────────────────────────────────────────
_W_TREND_MOMENTUM    = 0.40
_W_CONTENT_ALIGNMENT = 0.30
_W_DOMAIN_AUTHORITY  = 0.20
_W_FRESHNESS         = 0.10


def potential_score(
    *,
    trend_momentum: float,
    content_alignment: float,
    domain_authority: float,
    freshness: float,
) -> float:
    """Return composite Discover potential score (0–100)."""
    return (
        _W_TREND_MOMENTUM    * trend_momentum
        + _W_CONTENT_ALIGNMENT * content_alignment
        + _W_DOMAIN_AUTHORITY  * domain_authority
        + _W_FRESHNESS         * freshness
    )


def label(score: float) -> str:
    """Return human-readable score band (ported from scorer._label)."""
    if score >= 75:
        return "HIGH"
    elif score >= 55:
        return "MEDIUM"
    elif score >= 35:
        return "LOW"
    else:
        return "VERY LOW"


def freshness_from_hours(hours: float) -> int:
    """
    Convert story age in hours to a freshness score 0–100.

    Bands ported verbatim from scorer._freshness_score:
      <2h  → 100
      <6h  →  90
      <12h →  80
      <24h →  70
      <48h →  40
      <72h →  20
      ≥72h →  10
    """
    if hours < 2:
        return 100
    elif hours < 6:
        return 90
    elif hours < 12:
        return 80
    elif hours < 24:
        return 70
    elif hours < 48:
        return 40
    elif hours < 72:
        return 20
    else:
        return 10
