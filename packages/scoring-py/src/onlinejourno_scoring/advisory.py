"""
Premium distribution advisory — pure, no I/O.

Ported verbatim from discover-dashboard/analyze/seo_eeat.py
`_premium_distribution_advice`, adapted to accept explicit keyword args
instead of raw/channel_scores dicts.

Public API:
  premium_distribution_advice(
      *, paywalled, hard_paywall, discover_score, is_trending,
      matched_trend, word_count
  ) -> {urgency, note, options:[{rank, title, rationale, effort, impact}]}

Urgency rules (faithful to source):
  HIGH   — paywalled AND (is_trending AND discover_score >= 60)
  MEDIUM — paywalled AND (is_trending OR discover_score >= 45)
  LOW    — paywalled but neither condition above
  LOW    — not paywalled at all (options=[])
"""
from __future__ import annotations


def premium_distribution_advice(
    *,
    paywalled: bool,
    hard_paywall: bool,
    discover_score: int | float,
    is_trending: bool,
    matched_trend: str,
    word_count: int,
) -> dict:
    """
    When a paywalled / partial-paywall article is trending, assess the opportunity
    cost and generate concrete distribution options for editors.

    Returns:
        urgency   — "HIGH" | "MEDIUM" | "LOW"
        note      — quantified summary for editors
        options   — ranked distribution actions
    """
    # Derive partial_paywall: paywalled but not a hard paywall
    partial = paywalled and not hard_paywall

    if not paywalled:
        return {"urgency": "LOW", "note": "", "options": []}

    # ── Urgency ──────────────────────────────────────────────────────────────
    if is_trending and discover_score >= 60:
        urgency = "HIGH"
    elif is_trending or discover_score >= 45:
        urgency = "MEDIUM"
    else:
        urgency = "LOW"

    # ── Opportunity note ─────────────────────────────────────────────────────
    if urgency == "HIGH":
        note = (
            f"This article is paywalled AND matches a trending topic "
            f"({matched_trend!r}) with a Discover score of {discover_score}/100. "
            f"Premium gating is likely suppressing significant organic reach on Google Discover and News. "
            f"Immediate action recommended."
        )
    elif urgency == "MEDIUM":
        note = (
            f"Paywalled article with moderate Discover potential ({discover_score}/100). "
            + (f"Matched trend: {matched_trend!r}. " if is_trending else "")
            + "Distribution options below can recover reach without compromising subscription value."
        )
    else:
        note = (
            f"Paywalled article — Discover score is low ({discover_score}/100), "
            f"so distribution impact is limited. Schema compliance is still advisable."
        )

    # ── Ranked distribution options ──────────────────────────────────────────
    options: list[dict] = []

    # 1. Meter / First Click Free — highest reach recovery, lowest barrier
    if hard_paywall:
        options.append({
            "rank": 1,
            "title": "Open metered / First Click Free for this article",
            "rationale": (
                "Hard paywalls block Googlebot from assessing content quality. "
                "FCF or a meter exemption for this URL allows Google to index the full article "
                "and make it eligible for Discover and News. "
                "Industry data shows 30–50% organic reach uplift for meter-exempt trending stories."
            ),
            "effort": "Low — CMS URL-level override",
            "impact": "High" if urgency == "HIGH" else "Medium",
        })

    # 2. Extended preview / registered-user snippet
    if partial:
        options.append({
            "rank": 1,
            "title": "Extend free preview from intro-only to ~400 words",
            "rationale": (
                f"Currently scrapers see only {word_count} words — Google's quality systems may classify "
                f"this as thin content. Extending the free snippet to ~400 words signals depth "
                f"while keeping the full article subscriber-only. "
                f"Use isAccessibleForFree + hasPart JSON-LD to declare the cutoff explicitly."
            ),
            "effort": "Low — template or per-article override",
            "impact": "High" if discover_score >= 50 else "Medium",
        })

    # 3. Schema markup — always relevant for premium content
    options.append({
        "rank": 2,
        "title": "Add NewsArticle JSON-LD with isAccessibleForFree: false + hasPart",
        "rationale": (
            "Without structured data, Google cannot distinguish between a paywalled article "
            "and a broken or thin page. isAccessibleForFree:false + hasPart/cssSelector "
            "is required for Flexible Sampling eligibility. Missing schema is the single "
            "biggest technical gap for premium news in Discover."
        ),
        "effort": "Medium — template-level change, applies to all premium articles",
        "impact": "High",
    })

    # 4. Subscriber push / registered user targeting
    if is_trending:
        options.append({
            "rank": 3,
            "title": "Push to registered (non-subscriber) users via notification or email digest",
            "rationale": (
                f"The matched trend ({matched_trend!r}) indicates active audience interest. "
                f"Registered users who haven't converted are a high-value segment — "
                f"a triggered email or app push with the article headline and a subscriber CTA "
                f"can drive both reads (behind partial paywall) and conversions."
            ),
            "effort": "Medium — requires segmented push capability",
            "impact": "Medium",
        })

    # 5. Social teaser — always available
    options.append({
        "rank": 4,
        "title": "Publish a social teaser thread / short-form on X, Instagram, LinkedIn",
        "rationale": (
            "Even fully paywalled articles can generate referral traffic via social teasers. "
            "A 3–5 key-finding thread on X drives authenticated sessions (subscribers click through) "
            "and brand visibility among non-subscribers. "
            + (f"The trending angle ({matched_trend!r}) makes this timely." if is_trending else "")
        ),
        "effort": "Low — social team copy",
        "impact": "Medium",
    })

    # 6. Syndication / wire — for high-urgency trending stories
    if urgency == "HIGH":
        options.append({
            "rank": 5,
            "title": "Consider syndication of the intro/lede to PTI / wire partners",
            "rationale": (
                "For high-momentum trending topics, syndicating the news lede (not the full analysis) "
                "to wire services or partner sites expands brand reach and positions The Hindu "
                "as the authoritative source, driving return traffic to the subscriber-gated full story."
            ),
            "effort": "Medium — editorial approval + wire desk coordination",
            "impact": "High",
        })

    return {
        "urgency":  urgency,
        "note":     note,
        "options":  sorted(options, key=lambda x: x["rank"]),
    }
