"""Name-grained entity coverage index (spec 2026-06-28 §C1).

`signals.enrichment.entities` holds entity NAMES per signal; the only existing
cross-signal aggregate (channel_affinity_log) is type-grained. This module
derives a (type, name) -> count/last_seen/story_ids index that powers both the
archival-weight signal and the entity page.
"""
from __future__ import annotations

from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from onlinejourno_agents import db


@dataclass(slots=True)
class CoverageRow:
    entity_type: str
    entity_name: str
    appearance_count: int = 0
    last_seen: datetime | None = None
    story_ids: list[str] = field(default_factory=list)


def aggregate(signals: Iterable[dict[str, Any]]) -> Iterator[CoverageRow]:
    """Fold per-signal enrichment entities into one row per (type, name).

    Each signal: {story_id, published_at: datetime|None, entities: [{type,name}]}.
    Dedupes a repeated entity within a single signal. A naive `published_at` is
    treated as UTC so naive and aware inputs never collide on comparison.
    """
    acc: dict[tuple[str, str], CoverageRow] = {}
    for sig in signals:
        seen: set[tuple[str, str]] = set()
        story_id = sig.get("story_id")
        when = sig.get("published_at")
        if when is not None and when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        for ent in sig.get("entities") or []:
            etype = (ent.get("type") or "").strip()
            name = (ent.get("name") or "").strip()
            if not etype or not name:
                continue
            key = (etype, name)
            if key in seen:
                continue
            seen.add(key)
            row = acc.get(key)
            if row is None:
                row = acc[key] = CoverageRow(etype, name)
            row.appearance_count += 1
            if story_id and story_id not in row.story_ids:
                row.story_ids.append(story_id)
            if when is not None and (row.last_seen is None or when > row.last_seen):
                row.last_seen = when
    yield from acc.values()


# ----------------------------------------------------------------------
# DB reader
# ----------------------------------------------------------------------


def coverage_for(tenant_slug: str, entity_type: str, entity_name: str) -> CoverageRow:
    """Read coverage for an entity NAME (types in the historical index are not
    reliable — enrichment stores bare names — so we match by name and aggregate
    across any stored types). `entity_type` is used only to label the returned
    row. Zero-row if the name has no prior coverage."""
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        with conn.cursor() as cur:
            cur.execute(
                """select coalesce(sum(appearance_count), 0) as appearance_count,
                          max(last_seen) as last_seen
                     from entity_coverage
                    where tenant_id = %s and entity_name = %s""",
                (tenant_id, entity_name),
            )
            row = cur.fetchone()
    count = (row and row["appearance_count"]) or 0
    if count == 0:
        return CoverageRow(entity_type, entity_name)
    return CoverageRow(entity_type, entity_name, count, row["last_seen"], [])


# ----------------------------------------------------------------------
# Refresh (rebuild from signals.enrichment)
# ----------------------------------------------------------------------


def _entities_from_enrichment(enrichment: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract entities from a signal's enrichment jsonb, normalised to {type, name} dicts.

    Entities are stored at enrichment["analyse"]["entities"] by enrich.py.
    In the current DB they are plain strings (e.g. ["Sensex", "FIFA"]); this
    coerces them to the {type, name} shape that aggregate() expects, using the
    default type "entity". Falls back through other sub-keys for any signal
    enriched via an alternative path.
    """
    raw: list[Any] | None = None
    analyse = enrichment.get("analyse") or {}
    raw = analyse.get("entities")
    if not raw:
        for val in enrichment.values():
            if isinstance(val, dict):
                raw = val.get("entities")
                if raw:
                    break
    if not raw:
        return []
    result: list[dict[str, Any]] = []
    for ent in raw:
        if isinstance(ent, dict):
            result.append(ent)
        elif isinstance(ent, str) and ent.strip():
            result.append({"type": "entity", "name": ent.strip()})
    return result


def refresh_entity_coverage(*, tenant_slug: str) -> int:
    """Rebuild entity_coverage for a tenant from signals.enrichment. Returns rows written."""
    with db.connect() as conn, conn.cursor() as cur:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        cur.execute(
            "select s.id, s.published_at, s.enrichment from signals s "
            "where s.tenant_id = %s and s.enrichment is not null",
            (tenant_id,),
        )
        signals = [
            {
                "story_id": str(row["id"]),
                "published_at": row["published_at"],
                "entities": _entities_from_enrichment(row["enrichment"] or {}),
            }
            for row in cur.fetchall()
        ]
        rows = list(aggregate(signals))
        cur.execute("delete from entity_coverage where tenant_id = %s", (tenant_id,))
        for r in rows:
            cur.execute(
                "insert into entity_coverage "
                "(tenant_id, entity_type, entity_name, appearance_count, last_seen, story_ids) "
                "values (%s, %s, %s, %s, %s, %s)",
                (tenant_id, r.entity_type, r.entity_name, r.appearance_count,
                 r.last_seen, r.story_ids),
            )
    return len(rows)
