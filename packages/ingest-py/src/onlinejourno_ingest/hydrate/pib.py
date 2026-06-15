"""Parse a PIB press-release page into body text + posted date.

PIB pages (PressReleaseIframePage.aspx?PRID=…) put the release inside
`.innner-page-main-about-us-content-right-part`, with the headline in an
`<h2>` and the timestamp in `div.ReleaseDateSubHeaddateTime`
("Posted On: 15 JUN 2026 2:30PM by PIB Delhi"). The body is everything in
that container except the headline and the date line.

Dates are PIB Delhi wall-clock = IST (UTC+5:30, no DST), normalised to UTC.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from bs4 import BeautifulSoup

from onlinejourno_ingest.fetch.cloudflare import Fetcher

_CONTAINER = ".innner-page-main-about-us-content-right-part"
_DATE_SEL = "div.ReleaseDateSubHeaddateTime"
_IST = timedelta(hours=5, minutes=30)
_BODY_CAP = 20_000

_MONTHS = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}
_DATE_RE = re.compile(
    r"(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)",
    re.IGNORECASE,
)


@dataclass(slots=True)
class PibContent:
    body_text: str | None
    published_at: datetime | None


def _parse_ist_to_utc(text: str) -> datetime | None:
    m = _DATE_RE.search(text)
    if not m:
        return None
    day, mon, year, hh, mm, ap = m.groups()
    month = _MONTHS.get(mon.upper())
    if month is None:
        return None
    hour = int(hh) % 12 + (12 if ap.upper() == "PM" else 0)
    try:
        ist = datetime(int(year), month, int(day), hour, int(mm))
    except ValueError:
        return None
    return (ist - _IST).replace(tzinfo=UTC)


def parse_pib_page(html: bytes | str) -> PibContent:
    soup = BeautifulSoup(html, "lxml")
    container = soup.select_one(_CONTAINER)
    if container is None:
        return PibContent(body_text=None, published_at=None)

    date_el = container.select_one(_DATE_SEL)
    published_at = _parse_ist_to_utc(date_el.get_text(" ", strip=True)) if date_el else None

    # Strip headline + date so only the release body remains.
    for tag in container.select(f"h2, {_DATE_SEL}"):
        tag.decompose()
    text = re.sub(r"\s+", " ", container.get_text(" ", strip=True)).strip()
    body_text = text[:_BODY_CAP] or None

    return PibContent(body_text=body_text, published_at=published_at)


class PibHydrator:
    """Fetch a PIB PRID page through a `Fetcher` and parse it."""

    def __init__(self, fetcher: Fetcher) -> None:
        self.fetcher = fetcher

    def hydrate(self, url: str) -> PibContent:
        return parse_pib_page(self.fetcher.get_bytes(url))
