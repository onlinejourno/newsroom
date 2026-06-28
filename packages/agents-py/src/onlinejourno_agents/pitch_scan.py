"""pitch-scan (spec 2026-06-28 §C3): extract entities/topic from a pitch and
score it. Mirrors claim_extract.py — a cheap Gate, a pure coercer, then a
cost-capped LLM call, then the (pure) scoring engine.

This file is built in two tasks: Task 5 adds the pure Gate + coercer (below);
Task 6 appends the scan_pitch() orchestration. Keep this public surface stable.
"""
from __future__ import annotations

from typing import Any

ENTITY_TYPES = {"Location", "Person", "Organisation", "Topic", "Named Entity"}


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
