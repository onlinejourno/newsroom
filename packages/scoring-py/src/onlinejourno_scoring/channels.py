"""
Channel scorers for Google Discover, Google News, Google Search, and AIO
(AI Overviews / generative-readiness).

Each scorer returns:
    { "score": int, "grade": str, "signals": [{"name", "value", "max", "note"}] }

Ported from:
  - discover-dashboard/analyze/channel_scorer.py  (Discover / News / Search)
  - distribution_fit.py                           (need_weighted_composite + weights)
AIO scorer is new per spec (R2).
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from onlinejourno_scoring.seo_checks import grade

if TYPE_CHECKING:
    from onlinejourno_scoring.models import Page


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _signal(name: str, value: int, max_pts: int, note: str = "") -> dict:
    return {"name": name, "value": value, "max": max_pts, "note": note}


def _freshness_pts(published_dt: datetime | None, max_pts: int, now: datetime) -> tuple[int, str]:
    """Return (points_earned, note) based on how recent the publish datetime is."""
    if not published_dt:
        return 0, "No publish time — add one (freshness drives Discover/News)"
    pub = published_dt if published_dt.tzinfo else published_dt.replace(tzinfo=timezone.utc)
    now_tz = now if now.tzinfo else now.replace(tzinfo=timezone.utc)
    age_hours = (now_tz - pub).total_seconds() / 3600
    if age_hours < 6:
        return max_pts, f"Published {age_hours:.0f}h ago — very fresh"
    if age_hours < 24:
        return int(max_pts * 0.8), f"Published {age_hours:.0f}h ago — fresh"
    if age_hours < 48:
        return int(max_pts * 0.4), f"Published {age_hours:.0f}h ago — ageing"
    return 0, f"Published {age_hours:.0f}h ago — too old for a Discover boost"


_LARGE_IMG_PATTERNS = [
    r'(?:LANDSCAPE|PORTRAIT|SQUARE)[_-]?(1200|1280|1600)',  # Hindu CDN
    r'[_-](1200|1280|1600|1920)\b',                         # width token
    r'[?&]w=(1200|1280|1600)',                               # query param
    r'/(large|xl|full)/',                                    # path token
    r'[_-](large|xl|full)[_.-]',                            # suffix token
]


def _og_image_pts(page: "Page") -> tuple[int, str]:
    """Return (points, note) for OG image signal (max 25)."""
    img = page.og_image or page.image_url
    if not img:
        return 0, "No og:image or RSS image found — Discover card will not show"
    for pat in _LARGE_IMG_PATTERNS:
        if re.search(pat, img, re.IGNORECASE):
            return 25, "Large og:image detected (≥1200px) — ideal for Discover card"
    return 18, "og:image present — verify it is ≥1200×630px for Discover card eligibility"


def _title_engage_pts(page: "Page", max_pts: int) -> tuple[int, str]:
    """Return (points, note) for title length + engagement (max given)."""
    title = page.title or ""
    ln = len(title)
    if ln == 0:
        return 0, "No title tag"
    has_number = bool(re.search(r'\d', title))
    engage_bonus = 2 if has_number else 0
    if 50 <= ln <= 65:
        pts = min(max_pts, 12 + engage_bonus)
        note = f"Title is {ln} chars — ideal length"
    elif 40 <= ln < 50 or 65 < ln <= 75:
        pts = min(max_pts, 8 + engage_bonus)
        note = f"Title is {ln} chars — slightly outside 50-65 sweet spot"
    elif ln < 40:
        pts = min(max_pts, 4)
        note = f"Title too short ({ln} chars)"
    else:
        pts = min(max_pts, 5)
        note = f"Title too long ({ln} chars) — may be truncated in Discover"
    return pts, note


def _eeat_pts(page: "Page", max_pts: int) -> tuple[int, str]:
    """
    E-E-A-T signals: author byline, publish date, named sources.

    Scoring (out of max_pts):
      Author byline  — 40 % of max  (most important for News/Discover)
      Publish date   — 40 % of max  (equally important; required for freshness signal)
      Named sources  — 20 % of max  (trust signal; adds to but doesn't dominate)
    """
    byline_pts = int(max_pts * 0.40)
    date_pts   = int(max_pts * 0.40)
    source_pts = max_pts - byline_pts - date_pts  # remainder (avoids rounding gaps)

    score = 0
    notes = []
    if page.has_byline:
        score += byline_pts
        notes.append(f"author byline (+{byline_pts})")
    if page.published_dt is not None:
        score += date_pts
        notes.append(f"publish date (+{date_pts})")
    if page.named_sources:
        score += source_pts
        notes.append(f"{len(page.named_sources)} named source(s) (+{source_pts})")

    note = "E-E-A-T: " + (", ".join(notes) if notes else "no signals found")
    return min(max_pts, score), note


def _depth_pts(page: "Page", max_pts: int) -> tuple[int, str]:
    wc = page.word_count or 0
    if wc >= 800:
        return max_pts, f"{wc:,} words — strong content depth"
    if wc >= 400:
        return int(max_pts * 0.67), f"{wc:,} words — acceptable; aim for 800+"
    if wc >= 200:
        return int(max_pts * 0.33), f"{wc:,} words — thin content"
    return 0, f"{wc} words — very thin; add depth (≥800 words helps Search)"


def _https_pts(page: "Page", max_pts: int) -> tuple[int, str]:
    """Return (points, note) for HTTPS check — used by AIO scorer."""
    ok = page.https
    return (max_pts, "HTTPS confirmed") if ok else (0, "Not HTTPS — serve over HTTPS")


# ─── Google Discover Scorer ────────────────────────────────────────────────────
# Caps: og:image (large) 25, Freshness 25, Title (length+engagement) 15,
#       Trend alignment 20, E-E-A-T signals 10, Mobile/HTTPS 5 = 100

def score_discover(page: "Page", *, trend_alignment: float = 0.0, now: datetime) -> dict:
    """Score 0–100 for Google Discover eligibility."""
    signals = []
    total = 0

    # og:image present + large (25 pts)
    img_pts, img_note = _og_image_pts(page)
    if page.cf_blocked and img_pts == 0:
        img_pts  = 15
        img_note = ("⚠ og:image unverifiable — page blocked by Cloudflare. Partial credit: "
                    "verify the image is ≥1200×630px.")
    signals.append(_signal("og:image (large)", img_pts, 25, img_note))
    total += img_pts

    # Freshness (25 pts)
    fresh_pts, fresh_note = _freshness_pts(page.published_dt, 25, now)
    if page.cf_blocked and fresh_pts == 0 and page.published_dt is None:
        fresh_note = "⚠ Unable to assess — publish date not recoverable from blocked page"
        fresh_pts = 12
    signals.append(_signal("Freshness", fresh_pts, 25, fresh_note))
    total += fresh_pts

    # Title (15 pts)
    title_pts, title_note = _title_engage_pts(page, 15)
    if page.cf_blocked and len(page.title or "") < 25:
        title_note = "⚠ Title unreadable — page blocked; verify title is 50-65 chars for Discover"
        title_pts = 0
    signals.append(_signal("Title (length + engagement)", title_pts, 15, title_note))
    total += title_pts

    # Trend alignment (20 pts)
    trend_pts = max(0, min(20, int(trend_alignment)))
    trend_note = (
        f"Trend alignment score: {trend_pts}/20"
        if trend_pts > 0
        else "No trend alignment data provided"
    )
    signals.append(_signal("Trend alignment", trend_pts, 20, trend_note))
    total += trend_pts

    # E-E-A-T (10 pts)
    eeat_pts, eeat_note = _eeat_pts(page, 10)
    if page.cf_blocked and eeat_pts == 0:
        eeat_note = ("⚠ E-E-A-T signals unverifiable — on-page content blocked; "
                     "Google Bot is unaffected")
        eeat_pts = 5
    signals.append(_signal("E-E-A-T signals", eeat_pts, 10, eeat_note))
    total += eeat_pts

    # Mobile/HTTPS (5 pts)
    https_ok = page.https
    tech_pts = 5 if https_ok else 0
    signals.append(_signal("Mobile/HTTPS", tech_pts, 5,
                            "HTTPS confirmed" if https_ok else "Not served over HTTPS"))
    total += tech_pts

    score = max(0, min(100, total))
    return {"score": score, "grade": grade(score), "signals": signals}


# ─── Google News Scorer ────────────────────────────────────────────────────────
# Caps: NewsArticle schema 20, Author byline 20, Published date visible 15,
#       Original reporting signals 20, News sitemap section 10, Freshness 15 = 100

_WIRE_AGENCIES = {
    "pti", "reuters", "afp", "ap", "ani", "ians", "bloomberg",
    "staff reporter", "staff writer", "special correspondent",
    "our bureau", "our correspondent", "agencies", "wire",
}

_NEWS_SECTIONS = {
    "news", "national", "international", "business", "sport",
    "opinion", "sci-tech", "science", "technology", "cities", "states",
    "education", "environment", "elections", "entertainment",
}


def score_news(page: "Page", *, now: datetime) -> dict:
    """Score 0–100 for Google News eligibility."""
    signals = []
    total = 0

    # NewsArticle schema (20 pts)
    schema_types = page.schema_types
    has_news_schema = any(
        t in ("NewsArticle", "ReportageNewsArticle", "Article") for t in schema_types
    )
    if page.cf_blocked and not schema_types:
        schema_pts = 10
        schema_note = ("⚠ Schema unverifiable — page blocked; "
                       "publisher typically uses NewsArticle JSON-LD")
    else:
        schema_pts = 20 if has_news_schema else (10 if schema_types else 0)
        schema_note = (
            f"NewsArticle schema found: {', '.join(schema_types)}"
            if has_news_schema
            else (f"Non-news schema: {', '.join(schema_types)}" if schema_types
                  else "No schema found")
        )
    signals.append(_signal("NewsArticle schema", schema_pts, 20, schema_note))
    total += schema_pts

    # Author byline (20 pts)
    if page.has_byline:
        author_pts = 20
        author_note = f"Author: {(page.author or '')[:50]}"
    elif page.cf_blocked:
        author_pts = 10
        author_note = "⚠ Author byline unverifiable — on-page content blocked by Cloudflare"
    else:
        author_pts = 0
        author_note = "No author byline — critical for Google News ranking"
    signals.append(_signal("Author byline", author_pts, 20, author_note))
    total += author_pts

    # Published date visible (15 pts)
    if page.published_dt is not None:
        pub_pts = 15
        pub_note = f"Publish date present: {page.published_dt.isoformat()[:19]}"
    elif page.published:
        pub_pts = 15
        pub_note = f"Publish date: {page.published[:30]}"
    elif page.cf_blocked:
        pub_pts = 8
        pub_note = ("⚠ Publish date unverifiable — page blocked; "
                    "date should be visible in article header")
    else:
        pub_pts = 0
        pub_note = "No visible publish date"
    signals.append(_signal("Published date visible", pub_pts, 15, pub_note))
    total += pub_pts

    # Original reporting signals (20 pts)
    author = (page.author or "").strip().lower()
    is_wire = any(agency in author for agency in _WIRE_AGENCIES) if author else False
    is_named_journalist = (
        page.has_byline
        and not is_wire
        and len(author) > 5
        and " " in author
    )

    named = page.named_sources
    anon = page.anon_sources

    if is_wire:
        orig_pts = 5
        orig_note = (f"Wire service byline detected ({page.author}) "
                     "— original reporting credit limited")
    elif is_named_journalist and page.js_rendered:
        orig_pts = 14
        orig_note = (
            f"Named journalist byline ({page.author}) — original reporting assumed. "
            "Source quotes unverifiable (JS-rendered page); "
            "add named sources to JSON-LD for full credit."
        )
    elif len(named) >= 3:
        orig_pts = 20
        orig_note = (f"Strong original reporting: named journalist + "
                     f"{len(named)} named sources in text")
    elif len(named) >= 1:
        orig_pts = 15 if is_named_journalist else 12
        orig_note = f"Named journalist + {len(named)} named source(s) in text"
    elif is_named_journalist:
        orig_pts = 12
        orig_note = (f"Named journalist byline ({page.author}); "
                     "no inline source quotes detected")
    elif anon > 0:
        orig_pts = 5
        orig_note = f"Anonymous sources only ({anon} references) — add named experts"
    elif page.cf_blocked:
        orig_pts = 10
        orig_note = ("⚠ Original reporting signals unverifiable — on-page content blocked; "
                     "Google Bot is unaffected")
    else:
        orig_pts = 0
        orig_note = ("No author byline and no source signals — "
                     "content may be wire copy or auto-generated")
    signals.append(_signal("Original reporting signals", orig_pts, 20, orig_note))
    total += orig_pts

    # News sitemap section (10 pts) — infer from section_path
    section_path_raw = page.section_path or ""
    # section_path is a string like "World > Politics"; split on " > " or "/"
    if " > " in section_path_raw:
        section_segs = [s.strip() for s in section_path_raw.split(" > ") if s.strip()]
    else:
        section_segs = [s.strip() for s in section_path_raw.split("/") if s.strip()]

    looks_valid = bool(section_segs) and all(
        len(seg) < 30 and not re.search(r'[A-Z0-9]{10,}', seg)
        for seg in section_segs
    )
    in_news_path = looks_valid and any(s.lower() in _NEWS_SECTIONS for s in section_segs)

    if looks_valid:
        sitemap_pts = 10 if in_news_path else 5
        sitemap_note = (
            f"Section: {' > '.join(section_segs)} — in news sitemap"
            if in_news_path
            else f"Section: {' > '.join(section_segs)} — add to news sitemap"
        )
    elif page.cf_blocked:
        sitemap_pts = 8
        sitemap_note = "⚠ Section path from URL (page blocked) — sitemap inclusion unverifiable"
    else:
        sitemap_pts = 5
        sitemap_note = "Section path not detected — ensure URL structure reflects site taxonomy"
    signals.append(_signal("News sitemap section", sitemap_pts, 10, sitemap_note))
    total += sitemap_pts

    # Freshness (15 pts)
    fresh_pts, fresh_note = _freshness_pts(page.published_dt, 15, now)
    if page.cf_blocked and fresh_pts == 0 and page.published_dt is None:
        fresh_note = "⚠ Freshness unverifiable — publish date not accessible from blocked page"
        fresh_pts = 8
    signals.append(_signal("Freshness", fresh_pts, 15, fresh_note))
    total += fresh_pts

    score = max(0, min(100, total))
    return {"score": score, "grade": grade(score), "signals": signals}


# ─── Google Search Scorer ──────────────────────────────────────────────────────
# Caps: Title keyword alignment 20, Meta description 10, H1/H2 structure 10,
#       Word count / content depth 15, Internal links 10, External citations 10,
#       Structured data schema 15, HTTPS 10 = 100

def score_search(page: "Page", *, trend: str = "", now: datetime) -> dict:
    """Score 0–100 for Google Search ranking signals."""
    signals = []
    total = 0

    # Title keyword alignment (20 pts)
    title = (page.title or "").lower()
    matched_trend = trend
    if matched_trend and matched_trend.lower() in title:
        kw_pts = 20
        kw_note = f"Trend keyword '{matched_trend}' found in title"
    elif matched_trend:
        words = matched_trend.lower().split()
        matches = sum(1 for w in words if w in title)
        kw_pts = int(20 * matches / len(words)) if words else 0
        kw_note = (
            f"{matches}/{len(words)} trend words in title"
            if words
            else "No trend keyword to check"
        )
    else:
        kw_pts = 10
        kw_note = "No trend keyword provided — cannot check alignment"
    signals.append(_signal("Title keyword alignment", kw_pts, 20, kw_note))
    total += kw_pts

    # Meta description (10 pts)
    meta_len = len(page.meta_description or "")
    if 120 <= meta_len <= 160:
        meta_pts = 10
        meta_note = f"Meta description is {meta_len} chars — ideal"
    elif meta_len > 0:
        meta_pts = 6
        meta_note = f"Meta description present but {meta_len} chars — aim for 120-155"
    elif page.cf_blocked:
        meta_pts = 5
        meta_note = ("⚠ Meta description unverifiable — page blocked; "
                     "verify 120-155 char description in <head>")
    else:
        meta_pts = 0
        meta_note = "No meta description — missed snippet opportunity"
    signals.append(_signal("Meta description", meta_pts, 10, meta_note))
    total += meta_pts

    # H1/H2 structure (10 pts)
    h1s = page.h1s or []
    h2s = page.h2s or []
    if len(h1s) == 1 and len(h2s) >= 2:
        head_pts = 10
        head_note = f"Good heading structure: 1 H1, {len(h2s)} H2s"
    elif len(h1s) == 1:
        head_pts = 6
        head_note = f"H1 present but only {len(h2s)} H2 subheadings — add more"
    elif len(h1s) == 0 and page.cf_blocked:
        head_pts = 6
        head_note = ("⚠ Heading structure unverifiable — page blocked; "
                     "verify H1 and H2 subheadings are present")
    elif len(h1s) == 0:
        head_pts = 0
        head_note = "No H1 tag found — critical missing signal"
    else:
        head_pts = 4
        head_note = f"{len(h1s)} H1 tags (should be exactly 1)"
    signals.append(_signal("H1/H2 structure", head_pts, 10, head_note))
    total += head_pts

    # Word count / content depth (15 pts)
    wc = page.word_count or 0
    if page.cf_blocked and wc < 200:
        wc_pts = 8
        wc_note = ("⚠ Word count unverifiable — page blocked; "
                   "Google Bot can access full article text")
    elif wc >= 800:
        wc_pts = 15
        wc_note = f"{wc:,} words — strong content depth"
    elif wc >= 400:
        wc_pts = 10
        wc_note = f"{wc:,} words — acceptable; aim for 800+"
    elif wc >= 200:
        wc_pts = 5
        wc_note = f"{wc:,} words — thin content"
    else:
        wc_pts = 0
        wc_note = f"{wc} words — very thin; likely JS-rendered or paywalled"
    signals.append(_signal("Word count / content depth", wc_pts, 15, wc_note))
    total += wc_pts

    # Internal links (10 pts)
    il = page.internal_links or 0
    if page.cf_blocked and il < 2:
        il_pts = 6
        il_note = ("⚠ Internal links unverifiable — page blocked; "
                   "verify 3-5 internal links are present")
    elif il >= 5:
        il_pts = 10
        il_note = f"{il} internal links — good recirculation"
    elif il >= 2:
        il_pts = 6
        il_note = f"{il} internal links — add 3-5 for better crawl equity"
    else:
        il_pts = 2
        il_note = f"Only {il} internal link(s) — add topically relevant links"
    signals.append(_signal("Internal links", il_pts, 10, il_note))
    total += il_pts

    # External citations (10 pts)
    el = page.external_links or 0
    if page.cf_blocked and el < 1:
        el_pts = 5
        el_note = ("⚠ External citations unverifiable — page blocked; "
                   "verify citations to authoritative sources")
    elif el >= 3:
        el_pts = 10
        el_note = f"{el} external links — good trust signals"
    elif el >= 1:
        el_pts = 6
        el_note = f"{el} external link(s) — link to primary sources"
    else:
        el_pts = 0
        el_note = "No external links — add citations to authoritative sources"
    signals.append(_signal("External citations", el_pts, 10, el_note))
    total += el_pts

    # Structured data schema (15 pts)
    schema_types = page.schema_types
    has_news = any(t in ("NewsArticle", "ReportageNewsArticle") for t in schema_types)
    has_any = bool(schema_types)
    if has_news:
        sch_pts = 15
        sch_note = f"NewsArticle schema: {', '.join(schema_types)}"
    elif has_any:
        sch_pts = 8
        sch_note = f"Schema present but not NewsArticle: {', '.join(schema_types)}"
    elif page.cf_blocked:
        sch_pts = 10
        sch_note = ("⚠ Schema unverifiable — page blocked; "
                    "publisher uses NewsArticle JSON-LD on articles")
    else:
        sch_pts = 0
        sch_note = "No structured data — add NewsArticle JSON-LD"
    signals.append(_signal("Structured data schema", sch_pts, 15, sch_note))
    total += sch_pts

    # HTTPS (10 pts)
    https_pts = 10 if page.https else 0
    signals.append(_signal("HTTPS", https_pts, 10,
                            "Served over HTTPS" if page.https else "Not HTTPS — ranking penalty"))
    total += https_pts

    score = max(0, min(100, total))
    return {"score": score, "grade": grade(score), "signals": signals}


# ─── AIO Scorer (AI Overviews / generative readiness) ─────────────────────────
# Caps: extractable answer 25, structured data 20, E-E-A-T 20,
#       freshness 15, scannable headings 10, HTTPS 10 = 100

def score_aio(page: "Page", *, trend: str = "", now: datetime) -> dict:
    """Score 0–100 for AI Overviews / generative-AI readiness."""
    signals = []

    # Extractable answer (25 pts) — concise lede in first ~300 chars of body
    body = (page.body_text or "").strip()
    lede = body[:300]
    trend_in_lede = trend.lower() in lede.lower() if trend else False
    # A good lede: non-empty, contains a verb phrase (basic heuristic: ≥20 chars
    # and at least one sentence-ending character or verb-like word)
    has_lede = (
        len(lede) >= 40
        and bool(re.search(r'\b(is|are|was|were|will|has|have|had|said|says|told|reports?|shows?|found|plans?|tables?|confirms?)\b', lede, re.I))
    )
    if has_lede and trend_in_lede:
        ans_pts = 25
        ans_note = "Concise answer lede with trend keyword — strong AIO candidate"
    elif has_lede:
        ans_pts = 18
        ans_note = "Answer lede present — add trend keyword near the top for AIO lift"
    elif lede:
        ans_pts = 8
        ans_note = "Body starts but lacks a self-contained answer sentence — move key fact to lede"
    else:
        ans_pts = 0
        ans_note = "No body text detected — AIO requires an extractable answer in the first paragraph"
    signals.append(_signal("Extractable answer", ans_pts, 25, ans_note))

    # Structured data (20 pts) — AIO-favoured schemas
    aio_schemas = {"NewsArticle", "QAPage", "FAQPage", "HowTo", "Article"}
    types = page.schema_types
    if any(t in aio_schemas for t in types):
        sch_pts = 20
        sch_note = f"AIO-compatible schema found: {', '.join(types)}"
    elif types:
        sch_pts = 10
        sch_note = f"Schema present but not AIO-optimised ({', '.join(types)}) — add NewsArticle or QAPage"
    else:
        sch_pts = 0
        sch_note = "No structured data — add NewsArticle/QAPage JSON-LD for AIO eligibility"
    signals.append(_signal("Structured data", sch_pts, 20, sch_note))

    # E-E-A-T (20 pts) — named author + citation/primary-source links
    eeat_score = 0
    eeat_notes = []
    if page.has_byline and page.author:
        eeat_score += 12
        eeat_notes.append(f"named author ({page.author[:40]})")
    elif page.has_byline:
        eeat_score += 8
        eeat_notes.append("byline present (no name)")
    else:
        eeat_notes.append("no byline — add a named author for E-E-A-T")
    has_sources = bool(page.named_sources) or (page.external_links >= 1)
    if has_sources:
        eeat_score += 8
        eeat_notes.append(
            f"{len(page.named_sources)} named source(s)" if page.named_sources
            else f"{page.external_links} external citation(s)"
        )
    else:
        eeat_notes.append("no citations — link to primary sources")
    eeat_pts = min(20, eeat_score)
    signals.append(_signal("E-E-A-T", eeat_pts, 20, "E-E-A-T: " + ", ".join(eeat_notes)))

    # Freshness (15 pts)
    fresh_pts, fresh_note = _freshness_pts(page.published_dt, 15, now)
    signals.append(_signal("Freshness", fresh_pts, 15, fresh_note))

    # Scannable headings (10 pts)
    h2s = page.h2s or []
    if len(h2s) >= 2:
        head_pts = 10
        head_note = f"{len(h2s)} H2 subheadings — good scannable structure for AIO extraction"
    elif len(h2s) == 1:
        head_pts = 6
        head_note = "Only 1 H2 — add more subheadings to improve AIO scannability"
    else:
        head_pts = 0
        head_note = "No H2 subheadings — structure with H2s to help AIO extract sections"
    signals.append(_signal("Scannable headings", head_pts, 10, head_note))

    # HTTPS (10 pts)
    https_pts, https_note = _https_pts(page, 10)
    signals.append(_signal("HTTPS", https_pts, 10, https_note))

    total = sum(s["value"] for s in signals)
    score = max(0, min(100, total))
    return {"score": score, "grade": grade(score), "signals": signals}


# ─── Surface registry + dispatcher ────────────────────────────────────────────

SCORERS: dict = {
    "discover": score_discover,
    "google_news": score_news,
    "google_search": score_search,
    "aio": score_aio,
}


def score_surfaces(
    page: "Page",
    keys: list[str],
    *,
    trend: str = "",
    trend_alignment: float = 0.0,
    now: datetime,
) -> dict[str, dict]:
    """Score each requested surface that has a scorer; skip unknown keys."""
    results: dict[str, dict] = {}
    for key in keys:
        if key not in SCORERS:
            continue
        if key == "discover":
            results[key] = score_discover(page, trend_alignment=trend_alignment, now=now)
        elif key == "google_news":
            results[key] = score_news(page, now=now)
        elif key == "google_search":
            results[key] = score_search(page, trend=trend, now=now)
        elif key == "aio":
            results[key] = score_aio(page, trend=trend, now=now)
    return results


# ─── Need-aware weighting (ADR 0049) ─────────────────────────────────────────
# Ported from distribution_fit.py; aio entry added per R2 spec.
# Non-aio weights are verbatim from distribution_fit.NEED_SURFACE_WEIGHTS.

NEED_SURFACE_WEIGHTS: dict[str, dict[str, float]] = {
    "know":       {"discover": 1.5,  "google_news": 1.5,  "google_search": 1.0,  "aio": 1.25},
    "understand": {"google_search": 1.5, "google_news": 1.0, "discover": 0.75, "aio": 1.5},
    "feel":       {"discover": 1.25, "google_news": 0.75, "google_search": 0.75, "aio": 0.75},
    "do":         {"google_search": 1.5, "google_news": 0.75, "discover": 0.75, "aio": 1.0},
}


def need_weighted_composite(
    scored: dict[str, dict],
    need: str | None,
) -> dict:
    """Weighted composite + priority surfaces + top fix.

    Ported from distribution_fit.need_weighted_composite.
    Without a need (or unknown one) every surface weighs 1.0 — plain average.
    top_fix is the biggest weighted signal gap across priority surfaces.
    """
    if not scored:
        return {"composite": 0, "priority_surfaces": [], "top_fix": None}

    weights = NEED_SURFACE_WEIGHTS.get(need or "", {})
    total = wsum = 0.0
    for key, ch in scored.items():
        w = weights.get(key, 1.0)
        wsum += w
        total += ch["score"] * w

    priority = [k for k, w in weights.items() if w > 1.0 and k in scored]
    pool = priority or list(scored)

    best_gap, best_note = 0.0, None
    for k in pool:
        for s in scored[k].get("signals", []):
            gap = (s["max"] - s["value"]) * weights.get(k, 1.0)
            if gap > best_gap:
                best_gap, best_note = gap, s["note"]

    return {
        "composite": round(total / wsum),
        "priority_surfaces": priority,
        "top_fix": best_note,
    }
