"""SSRF-safe validation + fetch for user-supplied audit target URLs.

Mitigates SSRF on the audit fetch path: rejects non-http(s) schemes and any host
that resolves to a non-public address (loopback / private / link-local /
reserved — including the cloud metadata endpoint 169.254.169.254), and
re-validates *every* redirect hop before connecting, so a public URL cannot
bounce to an internal address.

Note: a residual DNS-rebinding TOCTOU window remains between validation and the
underlying ``requests`` resolution. Closing it fully requires pinning the
connection to the validated IP; tracked separately.
"""
from __future__ import annotations

import ipaddress
import socket
from collections.abc import Callable
from urllib.parse import urljoin, urlparse

import requests

_ALLOWED_SCHEMES = {"http", "https"}
_MAX_REDIRECTS = 5
_MAX_BYTES = 8_000_000  # 8 MB — generous for an article, blocks runaway/huge bodies

Resolver = Callable[[str], list[str]]


class UrlNotAllowed(ValueError):
    """Raised when a target URL (or a redirect hop) fails the SSRF safety checks."""


def _default_resolver(host: str) -> list[str]:
    return [info[4][0] for info in socket.getaddrinfo(host, None)]


_CGNAT = ipaddress.ip_network("100.64.0.0/10")


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
        or (ip.version == 4 and ip in _CGNAT)
    )


def validate_url(url: str, *, resolver: Resolver = _default_resolver) -> list[str]:
    """Return the resolved public IPs for ``url``'s host, or raise ``UrlNotAllowed``."""
    parsed = urlparse(url)
    if parsed.scheme.lower() not in _ALLOWED_SCHEMES:
        raise UrlNotAllowed(f"scheme must be http or https, got {parsed.scheme!r}")
    host = parsed.hostname
    if not host:
        raise UrlNotAllowed("URL has no host")
    try:
        ips = resolver(host)
    except socket.gaierror as exc:
        raise UrlNotAllowed(f"cannot resolve host {host!r}") from exc
    if not ips:
        raise UrlNotAllowed(f"cannot resolve host {host!r}")
    for raw in ips:
        if _is_blocked_ip(ipaddress.ip_address(raw)):
            raise UrlNotAllowed(f"host {host!r} resolves to a non-public address ({raw})")
    return ips


def _read_capped(resp, max_bytes: int = _MAX_BYTES):
    """Read ``resp``'s body, raising ``UrlNotAllowed`` if it exceeds ``max_bytes``.

    Guards against memory-exhaustion DoS from a target serving a huge or unbounded
    body: checks the declared Content-Length, then enforces the cap while
    streaming. Sets ``resp._content`` so ``.text`` / ``.content`` work downstream.
    """
    declared = resp.headers.get("Content-Length")
    if declared and declared.isdigit() and int(declared) > max_bytes:
        raise UrlNotAllowed(f"response too large: Content-Length {declared} > {max_bytes}")
    total = 0
    body = bytearray()
    for chunk in resp.iter_content(8192):
        total += len(chunk)
        if total > max_bytes:
            raise UrlNotAllowed(f"response exceeds {max_bytes} bytes")
        body.extend(chunk)
    resp._content = bytes(body)
    return resp


def safe_get(
    url: str,
    *,
    headers: dict | None = None,
    timeout: float = 15,
    resolver: Resolver = _default_resolver,
    http_get: Callable[[str], requests.Response] | None = None,
    max_redirects: int = _MAX_REDIRECTS,
    max_bytes: int = _MAX_BYTES,
) -> requests.Response:
    """GET ``url``, validating every hop is public before connecting.

    Redirects are followed manually (``allow_redirects=False``) so each
    intermediate URL is re-validated — a public URL cannot 3xx to an internal
    address. Raises ``UrlNotAllowed`` on an unsafe hop or too many redirects.
    """
    if http_get is None:
        session = requests.Session()

        def _do_get(u: str) -> requests.Response:
            resp = session.get(
                u, headers=headers, timeout=timeout, allow_redirects=False, stream=True
            )
            if resp.is_redirect:
                resp.close()
            else:
                _read_capped(resp, max_bytes)
            return resp

        getter: Callable[[str], requests.Response] = _do_get
    else:
        getter = http_get

    current = url
    for _ in range(max_redirects + 1):
        validate_url(current, resolver=resolver)
        resp = getter(current)
        if resp.is_redirect:
            location = resp.headers.get("Location")
            if not location:
                return resp
            current = urljoin(current, location)
            continue
        return resp
    raise UrlNotAllowed(f"exceeded {max_redirects} redirects")
