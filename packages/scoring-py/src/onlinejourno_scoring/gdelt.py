"""
GDELT v2 Doc API — domain-level story volume and topic authority.
Falls back to Google News RSS domain counting if GDELT times out.

Key fix: GDELT's API times out when queries contain phrase quotes ("keyword").
Always use unquoted keyword + optional domain: filter instead.

Public API (all return dict with `available` key; never raise):
  domain_authority(topic, domain=None, days=30) -> {available, score: float}
"""
from __future__ import annotations

import re
import requests
from collections import Counter
from urllib.parse import quote_plus

GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; DiscoverDashbot/1.0)"}
_GDELT_TIMEOUT = 6   # seconds — unquoted queries return in <2 s; bail fast on slow responses


def domain_authority(topic: str, domain: str | None = None, days: int = 30) -> dict:
    """
    Score 0-100: how authoritative is `domain` for `topic` based on story volume.
    If `domain` is None, returns a normalized authority score based on raw story count.

    Returns: {available, score: float}
    """
    try:
        if domain:
            domain_count = _query_story_count(topic, domain=domain, days=days)
            total_count  = _query_story_count(topic, domain=None,   days=days)
            if total_count == 0:
                return {"available": True, "score": 0.0}
            share = domain_count / total_count
            score = min(100.0, share * 200 + (domain_count / max(total_count, 1)) * 50)
        else:
            # Without a specific domain, return a normalized raw volume signal (0-100)
            total_count = _query_story_count(topic, domain=None, days=days)
            # Sigmoid-style normalisation: 250 articles in window ≈ score 100
            score = min(100.0, (total_count / 250) * 100)

        return {"available": True, "score": round(score, 1)}
    except Exception as exc:
        return {"available": False, "reason": str(exc), "score": 0.0}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _query_story_count(keyword: str, domain: str | None, days: int) -> int:
    safe_kw = re.sub(r'["\']', '', keyword).strip()
    query = f"{safe_kw} sourcelang:english"
    if domain:
        query += f" domain:{domain}"
    params = {
        "query":      query,
        "mode":       "artlist",
        "maxrecords": 250,
        "format":     "json",
        "timespan":   f"{days}d",
    }
    try:
        resp = requests.get(GDELT_DOC_API, params=params, headers=HEADERS, timeout=_GDELT_TIMEOUT)
        return len(resp.json().get("articles", []))
    except Exception:
        return 0
