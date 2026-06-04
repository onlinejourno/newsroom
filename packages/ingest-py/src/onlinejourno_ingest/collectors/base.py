"""Shared HTTP session and helpers used by all collectors."""

from __future__ import annotations

import hashlib

import requests

USER_AGENT = "OnlineJourno-Ingest/0.0.1 (+https://onlinejourno.com)"
DEFAULT_TIMEOUT_SECONDS = 20


def http_session() -> requests.Session:
    """Return a `requests.Session` with the OnlineJourno user agent set."""
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    return session


def url_hash(url: str) -> str:
    """Stable hash of a URL for dedup uniqueness on (tenant_id, url_hash).

    SHA-256 hex digest. URL is whitespace-stripped but otherwise verbatim;
    canonicalisation (sorting query parameters, dropping tracking params)
    happens in a separate step before storage when we decide which signal
    canonical fields are.
    """
    return hashlib.sha256(url.strip().encode("utf-8")).hexdigest()
