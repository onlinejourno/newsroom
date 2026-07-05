"""Pure entity-coverage aggregation (spec 2026-06-28 §C1)."""
from __future__ import annotations

from datetime import datetime, timezone

from onlinejourno_agents.entity_coverage import CoverageRow, aggregate

def _sig(story_id, when, entities):
    return {"story_id": story_id, "published_at": when, "entities": entities}

T0 = datetime(2026, 6, 1, tzinfo=timezone.utc)
T1 = datetime(2026, 6, 10, tzinfo=timezone.utc)

def test_aggregate_counts_and_last_seen():
    sigs = [
        _sig("s1", T0, [{"type": "Person", "name": "Rao"}, {"type": "Topic", "name": "Water"}]),
        _sig("s2", T1, [{"type": "Person", "name": "Rao"}]),
    ]
    rows = {(r.entity_type, r.entity_name): r for r in aggregate(sigs)}
    rao = rows[("Person", "Rao")]
    assert rao.appearance_count == 2
    assert rao.last_seen == T1
    assert set(rao.story_ids) == {"s1", "s2"}
    assert rows[("Topic", "Water")].appearance_count == 1

def test_aggregate_skips_blank_names():
    rows = list(aggregate([_sig("s1", T0, [{"type": "Person", "name": ""}, {"type": "Person"}])]))
    assert rows == []

def test_aggregate_dedupes_entity_within_one_signal():
    rows = {(r.entity_type, r.entity_name): r for r in
            aggregate([_sig("s1", T0, [{"type": "Person", "name": "Rao"}, {"type": "Person", "name": "Rao"}])])}
    assert rows[("Person", "Rao")].appearance_count == 1

def test_aggregate_handles_null_published_at():
    rows = {(r.entity_type, r.entity_name): r for r in
            aggregate([_sig("s1", None, [{"type": "Person", "name": "Rao"}])])}
    assert rows[("Person", "Rao")].appearance_count == 1
    assert rows[("Person", "Rao")].last_seen is None
