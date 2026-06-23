"""SSRF guard: public-IP validation + per-hop redirect validation.

Fully offline — the DNS resolver and the HTTP getter are injected so the
security logic is exercised without real network access.
"""
import socket

import pytest
from onlinejourno_scoring.url_guard import UrlNotAllowed, safe_get, validate_url


def _resolver(mapping):
    def r(host):
        if host not in mapping:
            raise socket.gaierror(f"unknown host {host}")
        return mapping[host]

    return r


# --- validate_url ------------------------------------------------------------

def test_validate_allows_public_ip():
    ips = validate_url(
        "https://news.example/a", resolver=_resolver({"news.example": ["93.184.216.34"]})
    )
    assert ips == ["93.184.216.34"]


@pytest.mark.parametrize(
    "ip",
    [
        "127.0.0.1",        # loopback
        "10.0.0.5",         # private
        "192.168.1.1",      # private
        "169.254.169.254",  # cloud metadata (link-local)
        "::1",              # ipv6 loopback
        "0.0.0.0",          # unspecified
    ],
)
def test_validate_blocks_internal_ip(ip):
    with pytest.raises(UrlNotAllowed):
        validate_url("http://target/", resolver=_resolver({"target": [ip]}))


def test_validate_blocks_when_any_ip_internal():
    # Host resolving to one public + one private IP must be rejected (rebinding-style).
    with pytest.raises(UrlNotAllowed):
        validate_url(
            "http://mixed/", resolver=_resolver({"mixed": ["93.184.216.34", "10.0.0.5"]})
        )


@pytest.mark.parametrize("url", ["file:///etc/passwd", "ftp://example.com/", "gopher://x/"])
def test_validate_blocks_non_http_scheme(url):
    with pytest.raises(UrlNotAllowed):
        validate_url(url, resolver=_resolver({}))


def test_validate_blocks_unresolvable():
    with pytest.raises(UrlNotAllowed):
        validate_url("http://nope/", resolver=_resolver({}))


# --- safe_get: validates EVERY hop before connecting -------------------------

class _Resp:
    def __init__(self, status, headers=None, text=""):
        self.status_code = status
        self.headers = headers or {}
        self.text = text
        self.url = ""

    @property
    def is_redirect(self):
        return self.status_code in (301, 302, 303, 307, 308) and "Location" in self.headers


def test_safe_get_follows_validated_redirects():
    pages = {
        "http://a.example/": _Resp(302, {"Location": "http://b.example/final"}),
        "http://b.example/final": _Resp(200, text="ok"),
    }
    resolver = _resolver({"a.example": ["93.184.216.34"], "b.example": ["93.184.216.35"]})
    resp = safe_get("http://a.example/", resolver=resolver, http_get=lambda u: pages[u])
    assert resp.status_code == 200
    assert resp.text == "ok"


def test_safe_get_blocks_redirect_to_internal():
    # Public URL 302s to the cloud-metadata endpoint — must be blocked at the hop.
    pages = {"http://a.example/": _Resp(302, {"Location": "http://metadata.internal/latest"})}
    resolver = _resolver(
        {"a.example": ["93.184.216.34"], "metadata.internal": ["169.254.169.254"]}
    )
    with pytest.raises(UrlNotAllowed):
        safe_get("http://a.example/", resolver=resolver, http_get=lambda u: pages[u])


def test_safe_get_caps_redirects():
    loop = _Resp(302, {"Location": "http://a.example/"})
    resolver = _resolver({"a.example": ["93.184.216.34"]})
    with pytest.raises(UrlNotAllowed):
        safe_get(
            "http://a.example/", resolver=resolver, http_get=lambda u: loop, max_redirects=3
        )
