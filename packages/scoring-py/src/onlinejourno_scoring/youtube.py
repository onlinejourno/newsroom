"""
YouTube keyword signals — no API key required.

Uses YouTube's suggest endpoint (same as autocomplete in the search bar)
to find what angles/sub-topics are popular on YouTube for a given keyword.
Editorially useful: if a topic is exploding on YouTube, it often spills
into Google Discover within 24-48 hours.

Public API (all return dict with `available` key; never raise):
  search_queries(keyword) -> {available, queries:[...], angles:[...]}
"""
from __future__ import annotations

import re
import json
import requests

SUGGEST_URL = "https://suggestqueries.google.com/complete/search"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; DiscoverDashbot/1.0)"}


def search_queries(keyword: str, region: str = "IN", max_results: int = 10) -> dict:
    """
    Return YouTube autocomplete suggestions + derived angle tags for `keyword`.

    Returns: {available, queries:[...], angles:[...]}
    """
    try:
        params = {
            "client": "youtube",
            "q": keyword,
            "hl": "en",
            "gl": region,
            "ds": "yt",
        }
        resp = requests.get(SUGGEST_URL, params=params, headers=HEADERS, timeout=8)
        match = re.search(r'\[.*\]', resp.text, re.DOTALL)
        if not match:
            return {"available": True, "queries": [], "angles": []}

        data = json.loads(match.group(0))
        suggestions_raw = data[1] if len(data) > 1 else []

        queries = []
        for item in suggestions_raw[:max_results]:
            if isinstance(item, list) and item:
                text = item[0]
            elif isinstance(item, str):
                text = item
            else:
                continue
            if text.strip().lower() != keyword.strip().lower():
                queries.append(text.strip())

        angles = _derive_angles(keyword, queries)
        return {"available": True, "queries": queries, "angles": angles}

    except Exception as exc:
        return {"available": False, "reason": str(exc), "queries": [], "angles": []}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _derive_angles(keyword: str, suggestions: list) -> list:
    """
    Derive content angle tags from YouTube suggestions.
    E.g. 'live', 'result', 'survey', 'news' → what types of content are trending.
    """
    base = keyword.lower()
    angles: list = []
    seen: set = set()
    for s in suggestions:
        suffix = s.lower().replace(base, "").strip(" -|:")
        if suffix and len(suffix) > 2 and suffix not in seen:
            seen.add(suffix)
            angles.append(suffix)
    return angles[:8]
