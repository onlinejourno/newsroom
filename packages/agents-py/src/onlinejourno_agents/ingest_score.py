"""ingest-score (Agent 1): score candidate signals, write the shortlist.

One LLM call per candidate signal (provider-agnostic — see client.py). Every
call is traced and cost-capped. The completer is injected so this orchestrator
is testable without a network and runs against any configured provider.
"""

from __future__ import annotations

from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from onlinejourno_agents import db
from onlinejourno_agents.client import Completion
from onlinejourno_agents.prompts import (
    BEAT_TAGS,
    build_batch_score_prompt,
    default_editorial_dna,
)

Completer = Callable[..., Completion]

SHORTLIST_AGENT = "ingest-score"
SHORTLIST_PATH = "shortlist"

# Signals scored per LLM call. Amortises the editorial-DNA system prompt across
# the batch; small enough that one bad batch loses few items and scoring quality
# holds. One LLM call == one trace (CLAUDE.md rule 10).
BATCH_SIZE = 10


@dataclass(slots=True)
class ShortlistResult:
    scored: int
    shortlisted: int
    skipped_budget: int
    failed: int
    spent_usd: float
    cap_usd: float


def _coerce_score(raw: Any) -> float:
    try:
        val = float(raw)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, val))


def _coerce_beat_tag(raw: Any, fallback: str) -> str:
    if isinstance(raw, str) and raw in BEAT_TAGS:
        return raw
    return fallback


def _chunks(seq: list[Any], size: int) -> Iterator[list[Any]]:
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def _batch_max_tokens(n: int) -> int:
    """Output budget for a batch of `n` signals (~score+reasons per item)."""
    return min(4096, 256 + 128 * n)


def _parse_batch_scores(
    data: dict[str, Any], batch: list[dict[str, Any]], *, default_beat: str
) -> list[tuple[UUID, float, str, str]]:
    """Map the model's batch response to (signal_id, score, reasons, beat_tag).

    Indices are 1-based into `batch`. Non-dict, out-of-range, and duplicate-index
    entries are dropped. Returns one tuple per successfully-scored signal.
    """
    raw = data.get("scores")
    if not isinstance(raw, list):
        return []
    out: list[tuple[UUID, float, str, str]] = []
    seen: set[int] = set()
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        try:
            idx = int(entry.get("index"))
        except (TypeError, ValueError):
            continue
        if not (1 <= idx <= len(batch)) or idx in seen:
            continue
        seen.add(idx)
        signal = batch[idx - 1]
        out.append(
            (
                signal["id"],
                _coerce_score(entry.get("score")),
                str(entry.get("reasons") or "").strip(),
                _coerce_beat_tag(entry.get("beat_tag"), default_beat),
            )
        )
    return out


def run_shortlist(
    *,
    tenant_slug: str,
    beat_slug: str | None,
    completer: Completer,
    since_hours: int | None = 48,
    top_n: int = 20,
    candidate_limit: int = 500,
    beat_tag_filter: str | None = None,
) -> ShortlistResult:
    """Score unscored signals and persist the top-N as the shortlist.

    `completer` matches `client.make_completer()`'s signature. `beat_slug`
    sets the shortlist's beat attribution; `beat_tag_filter` optionally
    narrows candidates by source beat tag.
    """
    dna = default_editorial_dna(beat_slug)
    default_beat = beat_tag_filter or "markets"
    scored: list[tuple[UUID, float, str]] = []  # (signal_id, score, rationale)
    skipped_budget = 0
    failed = 0

    # One connection for the whole run (commit per batch). Held open across the
    # LLM calls — far cheaper than reconnecting per signal (one idle connection
    # vs. hundreds of handshakes).
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        beat_id = db.beat_id_for_slug(conn, tenant_id, beat_slug) if beat_slug else None
        cap = db.daily_cap_usd(conn, tenant_id)
        spent = db.today_cost_usd(conn, tenant_id)
        candidates = db.candidate_signals(
            conn,
            tenant_id,
            beat_tag=beat_tag_filter,
            since_hours=since_hours,
            limit=candidate_limit,
        )

        for batch in _chunks(candidates, BATCH_SIZE):
            if spent >= cap:
                skipped_budget += len(batch)
                continue

            parts = build_batch_score_prompt(batch, editorial_dna=dna)
            try:
                completion = completer(
                    system=parts.system,
                    user=parts.user,
                    max_tokens=_batch_max_tokens(len(batch)),
                )
            except Exception as exc:  # network / parse / API failure — trace and continue
                db.record_trace(
                    conn,
                    tenant_id=tenant_id,
                    agent_name=SHORTLIST_AGENT,
                    path=SHORTLIST_PATH,
                    completion=None,
                    status="failed",
                    reasoning={"error": repr(exc), "batch_size": len(batch)},
                )
                conn.commit()
                failed += len(batch)
                continue

            spent += completion.cost_usd
            results = _parse_batch_scores(completion.data, batch, default_beat=default_beat)
            db.record_trace(
                conn,
                tenant_id=tenant_id,
                agent_name=SHORTLIST_AGENT,
                path=SHORTLIST_PATH,
                completion=completion,
                status="success",
                reasoning={
                    "batch_size": len(batch),
                    "scored": [
                        {"score": s, "reasons": r, "beat_tag": bt}
                        for (_sid, s, r, bt) in results
                    ],
                },
            )
            conn.commit()
            scored.extend((sid, s, r) for (sid, s, r, _bt) in results)

        # Rank highest-first; persist only the top-N as the shortlist.
        scored.sort(key=lambda t: t[1], reverse=True)
        shortlisted = scored[:top_n]
        for rank, (signal_id, score, rationale) in enumerate(shortlisted, start=1):
            db.insert_shortlist_item(
                conn,
                tenant_id=tenant_id,
                signal_id=signal_id,
                beat_id=beat_id,
                score=score,
                rank=rank,
                rationale=rationale,
            )
        conn.commit()

    return ShortlistResult(
        scored=len(scored),
        shortlisted=len(shortlisted),
        skipped_budget=skipped_budget,
        failed=failed,
        spent_usd=spent,
        cap_usd=cap,
    )
