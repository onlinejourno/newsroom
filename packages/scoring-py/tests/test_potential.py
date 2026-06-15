from onlinejourno_scoring.potential import potential_score, label, freshness_from_hours


def test_weighted_composite():
    assert potential_score(trend_momentum=100, content_alignment=100,
                           domain_authority=100, freshness=100) == 100.0
    assert round(potential_score(trend_momentum=50, content_alignment=0,
                                 domain_authority=0, freshness=0), 1) == 20.0  # 0.40*50


def test_labels():
    assert label(80) == "HIGH" and label(60) == "MEDIUM"
    assert label(40) == "LOW" and label(10) == "VERY LOW"


def test_freshness_bands():
    assert freshness_from_hours(1) == 100 and freshness_from_hours(100) == 10
