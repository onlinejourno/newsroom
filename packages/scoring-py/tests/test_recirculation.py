from onlinejourno_scoring.models import Page
from onlinejourno_scoring.recirculation import recirculation


def test_zero_links_low_score_with_advice():
    r = recirculation(Page(url="https://x.com/a", internal_links=0))
    assert r["score"] == 0
    assert any("internal link" in rec.lower() for rec in r["recommendations"])


def test_strong_recirc_scores_high():
    p = Page(url="https://x.com/a", internal_links=10, same_section_links=8,
             good_anchors=9, weak_anchors=1, has_related_block=True, deeper_taxonomy_links=3)
    r = recirculation(p)
    assert r["score"] >= 80


def test_returns_metrics_and_recommendations():
    r = recirculation(Page(url="https://x.com/a", internal_links=5, same_section_links=2,
                           good_anchors=3, weak_anchors=2))
    assert "score" in r and "metrics" in r and "recommendations" in r
    assert isinstance(r["recommendations"], list)
