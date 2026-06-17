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
    # Advertise only codecs requests/urllib3 can decode without extra deps.
    # `br` (brotli) needs the `brotli` package; without it RBI + Cloudflare-fronted
    # feeds came back as undecoded brotli bytes → feedparser saw binary (0 entries).
    "Accept-Encoding": "gzip, deflate",
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


class CloudflareFetcher:
    """Two-tier Fetcher. Tier 1 = realistic headers via requests; Tier 2 =
    headless Chromium that clears the JS challenge then pulls raw bytes."""

    def __init__(self, session: requests.Session, *, timeout_seconds: int = 20) -> None:
        self.session = session
        self.timeout = timeout_seconds

    def get_bytes(self, url: str, *, headers: dict[str, str] | None = None) -> bytes:
        try:
            return self._tier_headers(url, headers)
        except CloudflareBlocked:
            return self._tier_playwright(url)

    def _tier_headers(self, url: str, extra: dict[str, str] | None) -> bytes:
        merged = {**REALISTIC_HEADERS, **(extra or {})}
        if os.environ.get("CF_COOKIES"):
            merged["Cookie"] = os.environ["CF_COOKIES"]
        resp = self.session.get(url, headers=merged, timeout=self.timeout)
        if resp.status_code in (403, 503):
            raise CloudflareBlocked(url, "headers")
        resp.raise_for_status()
        if is_cloudflare_challenge(resp.content):
            raise CloudflareBlocked(url, "headers")
        return resp.content

    def _tier_playwright(self, url: str) -> bytes:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:  # pragma: no cover - install-time guard
            raise RuntimeError(
                "Playwright not installed. Run `uv add playwright` and "
                "`uv run playwright install chromium`."
            ) from exc

        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            )
            try:
                context = browser.new_context(
                    user_agent=REALISTIC_HEADERS["User-Agent"],
                    viewport={"width": 1440, "height": 900},
                    locale="en-IN",
                    timezone_id="Asia/Kolkata",
                    extra_http_headers={
                        "Accept-Language": REALISTIC_HEADERS["Accept-Language"],
                        "Sec-Ch-Ua": REALISTIC_HEADERS["Sec-Ch-Ua"],
                        "Sec-Ch-Ua-Mobile": "?0",
                        "Sec-Ch-Ua-Platform": '"macOS"',
                    },
                )
                context.add_init_script(
                    "Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>undefined});"
                    "window.chrome={runtime:{},app:{}};"
                    "Object.defineProperty(navigator,'plugins',{get:()=>[1,2,3,4,5]});"
                    "Object.defineProperty(navigator,'languages',{get:()=>['en-IN','en-US','en']});"
                )
                page = context.new_page()
                page.goto(_site_root(url), wait_until="domcontentloaded", timeout=30_000)
                try:
                    page.wait_for_load_state("networkidle", timeout=20_000)
                except Exception:  # noqa: BLE001 - idle wait is best-effort
                    pass
                resp = context.request.get(url)
                body = resp.body()
                if is_cloudflare_challenge(body):
                    raise CloudflareBlocked(url, "playwright")
                return body
            finally:
                browser.close()
