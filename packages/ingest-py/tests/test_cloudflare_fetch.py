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
