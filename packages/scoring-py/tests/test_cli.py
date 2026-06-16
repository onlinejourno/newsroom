from onlinejourno_scoring.cli import build_parser


def test_audit_subcommand_parses_all_flags():
    p = build_parser()
    ns = p.parse_args([
        "audit", "https://example.com/x",
        "--trend", "Iran", "--need", "understand",
        "--surfaces", "discover,aio", "--json",
    ])
    assert ns.url == "https://example.com/x"
    assert ns.trend == "Iran" and ns.need == "understand"
    assert ns.surfaces == "discover,aio" and ns.json is True


def test_surfaces_has_default():
    ns = build_parser().parse_args(["audit", "https://x.com/a"])
    assert ns.surfaces == "discover,google_news,google_search"


def test_topic_domains_subcommand_parses():
    p = build_parser()
    ns = p.parse_args(["topic-domains", "Iran", "--days", "14", "--json"])
    assert ns.topic == "Iran"
    assert ns.days == 14
    assert ns.json is True


def test_topic_domains_defaults():
    ns = build_parser().parse_args(["topic-domains", "climate"])
    assert ns.days == 7
    assert ns.json is False


def test_ranking_keywords_subcommand_parses():
    p = build_parser()
    ns = p.parse_args(["ranking-keywords", "thehindu.com", "--json"])
    assert ns.domain == "thehindu.com"
    assert ns.json is True


def test_ranking_keywords_defaults():
    ns = build_parser().parse_args(["ranking-keywords", "thehindu.com"])
    assert ns.domain == "thehindu.com"
    assert ns.json is False
