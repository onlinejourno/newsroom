"""
Recirculation module — internal-link quality scoring.

Ported from discover-dashboard/analyze/recirculation.py.
Adapts BeautifulSoup-derived counts to pre-extracted Page fields:
    page.internal_links        → total internal link count
    page.same_section_links    → links within the same primary section
    page.deeper_taxonomy_links → links within the same sub-section
    page.good_anchors          → descriptive anchor text count
    page.weak_anchors          → weak anchor text count ('read more', etc.)
    page.has_related_block     → 'Related articles' block present

Component caps: volume ≤30, same-section relevance ≤30,
                anchor quality ≤25, related-block 10, deeper-taxonomy ≤5.
"""
from __future__ import annotations

from onlinejourno_scoring.models import Page


def recirculation(page: Page) -> dict:
    """
    Compute recirculation quality score and recommendations for a page.

    Returns
    -------
    dict with keys:
        score           (int, 0-100)
        metrics         (dict of raw counts)
        recommendations (list[str])
    """
    total = page.internal_links
    same_section = page.same_section_links
    deeper_taxonomy = page.deeper_taxonomy_links
    good_anchors = page.good_anchors
    weak_anchors = page.weak_anchors
    has_related_block = page.has_related_block

    score = _compute_score(
        total=total,
        same_section=same_section,
        good_anchors=good_anchors,
        has_related_block=has_related_block,
        deeper_taxonomy=deeper_taxonomy,
    )

    recommendations = _build_recommendations(
        total=total,
        same_section=same_section,
        good_anchors=good_anchors,
        weak_anchors=weak_anchors,
        has_related_block=has_related_block,
    )

    metrics = {
        "total": total,
        "same_section": same_section,
        "deeper_taxonomy": deeper_taxonomy,
        "good_anchors": good_anchors,
        "weak_anchors": weak_anchors,
        "has_related_block": has_related_block,
    }

    return {
        "score": score,
        "metrics": metrics,
        "recommendations": recommendations,
    }


def _compute_score(
    total: int,
    same_section: int,
    good_anchors: int,
    has_related_block: bool,
    deeper_taxonomy: int,
) -> int:
    """Compute 0-100 recirculation quality score (ported verbatim)."""
    score = 0

    # Volume of internal links (up to 30 pts)
    if total >= 8:
        score += 30
    elif total >= 5:
        score += 20
    elif total >= 3:
        score += 12
    elif total >= 1:
        score += 5
    # 0 links → 0 pts

    # Same-section relevance (up to 30 pts)
    if total > 0:
        relevance_ratio = same_section / total
        score += int(30 * relevance_ratio)

    # Anchor text quality (up to 25 pts)
    total_anchors = good_anchors + max(0, total - good_anchors)
    if total_anchors > 0:
        quality_ratio = good_anchors / total_anchors
        score += int(25 * quality_ratio)

    # Related block presence (10 pts)
    if has_related_block:
        score += 10

    # Deeper taxonomy links bonus (up to 5 pts)
    if deeper_taxonomy >= 2:
        score += 5
    elif deeper_taxonomy == 1:
        score += 2

    return max(0, min(100, score))


def _build_recommendations(
    total: int,
    same_section: int,
    good_anchors: int,
    weak_anchors: int,
    has_related_block: bool,
) -> list[str]:
    """Build rule-based recommendations (ported verbatim, section_path omitted)."""
    recs: list[str] = []

    if total == 0:
        recs.append(
            "Add at least 4-6 internal links to related stories to improve recirculation and topic authority."
        )
        return recs

    if total < 3:
        recs.append(
            f"Only {total} internal link(s) found. Add 4-6 links to related stories within the same section."
        )
    elif total < 5:
        recs.append(f"{total} internal links found — aim for 5-8 for strong recirculation.")

    if total > 0 and same_section < max(2, total // 2):
        recs.append(
            f"Only {same_section}/{total} internal links are in the same section. "
            f"Prioritise linking to topically relevant stories for better E-E-A-T signals."
        )

    if weak_anchors > good_anchors:
        recs.append(
            f"{weak_anchors} link(s) use weak anchor text ('read more', 'click here'). "
            f"Replace with descriptive anchor text summarising the linked article."
        )

    if not has_related_block:
        recs.append(
            "No 'Related articles' block detected. Add a curated related-stories widget — "
            "it improves recirculation depth and signals topical comprehensiveness."
        )

    return recs
