"""DataForSEO client (vendored for the connector seam, ADR 0044).

HTTP logic for DataForSEO SERP + Labs endpoints, wrapped by the keywords/serp
adapters in connectors.py. Auth is INJECTED (a Basic (login, password) tuple) —
the adapter reads it from the configured env names; this module never reads env.
Every public function returns a dict with an `available` key and never raises on
a failed call (a fetch failure is distinct from a successful empty result).

Endpoint + field paths are from DataForSEO docs; confirm against the first live
response (tolerant .get() chains degrade to None rather than raise). Vendored from
masthead-audit/ingestor/dataforseo_client.py per the zero-dep rule.
"""
from __future__ import annotations

import time
from typing import Any
from urllib.parse import urlparse

import requests

SERP_LIVE_ADVANCED = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced"
LABS_BULK_TRAFFIC = "https://api.dataforseo.com/v3/dataforseo_labs/google/bulk_traffic_estimation/live"
LABS_RANKED_KEYWORDS = "https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live"
ADS_SEARCH_VOLUME = "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live"

_MIN_INTERVAL = 0.5
_MAX_RETRIES = 3
_OK = 20000
DEFAULT_LOCATION_CODE = 2356  # India; verify against DataForSEO locations
DEFAULT_LANGUAGE_CODE = "en"

_last_call = 0.0

Auth = tuple[str, str]


def post(
    session: requests.Session, url: str, payload: Any, auth: Auth | None, *, timeout: int = 30
) -> dict | None:
    """POST with injected Basic auth, global spacing and 429 retry. None on failure."""
    if auth is None:
        return None
    global _last_call
    for attempt in range(_MAX_RETRIES):
        wait = _MIN_INTERVAL - (time.monotonic() - _last_call)
        if wait > 0:
            time.sleep(wait)
        try:
            resp = session.post(url, json=payload, auth=auth, timeout=timeout)
            _last_call = time.monotonic()
            if resp.status_code == 429:
                time.sleep(_MIN_INTERVAL * (attempt + 1))
                continue
            resp.raise_for_status()
            return resp.json()
        except Exception:
            _last_call = time.monotonic()
            time.sleep(_MIN_INTERVAL)
    return None


def _first_result(data: dict | None) -> dict | None:
    if not data or data.get("status_code") != _OK:
        return None
    tasks = data.get("tasks") or []
    if not tasks or tasks[0].get("status_code") != _OK:
        return None
    results = tasks[0].get("result") or []
    return results[0] if results else None


def norm_domain(value: str) -> str:
    if not value:
        return ""
    host = urlparse(value).netloc if "://" in value else value.split("/", 1)[0]
    return host.lower().removeprefix("www.")


def search_volume(
    session: requests.Session, keywords: list[str], auth: Auth | None,
    *, location_code: int = DEFAULT_LOCATION_CODE, language_code: str = DEFAULT_LANGUAGE_CODE,
    timeout: int = 60,
) -> dict:
    """Google Ads search volume + CPC. Returns {available, items:[{keyword, search_volume, cpc, competition}]}."""
    if auth is None:
        return {"available": False, "reason": "no auth"}
    payload = [{"keywords": list(keywords), "location_code": location_code, "language_code": language_code}]
    data = post(session, ADS_SEARCH_VOLUME, payload, auth, timeout=timeout)
    if not data or data.get("status_code") != _OK:
        return {"available": False, "reason": "no result"}
    tasks = data.get("tasks") or []
    if not tasks or tasks[0].get("status_code") != _OK:
        return {"available": False, "reason": "no result"}
    items = [{"keyword": r.get("keyword"), "search_volume": r.get("search_volume"),
              "cpc": r.get("cpc"), "competition": r.get("competition")}
             for r in (tasks[0].get("result") or [])]
    return {"available": True, "items": items}


def bulk_traffic_estimation(
    session: requests.Session, targets: list[str], auth: Auth | None,
    *, location_code: int = DEFAULT_LOCATION_CODE, language_code: str = DEFAULT_LANGUAGE_CODE,
    timeout: int = 60,
) -> dict:
    """Estimated organic traffic for up to 1000 domains. Returns {available, targets:[{target, organic_etv, keyword_count}]}."""
    if auth is None:
        return {"available": False, "reason": "no auth"}
    payload = [{"targets": list(targets), "location_code": location_code, "language_code": language_code}]
    result = _first_result(post(session, LABS_BULK_TRAFFIC, payload, auth, timeout=timeout))
    if result is None:
        return {"available": False, "reason": "no result"}
    rows = []
    for it in (result.get("items") or []):
        organic = ((it.get("metrics") or {}).get("organic") or {})
        rows.append({"target": it.get("target"), "organic_etv": organic.get("etv"),
                     "keyword_count": organic.get("count")})
    return {"available": True, "targets": rows}


def ranked_keywords(
    session: requests.Session, target: str, auth: Auth | None,
    *, location_code: int = DEFAULT_LOCATION_CODE, language_code: str = DEFAULT_LANGUAGE_CODE,
    limit: int = 200, timeout: int = 60,
) -> dict:
    """Per-URL ranked keywords. Returns {available, target, keywords:[{keyword, search_volume, cpc, url, rank, etv}], total_etv}."""
    if auth is None:
        return {"available": False, "reason": "no auth"}
    payload = [{"target": target, "location_code": location_code,
                "language_code": language_code, "limit": limit}]
    result = _first_result(post(session, LABS_RANKED_KEYWORDS, payload, auth, timeout=timeout))
    if result is None:
        return {"available": False, "reason": "no result"}
    kws = []
    for it in (result.get("items") or []):
        kd = it.get("keyword_data") or {}
        ki = kd.get("keyword_info") or {}
        serp = (it.get("ranked_serp_element") or {}).get("serp_item") or {}
        kws.append({"keyword": kd.get("keyword"), "search_volume": ki.get("search_volume"),
                    "cpc": ki.get("cpc"), "url": serp.get("url"),
                    "rank": serp.get("rank_group"), "etv": serp.get("etv")})
    total_etv = round(sum(k["etv"] for k in kws if k.get("etv")), 2)
    return {"available": True, "target": target, "keywords": kws, "total_etv": total_etv}


def serp_ai_overview(
    session: requests.Session, keyword: str, auth: Auth | None,
    *, location_code: int = DEFAULT_LOCATION_CODE, language_code: str = DEFAULT_LANGUAGE_CODE,
    timeout: int = 30,
) -> dict:
    """AI-Overview presence + cited URLs for a query. Returns {available, aio_present, aio_cited_urls}."""
    if auth is None:
        return {"available": False, "reason": "no auth"}
    payload = [{"keyword": keyword, "location_code": location_code,
                "language_code": language_code, "load_async_ai_overview": False}]
    result = _first_result(post(session, SERP_LIVE_ADVANCED, payload, auth, timeout=timeout))
    if result is None:
        return {"available": False, "reason": "no result"}
    items = result.get("items") or []
    aio = next((it for it in items if it.get("type") == "ai_overview"), None)
    cited: list[str] = []
    if aio:
        for ref in (aio.get("references") or []):
            u = ref.get("url") or ref.get("link")
            if u:
                cited.append(u)
        for sub in (aio.get("items") or []):
            u = sub.get("url") or sub.get("link")
            if u:
                cited.append(u)
    # organic ranks too — the superset so masthead's outlet_signals can vendor this core.
    organic = [
        {"rank": it.get("rank_group"), "url": it.get("url"), "domain": it.get("domain")}
        for it in items if it.get("type") == "organic"
    ]
    return {"available": True, "aio_present": aio is not None,
            "aio_cited_urls": cited, "organic": organic}
