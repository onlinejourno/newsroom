"""ingest-score (Agent 1): score candidate signals, write the shortlist.

One LLM call per candidate signal (provider-agnostic — see client.py). Every
call is traced and cost-capped. The completer is injected so this orchestrator
is testable without a network and runs against any configured provider.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from onlinejourno_agents import db
from onlinejourno_agents.client import Completion
from onlinejourno_agents.prompts import (
    BEAT_TAGS,
    build_score_prompt,
    default_editorial_dna,
)

Completer = Callable[..., Completion]

SHORTLIST_AGENT = "ingest-score"
SHORTLIST_PATH = "shortlist"


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

    dna = default_editorial_dna(beat_slug)
    scored: list[tuple[UUID, float, str]] = []  # (signal_id, score, rationale)
    skipped_budget = 0
    failed = 0

    for signal in candidates:
        if spent >= cap:
            skipped_budget += 1
            continue

        parts = build_score_prompt(signal, editorial_dna=dna)
        try:
            completion = completer(system=parts.system, user=parts.user, max_tokens=512)
        except Exception as exc:  # network / parse / API failure — trace and continue
            with db.connect() as conn:
                db.record_trace(
                    conn,
                    tenant_id=tenant_id,
                    agent_name=SHORTLIST_AGENT,
                    path=SHORTLIST_PATH,
                    completion=None,
                    status="failed",
                    reasoning={"error": repr(exc)},
                    related_signal_id=signal["id"],
                )
            failed += 1
            continue

        spent += completion.cost_usd
        score = _coerce_score(completion.data.get("score"))
        reasons = str(completion.data.get("reasons") or "").strip()
        beat_tag = _coerce_beat_tag(completion.data.get("beat_tag"), beat_tag_filter or "markets")

        with db.connect() as conn:
            db.record_trace(
                conn,
                tenant_id=tenant_id,
                agent_name=SHORTLIST_AGENT,
                path=SHORTLIST_PATH,
                completion=completion,
                status="success",
                reasoning={"score": score, "reasons": reasons, "beat_tag": beat_tag},
                related_signal_id=signal["id"],
            )
        scored.append((signal["id"], score, reasons))

    # Rank highest-first; persist only the top-N as the shortlist.
    scored.sort(key=lambda t: t[1], reverse=True)
    shortlisted = scored[:top_n]
    with db.connect() as conn:
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

    return ShortlistResult(
        scored=len(scored),
        shortlisted=len(shortlisted),
        skipped_budget=skipped_budget,
        failed=failed,
        spent_usd=spent,
        cap_usd=cap,
    )
