"""5-axis SEO + E-E-A-T signal radar rollup.

Produces a list of 5 dicts — one per axis — each with:
    {"axis": str, "value": int}   # value in [0, 100]

Axis mapping (ported from discover-dashboard/dashboard/app.py _render_radar_chart):

    Content depth        — Search: "word count"/"content depth" + "h1"/"h2"/"structure" +
                           "meta description" (sum value / sum max * 100)
    E-E-A-T              — Discover: "e-e-a-t" + News: "author" + Search: "citation"/"link"
                           (max signal per source, then average of non-zero contributors)
    Technical SEO        — Search: "schema"/"structured data"/"newsarticle" + "https";
                           if CWV available, blend schema-https ratio with performance_score
    Freshness            — Discover + News + Search: "freshness"/"fresh" (max across surfaces)
    Distribution ready   — Discover: "og:image"/"trend"/"distribution" +
                           News: "sitemap" (max across surfaces)
"""

from __future__ import annotations

_AXES = [
    "Content depth",
    "E-E-A-T",
    "Technical SEO",
    "Freshness",
    "Distribution readiness",
]


def _sig_val(channel: dict, *fragments: str) -> int:
    """Return the first signal whose name contains any fragment (case-insensitive).

    Returns the signal's value normalised to 0-100, or 0 if not found / max==0.
    """
    lowers = [f.lower() for f in fragments]
    for s in channel.get("signals", []):
        name = s.get("name", "").lower()
        if any(frag in name for frag in lowers):
            mx = s.get("max") or 0
            val = s.get("value") or 0
            return int(val / mx * 100) if mx else 0
    return 0


def _sum_sig_val(channel: dict, *fragments: str) -> tuple[int, int]:
    """Sum value and max for all signals whose name contains any fragment.

    Returns (total_value, total_max) so caller can normalise.
    """
    lowers = [f.lower() for f in fragments]
    total_val = 0
    total_max = 0
    for s in channel.get("signals", []):
        name = s.get("name", "").lower()
        if any(frag in name for frag in lowers):
            total_val += s.get("value") or 0
            total_max += s.get("max") or 0
    return total_val, total_max


def _norm(value: int | float, max_val: int | float) -> int:
    """Normalise value/max_val to [0, 100], safe against zero division."""
    if not max_val:
        return 0
    return min(100, max(0, int(value / max_val * 100)))


def _content_depth(search: dict) -> int:
    """Sum word-count/depth + structure + meta-description signals from Search."""
    total_val, total_max = _sum_sig_val(
        search,
        "word count", "content depth",
        "h1", "h2", "structure",
        "meta description", "meta desc",
    )
    return _norm(total_val, total_max)


def _eeat(discover: dict, news: dict, search: dict) -> int:
    """Max per source then average non-zero contributors."""
    scores = [
        _sig_val(discover, "e-e-a-t", "eeat", "expertise", "authoritativeness"),
        _sig_val(news, "author", "byline"),
        _sig_val(search, "citation", "external link", "internal link", "link"),
    ]
    non_zero = [s for s in scores if s > 0]
    return int(sum(non_zero) / len(non_zero)) if non_zero else 0


def _technical_seo(search: dict, cwv: dict) -> int:
    """Schema/HTTPS signals; blend with CWV performance_score when available."""
    schema_val = _sig_val(search, "schema", "structured data", "newsarticle")
    https_val = _sig_val(search, "https", "ssl", "tls")
    # Base: average of schema and https (both already 0-100)
    signals = [v for v in (schema_val, https_val) if v > 0]
    base = int(sum(signals) / len(signals)) if signals else 0

    if cwv and cwv.get("available"):
        perf = cwv.get("performance_score") or 0
        perf = min(100, max(0, int(perf)))
        # Blend: average of schema-https ratio and CWV performance score
        return int((base + perf) / 2)
    return base


def _freshness(discover: dict, news: dict, search: dict) -> int:
    """Max freshness signal across all surfaces."""
    return max(
        _sig_val(discover, "freshness", "fresh"),
        _sig_val(news, "freshness", "fresh"),
        _sig_val(search, "freshness", "fresh"),
    )


def _distribution_readiness(discover: dict, news: dict) -> int:
    """og:image / trend / distribution (Discover) and sitemap (News)."""
    return max(
        _sig_val(discover, "og:image", "trend", "distribution", "social"),
        _sig_val(news, "sitemap", "news sitemap"),
    )


def radar(
    discover: dict,
    news: dict,
    search: dict,
    *,
    cwv: dict,
) -> list[dict]:
    """Compute the 5-axis signal radar.

    Args:
        discover: Channel result dict with a "signals" list.
        news:     Channel result dict with a "signals" list.
        search:   Channel result dict with a "signals" list.
        cwv:      CWV result dict; must have "available" (bool).
                  When available=True, should also carry "performance_score" (0-100).

    Returns:
        List of 5 dicts: [{"axis": str, "value": int}, ...]
        Each value is in [0, 100]. Order matches _AXES.
    """
    discover = discover or {}
    news = news or {}
    search = search or {}
    cwv = cwv or {}

    values = [
        _content_depth(search),
        _eeat(discover, news, search),
        _technical_seo(search, cwv),
        _freshness(discover, news, search),
        _distribution_readiness(discover, news),
    ]

    return [{"axis": axis, "value": val} for axis, val in zip(_AXES, values)]
