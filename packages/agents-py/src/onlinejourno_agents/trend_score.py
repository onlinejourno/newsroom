"""Trend scoring — the momentum + trajectory logic ported verbatim from the
discover-dashboard trend engine (`trends_fetcher._slope_to_score` /
`_predict_trajectory`), fed by OUR enriched signal corpus instead of pytrends.

The insight: cross-source convergence — the same entity surfacing across many
signals in a window — is the trend. We count entity frequency in a recent window
vs a prior window, normalise to a 0-100 heat, and apply the proven bands. An
external Google-Trends signal can augment this later via the `trends` connector
(pytrends), which is fragile + heavy and so kept pluggable, not a core dep.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass


def slope_to_score(slope: float, current: float, peak: float) -> float:
    """Verbatim from discover-dashboard trends_fetcher._slope_to_score."""
    base = min(current, 100)
    slope_boost = min(slope * 5, 30) if slope > 0 else max(slope * 3, -30)
    peak_ratio = current / peak if peak > 0 else 1.0
    peak_penalty = 0 if peak_ratio > 0.8 else (1 - peak_ratio) * 20
    return max(0, min(100, base + slope_boost - peak_penalty))


def predict_trajectory(slope: float, current: float, peak: float) -> str:
    """Ported from discover-dashboard trends_fetcher._predict_trajectory."""
    if current <= 0:
        return "no signal yet"
    peak_ratio = current / peak if peak > 0 else 1.0
    if slope > 2.0 and peak_ratio < 0.75:
        return "still building — peak not yet reached"
    if slope > 0.5 and peak_ratio >= 0.75:
        return "near peak — may plateau"
    if peak_ratio >= 0.95 and abs(slope) <= 0.5:
        return "at peak — watch for plateau"
    if slope < -2.0:
        return "fading fast — post-peak"
    if slope < -0.5:
        return "cooling — interest declining"
    return "momentum holding steady"


@dataclass(slots=True)
class TopicTrend:
    topic: str
    momentum: float
    trajectory: str
    recent: int
    prior: int


def topic_momentum(
    recent_entities: list[list[str]], prior_entities: list[list[str]]
) -> list[TopicTrend]:
    """Per-topic (entity) momentum from convergence across signals.

    Each argument is a list of per-signal entity lists. An entity counts once
    per signal. Counts are normalised to a 0-100 heat (hottest topic = 100) so
    the ported interest-scale bands apply. Sorted by momentum, highest first.
    """
    recent: Counter[str] = Counter()
    for ents in recent_entities:
        recent.update({e for e in ents if e})
    prior: Counter[str] = Counter()
    for ents in prior_entities:
        prior.update({e for e in ents if e})

    max_recent = max(recent.values(), default=1)
    out: list[TopicTrend] = []
    for topic, r in recent.items():
        p = prior.get(topic, 0)
        heat = r / max_recent * 100
        prior_heat = p / max_recent * 100
        slope = heat - prior_heat
        peak = max(heat, prior_heat, 1.0)
        out.append(
            TopicTrend(
                topic=topic,
                momentum=round(slope_to_score(slope, heat, peak), 1),
                trajectory=predict_trajectory(slope, heat, peak),
                recent=r,
                prior=p,
            )
        )
    out.sort(key=lambda t: t.momentum, reverse=True)
    return out
