"""Parse a PRS bill page into body (summary) + introduced date.

PRS bill pages (prsindia.org/billtrack/<slug>) carry the bill summary in the
main content region (.region-content) and a status timeline with dates like
"Jul 20, 2023" / "July 20, 2023". The earliest such date is the bill's
introduction — the event date we use as published_at.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime

from bs4 import BeautifulSoup

from onlinejourno_ingest.fetch.cloudflare import Fetcher

_CONTENT = ".region-content"
_BODY_CAP = 20_000
_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}
# "Jul 20, 2023" or "July 20, 2023"
_DATE_RE = re.compile(r"([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})")


@dataclass(slots=True)
class PrsContent:
    body_text: str | None
    published_at: datetime | None


def _earliest_date(text: str) -> datetime | None:
    """Earliest 'Mon DD, YYYY' in the text = the bill's introduction date."""
    dates: list[datetime] = []
    for m in _DATE_RE.finditer(text):
        month = _MONTHS.get(m.group(1)[:3].lower())
        if month is None:
            continue
        try:
            dates.append(datetime(int(m.group(3)), month, int(m.group(2)), tzinfo=UTC))
        except ValueError:
            continue
    return min(dates) if dates else None


def parse_prs_page(html: bytes | str) -> PrsContent:
    soup = BeautifulSoup(html, "lxml")
    container = soup.select_one(_CONTENT)
    if container is None:
        return PrsContent(body_text=None, published_at=None)
    text = re.sub(r"\s+", " ", container.get_text(" ", strip=True)).strip()
    return PrsContent(
        body_text=text[:_BODY_CAP] or None,
        published_at=_earliest_date(text),
    )


class PrsHydrator:
    """Fetch a PRS bill page through a `Fetcher` and parse it."""

    def __init__(self, fetcher: Fetcher) -> None:
        self.fetcher = fetcher

    def hydrate(self, url: str) -> PrsContent:
        return parse_prs_page(self.fetcher.get_bytes(url))
