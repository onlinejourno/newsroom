"""
Keywords Everywhere REST API v1 client.

Base URL : https://api.keywordseverywhere.com/v1
Auth     : Authorization: Bearer {KEYWORDS_EVERYWHERE}

Design principles
─────────────────
• Graceful    — every public fn returns a dict with `available` key on
                missing env key / network error / parse error. Never raises.
• Rate-limit  — automatic one-retry with 5 s sleep on HTTP 429
• Credit-safe — ranking_keywords batches up to 100 per request

Public API:
  ranking_keywords(url, country="IN") -> {available, keywords:[...], traffic:{...}}
  related(keyword, country="IN")      -> {available, keywords:[...]}
  pasf(keyword, country="IN")         -> {available, keywords:[...]}
  backlinks(url)                      -> {available, backlinks:[...]}
"""
from __future__ import annotations

import os
import time
import threading
import requests
from datetime import datetime, timedelta, timezone
from typing import Any

BASE_URL = "https://api.keywordseverywhere.com/v1"
TIMEOUT  = 20

# ── In-process TTL cache ──────────────────────────────────────────────────────
_cache: dict[str, tuple[Any, datetime]] = {}
_lock  = threading.Lock()


def _get_cached(key: str, ttl_h: float) -> Any:
    with _lock:
        if key in _cache:
            val, ts = _cache[key]
            if datetime.now(timezone.utc) - ts < timedelta(hours=ttl_h):
                return val
    return None


def _set_cached(key: str, val: Any) -> None:
    with _lock:
        _cache[key] = (val, datetime.now(timezone.utc))


# ── Auth ──────────────────────────────────────────────────────────────────────

def _api_key() -> str:
    return os.environ.get("KEYWORDS_EVERYWHERE", "")


def _auth_headers() -> dict:
    return {
        "Authorization": f"Bearer {_api_key()}",
        "Accept":        "application/json",
    }


def _key_available() -> bool:
    return bool(_api_key())


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def _retry_on_429(fn, *args, **kwargs):
    resp = fn(*args, **kwargs)
    if getattr(resp, "status_code", None) == 429:
        time.sleep(5)
        resp = fn(*args, **kwargs)
    return resp


def _normalise_list(raw) -> list:
    if isinstance(raw, list):
        return [item if isinstance(item, dict) else {"keyword": str(item)} for item in raw]
    if isinstance(raw, dict):
        inner = raw.get("data") or []
        return _normalise_list(inner)
    if isinstance(raw, str) and raw:
        return [{"keyword": raw}]
    return []


def _post_json(endpoint: str, payload: dict) -> dict:
    try:
        resp = _retry_on_429(
            requests.post,
            f"{BASE_URL}/{endpoint}",
            json=payload,
            headers=_auth_headers(),
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return {}


def _post_form(endpoint: str, form_str: str) -> dict:
    headers = {**_auth_headers(), "Content-Type": "application/x-www-form-urlencoded"}
    try:
        resp = _retry_on_429(
            requests.post,
            f"{BASE_URL}/{endpoint}",
            data=form_str,
            headers=headers,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return {}


# ── Public API ─────────────────────────────────────────────────────────────────

def ranking_keywords(url: str, country: str = "IN", num: int = 20) -> dict:
    """
    Keywords a specific URL ranks for + estimated organic traffic.

    Returns: {available, keywords:[{keyword, vol, cpc, competition, position}], traffic:{...}}
    """
    if not _key_available():
        return {"available": False, "reason": "KEYWORDS_EVERYWHERE env var not set", "keywords": [], "traffic": {}}

    cache_key = f"urlkw:{country}:{url}"
    cached = _get_cached(cache_key, ttl_h=12)
    if cached is not None:
        return cached

    try:
        kw_data    = _post_json("get_url_keywords", {"url": url, "country": country, "num": num})
        traffic    = _post_json("get_url_traffic",  {"url": url, "country": country})
        keywords   = _normalise_list(kw_data.get("data"))
        traffic_d  = traffic.get("data") or {}
        result = {"available": True, "keywords": keywords, "traffic": traffic_d}
        _set_cached(cache_key, result)
        return result
    except Exception as exc:
        return {"available": False, "reason": str(exc), "keywords": [], "traffic": {}}


def related(keyword: str, country: str = "IN", num: int = 20) -> dict:
    """
    Related keywords with vol/CPC/competition.

    Returns: {available, keywords:[...]}
    """
    if not _key_available():
        return {"available": False, "reason": "KEYWORDS_EVERYWHERE env var not set", "keywords": []}

    cache_key = f"rk:{country}:{keyword}"
    cached = _get_cached(cache_key, ttl_h=4)
    if cached is not None:
        return cached

    try:
        data   = _post_json("get_related_keywords", {"keyword": keyword, "country": country, "num": num})
        result = {"available": True, "keywords": _normalise_list(data.get("data"))}
        _set_cached(cache_key, result)
        return result
    except Exception as exc:
        return {"available": False, "reason": str(exc), "keywords": []}


def pasf(keyword: str, country: str = "IN") -> dict:
    """
    People Also Search For keywords.

    Returns: {available, keywords:[...]}
    """
    if not _key_available():
        return {"available": False, "reason": "KEYWORDS_EVERYWHERE env var not set", "keywords": []}

    cache_key = f"pasf:{country}:{keyword}"
    cached = _get_cached(cache_key, ttl_h=4)
    if cached is not None:
        return cached

    try:
        data   = _post_json("get_pasf_keywords", {"keyword": keyword, "country": country})
        result = {"available": True, "keywords": _normalise_list(data.get("data"))}
        _set_cached(cache_key, result)
        return result
    except Exception as exc:
        return {"available": False, "reason": str(exc), "keywords": []}


def backlinks(url: str, num: int = 10) -> dict:
    """
    Backlinks for a specific page.

    Returns: {available, backlinks:[{url, da, pa, spamScore}]}
    """
    if not _key_available():
        return {"available": False, "reason": "KEYWORDS_EVERYWHERE env var not set", "backlinks": []}

    cache_key = f"pagebl:{url}"
    cached = _get_cached(cache_key, ttl_h=24)
    if cached is not None:
        return cached

    try:
        data   = _post_json("get_page_backlinks", {"url": url, "num": num})
        result = {"available": True, "backlinks": _normalise_list(data.get("data"))}
        _set_cached(cache_key, result)
        return result
    except Exception as exc:
        return {"available": False, "reason": str(exc), "backlinks": []}
