"""Need-mix view (ADR 0049) — the strategic coverage-balance lens.

Pure analysis over classified signals: the distribution of reader needs
(know / understand / feel / do) overall and per beat, with the industry's
recurring flags — "Update me" (know) overproduction, and the absent
actionable ("do") opportunity. No I/O; the CLI feeds it db rows.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from onlinejourno_agents.prompts import USER_NEEDS

# Above this share of one need the mix is flagged as overproduction.
OVERPRODUCTION_SHARE = 0.6


@dataclass(slots=True)
class BeatMix:
    beat: str
    total: int
    shares: dict[str, float]  # need -> share of the beat's classified signals
    flags: list[str] = field(default_factory=list)


def build_mix(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """rows = [{beat, user_need, n}] -> {overall: BeatMix, beats: [BeatMix]}.

    Flags per ADR 0049: a need above OVERPRODUCTION_SHARE (the classic is
    know/"Update me"); zero "do" coverage (actionable content is promising
    across outlets — its absence is the opportunity)."""
    by_beat: dict[str, dict[str, int]] = {}
    for r in rows:
        need = r.get("user_need")
        if need not in USER_NEEDS:
            continue
        by_beat.setdefault(r["beat"], {})[need] = (
            by_beat.get(r["beat"], {}).get(need, 0) + int(r["n"])
        )

    def mix_for(beat: str, counts: dict[str, int]) -> BeatMix:
        total = sum(counts.values())
        shares = {k: counts.get(k, 0) / total for k in USER_NEEDS} if total else {}
        flags = []
        for need, share in shares.items():
            if share > OVERPRODUCTION_SHARE:
                label = "'Update me' overproduction" if need == "know" else f"'{need}' heavy"
                flags.append(f"{label} ({share:.0%})")
        if total >= 5 and shares.get("do", 0) == 0:
            flags.append("no actionable ('do') coverage — promising gap")
        return BeatMix(beat=beat, total=total, shares=shares, flags=flags)

    overall_counts: dict[str, int] = {}
    for counts in by_beat.values():
        for need, n in counts.items():
            overall_counts[need] = overall_counts.get(need, 0) + n

    return {
        "overall": mix_for("(all)", overall_counts),
        "beats": [mix_for(b, c) for b, c in sorted(by_beat.items())],
    }


def render_mix(report: dict[str, Any]) -> str:
    """Plain-text table for the CLI."""
    lines: list[str] = []

    def fmt(m: BeatMix) -> str:
        shares = " ".join(
            f"{need[:4]}:{m.shares.get(need, 0):>4.0%}" for need in USER_NEEDS
        )
        flag = f"  ⚠ {'; '.join(m.flags)}" if m.flags else ""
        return f"  {m.beat:<14} n={m.total:<4} {shares}{flag}"

    lines.append("need-mix (classified signals):")
    lines.append(fmt(report["overall"]))
    if report["beats"]:
        lines.append("per beat:")
        lines.extend(fmt(m) for m in report["beats"])
    return "\n".join(lines)
