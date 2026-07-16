"""cluster-threads chunking + global index remap (avoids Groq 413 on busy days)."""

from __future__ import annotations

from onlinejourno_agents import db
from onlinejourno_agents.client import Completion
from onlinejourno_agents.cluster_threads import (
    _chunk_signals,
    _remap_threads,
    run_cluster,
)


def test_chunk_signals_bases_and_sizes():
    chunks = list(_chunk_signals(list(range(130)), 60))
    assert [(base, len(part)) for base, part in chunks] == [(0, 60), (60, 60), (120, 10)]


def test_chunk_signals_single_when_under_size():
    assert list(_chunk_signals([1, 2, 3], 60)) == [(0, [1, 2, 3])]


def test_chunk_signals_empty():
    assert list(_chunk_signals([], 60)) == []


def test_remap_threads_keeps_one_based_at_base_zero():
    out = _remap_threads([{"title": "T", "slug": "t", "items": [1, 3]}], 0)
    assert out == [{"title": "T", "slug": "t", "items": [1, 3]}]


def test_remap_threads_offsets_by_base():
    out = _remap_threads([{"title": "T", "slug": "t", "items": [1, 2]}], 60)
    assert out[0]["items"] == [61, 62]


def test_remap_threads_drops_malformed():
    out = _remap_threads(
        [
            {"title": "ok", "slug": "ok", "items": [1, "x", None, 2]},
            {"no": "items"},
            "not a dict",
        ],
        0,
    )
    assert out == [{"title": "ok", "slug": "ok", "items": [1, 2]}]


def test_remap_threads_non_list_raw():
    assert _remap_threads(None, 0) == []


class _FakeConn:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_run_cluster_chunks_and_remaps_to_global_ids(monkeypatch):
    ids = [f"sig-{i}" for i in range(130)]
    signals = [{"id": sid, "headline": f"h{i}", "source_name": "src"} for i, sid in enumerate(ids)]
    links: list[str] = []
    calls = {"n": 0}

    def fake_completer(*, system, user, max_tokens):
        calls["n"] += 1
        return Completion(
            data={"threads": [{"title": "T", "slug": "t", "items": [1, 2]}]},
            model="fake", input_tokens=10, output_tokens=5, cost_usd=0.001,
        )

    monkeypatch.setattr(db, "connect", lambda *a, **k: _FakeConn())
    monkeypatch.setattr(db, "tenant_id_for_slug", lambda conn, slug: "tid")
    monkeypatch.setattr(db, "signals_for_clustering", lambda conn, tid, *, since_hours: signals)
    monkeypatch.setattr(db, "clear_recent_thread_links", lambda conn, tid, *, since_hours: None)
    monkeypatch.setattr(db, "upsert_thread", lambda conn, **k: "thread-id")
    monkeypatch.setattr(
        db, "link_signal_to_thread",
        lambda conn, *, thread_id, signal_id, reason: links.append(signal_id),
    )
    monkeypatch.setattr(db, "record_trace", lambda conn, **k: None)
    monkeypatch.setenv("CLUSTER_MAX_SIGNALS", "60")

    result = run_cluster(
        tenant_slug="self", beat_slug=None, completer=fake_completer, since_hours=72,
    )

    assert calls["n"] == 3  # 130 signals / 60 => 3 chunked LLM calls, not one 413
    assert links == ["sig-0", "sig-1", "sig-60", "sig-61", "sig-120", "sig-121"]
    assert result.status == "success"
    assert result.spent_usd == 0.003
