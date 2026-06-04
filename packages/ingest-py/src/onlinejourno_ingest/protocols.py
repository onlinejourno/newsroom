"""Domain types and protocols for the ingest seam.

Ported from discover-dashboard's two-protocol convention (AD-001, AD-005,
AD-009): each collector returns a list of typed `Signal` objects, raises
`FetchError` on unrecoverable failure, and never leaks raw library types
(feedparser entries, BeautifulSoup nodes) past this seam.

Identity types are `uuid.UUID` throughout — psycopg returns UUID column
values as `uuid.UUID`; carrying the same type past the seam avoids the
silent str/UUID lie that would otherwise show up in dataclass annotations.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Protocol
from uuid import UUID


class FetchError(Exception):
    """Raised by a collector when a source cannot be fetched.

    Captures the underlying cause so the pipeline can log and continue with
    the next source, rather than silently returning an empty list (which
    would hide outages — see `news-intel/AD-005` rationale).
    """


@dataclass(slots=True)
class Signal:
    """One discrete item harvested from a source.

    This is the canonical domain type that crosses the ingest seam. It is
    storage-agnostic; the `db` module knows how to upsert it into Postgres.
    """

    tenant_id: UUID
    source_id: UUID
    url: str
    url_hash: str
    headline: str | None = None
    body_text: str | None = None
    external_id: str | None = None
    published_at: datetime | None = None
    fetched_at: datetime | None = None
    language: str = "en"
    raw_payload: dict[str, Any] = field(default_factory=dict)


class Collector(Protocol):
    """A collector implements a single `fetch` method that returns Signals."""

    name: str

    def fetch(self, source: dict[str, Any]) -> list[Signal]:
        """Return the signals visible at the source right now.

        Raises `FetchError` on unrecoverable failure. Returns an empty list
        only when the source is reachable but legitimately had nothing new.
        """
        ...
