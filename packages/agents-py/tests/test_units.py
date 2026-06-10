"""Pure-unit tests — no network, no Postgres. Run with `pytest`.

The DB-touching orchestrators (run_shortlist, run_brief) are validated
against a live Postgres + a real shortlist; here we lock the pure logic that
the orchestrators lean on: cost math, JSON parsing, prompt shape, citation
mapping, score coercion, and Markdown rendering.
"""

from __future__ import annotations

import math

import pytest

from onlinejourno_agents.brief_compose import _map_cites
from onlinejourno_agents.client import (
    compute_cost_usd,
    parse_json_object,
    provider_config_from_env,
)
from onlinejourno_agents.ingest_score import (
    _coerce_beat_tag,
    _coerce_score,
    _parse_batch_scores,
)
from onlinejourno_agents.keywords import (
    KeywordVolume,
    best_for,
    fetch_volumes,
    parse_response,
)
from onlinejourno_agents.prompts import (
    BEAT_TAGS,
    build_batch_score_prompt,
    build_brief_prompt,
    build_score_prompt,
    default_editorial_dna,
)
from onlinejourno_agents.render import brief_to_markdown

# --- cost ---------------------------------------------------------------

def test_compute_cost_usd_sonnet():
    # 1M input @ $3 + 1M output @ $15 = $18
    cost, tracked = compute_cost_usd("claude-sonnet-4-5", 1_000_000, 1_000_000)
    assert math.isclose(cost, 18.0) and tracked is True
    cost2, _ = compute_cost_usd("claude-sonnet-4-5", 1000, 200)
    assert math.isclose(cost2, (1000 / 1e6) * 3 + (200 / 1e6) * 15)


def test_compute_cost_unknown_model_untracked():
    # A local / self-hosted or unpriced model is untracked ($0), not an error.
    cost, tracked = compute_cost_usd("llama-3.1-8b-local", 1000, 1000)
    assert cost == 0.0 and tracked is False


def test_compute_cost_price_override():
    cost, tracked = compute_cost_usd(
        "some-cloud-model", 1_000_000, 0, price_in=2.0, price_out=8.0
    )
    assert math.isclose(cost, 2.0) and tracked is True


# --- json parsing -------------------------------------------------------

def test_parse_bare_json():
    assert parse_json_object('{"score": 0.8, "beat_tag": "markets"}')["score"] == 0.8


def test_parse_fenced_json():
    text = '```json\n{"score": 0.5, "reasons": "x"}\n```'
    assert parse_json_object(text)["reasons"] == "x"


def test_parse_json_with_prose_prefix():
    text = 'Here is the result: {"score": 0.1}'
    assert parse_json_object(text)["score"] == 0.1


# --- score / beat coercion ---------------------------------------------

@pytest.mark.parametrize(
    "raw,expected",
    [(1.5, 1.0), (-2, 0.0), ("0.4", 0.4), (None, 0.0), ("x", 0.0)],
)
def test_coerce_score(raw, expected):
    assert _coerce_score(raw) == expected


def test_coerce_beat_tag_valid_and_fallback():
    assert _coerce_beat_tag("regulatory", "markets") == "regulatory"
    assert _coerce_beat_tag("nonsense", "markets") == "markets"
    assert _coerce_beat_tag(None, "corp") == "corp"
    assert all(tag in BEAT_TAGS for tag in ("markets", "regulatory", "corp"))


# --- prompts ------------------------------------------------------------

def test_build_score_prompt_shape():
    parts = build_score_prompt(
        {"headline": "SEBI fines XYZ", "body_text": "long body", "source_name": "SEBI"},
        editorial_dna=default_editorial_dna("markets-regulatory"),
    )
    assert "SEBI fines XYZ" in parts.user
    assert '"score"' in parts.system and '"beat_tag"' in parts.system
    assert "JSON" in parts.system


def test_build_batch_score_prompt_numbers_items():
    signals = [
        {"headline": "SEBI fines XYZ", "body_text": "b", "source_name": "SEBI"},
        {"headline": "RBI holds rate", "body_text": "b", "source_name": "RBI"},
    ]
    parts = build_batch_score_prompt(signals, editorial_dna="DNA")
    assert "[1] SEBI fines XYZ" in parts.user and "[2] RBI holds rate" in parts.user
    assert '"scores"' in parts.system and '"index"' in parts.system
    assert "JSON" in parts.system


def test_build_brief_prompt_numbers_items_and_asks_cites():
    items = [
        {"headline": "A", "source_name": "RBI", "rationale": "rate move", "body_text": "b"},
        {"headline": "B", "source_name": "NSE", "rationale": "filing", "body_text": "b"},
    ]
    parts = build_brief_prompt(items, editorial_dna="DNA", beat_name="markets")
    assert "[1] A" in parts.user and "[2] B" in parts.user
    assert '"cites"' in parts.system and '"sections"' in parts.system


# --- batch score parsing ------------------------------------------------

def test_parse_batch_scores_maps_and_filters():
    batch = [{"id": "aaa"}, {"id": "bbb"}, {"id": "ccc"}]
    data = {"scores": [
        {"index": 1, "score": 0.9, "reasons": "x", "beat_tag": "regulatory"},
        {"index": 3, "score": 1.5, "reasons": "y", "beat_tag": "nonsense"},
        {"index": 9, "score": 0.5},   # out of range -> dropped
        {"index": 1, "score": 0.1},   # duplicate index -> dropped
        "garbage",                    # non-dict -> dropped
    ]}
    out = _parse_batch_scores(data, batch, default_beat="markets")
    assert out == [
        ("aaa", 0.9, "x", "regulatory"),
        ("ccc", 1.0, "y", "markets"),  # score clamped, bad beat -> fallback
    ]


def test_parse_batch_scores_bad_payload():
    batch = [{"id": "a"}]
    assert _parse_batch_scores({}, batch, default_beat="markets") == []
    assert _parse_batch_scores({"scores": "nope"}, batch, default_beat="markets") == []


# --- cite mapping -------------------------------------------------------

def test_map_cites_maps_and_filters():
    ids = ["aaa", "bbb", "ccc"]
    assert _map_cites([1, 3], ids) == ["aaa", "ccc"]
    assert _map_cites([0, 4, "x", 2], ids) == ["bbb"]  # out-of-range + garbage dropped
    assert _map_cites("nope", ids) == []


# --- render -------------------------------------------------------------

def test_render_brief_markdown():
    content = {
        "meta": {"beat": "markets", "edition_date": "2026-06-05", "shortlist_items": 2},
        "sections": [
            {
                "heading": "Regulatory",
                "lede_one_liner": "SEBI moves.",
                "body": "SEBI issued a circular.",
                "signals": ["sig-1"],
            }
        ],
    }
    md = brief_to_markdown(
        content,
        title="Morning Brief — markets",
        disclosure_text="Composed by AI.",
        signal_urls={"sig-1": "https://sebi.gov.in/x"},
    )
    assert "# Morning Brief — markets" in md
    assert "## Regulatory" in md
    assert "**SEBI moves.**" in md
    assert "https://sebi.gov.in/x" in md
    assert "Composed by AI." in md


def test_render_empty_sections():
    md = brief_to_markdown({"meta": {}, "sections": []})
    assert "No sections" in md


# --- provider config ----------------------------------------------------

def test_provider_config_default_anthropic(monkeypatch):
    for k in (
        "LLM_PROVIDER", "LLM_MODEL", "LLM_API_KEY", "LLM_BASE_URL",
        "ANTHROPIC_DEFAULT_MODEL",
    ):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    cfg = provider_config_from_env()
    assert cfg.provider == "anthropic"
    assert cfg.model == "claude-sonnet-4-5"
    assert cfg.api_key == "sk-test"
    assert cfg.base_url is None


def test_provider_config_openai_local(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_MODEL", "llama3.1")
    monkeypatch.setenv("LLM_BASE_URL", "http://localhost:11434/v1")
    monkeypatch.delenv("LLM_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    cfg = provider_config_from_env()
    assert cfg.provider == "openai"
    assert cfg.model == "llama3.1"
    assert cfg.base_url.endswith("/v1")


def test_provider_config_unknown_provider_raises(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "groqzilla")
    with pytest.raises(ValueError):
        provider_config_from_env()


# --- keywords everywhere (Search-fit) -----------------------------------

def _kv(name, vol, trend_vals):
    return KeywordVolume(
        keyword=name, volume=vol, competition=0.0,
        trend=[{"value": v} for v in trend_vals],
    )


def test_trend_direction():
    assert _kv("a", 100, [10, 10, 10, 30, 30, 30]).trend_direction == "rising"
    assert _kv("a", 100, [30, 30, 30, 10, 10, 10]).trend_direction == "falling"
    assert _kv("a", 100, [20, 20, 20, 21, 20, 19]).trend_direction == "flat"
    assert _kv("a", 100, [10, 20]).trend_direction == "flat"  # too few points


def test_parse_response():
    payload = {"data": [
        {"keyword": "Repo Rate", "vol": 135000, "competition": 0.1,
         "trend": [{"month": "May", "year": 2026, "value": 74000}]},
        {"keyword": "", "vol": 5},  # skipped (no keyword)
    ]}
    out = parse_response(payload)
    assert "repo rate" in out and out["repo rate"].volume == 135000
    assert len(out) == 1


def test_best_for_picks_highest_volume():
    vols = {"repo rate": _kv("repo rate", 135000, []), "rbi mpc": _kv("rbi mpc", 18100, [])}
    assert best_for(["RBI MPC", "Repo Rate"], vols).keyword == "repo rate"
    assert best_for(["nonexistent"], vols) is None


def test_fetch_volumes_no_key_returns_empty(monkeypatch):
    monkeypatch.delenv("KEYWORDS_EVERYWHERE_API_KEY", raising=False)
    assert fetch_volumes(["repo rate"]) == {}
    assert fetch_volumes([], key="x") == {}  # no keywords


def test_render_search_fit_strong_and_weak():
    content = {"meta": {}, "sections": [
        {"heading": "RBI", "body": "x", "signals": [],
         "search_fit": {"keyword": "repo rate", "volume": 135000, "trend": "rising"}},
        {"heading": "SEBI scoop", "body": "y", "signals": [],
         "search_fit": {"keyword": "rajesh exports sebi", "volume": 0, "trend": "flat"}},
    ]}
    md = brief_to_markdown(content)
    assert "Search fit:** strong" in md and "repo rate" in md and "135,000" in md
    assert "Search fit:** weak" in md and "not a Search play" in md


def test_build_enrich_prompt_slim_for_nlp_first():
    from onlinejourno_agents.prompts import build_enrich_prompt

    sigs = [{"headline": "RBI cuts repo rate", "body_text": "The central bank…"}]
    full = build_enrich_prompt(sigs)
    slim = build_enrich_prompt(sigs, include_extraction=False)
    assert '"entities"' in full.system and '"geo"' in full.system
    assert '"entities"' not in slim.system and '"geo"' not in slim.system
    # Classification fields stay in both (ADR 0048: NLP-first trims extraction only).
    for part in (full, slim):
        assert '"beat"' in part.system and '"user_need"' in part.system
    assert len(slim.system) < len(full.system)
