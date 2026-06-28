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
