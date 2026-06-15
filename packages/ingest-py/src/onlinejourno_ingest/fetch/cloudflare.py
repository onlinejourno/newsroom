"""Cloudflare-aware fetch: realistic headers (Tier 1) + Playwright (Tier 2).

Ported from eip-handover/.../lib/cloudflare-fetch.ts. The Hindu, Moneycontrol,
and Business Standard sit behind Cloudflare's "Just a moment..." JS challenge:
a plain requests.get returns the challenge HTML or a 403/503, not the feed.
Tier 1 sends realistic browser headers; Tier 2 launches headless Chromium,
clears the challenge on the site root, then pulls the raw feed bytes through
the cleared browser context (page.content() would wrap the XML in HTML).
"""

from __future__ import annotations

import os
from typing import Protocol
from urllib.parse import urlsplit, urlunsplit

import requests

REALISTIC_HEADERS: dict[str, str] = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

_CHALLENGE_MARKERS = (
    "Just a moment...",
    "cf-mitigated",
    "cf_chl_",
    "Enable JavaScript and cookies to continue",
)


class CloudflareBlocked(Exception):
    """Raised when neither fetch tier can get past Cloudflare for a URL."""

    def __init__(self, url: str, stage: str) -> None:
        super().__init__(f"Cloudflare-blocked at {stage}: {url}")
        self.url = url
        self.stage = stage


def is_cloudflare_challenge(body: bytes | str) -> bool:
    """True if the body looks like a Cloudflare interstitial, not real content."""
    if not body:
        return True
    text = body.decode("utf-8", "ignore") if isinstance(body, bytes) else body
    peek = text[:5000]
    if any(marker in peek for marker in _CHALLENGE_MARKERS):
        return True
    return "cloudflare" in peek.lower() and len(text) < 8000


class Fetcher(Protocol):
    """Adapter contract (ADR 0007): fetch raw bytes for a URL."""

    def get_bytes(self, url: str, *, headers: dict[str, str] | None = None) -> bytes: ...


def _site_root(url: str) -> str:
    """scheme://netloc/ — the page Tier 2 loads to clear the challenge."""
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, "/", "", ""))
