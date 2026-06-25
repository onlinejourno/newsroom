"""
Discover Potential Score.

Ported from:
  predict/scorer.py  — composite formula, _label, _freshness_score
  config.py          — WEIGHT_* constants

REACH composite — distribution / surface readiness only:
  reach = 0.40 × trend_momentum
        + 0.30 × content_alignment
        + 0.20 × domain_authority
        + 0.10 × freshness

POTENTIAL — reach with the merit term folded in (the positioning lever):
  potential = _W_MERIT × merit + (1 − _W_MERIT) × reach

`merit` is the text-internal quality signal (SQEG page-quality: a named
journalist over wire copy, named sources, primary citations — see
sqeg.page_quality). WITHOUT it, a fresh wire-rewrite of a trending topic on
an authoritative domain scores HIGH potential — the forward-facing number
recommends the commodity play. The merit term denies that. `merit=None`
returns the pure-reach composite (back-compat).

Inputs are pre-computed component scores (0–100). No live trend fetch here.
"""
from __future__ import annotations

# ── Reach-composite weights (from config.py) ──────────────────────────────────
_W_TREND_MOMENTUM    = 0.40
_W_CONTENT_ALIGNMENT = 0.30
_W_DOMAIN_AUTHORITY  = 0.20
_W_FRESHNESS         = 0.10

# ── Merit weight — THE positioning lever ──────────────────────────────────────
# How far the forward-facing recommendation privileges text-internal merit over
# distribution-readiness. 0.0 = pure reach (commodity-friendly); higher = merit
# must be earned, not bought with trend-chasing. This number is an editorial /
# business-positioning decision, not an engineering one. Default 0.35 makes
# merit the single largest term — enough to deny a high-reach / low-merit
# (wire-rewrite) story a HIGH band without ignoring distribution.
_W_MERIT = 0.35


def reach_score(
    *,
    trend_momentum: float,
    content_alignment: float,
    domain_authority: float,
    freshness: float,
) -> float:
    """Return the reach / distribution composite (0–100) — surface readiness only."""
    return (
        _W_TREND_MOMENTUM    * trend_momentum
        + _W_CONTENT_ALIGNMENT * content_alignment
        + _W_DOMAIN_AUTHORITY  * domain_authority
        + _W_FRESHNESS         * freshness
    )


def potential_score(
    *,
    trend_momentum: float,
    content_alignment: float,
    domain_authority: float,
    freshness: float,
    merit: float | None = None,
) -> float:
    """Return composite Discover potential score (0–100).

    `merit` (0–100, text-internal quality) blends in at `_W_MERIT`. When
    `merit is None`, returns the pure reach composite (back-compat).
    """
    reach = reach_score(
        trend_momentum=trend_momentum,
        content_alignment=content_alignment,
        domain_authority=domain_authority,
        freshness=freshness,
    )
    if merit is None:
        return reach
    return _W_MERIT * merit + (1.0 - _W_MERIT) * reach


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
