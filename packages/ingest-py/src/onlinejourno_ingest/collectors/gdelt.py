"""GDELT DOC 2.0 collector.

Pulls article metadata from the GDELT Document API — free, no key, ~15-min
fresh, global. Used to reach outlets whose RSS is Cloudflare/JS-blocked
(The Hindu, Moneycontrol, Business Standard, PIB) without building scrapers
(see docs/SOURCE-ROADMAP.md). GDELT returns metadata only — headline, URL,
domain, seen-date, language — not article body (copyright). That is enough
for headline-level shortlisting of coverage the platform otherwise can't see.

Source-row convention (config-as-data, no schema change):
  kind     = 'gdelt'
  url      = the GDELT DOC endpoint (https://api.gdeltproject.org/api/v2/doc/doc)
  rss_url  = the GDELT query expression, e.g.
             "domainis:thehindu.com (sebi OR rbi OR nifty) sourcelang:english"
"""

from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Any

import requests

from onlinejourno_ingest.collectors.base import (
    DEFAULT_TIMEOUT_SECONDS,
    http_session,
    url_hash,
)
from onlinejourno_ingest.protocols import FetchError, Signal

GDELT_DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc"

# GDELT throttles rapid queries (HTTP 429). One collector instance handles all
# gdelt sources in a run, so it self-throttles to ~1 request per interval.
GDELT_MIN_REQUEST_INTERVAL = 5.0  # seconds between GDELT requests

# GDELT language names -> ISO 639-1 (extend as needed).
_LANG = {"English": "en", "Hindi": "hi", "Tamil": "ta", "Bengali": "bn"}


class GDELTCollector:
    """GDELT DOC 2.0 collector. Constructed once per pipeline run."""

    name = "gdelt"

    def __init__(
        self,
        *,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        max_records: int = 75,
        timespan: str = "2d",
        session: requests.Session | None = None,
    ) -> None:
        self.timeout = timeout_seconds
        self.max_records = max_records
        self.timespan = timespan
        self.session = session or http_session()
        self._last_request = 0.0

    def _throttle(self) -> None:
        """Sleep so successive GDELT requests stay >= GDELT_MIN_REQUEST_INTERVAL apart."""
        wait = GDELT_MIN_REQUEST_INTERVAL - (time.monotonic() - self._last_request)
        if wait > 0:
            time.sleep(wait)
        self._last_request = time.monotonic()

    def fetch(self, source: dict[str, Any]) -> list[Signal]:
        """Pull article metadata for one GDELT source row."""
        query = (source.get("rss_url") or "").strip()
        if not query:
            raise FetchError(
                f"gdelt source {source.get('name')!r} has no query in rss_url"
            )
        endpoint = source.get("url") or GDELT_DOC_ENDPOINT

        self._throttle()
        try:
            resp = self.session.get(
                endpoint,
                params={
                    "query": query,
                    "mode": "ArtList",
                    "format": "json",
                    "maxrecords": self.max_records,
                    "timespan": self.timespan,
                    "sort": "DateDesc",
                },
                timeout=self.timeout,
            )
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise FetchError(f"gdelt fetch failed: {exc}") from exc

        try:
            payload = resp.json()
        except ValueError as exc:
            # GDELT returns an HTML error page (not JSON) on a malformed query.
            raise FetchError(f"gdelt returned non-JSON (bad query?): {exc}") from exc

        articles = payload.get("articles") or []
        signals: list[Signal] = []
        for art in articles:
            signal = self._article_to_signal(source, art)
            if signal is not None:
                signals.append(signal)
        return signals

    def _article_to_signal(
        self, source: dict[str, Any], art: dict[str, Any]
    ) -> Signal | None:
        url = art.get("url")
        if not url:
            return None
        return Signal(
            tenant_id=source["tenant_id"],
            source_id=source["id"],
            url=url,
            url_hash=url_hash(url),
            headline=art.get("title"),
            body_text=None,  # GDELT DOC gives metadata only, no body
            external_id=None,
            published_at=_parse_seendate(art.get("seendate")),
            language=_LANG.get(art.get("language", ""), "en"),
            raw_payload={
                "domain": art.get("domain"),
                "sourcecountry": art.get("sourcecountry"),
                "socialimage": art.get("socialimage"),
                "language_name": art.get("language"),
                "via": "gdelt",
            },
        )


def _parse_seendate(value: str | None) -> datetime | None:
    """Parse GDELT seendate ('20260605T103000Z') into a UTC datetime."""
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=UTC)
    except (ValueError, TypeError):
        return None
