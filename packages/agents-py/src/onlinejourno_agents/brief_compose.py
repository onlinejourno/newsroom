"""brief-compose (Agent 2): compose the daily brief from the shortlist.

One LLM call per beat per morning (provider-agnostic — see client.py). Reads
the top shortlist items, asks the model to group them into thematic sections,
maps cited indices back to signal ids, and writes `briefs.content` +
`briefs.ai_disclosure` (ADR 0029).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from typing import Any
from uuid import UUID

from onlinejourno_agents import db, keywords
from onlinejourno_agents.client import Completion
from onlinejourno_agents.prompts import build_brief_prompt, default_editorial_dna

Completer = Callable[..., Completion]

BRIEF_AGENT = "brief-compose"
BRIEF_PATH = "brief"


@dataclass(slots=True)
class BriefResult:
    brief_id: UUID | None
    sections: int
    items_used: int
    spent_usd: float
    status: str


def _map_cites(cites: Any, signal_ids: list[UUID]) -> list[str]:
    """Map 1-based item indices from the model to signal-id strings. Defensive."""
    out: list[str] = []
    if not isinstance(cites, list):
        return out
    for c in cites:
        try:
            idx = int(c)
        except (TypeError, ValueError):
            continue
        if 1 <= idx <= len(signal_ids):
            out.append(str(signal_ids[idx - 1]))
    return out


def run_brief(
    *,
    tenant_slug: str,
    beat_slug: str | None,
    completer: Completer,
    top_n: int = 20,
    edition: date | None = None,
) -> BriefResult:
    """Compose and persist the daily brief for a beat from its shortlist."""
    edition = edition or date.today()

    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        beat_id = db.beat_id_for_slug(conn, tenant_id, beat_slug) if beat_slug else None
        for_user = db.default_brief_user(conn, tenant_id)
        items = db.top_shortlist(conn, tenant_id, beat_id=beat_id, limit=top_n)

    if not items:
        return BriefResult(brief_id=None, sections=0, items_used=0, spent_usd=0.0, status="empty")

    signal_ids: list[UUID] = [it["signal_id"] for it in items]
    dna = default_editorial_dna(beat_slug)
    parts = build_brief_prompt(items, editorial_dna=dna, beat_name=beat_slug or "desk")

    try:
        completion = completer(system=parts.system, user=parts.user, max_tokens=2048)
    except Exception as exc:
        with db.connect() as conn:
            db.record_trace(
                conn,
                tenant_id=tenant_id,
                agent_name=BRIEF_AGENT,
                path=BRIEF_PATH,
                completion=None,
                status="failed",
                reasoning={"error": repr(exc)},
            )
        return BriefResult(brief_id=None, sections=0, items_used=0, spent_usd=0.0, status="failed")

    raw_sections = completion.data.get("sections")
    sections: list[dict[str, Any]] = []
    if isinstance(raw_sections, list):
        for sec in raw_sections:
            if not isinstance(sec, dict):
                continue
            kws = sec.get("search_keywords")
            kws = [str(k).strip() for k in kws if str(k).strip()] if isinstance(kws, list) else []
            sections.append(
                {
                    "heading": str(sec.get("heading") or "").strip(),
                    "lede_one_liner": str(sec.get("lede_one_liner") or "").strip(),
                    "body": str(sec.get("body") or "").strip(),
                    "signals": _map_cites(sec.get("cites"), signal_ids),
                    "search_keywords": kws,
                }
            )

    # Distribution-fit (Search): real search volume per section, best-effort.
    # No KE key -> skipped, brief still composes. (Keywords Everywhere REST.)
    all_kws = [k for sec in sections for k in sec["search_keywords"]]
    volumes = keywords.fetch_volumes(all_kws)
    for sec in sections:
        kv = keywords.best_for(sec["search_keywords"], volumes)
        sec["search_fit"] = (
            {
                "keyword": kv.keyword,
                "volume": kv.volume,
                "trend": kv.trend_direction,
            }
            if kv
            else None
        )

    content = {
        "sections": sections,
        "meta": {
            "beat": beat_slug,
            "edition_date": edition.isoformat(),
            "shortlist_items": len(items),
            "composed_by": BRIEF_AGENT,
        },
    }
    ai_disclosure = {
        "models_used": [completion.model],
        "agents_invoked": ["ingest-score", "brief-compose"],
        "human_edited": False,
        "human_editor_id": None,
        "human_reviewed_at": None,
        "disclosure_text": (
            f"Composed by AI ({completion.model}) from {len(items)} shortlisted "
            f"sources. Not yet reviewed by an editor."
        ),
        "schema_version": 1,
    }

    with db.connect() as conn:
        brief_id = db.insert_brief(
            conn,
            tenant_id=tenant_id,
            for_user=for_user,
            beat_id=beat_id,
            edition_date=edition,
            content=content,
            ai_disclosure=ai_disclosure,
        )
    with db.connect() as conn:
        db.record_trace(
            conn,
            tenant_id=tenant_id,
            agent_name=BRIEF_AGENT,
            path=BRIEF_PATH,
            completion=completion,
            status="success",
            reasoning={"sections": len(sections), "items_used": len(items)},
            related_brief_id=brief_id,
        )

    return BriefResult(
        brief_id=brief_id,
        sections=len(sections),
        items_used=len(items),
        spent_usd=completion.cost_usd,
        status="success",
    )
