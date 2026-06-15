"""PIB hydration tests — pure parsing, no network."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from onlinejourno_ingest.hydrate.pib import parse_pib_page

_FIXTURE = (Path(__file__).parent / "fixtures" / "pib_release.html").read_text()


def test_parses_body_and_date():
    content = parse_pib_page(_FIXTURE)
    # 15 JUN 2026 2:30 PM IST == 09:00 UTC
    assert content.published_at == datetime(2026, 6, 15, 9, 0, tzinfo=UTC)
    assert "National Human Rights Commission" in content.body_text
    assert "four weeks" in content.body_text
    # headline and the "Posted On" date must NOT be in the body
    assert "suo motu cognizance" not in content.body_text
    assert "Posted On" not in content.body_text


def test_missing_date_div_yields_none_date_but_keeps_body():
    html = (
        '<div class="innner-page-main-about-us-content-right-part">'
        "<h2>Headline</h2><p>Body sentence here.</p></div>"
    )
    content = parse_pib_page(html)
    assert content.published_at is None
    assert content.body_text == "Body sentence here."


def test_missing_container_yields_empty_content():
    content = parse_pib_page("<html><body>nothing</body></html>")
    assert content.body_text is None
    assert content.published_at is None
