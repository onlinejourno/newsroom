"""Regression: never advertise a Content-Encoding we can't decode.

RBI and Cloudflare-fronted feeds (e.g. CPR India) respond with brotli when the
client advertises `br`. requests/urllib3 only decode brotli when the `brotli`
(or `brotlicffi`) package is installed; otherwise `resp.content` is raw brotli
bytes and feedparser sees binary — 0 entries, bozo — and the source is logged
as a malformed-feed failure. Advertise only what we can decode.
"""

import importlib.util

from onlinejourno_ingest.fetch.cloudflare import REALISTIC_HEADERS


def test_accept_encoding_only_advertises_decodable_codecs():
    encodings = [p.strip() for p in REALISTIC_HEADERS.get("Accept-Encoding", "").split(",")]
    if "br" in encodings:
        have_brotli = bool(
            importlib.util.find_spec("brotli")
            or importlib.util.find_spec("brotlicffi")
        )
        assert have_brotli, (
            "Accept-Encoding advertises 'br' but no brotli decoder is installed; "
            "brotli responses (RBI, Cloudflare-fronted feeds) come back undecoded."
        )
