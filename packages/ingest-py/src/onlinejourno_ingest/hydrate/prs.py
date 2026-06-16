"""Parse a PRS bill page into body (summary) + latest status date.

PRS bill pages (prsindia.org/billtrack/<slug>) are Drupal: the bill summary is
in `div.field-name-body`, and the legislative status timeline is in
`div.field-name-field-own-status-date`, one `span.date-display-single` per
event ("Aug 10, 2023" … "Dec 18, 2023"). We use the latest such date — the most
recent legislative action — as published_at.

Status dates are wall-clock IST (UTC+5:30, no DST) with no time component, so we
anchor each at noon IST before converting to UTC; the noon anchor keeps the
calendar date stable in both zones (a midnight anchor would roll it back a day).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from bs4 import BeautifulSoup

from onlinejourno_ingest.fetch.cloudflare import Fetcher

_BODY_SEL = "div.field-name-body"
# Scoped to the bill's own status timeline — not sidebars / related-bill blocks.
_DATE_SEL = "div.field-name-field-own-status-date span.date-display-single"
_IST = timedelta(hours=5, minutes=30)
_NOON = timedelta(hours=12)
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


def _parse_ist_date(text: str) -> datetime | None:
    """Parse a single 'Mon DD, YYYY' date as a noon-IST instant, in UTC."""
    m = _DATE_RE.search(text)
    if not m:
        return None
    month = _MONTHS.get(m.group(1)[:3].lower())
    if month is None:
        return None
    try:
        ist = datetime(int(m.group(3)), month, int(m.group(2))) + _NOON
    except ValueError:
        return None
    return (ist - _IST).replace(tzinfo=UTC)


def parse_prs_page(html: bytes | str) -> PrsContent:
    soup = BeautifulSoup(html, "lxml")

    body_el = soup.select_one(_BODY_SEL)
    body_text: str | None = None
    if body_el is not None:
        text = re.sub(r"\s+", " ", body_el.get_text(" ", strip=True)).strip()
        body_text = text[:_BODY_CAP] or None

    dates = [
        d
        for el in soup.select(_DATE_SEL)
        if (d := _parse_ist_date(el.get_text(" ", strip=True))) is not None
    ]
    published_at = max(dates) if dates else None

    return PrsContent(body_text=body_text, published_at=published_at)


class PrsHydrator:
    """Fetch a PRS bill page through a `Fetcher` and parse it."""

    def __init__(self, fetcher: Fetcher) -> None:
        self.fetcher = fetcher

    def hydrate(self, url: str) -> PrsContent:
        return parse_prs_page(self.fetcher.get_bytes(url))
