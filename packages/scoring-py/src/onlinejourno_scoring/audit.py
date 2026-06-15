"""
Audit orchestrator — assembles every scoring-py module into one JSON.

Public API
----------
audit_page(page, *, trend, need, surfaces, with_external=True, cwv=None) -> dict
run_audit(url, *, trend="", need="", surfaces=None) -> dict
"""
from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlparse

from onlinejourno_scoring.models import Page
from onlinejourno_scoring.seo_checks import score_checks
from onlinejourno_scoring.channels import score_surfaces, need_weighted_composite
from onlinejourno_scoring import sqeg
from onlinejourno_scoring.recirculation import recirculation
from onlinejourno_scoring import potential as potential_mod
from onlinejourno_scoring.signals_radar import radar


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ist_now() -> datetime:
    """Return the current datetime in UTC (IST offset not needed for age math)."""
    return datetime.now(timezone.utc)


def _trend_alignment(page: Page, trend: str) -> float:
    """
    Simple 0..100 content_alignment proxy:
      100 if trend phrase is in the title
       60 if trend phrase is in entities/tags/section
        0 otherwise
    """
    if not trend:
        return 0.0
    trend_l = trend.lower()
    title_l = (page.title or "").lower()
    if trend_l in title_l:
        return 100.0
    tags_text = " ".join(page.tags or []).lower()
    section_l = (page.section_path or "").lower()
    body_l = (page.body_text or "")[:500].lower()
    if trend_l in tags_text or trend_l in section_l or trend_l in body_l:
        return 60.0
    return 0.0


def _page_age_hours(page: Page, now: datetime) -> float:
    """Return article age in hours; defaults to 24h if publish time unknown."""
    if not page.published_dt:
        return 24.0
    pub = page.published_dt
    if pub.tzinfo is None:
        pub = pub.replace(tzinfo=timezone.utc)
    now_tz = now if now.tzinfo else now.replace(tzinfo=timezone.utc)
    return max(0.0, (now_tz - pub).total_seconds() / 3600)


# ── Core assembler ────────────────────────────────────────────────────────────

def audit_page(
    page: Page,
    *,
    trend: str,
    need: str,
    surfaces: list[str],
    with_external: bool = True,
    cwv: dict | None = None,
) -> dict:
    """
    Pure assembly — no I/O. Accepts a pre-built Page and returns the full
    audit JSON with keys:
        overall, checks, surfaces, composite, sqeg, recirculation,
        potential, radar, taxonomy, cwv
    Plus optional: warning (homepage), advisory (paywalled), ai_queries,
                   youtube, keywords (when with_external=True).
    """
    cwv = cwv or {"available": False}
    now = _ist_now()

    # ── R2: homepage guard ────────────────────────────────────────────────────
    result: dict = {}
    if page.is_homepage:
        result["warning"] = (
            "Homepage URL — run the audit on the article/story URL for a meaningful score."
        )

    # ── SEO checks ───────────────────────────────────────────────────────────
    checks_result = score_checks(page, trend=trend)
    result["overall"] = {
        "score": checks_result["score"],
        "grade": checks_result["grade"],
        "counts": checks_result["counts"],
    }
    result["checks"] = checks_result["checks"]

    # ── Surface scoring ───────────────────────────────────────────────────────
    alignment = _trend_alignment(page, trend)
    surfaces_scored = score_surfaces(
        page,
        surfaces,
        trend=trend,
        trend_alignment=alignment,
        now=now,
    )
    result["surfaces"] = surfaces_scored
    result["composite"] = need_weighted_composite(surfaces_scored, need)

    # ── SQEG ─────────────────────────────────────────────────────────────────
    result["sqeg"] = {
        "ymyl": sqeg.classify_ymyl(page),
        "page_quality": sqeg.page_quality(page),
        "needs_met": sqeg.needs_met(page, trend),
    }

    # ── Recirculation ─────────────────────────────────────────────────────────
    result["recirculation"] = recirculation(page)

    # ── Potential ─────────────────────────────────────────────────────────────
    from onlinejourno_scoring import gdelt as gdelt_mod
    age_h = _page_age_hours(page, now)
    freshness = potential_mod.freshness_from_hours(age_h)
    # domain authority: use gdelt with topic + domain extracted from URL
    parsed_url = urlparse(page.url or "")
    domain = parsed_url.netloc or None
    topic = trend or page.topic or ""
    da_result = gdelt_mod.domain_authority(topic, domain=domain) if topic else {"available": False, "score": 0.0}
    da_score = da_result.get("score", 0.0) if da_result.get("available") else 50.0  # neutral default

    # trend_momentum: proxy from surface composite score (or 50 if no surfaces)
    composite_val = result["composite"].get("composite", 50) or 50

    pot_score = potential_mod.potential_score(
        trend_momentum=float(composite_val),
        content_alignment=alignment,
        domain_authority=da_score,
        freshness=float(freshness),
    )
    result["potential"] = {
        "score": round(pot_score, 1),
        "label": potential_mod.label(pot_score),
        "components": {
            "trend_momentum": float(composite_val),
            "content_alignment": alignment,
            "domain_authority": da_score,
            "freshness": float(freshness),
        },
    }

    # ── Radar ─────────────────────────────────────────────────────────────────
    result["radar"] = radar(
        surfaces_scored.get("discover", {"signals": []}),
        surfaces_scored.get("google_news", {"signals": []}),
        surfaces_scored.get("google_search", {"signals": []}),
        cwv=cwv,
    )

    # ── Taxonomy ──────────────────────────────────────────────────────────────
    result["taxonomy"] = {
        "section_path": page.section_path,
        "topic": page.topic,
        "tags": page.tags,
    }

    # ── CWV ───────────────────────────────────────────────────────────────────
    result["cwv"] = cwv

    # ── Advisory (paywalled pages) ────────────────────────────────────────────
    if page.paywalled:
        from onlinejourno_scoring.advisory import premium_distribution_advice
        discover_ch = surfaces_scored.get("discover", {})
        result["advisory"] = premium_distribution_advice(
            paywalled=page.paywalled,
            hard_paywall=page.hard_paywall,
            discover_score=discover_ch.get("score", 0),
            is_trending=bool(trend and alignment >= 60),
            matched_trend=trend,
            word_count=page.word_count,
        )

    # ── External enrichment (network calls; guarded) ──────────────────────────
    if with_external:
        kw = trend or page.topic or ""
        if kw:
            from onlinejourno_scoring import ai_queries as ai_mod
            from onlinejourno_scoring import youtube as yt_mod
            ai_result = ai_mod.reader_questions(kw)
            if ai_result.get("available"):
                result["ai_queries"] = ai_result

            yt_result = yt_mod.search_queries(kw)
            if yt_result.get("available"):
                result["youtube"] = yt_result

        if page.url:
            from onlinejourno_scoring import keywords_everywhere as ke_mod
            ke_result = ke_mod.ranking_keywords(page.url)
            if ke_result.get("available"):
                result["keywords"] = ke_result

    return result


# ── URL-entry point ───────────────────────────────────────────────────────────

def run_audit(
    url: str,
    *,
    trend: str = "",
    need: str = "",
    surfaces: list[str] | None = None,
) -> dict:
    """
    Fetch *url*, run CWV check, assemble full audit JSON.

    Never raises — any exception returns {"error": str(e), "url": url}.
    """
    surfaces = surfaces or ["discover", "google_news", "google_search"]
    try:
        from onlinejourno_scoring.fetch import fetch_page
        from onlinejourno_scoring import cwv as cwv_mod

        page = fetch_page(url)
        cwv_result = cwv_mod.page_experience(url)
        result = audit_page(
            page,
            trend=trend,
            need=need,
            surfaces=surfaces,
            with_external=True,
            cwv=cwv_result,
        )
        result["url"] = url
        return result
    except Exception as exc:  # noqa: BLE001
        return {"error": str(exc), "url": url}
