"""Canonical letter grade — the SINGLE A–F band table for the whole suite.

Promoted from cwv._letter_grade. Everything that turns a 0–100 score into a
letter (Galley, The Audit, Frontmatter, Newsroom) MUST use this, so the same
score always yields the same grade. Don't fork the bands.
"""
from __future__ import annotations

import json
from pathlib import Path

# (threshold, letter) high→low. bands.json is the one source of truth;
# the literal below is only the fallback if the file is missing/corrupt.
try:
    _raw = json.loads((Path(__file__).with_name("bands.json")).read_text())
    GRADE_BANDS: tuple[tuple[float, str], ...] = tuple(
        sorted(((float(v), str(k)) for k, v in _raw.items()), reverse=True)
    )
except (OSError, ValueError):
    GRADE_BANDS = ((80.0, "A"), (65.0, "B"), (50.0, "C"), (35.0, "D"))


def letter_grade(score: float | None) -> str:
    """0–100 score → A/B/C/D/F. None → 'F' (no signal)."""
    if score is None:
        return "F"
    s = float(score)
    for threshold, letter in GRADE_BANDS:
        if s >= threshold:
            return letter
    return "F"
