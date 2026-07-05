"""Need-mix view (ADR 0049) — pure analysis tests."""

from __future__ import annotations

from onlinejourno_agents.need_mix import build_mix, render_mix


def _rows():
    return [
        {"beat": "Business", "user_need": "know", "n": 7},
        {"beat": "Business", "user_need": "understand", "n": 2},
        {"beat": "Business", "user_need": "do", "n": 1},
        {"beat": "Economy", "user_need": "know", "n": 2},
        {"beat": "Economy", "user_need": "understand", "n": 3},
    ]


def test_build_mix_shares_and_flags():
    report = build_mix(_rows())
    overall = report["overall"]
    assert overall.total == 15
    assert abs(overall.shares["know"] - 9 / 15) < 1e-9

    biz = next(m for m in report["beats"] if m.beat == "Business")
    # know = 7/10 -> Update-me overproduction flagged
    assert any("Update me" in f for f in biz.flags)

    eco = next(m for m in report["beats"] if m.beat == "Economy")
    # know = 2/5, no overproduction; do absent with n>=5 -> gap flagged
    assert any("do" in f for f in eco.flags)
    assert not any("Update me" in f for f in eco.flags)


def test_build_mix_ignores_unknown_needs():
    report = build_mix([
        {"beat": "X", "user_need": "banana", "n": 99},
        {"beat": "X", "user_need": "feel", "n": 1},
    ])
    assert report["overall"].total == 1
    assert report["overall"].shares["feel"] == 1.0


def test_render_mix_readable():
    out = render_mix(build_mix(_rows()))
    assert "need-mix" in out and "Business" in out and "⚠" in out
