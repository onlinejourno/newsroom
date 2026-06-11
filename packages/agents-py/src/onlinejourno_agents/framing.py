"""m-framing-pej — the PEJ "Framing the News" coder (Classify pillar).

Port of the news-intel Phase-2 coder onto the platform's provider-agnostic
completer: codes each signal's dominant narrative frame (one of the 14 in the
framing-india-2026 codebook — the 13 PEJ frames + the India-tuned
Institutional Critique), a PEJ topic, a frame group, confidence and a
one-line rationale. Batched like enrich; cost-capped; results land in
``signals.enrichment['framing']``.

The frame vocabulary matches the 170-article goldset
(docs/reports/framing-india-2026/dataset.json) so the coder is eval-able
against human coding.
"""

from __future__ import annotations

from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import Any

from onlinejourno_agents import db
from onlinejourno_agents.client import Completion
from onlinejourno_agents.prompts import PEJ_FRAMES, PEJ_TOPICS, build_framing_prompt

Completer = Callable[..., Completion]

BATCH_SIZE = 8
CODER_VERSION = "pej-frame-v2-platform"

# Frame groups — the rollup the framing fingerprint reports on (news-intel),
# with the India-specific Institutional Critique joining the combative group.
FRAME_GROUPS: dict[str, str] = {
    "Conflict": "combative",
    "Horse Race": "combative",
    "Wrongdoing Exposed": "combative",
    "Institutional Critique": "combative",
    "Process": "explanatory",
    "Historical Outlook": "explanatory",
    "Trend": "explanatory",
    "Straight News": "straight",
    "Policy Explored": "policy",
    "Consensus": "other",
    "Conjecture": "other",
    "Reaction": "other",
    "Reality Check": "other",
    "Personality Profile": "other",
}


@dataclass(slots=True)
class FramingResult:
    coded: int
    failed: int
    spent_usd: float
    cap_usd: float
    status: str


def _chunks(seq: list[Any], size: int) -> Iterator[list[Any]]:
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def coerce_coding(raw: Any) -> dict[str, Any] | None:
    """Validate one model result into a framing coding, or None."""
    if not isinstance(raw, dict):
        return None
    frame = raw.get("frame")
    if frame not in PEJ_FRAMES:
        return None
    topic = raw.get("topic")
    confidence = raw.get("confidence")
    try:
        confidence = max(0.0, min(1.0, float(confidence)))
    except (TypeError, ValueError):
        confidence = None
    return {
        "frame": frame,
        "frame_group": FRAME_GROUPS[frame],
        "topic": topic if topic in PEJ_TOPICS else None,
        "confidence": confidence,
        "rationale": str(raw.get("rationale") or "")[:300] or None,
        "coder_version": CODER_VERSION,
    }


def _max_tokens(n: int) -> int:
    return min(4096, 200 + 150 * n)


def run_framing(
    *,
    tenant_slug: str,
    completer: Completer,
    since_hours: int = 168,
    limit: int = 60,
    target: str = "signals",
) -> FramingResult:
    """``target`` = "signals" (the inflow) or "stories" (own published work,
    ADR 0054-B — the Differentiation Ratio needs frames on stories)."""
    coded = 0
    failed = 0
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        cap = db.daily_cap_usd(conn, tenant_id)
        spent = db.today_cost_usd(conn, tenant_id)
        if target == "stories":
            rows = db.stories_needing_framing(conn, tenant_id, limit=limit)
        else:
            rows = db.signals_needing_framing(
                conn, tenant_id, since_hours=since_hours, limit=limit
            )
        if not rows:
            return FramingResult(0, 0, spent, cap, "empty")

        for batch in _chunks(rows, BATCH_SIZE):
            if spent >= cap:
                break
            parts = build_framing_prompt(batch)
            try:
                completion = completer(
                    system=parts.system,
                    user=parts.user,
                    max_tokens=_max_tokens(len(batch)),
                )
            except Exception:  # network / API / parse — skip the batch, keep going
                failed += len(batch)
                continue
            spent += completion.cost_usd

            results = (completion.data or {}).get("results") or []
            by_index = {r.get("index"): r for r in results if isinstance(r, dict)}
            for i, sig in enumerate(batch, start=1):
                coding = coerce_coding(by_index.get(i))
                if coding is None:
                    failed += 1
                    continue
                if target == "stories":
                    db.update_story_framing(
                        conn, tenant_id=tenant_id, story_id=sig["id"], framing=coding
                    )
                else:
                    db.update_signal_framing(
                        conn, tenant_id=tenant_id, signal_id=sig["id"], framing=coding
                    )
                coded += 1
            conn.commit()

    return FramingResult(coded, failed, spent, cap, "success")
