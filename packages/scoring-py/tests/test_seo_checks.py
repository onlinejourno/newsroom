from onlinejourno_scoring.models import Page
from onlinejourno_scoring.seo_checks import run_checks, overall, grade, score_checks


def _find(checks, signal):
    return next(c for c in checks if c["signal"].lower().startswith(signal.lower()))


def test_grade_bands():
    assert grade(85) == "A" and grade(70) == "B" and grade(55) == "C"
    assert grade(40) == "D" and grade(10) == "F"


def test_overall_formula():
    assert overall(passed=8, total=10, critical=1, warning=1) == 64  # 80-12-4
    assert overall(passed=0, total=10, critical=5, warning=5) == 0   # floored at 0


def test_https_critical_when_not_secure():
    c = _find(run_checks(Page(url="http://x.com/a", https=False)), "HTTPS")
    assert c["severity"] == "critical" and c["element"] == "Sc"


def test_title_length_warning_when_too_long():
    c = _find(run_checks(Page(url="https://x.com/a", title="x" * 90)), "Title length")
    assert c["severity"] == "warning"


def test_author_critical_when_no_byline():
    c = _find(run_checks(Page(url="https://x.com/a", has_byline=False)), "Author")
    assert c["severity"] == "critical" and c["element"] == "Au"


def test_schema_critical_when_absent():
    c = _find(run_checks(Page(url="https://x.com/a", schema_types=[])), "Structured")
    assert c["severity"] == "critical" and c["element"] == "Sd"


def test_word_count_critical_when_thin():
    c = _find(run_checks(Page(url="https://x.com/a", word_count=120)), "Word count")
    assert c["severity"] == "critical"


def test_score_checks_shape():
    r = score_checks(Page(url="https://x.com/a", title="A solid headline about policy",
                          has_byline=True, author="J Doe", word_count=900,
                          schema_types=["NewsArticle"], https=True))
    assert set(r) >= {"checks", "score", "grade", "counts"}
    assert r["grade"] in list("ABCDF")
    assert set(r["counts"]) == {"critical", "warning", "ok"}


def test_author_degrades_on_homepage_not_critical():
    # R2: a homepage URL must not score a spurious "critical" for a missing byline
    c = _find(run_checks(Page(url="https://x.com/", has_byline=False, is_homepage=True)), "Author")
    assert c["severity"] == "warning"
