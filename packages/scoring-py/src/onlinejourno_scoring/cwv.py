"""
Core Web Vitals scoring via Google PageSpeed Insights v5.

grade_cwv()       — pure function: thresholds → A/B/C/D/F grade + remediation
page_experience() — live PSI call for a URL; never raises, degrades gracefully.

Google CWV thresholds used:
  LCP  good ≤ 2500 ms   / poor > 4000 ms
  CLS  good ≤ 0.10      / poor > 0.25
  TBT  good ≤ 200 ms    / poor > 600 ms   (lab proxy for INP)
  FCP  good ≤ 1800 ms   / poor > 3000 ms

Grading: blend performance_score with pass/fail counts across the 4 CWV metrics.
  base   = performance_score
  bonus  = +5  per "good" metric   (max +20)
  penalty= -10 per "poor" metric   (max -40)
  blended_score = clamp(base + bonus - penalty, 0, 100)
  A ≥ 80 / B ≥ 65 / C ≥ 50 / D ≥ 35 / F < 35
"""
from __future__ import annotations

import os

import requests

PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
_TIMEOUT = 90  # seconds; PSI itself takes 15-30 s

# ── CWV thresholds (Google values) ───────────────────────────────────────────

_LCP_GOOD = 2500   # ms
_LCP_POOR = 4000   # ms
_CLS_GOOD = 0.10
_CLS_POOR = 0.25
_TBT_GOOD = 200    # ms
_TBT_POOR = 600    # ms
_FCP_GOOD = 1800   # ms
_FCP_POOR = 3000   # ms


def _lcp_status(ms: float) -> str:
    if ms <= _LCP_GOOD:
        return "good"
    if ms > _LCP_POOR:
        return "poor"
    return "needs-improvement"


def _cls_status(score: float) -> str:
    if score <= _CLS_GOOD:
        return "good"
    if score > _CLS_POOR:
        return "poor"
    return "needs-improvement"


def _tbt_status(ms: float) -> str:
    if ms <= _TBT_GOOD:
        return "good"
    if ms > _TBT_POOR:
        return "poor"
    return "needs-improvement"


def _fcp_status(ms: float) -> str:
    if ms <= _FCP_GOOD:
        return "good"
    if ms > _FCP_POOR:
        return "poor"
    return "needs-improvement"


def _letter_grade(blended: float) -> str:
    if blended >= 80:
        return "A"
    if blended >= 65:
        return "B"
    if blended >= 50:
        return "C"
    if blended >= 35:
        return "D"
    return "F"


# ── Public API ────────────────────────────────────────────────────────────────

def grade_cwv(
    *,
    performance_score: float,
    lcp_ms: float,
    cls_score: float,
    tbt_ms: float,
    fcp_ms: float,
) -> dict:
    """
    Pure function — no I/O.  Applies Google CWV thresholds and returns:

    {
      "available":        True,
      "performance_score": float,
      "grade":            "A"|"B"|"C"|"D"|"F",
      "metrics": {
          "performance_score": float,
          "lcp_ms":   float,
          "cls_score": float,
          "tbt_ms":   float,
          "fcp_ms":   float,
      },
      "recommendations": [str],   # one line per failing metric; empty when all pass
    }
    """
    statuses = {
        "lcp": _lcp_status(lcp_ms),
        "cls": _cls_status(cls_score),
        "tbt": _tbt_status(tbt_ms),
        "fcp": _fcp_status(fcp_ms),
    }

    good_count = sum(1 for s in statuses.values() if s == "good")
    poor_count = sum(1 for s in statuses.values() if s == "poor")

    blended = float(performance_score) + good_count * 5 - poor_count * 10
    blended = max(0.0, min(100.0, blended))

    recommendations: list[str] = []

    if statuses["lcp"] != "good":
        if statuses["lcp"] == "poor":
            recommendations.append(
                f"LCP is {lcp_ms:.0f} ms (poor, >4000 ms) — serve images via CDN, "
                "use preload for hero images, reduce server response time."
            )
        else:
            recommendations.append(
                f"LCP is {lcp_ms:.0f} ms (needs improvement, >2500 ms) — "
                "optimise hero image size and defer non-critical JS."
            )

    if statuses["cls"] != "good":
        if statuses["cls"] == "poor":
            recommendations.append(
                f"CLS is {cls_score:.3f} (poor, >0.25) — reserve explicit width/height "
                "for images and embeds; avoid inserting content above existing DOM."
            )
        else:
            recommendations.append(
                f"CLS is {cls_score:.3f} (needs improvement, >0.10) — "
                "add size attributes to all images and ad slots."
            )

    if statuses["tbt"] != "good":
        if statuses["tbt"] == "poor":
            recommendations.append(
                f"TBT is {tbt_ms:.0f} ms (poor, >600 ms) — split long tasks, "
                "defer third-party scripts, reduce main-thread work."
            )
        else:
            recommendations.append(
                f"TBT is {tbt_ms:.0f} ms (needs improvement, >200 ms) — "
                "review analytics and ad tags for main-thread blocking."
            )

    if statuses["fcp"] != "good":
        if statuses["fcp"] == "poor":
            recommendations.append(
                f"FCP is {fcp_ms:.0f} ms (poor, >3000 ms) — eliminate render-blocking "
                "resources, inline critical CSS, use a fast hosting region."
            )
        else:
            recommendations.append(
                f"FCP is {fcp_ms:.0f} ms (needs improvement, >1800 ms) — "
                "reduce server latency and prioritise above-the-fold CSS delivery."
            )

    return {
        "available": True,
        "performance_score": performance_score,
        "grade": _letter_grade(blended),
        "metrics": {
            "performance_score": performance_score,
            "lcp_ms": lcp_ms,
            "cls_score": cls_score,
            "tbt_ms": tbt_ms,
            "fcp_ms": fcp_ms,
        },
        "recommendations": recommendations,
    }


def page_experience(url: str) -> dict:
    """
    Fetch PageSpeed Insights v5 for *url* (mobile strategy, performance category)
    and return grade_cwv(...) result.

    Never raises — any failure returns {"available": False, "reason": str}.
    Requires env var PAGESPEED_API_KEY; if absent/empty → available=False immediately.
    """
    api_key = os.environ.get("PAGESPEED_API_KEY", "").strip()
    if not api_key:
        return {"available": False, "reason": "no PAGESPEED_API_KEY"}

    params: dict = {
        "url": url,
        "strategy": "mobile",
        "category": "performance",
        "key": api_key,
    }

    try:
        resp = requests.get(PSI_URL, params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        lr = data["lighthouseResult"]
        performance_score = float(
            lr["categories"]["performance"]["score"] * 100
        )
        lcp_ms = float(lr["audits"]["largest-contentful-paint"]["numericValue"])
        cls_score = float(lr["audits"]["cumulative-layout-shift"]["numericValue"])
        tbt_ms = float(lr["audits"]["total-blocking-time"]["numericValue"])
        fcp_ms = float(lr["audits"]["first-contentful-paint"]["numericValue"])

        return grade_cwv(
            performance_score=performance_score,
            lcp_ms=lcp_ms,
            cls_score=cls_score,
            tbt_ms=tbt_ms,
            fcp_ms=fcp_ms,
        )

    except Exception as exc:  # noqa: BLE001
        return {"available": False, "reason": str(exc)}
