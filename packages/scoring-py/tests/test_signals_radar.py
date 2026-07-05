from onlinejourno_scoring.signals_radar import radar


def test_radar_axes_and_range():
    discover = {"signals": [{"name": "og:image (large)", "value": 25, "max": 25},
                            {"name": "Freshness", "value": 20, "max": 25},
                            {"name": "E-E-A-T signals", "value": 8, "max": 10}]}
    news = {"signals": [{"name": "Author byline", "value": 20, "max": 20},
                        {"name": "Freshness", "value": 12, "max": 15},
                        {"name": "News sitemap section", "value": 10, "max": 10}]}
    search = {"signals": [{"name": "Word count / content depth", "value": 15, "max": 15},
                          {"name": "Structured data schema", "value": 15, "max": 15},
                          {"name": "HTTPS", "value": 10, "max": 10}]}
    r = radar(discover, news, search, cwv={"available": True, "grade": "A", "performance_score": 95})
    axes = {a["axis"] for a in r}
    assert axes == {"Content depth", "E-E-A-T", "Technical SEO", "Freshness", "Distribution readiness"}
    assert all(0 <= a["value"] <= 100 for a in r)


def test_radar_handles_cwv_unavailable():
    empty = {"signals": []}
    r = radar(empty, empty, empty, cwv={"available": False})
    assert len(r) == 5 and all(0 <= a["value"] <= 100 for a in r)
