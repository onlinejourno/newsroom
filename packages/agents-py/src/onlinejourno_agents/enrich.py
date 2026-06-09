"""analyse-enrich (L2 Analyse) — enrich raw signals with structured metadata.

One LLM call per batch (provider-agnostic — see client.py): extract entities,
geo (district/region), beat, topic, and a summary, then write them onto the
signal (`district`, `region`, `beat`, `enrichment`). This turns the reporter's
raw inflow into meaningful, beat/geo-scoped signals.

The completer is injected so this orchestrator is testable without a network
and runs against any configured provider.
"""

from __future__ import annotations

from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import Any

from onlinejourno_agents import db
from onlinejourno_agents.client import Completion
from onlinejourno_agents.prompts import ENRICH_BEATS, USER_NEEDS, build_enrich_prompt

Completer = Callable[..., Completion]

BATCH_SIZE = 8


@dataclass(slots=True)
class EnrichResult:
    enriched: int
    failed: int
    spent_usd: float
    cap_usd: float
    status: str


def _chunks(seq: list[Any], size: int) -> Iterator[list[Any]]:
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def _coerce_beat(raw: Any) -> str:
    return raw if isinstance(raw, str) and raw in ENRICH_BEATS else "Other"


def _coerce_need(raw: Any) -> str | None:
    return raw if isinstance(raw, str) and raw in USER_NEEDS else None


def _max_tokens(n: int) -> int:
    return min(4096, 200 + 200 * n)


def run_enrich(
    *,
    tenant_slug: str,
    completer: Completer,
    since_hours: int = 48,
    limit: int = 60,
) -> EnrichResult:
    enriched = 0
    failed = 0
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        cap = db.daily_cap_usd(conn, tenant_id)
        spent = db.today_cost_usd(conn, tenant_id)
        rows = db.signals_needing_enrichment(
            conn, tenant_id, since_hours=since_hours, limit=limit
        )
        if not rows:
            return EnrichResult(0, 0, spent, cap, "empty")

        for batch in _chunks(rows, BATCH_SIZE):
            if spent >= cap:
                break
            parts = build_enrich_prompt(batch)
            try:
                completion = completer(
                    system=parts.system, user=parts.user, max_tokens=_max_tokens(len(batch))
                )
            except Exception:  # network / API / parse — skip the batch, keep going
                failed += len(batch)
                continue
            spent += completion.cost_usd

            results = (completion.data or {}).get("results") or []
            by_index = {
                r.get("index"): r for r in results if isinstance(r, dict)
            }
            for i, sig in enumerate(batch, start=1):
                r = by_index.get(i)
                if not isinstance(r, dict):
                    continue
                geo = r.get("geo") if isinstance(r.get("geo"), dict) else {}
                beat = _coerce_beat(r.get("beat"))
                db.update_signal_enrichment(
                    conn,
                    tenant_id=tenant_id,
                    signal_id=sig["id"],
                    district=geo.get("district"),
                    region=geo.get("region") or geo.get("country"),
                    beat=beat,
                    enrichment={
                        "analyse": {
                            "entities": r.get("entities") or [],
                            "summary": r.get("summary"),
                        },
                        "classify": {
                        "beat": beat,
                        "topic": r.get("topic"),
                        "user_need": _coerce_need(r.get("user_need")),
                    },
                        "geo": geo,
                    },
                )
                enriched += 1
            conn.commit()

    return EnrichResult(enriched, failed, spent, cap, "success")
