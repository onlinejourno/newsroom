"""HTML scrape collector — ingests public-record sources with no feed or API
(gazette listings, court cause-lists, tender portals) by selecting story links
on a page. Static HTML only (no JS rendering); Cloudflare-hard sites are a
later concern.

source.params:
  item_selector     : CSS selector for each item (an <a>, or a container with one)
  headline_selector : optional CSS selector for the headline within an item
  max_items         : optional cap
Relative links are resolved against source.url.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from onlinejourno_ingest.collectors.base import (
    DEFAULT_TIMEOUT_SECONDS,
    http_session,
    url_hash,
)
from onlinejourno_ingest.protocols import FetchError, Signal


class ScrapeCollector:
    """Static-HTML scrape collector. Constructed once per pipeline run."""

    name = "scrape"

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

    def fetch(self, source: dict[str, Any]) -> list[Signal]:
        page_url = source.get("url")
        if not page_url:
            raise FetchError("scrape source has no url")
        params = source.get("params") or {}
        selector = params.get("item_selector") or params.get("selector")
        if not selector:
            raise FetchError("scrape source needs params.item_selector")

        try:
            resp = self.session.get(page_url, timeout=self.timeout)
            resp.raise_for_status()
        except requests.RequestException as exc:
            raise FetchError(f"scrape fetch failed for {page_url}: {exc}") from exc

        soup = BeautifulSoup(resp.text, "html.parser")
        headline_sel = params.get("headline_selector")
        cap = int(params.get("max_items") or self.max_items)

        out: list[Signal] = []
        seen: set[str] = set()
        for el in soup.select(selector)[:cap]:
            link = el if el.name == "a" else el.find("a")
            href = link.get("href") if link else None
            if not href:
                continue
            url = urljoin(page_url, href)
            if url in seen:
                continue
            seen.add(url)
            if headline_sel:
                node = el.select_one(headline_sel)
                headline = node.get_text(strip=True) if node else None
            else:
                headline = link.get_text(strip=True) if link else el.get_text(strip=True)
            out.append(
                Signal(
                    tenant_id=source["tenant_id"],
                    source_id=source["id"],
                    url=url,
                    url_hash=url_hash(url),
                    headline=headline or None,
                    external_id=url,
                    fetched_at=datetime.now(UTC),
                    raw_payload={"scraped_from": page_url},
                )
            )
        return out
