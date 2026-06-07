"""m-framing-pej eval: replay the PEJ frame scorer against the India-2026
goldset (170 human-coded stories) and report how often the AI agrees with the
human coder. This is the eval gate the module ships behind (CLAUDE.md: eval-first).
"""

from __future__ import annotations

import collections
import json
import pathlib
from collections.abc import Callable
from dataclasses import dataclass, field

from onlinejourno_agents.client import Completion
from onlinejourno_agents.prompts import build_frame_prompt

Completer = Callable[..., Completion]
DEFAULT_GOLDSET = "docs/reports/framing-india-2026/dataset.json"


@dataclass(slots=True)
class FrameEvalResult:
    n: int = 0
    frame_correct: int = 0
    topic_correct: int = 0
    spent_usd: float = 0.0
    confusions: collections.Counter = field(default_factory=collections.Counter)

    @property
    def frame_accuracy(self) -> float:
        return self.frame_correct / self.n if self.n else 0.0

    @property
    def topic_accuracy(self) -> float:
        return self.topic_correct / self.n if self.n else 0.0


def run_frame_eval(
    *,
    completer: Completer,
    goldset_path: str = DEFAULT_GOLDSET,
    sample: int | None = None,
) -> FrameEvalResult:
    """Classify each goldset story and tally frame/topic agreement with the human label."""
    rows = json.loads(pathlib.Path(goldset_path).read_text())
    if sample is not None:
        rows = rows[:sample]

    result = FrameEvalResult()
    for r in rows:
        parts = build_frame_prompt({"headline": r.get("headline"), "body_text": None})
        try:
            c = completer(system=parts.system, user=parts.user, max_tokens=200)
        except Exception:
            continue
        result.n += 1
        result.spent_usd += c.cost_usd
        true_frame, true_topic = r.get("frame"), r.get("topic")
        pred_frame = (c.data.get("frame") or "").strip()
        pred_topic = (c.data.get("topic") or "").strip()
        if pred_frame == true_frame:
            result.frame_correct += 1
        else:
            result.confusions[(true_frame, pred_frame)] += 1
        if pred_topic == true_topic:
            result.topic_correct += 1
    return result
