"""cluster-threads: group recent signals into story threads (precise velocity).

One LLM call clusters the window's signals into named threads; thread_links
then back the velocity shown on the shortlist. Re-clusters fresh each run
(drops the window's links first). The completer is injected for testability.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass

from onlinejourno_agents import db
from onlinejourno_agents.client import Completion
from onlinejourno_agents.prompts import build_cluster_prompt, default_editorial_dna

Completer = Callable[..., Completion]
CLUSTER_AGENT = "cluster-threads"
CLUSTER_PATH = "thread"


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

    parts = build_cluster_prompt(signals, editorial_dna=default_editorial_dna(beat_slug))
    try:
        completion = completer(system=parts.system, user=parts.user, max_tokens=4096)
    except Exception as exc:
        with db.connect() as conn:
            db.record_trace(
                conn, tenant_id=tenant_id, agent_name=CLUSTER_AGENT, path=CLUSTER_PATH,
                completion=None, status="failed", reasoning={"error": repr(exc)},
            )
        return ClusterResult(0, 0, 0.0, "failed")

    ids = [s["id"] for s in signals]
    raw = completion.data.get("threads")
    threads = raw if isinstance(raw, list) else []
    made = linked = 0

    with db.connect() as conn:
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

    with db.connect() as conn:
        db.record_trace(
            conn, tenant_id=tenant_id, agent_name=CLUSTER_AGENT, path=CLUSTER_PATH,
            completion=completion, status="success",
            reasoning={"threads": made, "linked": linked},
        )
    return ClusterResult(made, linked, completion.cost_usd, "success")
