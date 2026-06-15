from onlinejourno_scoring.models import Page
from onlinejourno_scoring.sqeg import classify_ymyl, page_quality, needs_met


def test_ymyl_health_is_critical():
    y = classify_ymyl(Page(url="https://x.com/h", section_path="Health", body_text="vaccine rollout"))
    assert y["level"] == "Critical YMYL" and y["is_ymyl"] is True


def test_ymyl_sport_is_low():
    y = classify_ymyl(Page(url="https://x.com/s", section_path="Sport"))
    assert y["level"] == "Low YMYL"


def test_pq_anonymous_news_flags_risk():
    pq = page_quality(Page(url="https://x.com/a", has_byline=False, word_count=120, schema_types=[]))
    assert any("nonymous" in f for f in pq["risk_flags"])
    assert pq["grade"].endswith("PQ")
    assert any("ref" in s for s in pq["signals"])  # SQEG §refs present


def test_needs_met_fails_when_no_overlap():
    nm = needs_met(Page(url="https://x.com/a", section_path="Sport", title="Cricket score"), trend="election")
    assert nm["needs_met"] == "Fails to Meet" and nm["alignment_ratio"] == 0.0
