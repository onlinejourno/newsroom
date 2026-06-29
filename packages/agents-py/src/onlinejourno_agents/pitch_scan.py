"""pitch-scan (spec 2026-06-28 §C3): extract entities/topic from a pitch and
score it. Mirrors claim_extract.py — a cheap Gate, a pure coercer, then a
cost-capped LLM call, then the (pure) scoring engine.

This file is built in two tasks: Task 5 adds the pure Gate + coercer (below);
Task 6 appends the scan_pitch() orchestration. Keep this public surface stable.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from onlinejourno_scoring.pitch_weight import archival_weight, decide
from onlinejourno_scoring.potential import reach_score

from onlinejourno_agents.entity_coverage import coverage_for

ENTITY_TYPES = {"Location", "Person", "Organisation", "Topic", "Named Entity"}

# Pitch-stage reach inputs: a pitch is an idea, not a published story. trend and
# alignment default neutral; domain_authority is the tenant's constant; freshness
# is full (a fresh idea). Entity-specific authority lives in archival, not here,
# to avoid double-counting.
_PITCH_TREND = 50.0
_PITCH_ALIGNMENT = 50.0
_PITCH_DOMAIN_AUTHORITY = 50.0
_PITCH_FRESHNESS = 100.0


def has_scannable_text(text: str) -> bool:
    """Gate: skip empty/whitespace pitches before any LLM spend."""
    return bool(text and text.strip())


def coerce_entities(raw: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Validate LLM entity output: known type (else 'Named Entity'), non-blank
    trimmed name, deduped."""
    out: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for ent in raw or []:
        name = (ent.get("name") or "").strip()
        if not name:
            continue
        etype = (ent.get("type") or "").strip()
        if etype not in ENTITY_TYPES:
            etype = "Named Entity"
        key = (etype, name)
        if key in seen:
            continue
        seen.add(key)
        out.append({"type": etype, "name": name})
    return out


# ---------------------------------------------------------------------------
# Task 6: scan_pitch() orchestration
# ---------------------------------------------------------------------------


def _days_since(when: datetime | None, today: datetime) -> int | None:
    return None if when is None else max(0, (today - when).days)


def _extract_entities(text: str) -> tuple[list[dict[str, str]], str | None]:
    """Call the LLM to extract entities and topic from pitch text.

    Uses make_completer() exactly as claim_extract.py / other orchestrators do.
    The response JSON is {"entities": [...], "topic": "..."}.
    """
    from onlinejourno_agents.client import make_completer
    from onlinejourno_agents.prompts import build_pitch_entity_prompt

    completer = make_completer()
    parts = build_pitch_entity_prompt(text)
    completion = completer(system=parts.system, user=parts.user, max_tokens=512)
    raw_entities = (completion.data or {}).get("entities") or []
    topic = (completion.data or {}).get("topic") or None
    entities = coerce_entities(raw_entities)
    return entities, topic


def scan_pitch(
    *,
    tenant_slug: str,
    text: str,
    conviction: str = "normal",
    today: datetime | None = None,
) -> dict:
    """Extract entities/topic, score the pitch, return the full payload.

    The CLI serialises this to JSON. On LLM failure the pitch still scores from
    reach only (degraded=True). merit is always None at pitch stage — no drafted
    story to score.
    """
    today = today or datetime.now(timezone.utc)
    if not has_scannable_text(text):
        return _score(tenant_slug, [], None, conviction, today, degraded=False)
    try:
        entities, topic = _extract_entities(text)
        degraded = False
    except Exception as exc:
        import sys
        print(f"[pitch-scan] entity extraction failed: {exc!r}", file=sys.stderr)
        entities, topic, degraded = [], None, True
    return _score(tenant_slug, entities, topic, conviction, today, degraded=degraded)


def _score(
    tenant_slug: str,
    entities: list[dict[str, str]],
    topic: str | None,
    conviction: str,
    today: datetime,
    *,
    degraded: bool,
) -> dict:
    best = 0
    for ent in entities:
        cov = coverage_for(tenant_slug, ent["type"], ent["name"])
        best = max(
            best,
            archival_weight(
                appearance_count=cov.appearance_count,
                days_since_last=_days_since(cov.last_seen, today),
            ),
        )
    reach = int(
        round(
            reach_score(
                trend_momentum=_PITCH_TREND,
                content_alignment=_PITCH_ALIGNMENT,
                domain_authority=_PITCH_DOMAIN_AUTHORITY,
                freshness=_PITCH_FRESHNESS,
            )
        )
    )
    pw = decide(merit=None, reach=reach, archival=best, conviction=conviction)
    return {
        "entities": entities,
        "topic": topic,
        "merit": None,
        "reach": reach,
        "potential": pw.base,
        "archival_weight": best,
        "pitch_weight": pw.weight,
        "pitch_why": pw.why,
        "degraded": degraded,
    }


def run_pitch_scoring(*, tenant_slug: str, limit: int = 200) -> int:
    """Cron-fill the prod path: score pitched leads that have no pitch_weight yet.

    The Node-only web prod image can't shell the scan, so a prod pitch lands with
    NULL scores (see apps/web addLead). This step — run by the Python cron, which
    has the LLM key — fills them with a full scan. Idempotent: only touches leads
    where pitch_weight is null. Returns the number scored.
    """
    import json

    from onlinejourno_agents import db

    with db.connect() as conn, conn.cursor() as cur:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        cur.execute(
            """select id, title, note, conviction
                 from story_leads
                where tenant_id = %s and origin = 'pitched' and pitch_weight is null
                order by created_at
                limit %s""",
            (tenant_id, limit),
        )
        rows = cur.fetchall()
        scored = 0
        for r in rows:
            text = r["title"] or ""
            if r["note"]:
                text += "\n" + r["note"]
            payload = scan_pitch(
                tenant_slug=tenant_slug,
                text=text,
                conviction=r["conviction"] or "normal",
            )
            if payload.get("pitch_weight") is None:
                continue
            cur.execute(
                """update story_leads
                      set entities = %s, reach = %s, potential = %s,
                          archival_weight = %s, pitch_weight = %s, pitch_why = %s
                    where id = %s""",
                (
                    json.dumps(payload["entities"]),
                    payload["reach"],
                    payload["potential"],
                    payload["archival_weight"],
                    payload["pitch_weight"],
                    payload["pitch_why"],
                    r["id"],
                ),
            )
            scored += 1
    return scored
