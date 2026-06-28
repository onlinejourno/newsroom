"""Reach / prominence — the canonical REACH capability (News Ranking core).

ONE contract for "how far has this travelled?", consumed by BOTH Frontmatter
(a newsroom's OWN stories) and Pulse (the ECOSYSTEM's gems) and composable by the
JATO orchestrator. It exists so reach is never forked a third time: today Pulse
computes reach as GNews token-overlap and Frontmatter as readiness+placement —
different math for the same idea. Both should consume `reach(subject) -> ReachScore`.

Three layers (only the top is the "agent"):
  1. signal sources  = the connector seam (serp/trends/social/analytics/search_console)
  2. reach engine    = ``compute_reach`` below — deterministic, basis-aware, no LLM
  3. capability agent = ``ReachProvider`` — gathers signals from connectors, runs the engine

Honesty is load-bearing (handover 2026-06-28): every signal is labelled by BASIS —
observed / predicted / proxy / unavailable — and the composite is confidence-weighted
so a reach built only from sampled AI surfaces or open proxies is never reported as if
observed. No fabricated exact counts.

This module is the Python reference. The canonical shape is language-neutral
(see ``ReachScore.to_dict``); Frontmatter (TS) mirrors it and both sides are pinned
by shared golden fixtures so they cannot silently diverge.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol, runtime_checkable

# How much to trust a signal by how it was obtained. Drives the confidence weighting.
Basis = Literal["observed", "predicted", "proxy", "unavailable"]
_BASIS_WEIGHT: dict[Basis, float] = {
    "observed": 1.0,    # real rank/count from the surface or its API
    "predicted": 0.6,   # sampled + perishable (AI Overviews, SERP position) — re-sample
    "proxy": 0.4,       # open correlate (GDELT pickup, Trends, Bluesky, Wikipedia)
    "unavailable": 0.0, # dark (WhatsApp/closed) — recorded, never scored
}

# Where a signal comes from. Maps onto connector categories (ADR 0044).
Surface = Literal[
    "search", "news", "discover", "ai_overview", "ai_assistant",  # serp/search_console
    "trends", "social", "video", "wiki", "referral",              # trends/social/analytics
]


@dataclass
class SurfaceSignal:
    """One reach reading from one surface, with how it was obtained."""

    surface: Surface
    value: float                 # 0..100 normalised reach on this surface
    basis: Basis
    weight: float = 1.0          # editorial importance of this surface (tenant-tunable)
    note: str = ""               # human label, e.g. "AIO citation present (sampled 2026-06-28)"
    raw: dict[str, Any] = field(default_factory=dict)  # provenance; never the headline number

    def to_dict(self) -> dict[str, Any]:
        return {
            "surface": self.surface, "value": round(self.value, 1), "basis": self.basis,
            "weight": self.weight, "note": self.note, "raw": self.raw,
        }


@dataclass
class ReachSubject:
    """What we're measuring reach FOR — a story (Frontmatter/Pulse) or an outlet (The Audit)."""

    kind: Literal["story", "outlet"]
    url: str = ""
    title: str = ""
    entity: str = ""             # person/org/topic to query surfaces with
    domain: str = ""             # for outlet-level reach
    geo: str | None = None       # e.g. "IN" — surfaces are locale-specific


@dataclass
class ReachScore:
    """Canonical reach result. ``reach`` 0..100; ``confidence`` 0..1 (coverage × basis)."""

    reach: float
    confidence: float
    basis_summary: Basis              # weakest basis that materially shaped the score
    surfaces: list[SurfaceSignal] = field(default_factory=list)
    note: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "reach": round(self.reach, 1),
            "confidence": round(self.confidence, 2),
            "basis_summary": self.basis_summary,
            "surfaces": [s.to_dict() for s in self.surfaces],
            "note": self.note,
        }


def compute_reach(subject: ReachSubject, signals: list[SurfaceSignal]) -> ReachScore:
    """Deterministic, basis-aware composite reach. Pure — the heart both products share.

    reach = Σ(value · weight · basis_weight) / Σ(weight · basis_weight) over scorable
    signals. ``unavailable`` signals are recorded but never scored. confidence = how much
    of the intended surface weight was actually observed (observed counts full, predicted/
    proxy partial) — so a score built only from proxies reports LOW confidence, honestly.
    """
    scorable = [s for s in signals if _BASIS_WEIGHT[s.basis] > 0 and s.weight > 0]
    if not scorable:
        return ReachScore(reach=0.0, confidence=0.0, basis_summary="unavailable",
                          surfaces=signals, note="no scorable reach signals")
    num = sum(s.value * s.weight * _BASIS_WEIGHT[s.basis] for s in scorable)
    den = sum(s.weight * _BASIS_WEIGHT[s.basis] for s in scorable)
    reach = num / den
    # confidence = realised basis-weight over total intended weight (incl. unscored surfaces)
    total_w = sum(s.weight for s in signals if s.weight > 0) or 1.0
    confidence = sum(s.weight * _BASIS_WEIGHT[s.basis] for s in scorable) / total_w
    # weakest basis that carried real weight — the honesty flag
    order: list[Basis] = ["observed", "predicted", "proxy"]
    present = [b for b in order if any(s.basis == b for s in scorable)]
    basis_summary: Basis = present[-1] if present else "unavailable"
    return ReachScore(reach=reach, confidence=round(confidence, 4),
                      basis_summary=basis_summary, surfaces=signals)


def _clamp100(x: float) -> float:
    return max(0.0, min(100.0, float(x)))


def _first_num(d: dict[str, Any], *keys: str) -> float | None:
    """First numeric value among ``keys`` in ``d`` — defensive connector-shape reader."""
    for k in keys:
        v = d.get(k)
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            return float(v)
    return None


@runtime_checkable
class ReachProvider(Protocol):
    """The JATO ``reach`` capability. Implementations gather signals from the connector
    seam (serp/trends/social/…) and return the canonical ``ReachScore``. Frontmatter,
    Pulse and the orchestrator depend on THIS, never on a bespoke reach calculation."""

    def reach(self, subject: ReachSubject) -> ReachScore: ...


class ConnectorReachAgent:
    """Reference ``ReachProvider`` over the connector seam (skeleton).

    Pass the per-tenant connector clients (the same objects ``make_connector`` builds:
    serp / trends / social / search_console / analytics). Each available connector
    contributes a ``SurfaceSignal`` with its honest basis; missing connectors simply
    don't contribute (lower confidence, never a fabricated number). Start with the
    open-proxy + sampleable connectors; paid/closed surfaces are added as adapters land.
    """

    def __init__(self, connectors: dict[str, Any], *, weights: dict[Surface, float] | None = None):
        self._c = connectors or {}
        self._w = weights or {}

    def reach(self, subject: ReachSubject) -> ReachScore:
        """Gather a SurfaceSignal per available connector, then compose.

        Each adapter is defensive: a missing connector contributes nothing, and a
        connector that errors or returns an unexpected shape is SKIPPED (lower
        confidence) rather than guessed — honesty over a fabricated number. The
        CONTRACT (the shapes + ``compute_reach``) is what Frontmatter/Pulse code against;
        these adapters fill in as connector return-shapes firm up.
        """
        q = subject.entity or subject.title
        sigs: list[SurfaceSignal] = []

        # serp → AI Overview: are the answer engines CITING this, or replacing it?
        # Sampled + perishable → basis "predicted".
        serp = self._c.get("serp")
        if serp is not None and q:
            try:
                res = serp.ai_overview(q, geo=subject.geo) or {}
                if res.get("available"):
                    cited = res.get("cited_urls") or res.get("cited") or []
                    needle = (subject.url or subject.domain or "").lower()
                    is_cited = bool(needle) and any(needle in str(u).lower() for u in cited)
                    value = 100.0 if is_cited else (25.0 if res.get("present") else 0.0)
                    note = "AIO cites this" if is_cited else ("AIO present, not cited" if res.get("present") else "no AIO")
                    sigs.append(SurfaceSignal("ai_overview", value, "predicted", weight=self._w.get("ai_overview", 1.0), note=note, raw=res))
            except Exception:
                pass  # skip; never sink the score

        # trends → topic momentum: open proxy for interest/velocity → basis "proxy".
        trends = self._c.get("trends")
        if trends is not None and q:
            try:
                res = trends.momentum([q], geo=subject.geo) or {}
                v = _first_num(res, "momentum", "score", "value", "interest")
                if v is not None:
                    sigs.append(SurfaceSignal("trends", _clamp100(v), "proxy", weight=self._w.get("trends", 1.0), note="topic momentum (proxy)", raw=res))
            except Exception:
                pass

        # social → reach: shape varies by provider; trust the adapter's own basis if given.
        social = self._c.get("social")
        if social is not None and subject.url:
            try:
                res = social.reach(subject.url) or {}
                v = _first_num(res, "reach", "score", "value")
                if v is not None:
                    basis: Basis = res.get("basis") if res.get("basis") in _BASIS_WEIGHT else "proxy"
                    sigs.append(SurfaceSignal("social", _clamp100(v), basis, weight=self._w.get("social", 1.0), note="social reach", raw=res))
            except Exception:
                pass

        return compute_reach(subject, sigs)
