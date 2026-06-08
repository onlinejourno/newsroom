"""Distribution-fit scorer (m-distribution-fit Phase 1) — the fair-chance heart.

A pure, deterministic, content-based port + generalisation of the discover-dashboard
channel scorer. Given a story's content, score how built it is for each
distribution surface (Discover / Search / News today; the registry's other
surfaces — AIO, generative-AI, etc. — get their own signal sets in later slices)
and return the single most useful fix.

No network, no API keys: scores from the fields a signal already has (title,
publish time, body depth, URL, optional image/schema/byline). Missing signals
become actionable fixes ("no image detected — add a ≥1200px image for Discover"),
which is exactly what the reporter needs pre-publish.

Generalised off any one newsroom: no masthead-specific partial-credit hacks.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any


@dataclass
class Story:
    title: str = ""
    published: datetime | None = None
    word_count: int | None = None
    image: str | None = None          # og:image / lead image URL, if known
    schema_types: list[str] = field(default_factory=list)
    has_byline: bool = False
    author: str | None = None
    named_sources: list[str] = field(default_factory=list)
    url: str | None = None
    trend_alignment: int = 0          # 0-20, from upstream trend score


def grade(score: int) -> str:
    if score >= 80:
        return "A"
    if score >= 65:
        return "B"
    if score >= 50:
        return "C"
    if score >= 35:
        return "D"
    return "F"


def _sig(name: str, value: int, max_pts: int, note: str) -> dict[str, Any]:
    return {"name": name, "value": value, "max": max_pts, "note": note}


def _freshness(published: datetime | None, max_pts: int) -> tuple[int, str]:
    if not published:
        return 0, "No publish time — add one (freshness drives Discover/News)"
    pub = published if published.tzinfo else published.replace(tzinfo=UTC)
    age_h = (datetime.now(UTC) - pub).total_seconds() / 3600
    if age_h < 6:
        return max_pts, f"Published {age_h:.0f}h ago — very fresh"
    if age_h < 24:
        return int(max_pts * 0.8), f"Published {age_h:.0f}h ago — fresh"
    if age_h < 48:
        return int(max_pts * 0.4), f"Published {age_h:.0f}h ago — ageing"
    return 0, f"Published {age_h:.0f}h ago — too old for a Discover boost"


_LARGE_IMG = [
    r"[_-](1200|1280|1600|1920)\b",
    r"[?&]w=(1200|1280|1600)",
    r"/(large|xl|full)/",
]


def _image(image: str | None, max_pts: int) -> tuple[int, str]:
    if not image:
        return 0, "No image detected — add a ≥1200×630px image (Discover card needs it)"
    if any(re.search(p, image, re.I) for p in _LARGE_IMG):
        return max_pts, "Large image detected (≥1200px) — ideal for the Discover card"
    return int(max_pts * 0.7), "Image present — verify it is ≥1200×630px for Discover"


def _title(title: str, max_pts: int) -> tuple[int, str]:
    n = len(title or "")
    if n == 0:
        return 0, "No title"
    bonus = 2 if re.search(r"\d", title) else 0
    if 50 <= n <= 65:
        return min(max_pts, 12 + bonus), f"Title {n} chars — ideal"
    if 40 <= n < 50 or 65 < n <= 75:
        return min(max_pts, 8 + bonus), f"Title {n} chars — nudge toward 50–65"
    if n < 40:
        return min(max_pts, 4), f"Title short ({n} chars) — expand toward 50–65"
    return min(max_pts, 5), f"Title long ({n} chars) — may truncate; trim toward 50–65"


def _depth(word_count: int | None, max_pts: int) -> tuple[int, str]:
    if not word_count:
        return 0, "No body — add depth (≥600 words helps Search)"
    if word_count >= 600:
        return max_pts, f"{word_count} words — good depth"
    if word_count >= 300:
        return int(max_pts * 0.6), f"{word_count} words — thin; aim for ≥600"
    return int(max_pts * 0.3), f"{word_count} words — too thin for Search depth"


def _eeat(story: Story, max_pts: int) -> tuple[int, str]:
    byline_pts = int(max_pts * 0.5)
    src_pts = max_pts - byline_pts
    score, notes = 0, []
    if story.has_byline:
        score += byline_pts
        notes.append("named byline")
    else:
        notes.append("no byline — add a named author (E-E-A-T)")
    if story.named_sources:
        score += src_pts
        notes.append(f"{len(story.named_sources)} named source(s)")
    return min(max_pts, score), "E-E-A-T: " + ", ".join(notes)


def _schema(types: list[str], max_pts: int) -> tuple[int, str]:
    news = {"NewsArticle", "ReportageNewsArticle", "Article"}
    if any(t in news for t in types):
        return max_pts, f"NewsArticle schema present ({', '.join(types)})"
    if types:
        return int(max_pts * 0.5), f"Non-news schema ({', '.join(types)}) — add NewsArticle JSON-LD"
    return 0, "No schema — add NewsArticle JSON-LD (News/Discover)"


def _https(url: str | None, max_pts: int) -> tuple[int, str]:
    ok = (url or "https://").startswith("https://")
    return (max_pts, "HTTPS") if ok else (0, "Not HTTPS — serve over HTTPS")


def _result(signals: list[dict[str, Any]]) -> dict[str, Any]:
    total = sum(s["value"] for s in signals)
    score = max(0, min(100, total))
    # top fix = the signal furthest from full marks
    gaps = [s for s in signals if s["value"] < s["max"]]
    top_fix = max(gaps, key=lambda s: s["max"] - s["value"])["note"] if gaps else None
    return {"score": score, "grade": grade(score), "signals": signals, "top_fix": top_fix}


def score_discover(s: Story) -> dict[str, Any]:
    iv, inote = _image(s.image, 25)
    fv, fnote = _freshness(s.published, 25)
    tv, tnote = _title(s.title, 15)
    trend = max(0, min(20, s.trend_alignment))
    ev, enote = _eeat(s, 10)
    hv, hnote = _https(s.url, 5)
    return _result([
        _sig("Large image", iv, 25, inote),
        _sig("Freshness", fv, 25, fnote),
        _sig("Title", tv, 15, tnote),
        _sig("Trend alignment", trend, 20, f"trend {trend}/20" if trend else "no trend data"),
        _sig("E-E-A-T", ev, 10, enote),
        _sig("HTTPS", hv, 5, hnote),
    ])


def score_news(s: Story) -> dict[str, Any]:
    sv, snote = _schema(s.schema_types, 25)
    if s.has_byline:
        bv, bnote = 20, f"Author: {(s.author or '')[:50]}"
    else:
        bv, bnote = 0, "No byline — critical for News"
    fv, fnote = _freshness(s.published, 20)
    tv, tnote = _title(s.title, 15)
    hv, hnote = _https(s.url, 20)
    return _result([
        _sig("NewsArticle schema", sv, 25, snote),
        _sig("Author byline", bv, 20, bnote),
        _sig("Freshness", fv, 20, fnote),
        _sig("Title", tv, 15, tnote),
        _sig("HTTPS", hv, 20, hnote),
    ])


def score_search(s: Story) -> dict[str, Any]:
    tv, tnote = _title(s.title, 25)
    dv, dnote = _depth(s.word_count, 30)
    sv, snote = _schema(s.schema_types, 20)
    hv, hnote = _https(s.url, 15)
    ev, enote = _eeat(s, 10)
    return _result([
        _sig("Title", tv, 25, tnote),
        _sig("Depth", dv, 30, dnote),
        _sig("Schema", sv, 20, snote),
        _sig("HTTPS", hv, 15, hnote),
        _sig("E-E-A-T", ev, 10, enote),
    ])


_SCORERS = {
    "discover": score_discover,
    "google_search": score_search,
    "google_news": score_news,
}


def channel_score(
    story: Story, surfaces: list[str] | None = None
) -> dict[str, dict[str, Any]]:
    """Score a story for each requested surface that has a content-based scorer.

    `surfaces` = enabled surface keys (from the registry). Unknown/AI surfaces are
    skipped here (their signal sets land in later slices). Defaults to all three
    content-based surfaces.
    """
    keys = surfaces if surfaces is not None else list(_SCORERS)
    return {k: _SCORERS[k](story) for k in keys if k in _SCORERS}
