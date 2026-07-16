"""cluster-threads: group recent signals into story threads (precise velocity).

Signals are chunked across one or more LLM calls (each stays under the Groq
free-tier per-request limit); the returned threads back the velocity shown on
the shortlist. Re-clusters fresh each run (drops the window's links first). The
completer is injected for testability.
"""

from __future__ import annotations

import os
import re
from collections.abc import Callable, Iterator
from dataclasses import dataclass, replace
from typing import Any

from onlinejourno_agents import db
from onlinejourno_agents.client import Completion
from onlinejourno_agents.prompts import build_cluster_prompt, default_editorial_dna

Completer = Callable[..., Completion]
CLUSTER_AGENT = "cluster-threads"
CLUSTER_PATH = "thread"

# Groq's free tier rejects an over-large clustering prompt with HTTP 413 (or
# dies on TPD-429 first on 70b). Cap signals per LLM call and batch the rest so
# each request stays under the per-request limit; threads merge across chunks.
_DEFAULT_MAX_SIGNALS = 60


def _max_signals_per_call() -> int:
    """Signals per clustering call. Env-tunable without a redeploy."""
    raw = os.environ.get("CLUSTER_MAX_SIGNALS")
    if raw and raw.isdigit() and int(raw) > 0:
        return int(raw)
    return _DEFAULT_MAX_SIGNALS


def _chunk_signals(
    signals: list[dict[str, Any]], size: int
) -> Iterator[tuple[int, list[dict[str, Any]]]]:
    """Yield (base, chunk); base = count of signals before this chunk."""
    for base in range(0, len(signals), size):
        yield base, signals[base:base + size]


def _remap_threads(raw: object, base: int) -> list[dict[str, Any]]:
    """Remap a chunk's threads to global 1-based item indices (base + i).

    Items are 1-based within the chunk; malformed threads/items are dropped so
    the merged result matches the single-call shape the persist loop expects.
    """
    threads = raw if isinstance(raw, list) else []
    out: list[dict[str, Any]] = []
    for t in threads:
        if not isinstance(t, dict) or not isinstance(t.get("items"), list):
            continue
        items: list[int] = []
        for it in t["items"]:
            try:
                items.append(base + int(it))
            except (TypeError, ValueError):
                continue
        out.append({"title": t.get("title"), "slug": t.get("slug"), "items": items})
    return out


@dataclass(slots=True)
class ClusterResult:
    threads: int
    linked: int
    spent_usd: float
    status: str


def _slugify(text: str | None, *, fallback: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return slug[:60] or fallback


def run_cluster(
    *,
    tenant_slug: str,
    beat_slug: str | None,
    completer: Completer,
    since_hours: int = 24,
) -> ClusterResult:
    """Cluster recent signals into threads and persist thread_links."""
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        beat_id = db.beat_id_for_slug(conn, tenant_id, beat_slug) if beat_slug else None
        signals = db.signals_for_clustering(conn, tenant_id, since_hours=since_hours)

    if not signals:
        return ClusterResult(0, 0, 0.0, "empty")

    dna = default_editorial_dna(beat_slug)
    threads: list[dict[str, Any]] = []
    last: Completion | None = None
    in_tokens = out_tokens = 0
    total_cost = 0.0
    try:
        for base, chunk in _chunk_signals(signals, _max_signals_per_call()):
            parts = build_cluster_prompt(chunk, editorial_dna=dna)
            completion = completer(system=parts.system, user=parts.user, max_tokens=4096)
            last = completion
            total_cost += completion.cost_usd
            in_tokens += completion.input_tokens
            out_tokens += completion.output_tokens
            threads.extend(_remap_threads(completion.data.get("threads"), base))
    except Exception as exc:
        with db.connect(tenant_id) as conn:
            db.record_trace(
                conn, tenant_id=tenant_id, agent_name=CLUSTER_AGENT, path=CLUSTER_PATH,
                completion=None, status="failed", reasoning={"error": repr(exc)},
            )
        return ClusterResult(0, 0, 0.0, "failed")

    if last is None:
        return ClusterResult(0, 0, 0.0, "empty")
    trace_completion = replace(
        last, cost_usd=total_cost, input_tokens=in_tokens, output_tokens=out_tokens
    )
    chunks = -(-len(signals) // _max_signals_per_call())

    ids = [s["id"] for s in signals]
    made = linked = 0

    with db.connect(tenant_id) as conn:
        db.clear_recent_thread_links(conn, tenant_id, since_hours=since_hours)
        for n, t in enumerate(threads, start=1):
            if not isinstance(t, dict) or not isinstance(t.get("items"), list):
                continue
            title = str(t.get("title") or "").strip() or "Untitled thread"
            slug = _slugify(t.get("slug") or title, fallback=f"thread-{n}")
            thread_id = db.upsert_thread(
                conn, tenant_id=tenant_id, slug=slug, title=title, beat_id=beat_id
            )
            made += 1
            for it in t["items"]:
                try:
                    idx = int(it)
                except (TypeError, ValueError):
                    continue
                if 1 <= idx <= len(ids):
                    db.link_signal_to_thread(
                        conn, thread_id=thread_id, signal_id=ids[idx - 1], reason=title
                    )
                    linked += 1

    with db.connect(tenant_id) as conn:
        db.record_trace(
            conn, tenant_id=tenant_id, agent_name=CLUSTER_AGENT, path=CLUSTER_PATH,
            completion=trace_completion, status="success",
            reasoning={"threads": made, "linked": linked, "chunks": chunks},
        )
    return ClusterResult(made, linked, total_cost, "success")
