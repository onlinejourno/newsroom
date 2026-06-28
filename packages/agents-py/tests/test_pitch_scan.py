"""Pure parts of pitch-scan (spec 2026-06-28 §C3)."""
from __future__ import annotations

from onlinejourno_agents.pitch_scan import ENTITY_TYPES, coerce_entities, has_scannable_text


def test_gate_rejects_blank():
    assert has_scannable_text("") is False
    assert has_scannable_text("   ") is False
    assert has_scannable_text("Metro phase 2 funding delayed") is True


def test_coerce_keeps_known_types_and_trims():
    raw = [
        {"type": "Person", "name": "  Rao  "},
        {"type": "Location", "name": "Hyderabad"},
        {"type": "Gibberish", "name": "x"},   # unknown type -> Named Entity
        {"type": "Topic", "name": ""},         # blank name -> dropped
    ]
    out = coerce_entities(raw)
    assert {"type": "Person", "name": "Rao"} in out
    assert {"type": "Named Entity", "name": "x"} in out
    assert all(e["name"] for e in out)
    assert all(e["type"] in ENTITY_TYPES for e in out)


def test_coerce_dedupes():
    out = coerce_entities([{"type": "Person", "name": "Rao"}, {"type": "Person", "name": "Rao"}])
    assert len(out) == 1
