"""Cloudflare fetch unit tests. Pure — no network, no browser."""

from __future__ import annotations

from onlinejourno_ingest.fetch.cloudflare import (
    CloudflareBlocked,
    is_cloudflare_challenge,
)


def test_challenge_detection():
    assert is_cloudflare_challenge("<html>Just a moment...</html>") is True
    assert is_cloudflare_challenge(b"<html>cf_chl_opt</html>") is True
    assert is_cloudflare_challenge("") is True
    # Short body that mentions cloudflare = challenge interstitial.
    assert is_cloudflare_challenge("blocked by cloudflare") is True
    # A real feed is long and has no challenge markers.
    assert is_cloudflare_challenge("<?xml version='1.0'?><rss>" + "x" * 9000 + "</rss>") is False


def test_cloudflare_blocked_carries_stage():
    err = CloudflareBlocked("https://x.test/feed", "headers")
    assert err.stage == "headers"
    assert "headers" in str(err)


import pytest

from onlinejourno_ingest.fetch.cloudflare import CloudflareFetcher


class _FakeResponse:
    def __init__(self, status_code: int, content: bytes):
        self.status_code = status_code
        self.content = content

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")


class _FakeSession:
    def __init__(self, response: _FakeResponse):
        self._response = response
        self.calls: list[tuple[str, dict]] = []

    def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return self._response


import requests  # noqa: E402  (after _FakeResponse for raise_for_status)


def test_tier1_returns_content_on_clean_200():
    body = b"<?xml version='1.0'?><rss>" + b"x" * 9000 + b"</rss>"
    fetcher = CloudflareFetcher(_FakeSession(_FakeResponse(200, body)))
    assert fetcher.get_bytes("https://x.test/feed") == body


def test_tier1_403_escalates_to_tier2(monkeypatch):
    fetcher = CloudflareFetcher(_FakeSession(_FakeResponse(403, b"")))
    monkeypatch.setattr(fetcher, "_tier_playwright", lambda url: b"<rss>browser</rss>")
    assert fetcher.get_bytes("https://x.test/feed") == b"<rss>browser</rss>"


def test_tier1_challenge_body_escalates_to_tier2(monkeypatch):
    challenge = b"<html>Just a moment...</html>"
    fetcher = CloudflareFetcher(_FakeSession(_FakeResponse(200, challenge)))
    monkeypatch.setattr(fetcher, "_tier_playwright", lambda url: b"<rss>browser</rss>")
    assert fetcher.get_bytes("https://x.test/feed") == b"<rss>browser</rss>"
