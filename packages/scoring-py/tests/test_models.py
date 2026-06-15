from onlinejourno_scoring.models import Page


def test_page_defaults():
    p = Page(url="https://x.com/a")
    assert p.url == "https://x.com/a"
    assert p.title == "" and p.word_count == 0
    assert p.h1s == [] and p.schema_types == []
    assert p.cf_blocked is False and p.is_live_blog is False
    assert p.internal_links == 0 and p.external_links == 0
    assert p.is_homepage is False
