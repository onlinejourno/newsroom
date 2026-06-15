from datetime import datetime, timezone
from onlinejourno_scoring.models import Page
from onlinejourno_scoring.channels import (
    score_discover, score_news, score_search, score_aio,
    score_surfaces, need_weighted_composite, grade,
)

FRESH = datetime(2026, 6, 14, 10, tzinfo=timezone.utc)
NOW = datetime(2026, 6, 14, 12, tzinfo=timezone.utc)


def _sig(res, name):
    return next(s for s in res["signals"] if s["name"].lower().startswith(name.lower()))


def test_discover_freshness_full_when_under_6h():
    r = score_discover(Page(url="https://x.com/a", published_dt=FRESH), trend_alignment=0.0, now=NOW)
    assert _sig(r, "Fresh")["value"] == 25


def test_news_byline_zero_without_author():
    r = score_news(Page(url="https://x.com/a", has_byline=False), now=NOW)
    assert _sig(r, "Author")["value"] == 0 and _sig(r, "Author")["max"] == 20


def test_news_has_rich_signals():
    from onlinejourno_scoring.channels import score_news
    from datetime import datetime, timezone
    r = score_news(Page(url="https://x.com/a", schema_types=["NewsArticle"], has_byline=True,
                        author="J Doe", named_sources=["Official A"], section_path="World"),
                   now=datetime(2026, 6, 14, 12, tzinfo=timezone.utc))
    names = {s["name"] for s in r["signals"]}
    assert "Original reporting signals" in names
    assert "News sitemap section" in names
    assert "Published date visible" in names
    assert max(s["max"] for s in r["signals"] if s["name"] == "Original reporting signals") == 20


def test_search_has_eight_rich_signals():
    from onlinejourno_scoring.channels import score_search
    from datetime import datetime, timezone
    r = score_search(Page(url="https://x.com/a", word_count=900, meta_description="x"*120,
                          h1s=["H"], h2s=["A","B"], internal_links=8, external_links=4,
                          schema_types=["NewsArticle"]), trend="policy",
                     now=datetime(2026, 6, 14, 12, tzinfo=timezone.utc))
    names = {s["name"] for s in r["signals"]}
    assert {"Title keyword alignment","Meta description","H1/H2 structure",
            "Word count / content depth","Internal links","External citations",
            "Structured data schema","HTTPS"} <= names
    assert len(r["signals"]) == 8


def test_search_depth_full_at_900_words():
    r = score_search(Page(url="https://x.com/a", word_count=900), trend="", now=NOW)
    assert _sig(r, "Word")["value"] >= 1  # depth signal present + scored


def test_aio_rewards_structured_answer_and_schema():
    p = Page(url="https://x.com/a", schema_types=["NewsArticle"], has_byline=True,
             author="J Doe", body_text="The committee will table the report next week. " * 3,
             published_dt=FRESH, h2s=["What happened", "Why it matters"])
    r = score_aio(p, trend="report", now=NOW)
    assert r["score"] > 0 and "grade" in r
    assert any("answer" in s["name"].lower() or "structured" in s["name"].lower() for s in r["signals"])


def test_score_surfaces_only_requested_keys():
    p = Page(url="https://x.com/a")
    out = score_surfaces(p, ["discover", "aio", "bogus"], trend="", trend_alignment=0.0, now=NOW)
    assert set(out) == {"discover", "aio"}  # unknown keys skipped


def test_need_weighted_composite_reweights():
    scored = {"discover": {"score": 80, "grade": "A", "signals": []},
              "google_search": {"score": 40, "grade": "D", "signals": []}}
    know = need_weighted_composite(scored, "know")       # discover 1.5, search 1.0
    understand = need_weighted_composite(scored, "understand")  # search 1.5, discover 0.75
    assert know["composite"] > understand["composite"]
    assert "priority_surfaces" in know and "top_fix" in know


def test_grade_bands():
    assert grade(80) == "A" and grade(34) == "F"
