"""m-calendar — the Claim Extractor (ADR 0057): the one real LLM agent of the
Predictive Editorial Calendar. For each signal it pulls out concrete, time-bound
public promises ("the flyover will open by June"), and the (pure) Date Normaliser
resolves the deadline phrase to a target date. Everything except the extraction
itself is deterministic code — the product's cost + reliability story.

Mirrors `framing.py`: a pure `coerce_claim` validator + `to_event` builder (both
unit-tested), a cheap `has_temporal_cue` Gate to keep no-date text away from the
LLM, and a batched, cost-capped `run_claim_extraction` orchestration.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from datetime import date
from typing import Any

from onlinejourno_agents import db
from onlinejourno_agents.client import Completion
from onlinejourno_agents.date_normalise import normalise
from onlinejourno_agents.prompts import build_claim_prompt

Completer = Callable[..., Completion]

BATCH_SIZE = 6
EXTRACTOR_VERSION = "claim-extract-v1"

# The Gate (PRD): cheap temporal-cue pre-filter. Months, quarters, fiscal-year,
# relative spans, and explicit dates — the surface forms the normaliser resolves.
_CUE = re.compile(
    r"\b(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|"
    r"sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?|q[1-4]|"
    r"tomorrow|next (week|month|year)|financial year|fiscal year|year[- ]end|"
    r"(with)?in \d+|by \d{4}|\d{4}-\d{2}-\d{2}|deadline|by end of)\b",
    re.IGNORECASE,
)


def has_temporal_cue(text: str) -> bool:
    """True if the text plausibly carries a deadline worth sending to the LLM."""
    return bool(text) and bool(_CUE.search(text))


@dataclass(slots=True)
class ClaimResult:
    scanned: int
    events: int
    failed: int
    spent_usd: float
    cap_usd: float
    status: str


def coerce_claim(raw: Any) -> dict[str, Any] | None:
    """Validate one model-extracted claim into a clean dict, or None.

    A claim is meaningless without `what` (the thing promised); everything else
    is optional. Confidence is clamped to 0..1, or None if unparseable.
    """
    if not isinstance(raw, dict):
        return None
    what = str(raw.get("what") or "").strip()
    if not what:
        return None
    try:
        confidence = max(0.0, min(1.0, float(raw.get("confidence"))))
    except (TypeError, ValueError):
        confidence = None

    def _opt(key: str, limit: int) -> str | None:
        v = str(raw.get(key) or "").strip()
        return v[:limit] or None

    return {
        "who": _opt("who", 200),
        "what": what[:300],
        "deadline_text": _opt("deadline_text", 120),
        "original_claim_text": _opt("original_claim_text", 500),
        "topic": _opt("topic", 80),
        "confidence": confidence,
    }


def to_event(
    claim: dict[str, Any],
    *,
    reference: date,
    source_link: str | None,
    signal_id: str | None,
    extractor_version: str = EXTRACTOR_VERSION,
) -> dict[str, Any]:
    """Resolve a coerced claim into a calendar_event record. The deadline phrase
    is normalised against `reference` (the date the claim was made). `claim_key`
    is a stable dedup hash — independent of the reference date — so re-runs upsert
    the same row rather than duplicating it."""
    nd = normalise(claim.get("deadline_text") or "", reference)
    key_src = "|".join(
        [claim.get("who") or "", claim["what"], claim.get("deadline_text") or "", source_link or ""]
    )
    claim_key = hashlib.sha1(key_src.encode("utf-8")).hexdigest()[:16]
    return {
        "who": claim.get("who"),
        "what": claim["what"],
        "deadline_text": claim.get("deadline_text"),
        "date_claimed": reference,
        "target_date": nd.target,
        "precision": nd.precision,
        "source_link": source_link,
        "original_claim_text": claim.get("original_claim_text"),
        "confidence": claim.get("confidence"),
        "topic": claim.get("topic"),
        "signal_id": signal_id,
        "claim_key": claim_key,
        "extractor_version": extractor_version,
    }


def _chunks(seq: list[Any], size: int) -> Iterator[list[Any]]:
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def _max_tokens(n: int) -> int:
    return min(4096, 300 + 250 * n)  # claims are richer than a frame label


def run_claim_extraction(
    *,
    tenant_slug: str,
    completer: Completer,
    since_hours: int = 336,
    limit: int = 60,
) -> ClaimResult:
    """Scan enriched signals for time-bound promises, resolve their deadlines,
    and upsert calendar events. Cost-capped; each signal is marked scanned so a
    no-claim signal is never re-sent to the LLM."""
    scanned = 0
    events = 0
    failed = 0
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        cap = db.daily_cap_usd(conn, tenant_id)
        spent = db.today_cost_usd(conn, tenant_id)
        rows = db.signals_needing_claims(conn, tenant_id, since_hours=since_hours, limit=limit)
        # The Gate: only spend the LLM on signals that carry a temporal cue.
        rows = [r for r in rows if has_temporal_cue(f"{r.get('headline') or ''} {r.get('body_text') or ''}")]
        if not rows:
            return ClaimResult(0, 0, 0, spent, cap, "empty")

        for batch in _chunks(rows, BATCH_SIZE):
            if spent >= cap:
                break
            parts = build_claim_prompt(batch)
            try:
                completion = completer(
                    system=parts.system, user=parts.user, max_tokens=_max_tokens(len(batch))
                )
            except Exception:  # network / API / parse — skip the batch, keep going
                failed += len(batch)
                continue
            spent += completion.cost_usd

            results = (completion.data or {}).get("results") or []
            by_index = {r.get("index"): r for r in results if isinstance(r, dict)}
            for i, sig in enumerate(batch, start=1):
                claims = (by_index.get(i) or {}).get("claims") or []
                n = 0
                for raw in claims:
                    claim = coerce_claim(raw)
                    if claim is None:
                        failed += 1
                        continue
                    event = to_event(
                        claim,
                        reference=sig.get("claimed_date") or db.now_utc().date(),
                        source_link=sig.get("url"),
                        signal_id=sig["id"],
                    )
                    db.upsert_calendar_event(conn, tenant_id=tenant_id, event=event)
                    events += 1
                    n += 1
                db.mark_signal_calendar_scanned(conn, tenant_id=tenant_id, signal_id=sig["id"], n=n)
                scanned += 1
            conn.commit()

    return ClaimResult(scanned, events, failed, spent, cap, "success")
