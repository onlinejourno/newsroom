"""Shared HTTP session and helpers used by all collectors."""

from __future__ import annotations

import hashlib
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

USER_AGENT = "OnlineJourno-Ingest/0.0.1 (+https://onlinejourno.com)"
DEFAULT_TIMEOUT_SECONDS = 20

# Query-string keys that identify the same article across campaigns/referrers.
# Dropped before hashing so the same piece behind different tracking params
# dedups to one signal (otherwise scoring pays for near-duplicate copies).
TRACKING_PARAMS = frozenset(
    {
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "utm_id", "utm_reader", "utm_name", "utm_brand",
        "fbclid", "gclid", "gclsrc", "dclid", "msclkid", "yclid",
        "mc_cid", "mc_eid", "igshid", "igsh", "_hsenc", "_hsmi",
        "ref", "ref_src", "referrer", "spm", "cmpid", "ncid", "src",
    }
)


def http_session() -> requests.Session:
    """Return a `requests.Session` with the OnlineJourno UA and retry/backoff.

    Government and exchange portals rate-limit and flake; without retries a
    single 429/5xx silently fails the source for the day. Retries idempotent
    GET/HEAD only, with exponential backoff.
    """
    session = requests.Session()
    session.headers["User-Agent"] = USER_AGENT
    retry = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET", "HEAD"}),
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def canonical_url(url: str) -> str:
    """Canonicalise a URL for dedup: drop tracking params + fragment.

    Preserves scheme, host, path, and the order of non-tracking query params,
    so a URL with no tracking params is unchanged (no churn against existing
    hashes). Only the fragment and known tracking keys are stripped.
    """
    parts = urlsplit(url.strip())
    kept = [
        (k, v)
        for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if k.lower() not in TRACKING_PARAMS
    ]
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(kept), ""))


def url_hash(url: str) -> str:
    """Stable SHA-256 hex digest of the canonicalised URL.

    Dedup uniqueness is on (tenant_id, url_hash); canonicalisation here makes
    the same article behind different tracking params hash to one value.
    """
    return hashlib.sha256(canonical_url(url).encode("utf-8")).hexdigest()


def latin_share(text: str) -> float:
    """Share of alphabetic chars that are basic-Latin — a cheap script gate.

    Portals sometimes serve vernacular content on an 'English' endpoint (PIB's
    RSS redirects by region); when a source expects English, entries whose
    letters are mostly non-Latin are skipped at Collect (ADR: /en tenant
    ingests English).
    """
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 1.0
    return sum(1 for c in letters if c.isascii()) / len(letters)
