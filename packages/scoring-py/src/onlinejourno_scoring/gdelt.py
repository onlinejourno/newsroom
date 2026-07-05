"""
GDELT v2 Doc API — domain-level story volume and topic authority.
Falls back to Google News RSS domain counting if GDELT times out.

Key fix: GDELT's API times out when queries contain phrase quotes ("keyword").
Always use unquoted keyword + optional domain: filter instead.

Public API (all return dict with `available` key; never raise):
  domain_authority(topic, domain=None, days=30) -> {available, score: float}
  top_domains(topic, days=7, max_records=100) -> {available, topic, days, source, domains, reason?}
"""
from __future__ import annotations

import re
import requests
import feedparser
from collections import Counter
from urllib.parse import quote_plus

GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; DiscoverDashbot/1.0)"}
_GDELT_TIMEOUT = 6   # seconds — unquoted queries return in <2 s; bail fast on slow responses


# Known publication name → domain mapping (expand as needed)
_PUB_DOMAIN_MAP = {
    "the hindu":           "thehindu.com",
    "ndtv":                "ndtv.com",
    "the times of india":  "timesofindia.com",
    "times of india":      "timesofindia.com",
    "hindustan times":     "hindustantimes.com",
    "the indian express":  "indianexpress.com",
    "indian express":      "indianexpress.com",
    "the wire":            "thewire.in",
    "scroll":              "scroll.in",
    "the print":           "theprint.in",
    "deccan herald":       "deccanherald.com",
    "deccan chronicle":    "deccanchronicle.com",
    "the week":            "theweek.in",
    "outlook":             "outlookindia.com",
    "frontline":           "frontline.in",
    "business standard":   "business-standard.com",
    "livemint":            "livemint.com",
    "mint":                "livemint.com",
    "financial express":   "financialexpress.com",
    "economic times":      "economictimes.com",
    "moneycontrol":        "moneycontrol.com",
    "the quint":           "thequint.com",
    "bbc":                 "bbc.com",
    "reuters":             "reuters.com",
    "associated press":    "apnews.com",
    "ap":                  "apnews.com",
    "bloomberg":           "bloomberg.com",
    "al jazeera":          "aljazeera.com",
    "wion":                "wionews.com",
    "ani":                 "aninews.in",
    "pti":                 "ptinews.com",
    "zee news":            "zeenews.india.com",
    "india today":         "indiatoday.in",
    "news18":              "news18.com",
    "firstpost":           "firstpost.com",
    "the tribune":         "tribuneindia.com",
}


def _pub_to_domain_slug(pub_name: str) -> str:
    """Convert publication name to a domain slug for matching."""
    lower = pub_name.lower().strip()
    if lower in _PUB_DOMAIN_MAP:
        return _PUB_DOMAIN_MAP[lower]
    # Fallback: slugify
    slug = re.sub(r'[^a-z0-9]', '', lower.replace(" ", ""))
    return f"{slug}.com"


def top_domains(topic: str, days: int = 7, max_records: int = 100) -> dict:
    """
    Return domains ranked by story count for a topic.
    Primary: GDELT Doc API (unquoted query — quoted queries time out).
    Fallback: Google News RSS search (always available).

    Returns: {available, topic, days, source, domains: [{domain, count}], reason?}
    Never raises.
    """
    try:
        gdelt_result = _gdelt_top_domains(topic, max_records, days)
        if gdelt_result:
            return {
                "available": True,
                "topic":   topic,
                "days":    days,
                "source":  "GDELT",
                "domains": gdelt_result,
            }
        # GDELT returned empty — try Google News RSS fallback
        gnews_result = _gnews_top_domains(topic)
        if gnews_result:
            return {
                "available": True,
                "topic":   topic,
                "days":    days,
                "source":  "GoogleNews",
                "domains": gnews_result,
            }
        # Both empty (no coverage or both unreachable)
        return {
            "available": False,
            "topic":     topic,
            "days":      days,
            "domains":   [],
            "reason":    "no results from GDELT or Google News",
        }
    except Exception as exc:
        return {
            "available": False,
            "topic":     topic,
            "days":      days,
            "domains":   [],
            "reason":    str(exc),
        }


def _gdelt_top_domains(keyword: str, max_records: int, days: int) -> list:
    """Query GDELT DOC API, aggregate articles by domain → sorted list."""
    safe_kw = re.sub(r'["\']', '', keyword).strip()
    params = {
        "query":      f"{safe_kw} sourcelang:english",
        "mode":       "artlist",
        "maxrecords": max_records,
        "format":     "json",
        "timespan":   f"{days}d",
    }
    try:
        resp = requests.get(GDELT_DOC_API, params=params, headers=HEADERS, timeout=_GDELT_TIMEOUT)
        resp.raise_for_status()
        articles = resp.json().get("articles", [])
        if not articles:
            return []
        counts = Counter(a.get("domain", "") for a in articles if a.get("domain"))
        return [{"domain": d, "count": c} for d, c in counts.most_common()]
    except Exception as e:
        print(f"[gdelt] GDELT fetch failed ({type(e).__name__}): {e}")
        return []


def _gnews_top_domains(keyword: str) -> list:
    """
    Google News RSS fallback — count publications across top 50 results.
    Returns same schema as GDELT result (domain, count).
    Domain is the slugified publication name so it can be matched against outlet domain.
    """
    url = f"https://news.google.com/rss/search?q={quote_plus(keyword)}&hl=en-IN&gl=IN&ceid=IN:en"
    try:
        feed = feedparser.parse(url)
        if not feed.entries:
            return []

        counts: Counter = Counter()
        for entry in feed.entries[:50]:
            src_obj = getattr(entry, "source", None)
            src_title = ""
            if isinstance(src_obj, dict):
                src_title = src_obj.get("title", "")
            elif hasattr(src_obj, "title"):
                src_title = src_obj.title
            if not src_title or "google" in src_title.lower():
                continue
            slug = _pub_to_domain_slug(src_title)
            counts[slug] += 1

        if not counts:
            return []
        return [{"domain": slug, "count": c} for slug, c in counts.most_common()]
    except Exception as e:
        print(f"[gdelt] Google News RSS fallback failed: {e}")
        return []


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
