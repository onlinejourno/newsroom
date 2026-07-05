from onlinejourno_scoring.potential import (
    potential_score, reach_score, label, freshness_from_hours,
)


def test_weighted_composite():
    assert potential_score(trend_momentum=100, content_alignment=100,
                           domain_authority=100, freshness=100) == 100.0
    assert round(potential_score(trend_momentum=50, content_alignment=0,
                                 domain_authority=0, freshness=0), 1) == 20.0  # 0.40*50


def test_merit_none_preserves_reach_only():
    # Back-compat: no merit term == the pure reach composite.
    kw = dict(trend_momentum=80, content_alignment=80, domain_authority=80, freshness=80)
    assert potential_score(**kw) == potential_score(**kw, merit=None) == reach_score(**kw)


def test_merit_term_denies_commodity_a_high_band():
    # Polished wire-rewrite of a trend on an authoritative domain: high reach,
    # mediocre merit (no named journalist/sources). Reach alone would say HIGH.
    kw = dict(trend_momentum=85, content_alignment=90, domain_authority=70, freshness=100)
    reach_only = potential_score(**kw)
    assert label(reach_only) == "HIGH"            # the commodity play scores HIGH on reach
    with_merit = potential_score(**kw, merit=55)
    assert with_merit < reach_only
    assert label(with_merit) != "HIGH"            # merit-weighting takes the HIGH away


def test_merit_rich_story_keeps_high():
    # Named reporter, named sources, citations (high merit) + reach-ready: stays HIGH.
    s = potential_score(trend_momentum=85, content_alignment=85,
                        domain_authority=80, freshness=90, merit=88)
    assert label(s) == "HIGH"


def test_labels():
    assert label(80) == "HIGH" and label(60) == "MEDIUM"
    assert label(40) == "LOW" and label(10) == "VERY LOW"


def test_freshness_bands():
    assert freshness_from_hours(1) == 100 and freshness_from_hours(100) == 10
