"""PRS hydration tests — pure parsing on a saved real-page fixture, no network."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from onlinejourno_ingest.hydrate.prs import PrsHydrator, parse_prs_page

_FIXTURE = (Path(__file__).parent / "fixtures" / "prs_bill.html").read_text()


def test_parses_latest_status_date_ist_to_utc():
    content = parse_prs_page(_FIXTURE)
    # Latest status date Dec 18, 2023 at noon IST == 06:30 UTC same day.
    assert content.published_at == datetime(2023, 12, 18, 6, 30, tzinfo=UTC)


def test_ignores_dates_outside_the_status_field():
    content = parse_prs_page(_FIXTURE)
    # The decoy Jan 02, 2030 in the related-bills block must NOT be picked,
    # nor the earliest status date.
    assert content.published_at != datetime(2030, 1, 2, 6, 30, tzinfo=UTC)
    assert content.published_at.year == 2023


def test_body_is_the_summary_field_only():
    content = parse_prs_page(_FIXTURE)
    assert "Highlights of the Bill" in content.body_text
    assert "Indian Post Office Act, 1898" in content.body_text
    # body comes from field-name-body — not the status timeline, ministry, or nav
    assert "Dec 18, 2023" not in content.body_text
    assert "Communications" not in content.body_text
    assert "Follow Us" not in content.body_text
    assert "2030" not in content.body_text


def test_missing_status_field_yields_none_date_but_keeps_body():
    html = (
        '<div class="field field-name-body"><div class="field-items">'
        '<div class="field-item even"><p>Body sentence here.</p></div></div></div>'
    )
    content = parse_prs_page(html)
    assert content.published_at is None
    assert content.body_text == "Body sentence here."


def test_missing_both_fields_yields_empty_content():
    content = parse_prs_page("<html><body>nothing</body></html>")
    assert content.body_text is None
    assert content.published_at is None


class _FakeFetcher:
    def __init__(self, payload: bytes):
        self._payload = payload
        self.urls: list[str] = []

    def get_bytes(self, url, *, headers=None):
        self.urls.append(url)
        return self._payload


def test_hydrator_fetches_then_parses():
    fetcher = _FakeFetcher(_FIXTURE.encode("utf-8"))
    url = "https://prsindia.org/billtrack/the-post-office-bill-2023"
    content = PrsHydrator(fetcher).hydrate(url)
    assert fetcher.urls == [url]
    assert content.published_at == datetime(2023, 12, 18, 6, 30, tzinfo=UTC)
    assert "Highlights of the Bill" in content.body_text
