from onlinejourno_scoring.models import Page
from onlinejourno_scoring.audit import audit_page


def test_audit_page_assembles_all_sections():
    p = Page(url="https://x.com/a", title="A reasonably good headline about Iran sanctions",
             has_byline=True, author="Jane Doe", word_count=900, schema_types=["NewsArticle"],
             https=True, section_path="International", internal_links=6, same_section_links=4,
             good_anchors=5)
    a = audit_page(p, trend="Iran", need="", surfaces=["discover", "google_news", "google_search"],
                   with_external=False, cwv={"available": False})
    for key in ("overall", "checks", "surfaces", "composite", "sqeg", "recirculation", "radar", "taxonomy"):
        assert key in a
    assert set(a["surfaces"]) == {"discover", "google_news", "google_search"}
    assert a["overall"]["grade"] in list("ABCDF")


def test_audit_page_flags_homepage():
    a = audit_page(Page(url="https://x.com/", is_homepage=True), trend="", need="",
                   surfaces=["discover"], with_external=False, cwv={"available": False})
    assert "warning" in a and "homepage" in a["warning"].lower()
