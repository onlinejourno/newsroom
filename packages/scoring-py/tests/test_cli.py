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
