"""RSS / Atom collector.

Ported from news-intel `src/collect_rss.py`. Differences from the
original:

* Multi-tenant: signals carry `tenant_id` and `source_id` as UUIDs.
* Domain types past the seam: returns `list[Signal]`, not raw feedparser entries.
* `FetchError` on unrecoverable failure rather than silent `[]`.
* Construction-time config (timeout, max items per source).
* Timezone-aware published_at parsing — prefers RFC 2822 raw strings over
  feedparser's struct_time (which assumes UTC and silently drifts when a
  source emits naive local time).
"""

from __future__ import annotations

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import urljoin

import feedparser
import requests
from bs4 import BeautifulSoup

from onlinejourno_ingest.collectors.base import (
    DEFAULT_TIMEOUT_SECONDS,
    http_session,
    url_hash,
)
from onlinejourno_ingest.protocols import FetchError, Signal

COMMON_FEED_PATHS = ["/feed/", "/feed", "/rss", "/rss.xml", "/feeds/all.rss"]


class RSSCollector:
    """RSS / Atom collector. Constructed once per pipeline run."""

    name = "rss"

    def __init__(
        self,
        *,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        max_items_per_source: int = 200,
        session: requests.Session | None = None,
    ) -> None:
        self.timeout = timeout_seconds
        self.max_items = max_items_per_source
        self.session = session or http_session()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fetch(self, source: dict[str, Any]) -> list[Signal]:
        """Pull signals from one source row. Raises `FetchError` on failure."""
        feed_url = source.get("rss_url") or self._discover_feed(source["url"])
        if not feed_url:
            raise FetchError(f"no RSS feed found for {source['url']}")

        try:
            response = self.session.get(feed_url, timeout=self.timeout)
            response.raise_for_status()
        except requests.RequestException as exc:
            raise FetchError(f"fetch failed: {exc}") from exc

        parsed = feedparser.parse(response.content)
        signals: list[Signal] = []
        for entry in parsed.entries[: self.max_items]:
            signal = self._entry_to_signal(source, entry)
            if signal is not None:
                signals.append(signal)
        return signals

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _discover_feed(self, homepage: str) -> str | None:
        """Find a feed URL from <link> tags or common paths."""
        try:
            response = self.session.get(homepage, timeout=self.timeout)
            response.raise_for_status()
        except requests.RequestException:
            return None

        soup = BeautifulSoup(response.text, "lxml")
        for link in soup.find_all("link", rel="alternate"):
            link_type = (link.get("type") or "").lower()
            href = link.get("href")
            if href and ("rss" in link_type or "atom" in link_type):
                return urljoin(homepage, href)

        for path in COMMON_FEED_PATHS:
            candidate = urljoin(homepage, path)
            try:
                head = self.session.head(
                    candidate, timeout=self.timeout, allow_redirects=True
                )
                content_type = (head.headers.get("content-type") or "").lower()
                if head.ok and ("xml" in content_type or "rss" in content_type):
                    return candidate
            except requests.RequestException:
                continue
        return None

    def _entry_to_signal(
        self,
        source: dict[str, Any],
        entry: Any,
    ) -> Signal | None:
        """Convert a feedparser entry into a `Signal`. Returns None if invalid."""
        url = entry.get("link")
        if not url:
            return None
        return Signal(
            tenant_id=source["tenant_id"],
            source_id=source["id"],
            url=url,
            url_hash=url_hash(url),
            headline=entry.get("title"),
            body_text=entry.get("summary"),
            external_id=entry.get("id"),
            published_at=_parse_published(entry),
            language=(source.get("expected_languages") or ["en"])[0],
            raw_payload={
                "summary": entry.get("summary"),
                "tags": [tag.get("term") for tag in entry.get("tags") or []],
            },
        )


def _parse_published(entry: Any) -> datetime | None:
    """Parse an entry's published / updated time into a timezone-aware UTC datetime.

    Strategy:
        1. Try the raw RFC 2822 string (`entry.published` or `entry.updated`)
           through `email.utils.parsedate_to_datetime` — this preserves the
           originating timezone offset and avoids the silent-UTC assumption
           feedparser makes for naive datetimes.
        2. Fall back to feedparser's `*_parsed` struct_time, which is in
           UTC when the source had an explicit timezone and otherwise
           reflects whatever feedparser's heuristics produced.

    Returns a UTC-normalised `datetime` or `None`.
    """
    raw = entry.get("published") or entry.get("updated")
    if raw:
        try:
            dt = parsedate_to_datetime(raw)
        except (TypeError, ValueError):
            dt = None
        else:
            if dt is not None:
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)

    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if not parsed:
        return None
    return datetime(*parsed[:6], tzinfo=timezone.utc)
