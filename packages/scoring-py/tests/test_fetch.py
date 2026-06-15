from onlinejourno_scoring.fetch import parse_html

HTML = """
<html><head><title>Example Headline About Iran</title>
<meta name="description" content="A test description that is reasonably long enough.">
<link rel="canonical" href="https://x.com/a">
<meta property="og:title" content="OG Title"><meta property="og:image" content="https://x.com/i.jpg">
<script type="application/ld+json">{"@type":"NewsArticle","author":{"name":"Jane Doe"}}</script>
</head><body><h1>Example Headline</h1><h2>Sub</h2>
<p>word word word word word</p><img src="a.jpg" alt="x"><img src="b.jpg"></body></html>
"""


def test_parse_html_basics():
    p = parse_html(HTML, url="https://x.com/a")
    assert p.title.startswith("Example Headline")
    assert p.canonical == "https://x.com/a"
    assert p.og_image == "https://x.com/i.jpg"
    assert "NewsArticle" in p.schema_types
    assert p.has_byline is True and "Jane Doe" in p.author
    assert len(p.h1s) == 1 and len(p.h2s) == 1
    assert p.images_total == 2 and p.images_without_alt == 1
    assert p.https is True
    assert p.is_homepage is False


def test_parse_html_flags_homepage():
    p = parse_html("<html><head><title>The Hindu</title></head><body></body></html>",
                   url="https://www.thehindu.com/")
    assert p.is_homepage is True


def test_parse_html_homepage_with_path_is_false():
    p = parse_html("<html><head><title>x</title></head><body></body></html>",
                   url="https://www.thehindu.com/news/national/article123")
    assert p.is_homepage is False
