"""URL canonicalisation / hashing tests. Pure, no network or DB."""

from __future__ import annotations

from onlinejourno_ingest.collectors.base import canonical_url, url_hash


def test_clean_url_unchanged():
    # No tracking params, no fragment -> identical (no churn vs old hashes).
    u = "https://www.livemint.com/market/stock-market-news/abc-123"
    assert canonical_url(u) == u
    assert url_hash(u) == url_hash(u)


def test_tracking_params_stripped():
    base = "https://example.com/a?id=42"
    tracked = base + "&utm_source=newsletter&utm_medium=email&fbclid=xyz"
    assert canonical_url(tracked) == base
    # Same article behind tracking params dedups to one hash.
    assert url_hash(tracked) == url_hash(base)


def test_fragment_dropped():
    assert canonical_url("https://example.com/a#section") == "https://example.com/a"


def test_non_tracking_params_preserved_in_order():
    u = "https://example.com/a?b=2&a=1"
    assert canonical_url(u) == u  # order preserved, nothing dropped


def test_whitespace_stripped():
    assert canonical_url("  https://example.com/a  ") == "https://example.com/a"
