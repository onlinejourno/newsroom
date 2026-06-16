"""
affinity.py — pure aggregation of channel-affinity log rows.

Ported from discover-dashboard/data/performance_log.py `affinity_stats()`.
The NLP log-writer (populating channel_affinity_log) is a separate task.

`affinity_stats(rows)` is pure: no DB, no network, no filesystem.
Window/date filtering happens in the SQL caller; this function aggregates
whatever rows it receives.
"""
from __future__ import annotations

from collections import Counter, defaultdict


def affinity_stats(rows: list[dict]) -> dict:
    """
    Aggregate channel-affinity log rows.

    Args:
        rows: list of dicts, each with at minimum:
              entity_type (str), channel (str), section (str, optional)

    Returns:
        {
            "by_entity_type": [
                {
                    "entity_type": str,
                    "appearances": int,
                    "top_channels": [channel, ...],   # sorted by count desc
                    "top_sections": [section, ...],   # sorted by count desc, empty excluded
                },
                ...                                   # sorted by appearances desc
            ],
            "channel_totals": {channel: int, ...},
        }
    """
    if not rows:
        return {"by_entity_type": [], "channel_totals": {}}

    # Accumulators keyed by entity_type
    appearances: Counter = Counter()
    channels: dict[str, Counter] = defaultdict(Counter)
    sections: dict[str, Counter] = defaultdict(Counter)

    channel_totals: Counter = Counter()

    for row in rows:
        et = row.get("entity_type", "Unknown") or "Unknown"
        ch = row.get("channel", "unknown") or "unknown"
        sec = row.get("section", "") or ""

        appearances[et] += 1
        channels[et][ch] += 1
        if sec:
            sections[et][sec] += 1

        channel_totals[ch] += 1

    by_entity_type = [
        {
            "entity_type": et,
            "appearances": count,
            "top_channels": [ch for ch, _ in channels[et].most_common()],
            "top_sections": [sec for sec, _ in sections[et].most_common()],
        }
        for et, count in appearances.most_common()
    ]

    return {
        "by_entity_type": by_entity_type,
        "channel_totals": dict(channel_totals),
    }
