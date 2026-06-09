"""Generic JSON API collector — ingests public **data** (open-data portals, JSON
feeds, agency APIs) into signals. The reporter's tool watches data, not just RSS.

Driven entirely by the admin `sources` row:
  - `url`     : the endpoint
  - `params`  : { response_path?, map?, ...extra query params }
      response_path : dot-path to the array of items (e.g. "result.records")
      map           : { headline, url, external_id, published } -> JSON keys
  - `auth`    : { method: bearer|api_key, secret_ref } — key read from env

Anything not understood falls back to sensible defaults (title/link/id/date).
"""

from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import Any

import requests

from onlinejourno_ingest.collectors.base import (
    DEFAULT_TIMEOUT_SECONDS,
    http_session,
    url_hash,
)
from onlinejourno_ingest.protocols import FetchError, Signal


def _walk(data: Any, path: str | None) -> list[Any]:
    """Resolve a dot-path to the list of items."""
    cur = data
    if path:
        for seg in path.split("."):
            cur = cur.get(seg) if isinstance(cur, dict) else None
    if isinstance(cur, list):
        return cur
    return [cur] if isinstance(cur, dict) else []


def _first(item: dict[str, Any], keys: list[str]) -> Any:
    for k in keys:
        if k and item.get(k):
            return item[k]
    return None


def _parse_dt(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class ApiCollector:
    """Generic JSON API collector. Constructed once per pipeline run."""

    name = "api"

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
        endpoint = source.get("url")
        if not endpoint:
            raise FetchError("api source has no url")

        params = source.get("params") or {}
        auth = source.get("auth") or {}
        query = {
            k: v for k, v in params.items() if k not in ("response_path", "map")
        }
        headers: dict[str, str] = {}
        secret_ref = auth.get("secret_ref")
        if secret_ref and (key := os.environ.get(secret_ref)):
            if (auth.get("method") or "bearer") == "bearer":
                headers["Authorization"] = f"Bearer {key}"
            else:
                query["api_key"] = key

        try:
            resp = self.session.get(
                endpoint, params=query, headers=headers, timeout=self.timeout
            )
            resp.raise_for_status()
            data = resp.json()
        except (requests.RequestException, ValueError) as exc:
            raise FetchError(f"api fetch failed for {endpoint}: {exc}") from exc

        mapping = params.get("map") or {}
        out: list[Signal] = []
        for item in _walk(data, params.get("response_path"))[: self.max_items]:
            if not isinstance(item, dict):
                continue
            url = _first(item, [mapping.get("url", "url"), "link", "href"]) or endpoint
            headline = _first(item, [mapping.get("headline", "title"), "headline", "name"])
            ext = _first(item, [mapping.get("external_id", "id"), "guid", "uuid"])
            published = _parse_dt(
                _first(item, [mapping.get("published", "published"), "date", "datePublished"])
            )
            out.append(
                Signal(
                    tenant_id=source["tenant_id"],
                    source_id=source["id"],
                    url=str(url),
                    url_hash=url_hash(str(url)),
                    headline=str(headline) if headline else None,
                    external_id=str(ext) if ext else None,
                    published_at=published,
                    fetched_at=datetime.now(UTC),
                    raw_payload=item,
                )
            )
        return out
