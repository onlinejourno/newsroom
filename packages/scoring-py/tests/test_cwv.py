from onlinejourno_scoring.cwv import grade_cwv, page_experience


def test_grade_cwv_good():
    g = grade_cwv(performance_score=95, lcp_ms=2000, cls_score=0.05, tbt_ms=150, fcp_ms=1200)
    assert g["available"] is True and g["grade"] in ("A", "B")
    assert g["metrics"]["lcp_ms"] == 2000


def test_grade_cwv_poor():
    g = grade_cwv(performance_score=25, lcp_ms=6000, cls_score=0.4, tbt_ms=900, fcp_ms=4000)
    assert g["grade"] in ("D", "F")
    assert g["recommendations"]  # non-empty remediation


def test_page_experience_no_key_degrades(monkeypatch):
    monkeypatch.delenv("PAGESPEED_API_KEY", raising=False)
    r = page_experience("https://x.com/a")
    assert r["available"] is False and "reason" in r
