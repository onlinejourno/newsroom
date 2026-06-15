"""
SEO + E-E-A-T periodic-table checks (port of seo_eeat.py _check_* functions).

Reads from the normalised Page dataclass instead of a raw BeautifulSoup dict.
Severity values: "critical" | "warning" | "ok"
PT element codes: Ti Ds Hd Mm Sd Cn Ar Sh Il El Au Fr Tr Sc Ar Ac
"""
from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from onlinejourno_scoring.models import Page


# ─── Primitive builder ─────────────────────────────────────────────────────────

def _chk(category: str, signal: str, severity: str, finding: str,
         recommendation: str, element: str = "") -> dict:
    return {
        "category": category,
        "signal": signal,
        "severity": severity,
        "finding": finding,
        "recommendation": recommendation,
        "element": element,
    }


# ─── Individual checks ────────────────────────────────────────────────────────

def _check_title(page: "Page", trend: str = "") -> list[dict]:
    checks = []
    title = page.title or ""
    ln = len(title)

    if ln == 0:
        checks.append(_chk(
            "SEO", "Title tag", "critical",
            "No <title> tag found",
            "Add a <title> tag — it's the primary headline in Discover cards",
            "Ti",
        ))
    elif ln > 70:
        checks.append(_chk(
            "SEO", "Title length", "warning",
            f"Title is {ln} chars (recommended: 50-65)",
            "Trim to under 65 characters to avoid truncation in Discover cards",
            "Ti",
        ))
    elif ln < 30:
        checks.append(_chk(
            "SEO", "Title length", "warning",
            f"Title is only {ln} chars — too short",
            "Expand the title with a key detail or entity name (person, place, figure)",
            "Ti",
        ))
    else:
        checks.append(_chk(
            "SEO", "Title length", "ok",
            f"Title length is {ln} chars — good",
            "",
            "Ti",
        ))

    if trend and trend.lower() not in title.lower():
        checks.append(_chk(
            "SEO", "Trend keyword in title", "warning",
            f"Trending keyword '{trend}' not found in title",
            f"Consider including '{trend}' or a close variant near the start of the title",
            "Ti",
        ))
    elif trend:
        checks.append(_chk(
            "SEO", "Trend keyword in title", "ok",
            f"Trending keyword '{trend}' present in title",
            "",
            "Ti",
        ))

    # Numbers boost CTR in Discover
    if re.search(r'\d', title):
        checks.append(_chk(
            "SEO", "Number in title", "ok",
            "Title contains a number — good for CTR",
            "",
            "Ti",
        ))

    return checks


def _check_meta_description(page: "Page") -> list[dict]:
    desc = page.meta_description or ""
    ln = len(desc)
    if ln == 0:
        if page.cf_blocked:
            return [_chk(
                "SEO", "Meta description", "warning",
                "Meta description not assessable — page is Cloudflare-protected",
                "Verify a 120-155 char meta description is set in the CMS article template",
                "Ds",
            )]
        return [_chk(
            "SEO", "Meta description", "warning",
            "No meta description found",
            "Add a 120-155 char meta description summarising the story — Discover may use it as the card snippet",
            "Ds",
        )]
    elif ln > 160:
        return [_chk(
            "SEO", "Meta description length", "warning",
            f"Meta description is {ln} chars — may be truncated",
            "Keep meta description under 155 characters",
            "Ds",
        )]
    return [_chk(
        "SEO", "Meta description", "ok",
        f"Meta description present ({ln} chars)",
        "",
        "Ds",
    )]


def _check_headings(page: "Page") -> list[dict]:
    checks = []
    h1s = page.h1s or []
    h2s = page.h2s or []

    if page.cf_blocked:
        checks.append(_chk(
            "SEO", "H1 / H2 tags", "warning",
            "Heading structure not assessable — page is Cloudflare-protected",
            "Verify the article has one <h1> headline and 2-3 <h2> subheadings in the CMS",
            "Hd",
        ))
        return checks

    if page.is_homepage:
        checks.append(_chk(
            "SEO", "H1 / H2 tags", "warning",
            "Heading structure not assessed — run on the article URL, not the homepage",
            "Re-run this check against an individual article URL to get actionable findings",
            "Hd",
        ))
        return checks

    if len(h1s) == 0:
        checks.append(_chk(
            "SEO", "H1 tag", "critical",
            "No <h1> found",
            "Add exactly one <h1> with the primary article headline",
            "Hd",
        ))
    elif len(h1s) > 1:
        checks.append(_chk(
            "SEO", "H1 tag", "warning",
            f"{len(h1s)} H1 tags found",
            "Use exactly one <h1> — multiple H1s dilute heading hierarchy",
            "Hd",
        ))
    else:
        checks.append(_chk(
            "SEO", "H1 tag", "ok",
            "Single H1 tag present",
            "",
            "Hd",
        ))

    if len(h2s) == 0:
        checks.append(_chk(
            "SEO", "H2 subheadings", "warning",
            "No H2 subheadings found",
            "Add at least 2-3 H2 subheadings to improve scannability and topical signals",
            "Hd",
        ))
    else:
        checks.append(_chk(
            "SEO", "H2 subheadings", "ok",
            f"{len(h2s)} H2 subheadings found",
            "",
            "Hd",
        ))
    return checks


def _check_images(page: "Page") -> list[dict]:
    total = page.images_total or 0
    without_alt = page.images_without_alt or 0
    checks = []

    if page.cf_blocked:
        checks.append(_chk(
            "SEO", "Images", "warning",
            "Image count not assessable — page is Cloudflare-protected",
            "Ensure at least one high-quality image (min 1200×630 px) is present in the article",
            "Mm",
        ))
        return checks

    if page.is_homepage:
        checks.append(_chk(
            "SEO", "Images", "warning",
            "Image check not assessed — run on the article URL, not the homepage",
            "Re-run against an individual article URL for image findings",
            "Mm",
        ))
        return checks

    if total == 0:
        checks.append(_chk(
            "SEO", "Images", "warning",
            "No images found",
            "Add at least one high-quality image (min 1200×630px) — Discover cards are image-driven",
            "Mm",
        ))
    else:
        checks.append(_chk(
            "SEO", "Images", "ok",
            f"{total} image(s) found",
            "",
            "Mm",
        ))

    if without_alt > 0:
        checks.append(_chk(
            "SEO", "Image alt text", "warning",
            f"{without_alt} image(s) missing alt text",
            "Add descriptive alt text to all images for accessibility and image search",
            "Mm",
        ))
    elif total > 0:
        checks.append(_chk(
            "SEO", "Image alt text", "ok",
            "All images have alt text",
            "",
            "Mm",
        ))

    return checks


def _check_canonical(page: "Page") -> list[dict]:
    if page.cf_blocked:
        return [_chk(
            "Technical", "Canonical URL", "warning",
            "Canonical tag not assessable — page is Cloudflare-protected",
            "Verify <link rel='canonical'> matches the article URL in the CMS template",
            "Ar",
        )]

    if page.is_homepage:
        return [_chk(
            "Technical", "Canonical URL", "warning",
            "Canonical check not assessed — run on the article URL, not the homepage",
            "Re-run against an individual article URL",
            "Ar",
        )]

    canonical = page.canonical or ""
    url = page.url or ""

    if not canonical:
        return [_chk(
            "Technical", "Canonical URL", "warning",
            "No canonical tag found",
            "Add <link rel='canonical' href='...'> to prevent duplicate content issues",
            "Ar",
        )]
    if canonical.rstrip("/") != url.rstrip("/"):
        return [_chk(
            "Technical", "Canonical URL", "warning",
            f"Canonical ({canonical}) differs from current URL",
            "Verify the canonical URL is intentional — mismatched canonicals can prevent Discover indexing",
            "Ar",
        )]
    return [_chk(
        "Technical", "Canonical URL", "ok",
        "Canonical tag matches page URL",
        "",
        "Ar",
    )]


def _check_schema(page: "Page") -> list[dict]:
    types = page.schema_types or []
    is_live_blog = page.is_live_blog or False
    checks = []

    if not types:
        if page.cf_blocked:
            checks.append(_chk(
                "Technical", "Structured data", "warning",
                "Schema not assessable — page is Cloudflare-protected",
                "Verify NewsArticle JSON-LD schema is present in the CMS",
                "Sd",
            ))
        elif page.is_homepage:
            checks.append(_chk(
                "Technical", "Structured data", "warning",
                "Schema check not assessed — run on the article URL, not the homepage",
                "Re-run against an individual article URL to verify NewsArticle JSON-LD is present",
                "Sd",
            ))
        else:
            checks.append(_chk(
                "Technical", "Structured data", "critical",
                "No JSON-LD schema found",
                "Add NewsArticle JSON-LD schema with headline, datePublished, dateModified, author, image",
                "Sd",
            ))
    else:
        has_news = any(t in ("NewsArticle", "Article", "ReportageNewsArticle") for t in types)
        has_live = any("LiveBlog" in (t or "") for t in types)

        if is_live_blog:
            if has_live:
                checks.append(_chk(
                    "Technical", "LiveBlogPosting schema", "ok",
                    "LiveBlogPosting schema found — correct for live updates format",
                    "",
                    "Sd",
                ))
            elif has_news:
                checks.append(_chk(
                    "Technical", "LiveBlogPosting schema", "warning",
                    "NewsArticle schema found but LiveBlogPosting recommended for live updates",
                    "Replace or supplement with LiveBlogPosting schema including liveBlogUpdate "
                    "entries so Google can surface individual updates in Search and Discover",
                    "Sd",
                ))
            else:
                checks.append(_chk(
                    "Technical", "LiveBlogPosting schema", "critical",
                    f"Schema present ({', '.join(types)}) but no LiveBlogPosting type",
                    "Add LiveBlogPosting JSON-LD with liveBlogUpdate entries — "
                    "required for Google to show live badge in search results",
                    "Sd",
                ))
        else:
            if has_news:
                checks.append(_chk(
                    "Technical", "NewsArticle schema", "ok",
                    "NewsArticle/Article schema found",
                    "",
                    "Sd",
                ))
            else:
                checks.append(_chk(
                    "Technical", "NewsArticle schema", "warning",
                    f"Schema present ({', '.join(types)}) but no NewsArticle type",
                    "Use NewsArticle or ReportageNewsArticle for news content — not just Article",
                    "Sd",
                ))
    return checks


def _check_open_graph(page: "Page") -> list[dict]:
    checks = []
    og_title = page.og_title or ""
    og_image = page.og_image or ""
    cf = page.cf_blocked

    if not og_title:
        if cf:
            checks.append(_chk(
                "SEO", "OG title", "warning",
                "og:title not assessable — page is Cloudflare-protected",
                "Verify og:title meta tag is set in the CMS article template",
                "Sh",
            ))
        else:
            checks.append(_chk(
                "SEO", "OG title", "warning",
                "og:title not set",
                "Add og:title — used by Discover and social previews for the card headline",
                "Sh",
            ))
    else:
        checks.append(_chk("SEO", "OG title", "ok", "og:title present", "", "Sh"))

    if not og_image:
        if cf:
            checks.append(_chk(
                "SEO", "OG image", "warning",
                "og:image not assessable — page is Cloudflare-protected",
                "Verify og:image (min 1200×630px) is set — it is the Discover card image",
                "Sh",
            ))
        else:
            checks.append(_chk(
                "SEO", "OG image", "critical",
                "og:image not set",
                "Add og:image (min 1200×630px) — this IS the Discover card image; missing = no card",
                "Sh",
            ))
    else:
        checks.append(_chk("SEO", "OG image", "ok", "og:image present", "", "Sh"))

    return checks


def _check_word_count(page: "Page") -> list[dict]:
    wc = page.word_count or 0
    js_rendered = page.js_rendered or False
    is_live_blog = page.is_live_blog or False
    # partial_paywall: paywalled but not hard_paywall (intro visible, body cut off)
    partial_paywall = page.paywalled and not page.hard_paywall

    # Live blog: content is a stream of timestamped updates — word count irrelevant
    if is_live_blog:
        schema_types = page.schema_types or []
        schema_note = (
            " LiveBlogPosting schema detected."
            if any("LiveBlog" in (t or "") for t in schema_types)
            else " Add LiveBlogPosting JSON-LD so Google indexes individual updates."
        )
        return [_chk(
            "Content", "Word count", "ok",
            "Live blog / live updates format — word count not assessed",
            f"Live blogs are evaluated by update frequency and recency, not total word count.{schema_note}",
            "Cn",
        )]

    # JS-rendered: content loads via JavaScript — scraped count is unreliable
    if js_rendered:
        # Page model has no estimated_word_count field; use word_count as best proxy
        estimated = wc if wc >= 100 else None
        note = f" — schema reports {estimated:,} words" if estimated else ""
        if estimated and estimated >= 600:
            return [_chk(
                "Content", "Word count", "ok",
                f"JS-rendered page{note}",
                "Schema word count looks healthy. Keep full articleBody in JSON-LD.",
                "Cn",
            )]
        return [_chk(
            "Content", "Word count", "warning",
            f"JS-rendered page — body not accessible via HTML scraping{note}",
            "Confirm article length in your CMS. Top Discover stories run 800-1,500 words. "
            "Add articleBody and wordCount to JSON-LD so Google can assess content depth.",
            "Cn",
        )]

    # Partial paywall: standalone _check_paywalled() handles this — skip to avoid duplication
    if partial_paywall:
        return []

    if page.is_homepage:
        return [_chk(
            "Content", "Word count", "warning",
            "Word count not assessed — run on the article URL, not the homepage",
            "Re-run against an individual article URL for depth findings",
            "Cn",
        )]

    if wc < 300:
        return [_chk(
            "Content", "Word count", "critical",
            f"Only {wc} words — very thin content",
            "Expand to at least 600 words; top Discover stories typically have 800-1,500 words",
            "Cn",
        )]
    elif wc < 600:
        return [_chk(
            "Content", "Word count", "warning",
            f"{wc} words — below competitive depth",
            "Aim for 800+ words; add context, background, expert quotes, or data",
            "Cn",
        )]
    return [_chk(
        "Content", "Word count", "ok",
        f"{wc:,} words — good depth",
        "",
        "Cn",
    )]


def _check_internal_links(page: "Page") -> list[dict]:
    if page.cf_blocked:
        return [_chk(
            "SEO", "Internal links", "warning",
            "Internal links not assessable — page is Cloudflare-protected",
            "Verify the article includes 3-5 internal links to related stories",
            "Il",
        )]
    if page.is_homepage:
        return [_chk(
            "SEO", "Internal links", "warning",
            "Internal links not assessed — run on the article URL, not the homepage",
            "Re-run against an individual article URL",
            "Il",
        )]
    count = page.internal_links or 0
    if count < 2:
        return [_chk(
            "SEO", "Internal links", "warning",
            f"Only {count} internal link(s)",
            "Add 3-5 internal links to related stories — improves crawlability and topic authority",
            "Il",
        )]
    return [_chk(
        "SEO", "Internal links", "ok",
        f"{count} internal links",
        "",
        "Il",
    )]


def _check_external_links(page: "Page") -> list[dict]:
    if page.cf_blocked:
        return [_chk(
            "E-E-A-T", "External citations", "warning",
            "External links not assessable — page is Cloudflare-protected",
            "Verify the article cites at least one primary source (govt data, research paper)",
            "El",
        )]
    if page.is_homepage:
        return [_chk(
            "E-E-A-T", "External citations", "warning",
            "External links not assessed — run on the article URL, not the homepage",
            "Re-run against an individual article URL",
            "El",
        )]
    count = page.external_links or 0
    if count == 0:
        return [_chk(
            "E-E-A-T", "External citations", "warning",
            "No external links found",
            "Link to primary sources (government data, research papers) — signals trustworthiness to Google",
            "El",
        )]
    return [_chk(
        "E-E-A-T", "External citations", "ok",
        f"{count} external links present",
        "",
        "El",
    )]


def _check_author(page: "Page") -> list[dict]:
    checks = []
    has_byline = page.has_byline or False
    author = page.author or ""

    if page.is_homepage:
        return [_chk(
            "E-E-A-T", "Author byline", "warning",
            "Author check not assessed — run on the article URL, not the homepage",
            "Re-run the audit against an individual article URL",
            "Au",
        )]

    if page.cf_blocked and not has_byline:
        checks.append(_chk(
            "E-E-A-T", "Author byline", "warning",
            "Author byline not assessable — page is Cloudflare-protected",
            "Verify a named author byline is present in the CMS/article page",
            "Au",
        ))
    elif not has_byline:
        checks.append(_chk(
            "E-E-A-T", "Author byline", "critical",
            "No author byline detected",
            "Add a named author byline — anonymous articles score low on E-E-A-T; link to author profile",
            "Au",
        ))
    else:
        checks.append(_chk(
            "E-E-A-T", "Author byline", "ok",
            f"Author byline found: '{author[:50]}'",
            "",
            "Au",
        ))
    return checks


def _check_date_signals(page: "Page") -> list[dict]:
    checks = []
    published = page.published or ""
    modified = page.modified or ""
    cf = page.cf_blocked

    if not published:
        checks.append(_chk(
            "E-E-A-T", "Publish date", "warning",
            "No publish date detected" + (" (page CF-protected)" if cf else ""),
            "Add datePublished in both the visible page and JSON-LD schema — Discover shows time-since-published",
            "Fr",
        ))
    else:
        src_note = " (from Google News index)" if cf else ""
        checks.append(_chk(
            "E-E-A-T", "Publish date", "ok",
            f"Publish date: {published[:30]}{src_note}",
            "",
            "Fr",
        ))

    if not modified:
        if cf:
            checks.append(_chk(
                "E-E-A-T", "Last modified date", "warning",
                "dateModified not assessable — page is Cloudflare-protected",
                "Ensure dateModified is set in JSON-LD schema and updated on content changes",
                "Fr",
            ))
        else:
            checks.append(_chk(
                "E-E-A-T", "Last modified date", "warning",
                "No dateModified signal found",
                "Add dateModified to JSON-LD schema; update it when content changes — signals freshness to Discover",
                "Fr",
            ))
    else:
        checks.append(_chk(
            "E-E-A-T", "Last modified date", "ok",
            f"Modified date: {modified[:30]}",
            "",
            "Fr",
        ))
    return checks


def _check_expert_citations(page: "Page") -> list[dict]:
    named = page.named_sources or []
    anon = page.anon_sources or 0
    checks = []

    if len(named) == 0 and anon > 0:
        checks.append(_chk(
            "E-E-A-T", "Named expert sources", "warning",
            f"{anon} anonymous source reference(s), no named experts",
            "Replace at least 1 anonymous source with a named expert (name + title + organisation)",
            "Tr",
        ))
    elif len(named) == 0:
        checks.append(_chk(
            "E-E-A-T", "Expert sources", "warning",
            "No expert citations detected",
            "Add quotes from named experts (economists, officials, scientists) to boost authoritativeness",
            "Tr",
        ))
    else:
        checks.append(_chk(
            "E-E-A-T", "Named expert sources", "ok",
            f"Named sources detected: {', '.join(named[:3])}",
            "",
            "Tr",
        ))
    return checks


def _check_named_sources(page: "Page") -> list[dict]:
    anon = page.anon_sources or 0
    if anon > 2:
        return [_chk(
            "E-E-A-T", "Anonymous sources", "warning",
            f"{anon} anonymous source references found",
            "Reduce reliance on anonymous sources; where unavoidable, describe role/position precisely",
            "Tr",
        )]
    return []


def _check_corrections_policy(page: "Page") -> list[dict]:
    body = (page.body_text or "").lower()
    if "correction" in body or "corrected" in body or "editor's note" in body:
        return [_chk(
            "E-E-A-T", "Corrections transparency", "ok",
            "Correction/editor's note present — good transparency signal",
            "",
            "Tr",
        )]
    return []


def _check_https(page: "Page") -> list[dict]:
    # Use the explicit https flag (populated from URL scheme by the fetcher).
    # Fall back to inspecting the URL directly so the field is not mandatory.
    is_secure = page.https if page.https is not None else (page.url or "").startswith("https://")
    if is_secure:
        return [_chk("Technical", "HTTPS", "ok", "Page served over HTTPS", "", "Sc")]
    return [_chk(
        "Technical", "HTTPS", "critical",
        "Page not served over HTTPS",
        "Migrate to HTTPS — non-secure pages are excluded from Discover",
        "Sc",
    )]


def _check_paywalled(page: "Page") -> list[dict]:
    """
    Consolidated paywall check.
    partial_paywall = paywalled AND NOT hard_paywall (intro visible, body cut off).
    hard_paywall    = content fully subscriber-gated.
    """
    paywalled = page.paywalled or False
    hard = page.hard_paywall or False
    partial = paywalled and not hard
    wc = page.word_count or 0
    has_schema = bool(page.schema_types)
    cf_blocked = page.cf_blocked

    if not paywalled:
        return []
    if cf_blocked:
        # CF-block notice already covers inaccessibility — avoid double-reporting
        return []

    if partial:
        schema_note = (
            " NewsArticle schema with isAccessibleForFree and hasPart/isPartOf is detected — good."
            if has_schema
            else " Add NewsArticle JSON-LD with isAccessibleForFree:False and hasPart/cssSelector so Google can index the full article."
        )
        return [_chk(
            "Technical", "Paywall & content access", "warning",
            f"Paywalled — scrapers see only {wc} words (intro only); full article is subscriber-only",
            f"Google's crawler uses special credentials to access paywalled content — ensure your paywall "
            f"allows Googlebot via flexible metered access (First Click Free) or structured-data signalling.{schema_note}",
            "Ac",
        )]

    # Hard paywall
    schema_note = (
        " Schema present — good."
        if has_schema
        else " Add NewsArticle JSON-LD with isAccessibleForFree and hasPart so Google can index metadata."
    )
    return [_chk(
        "Technical", "Paywall & content access", "warning",
        "Hard paywall — content fully subscriber-gated",
        f"Hard paywalls prevent Google from assessing content quality. "
        f"Switch to flexible sampling / First Click Free.{schema_note}",
        "Ac",
    )]


# ─── Orchestrator ─────────────────────────────────────────────────────────────

def run_checks(page: "Page", trend: str = "") -> list[dict]:
    """Run all SEJ periodic-table checks against a Page.  Returns list of check dicts."""
    checks: list[dict] = []

    # SEO
    checks += _check_title(page, trend)
    checks += _check_meta_description(page)
    checks += _check_headings(page)
    checks += _check_images(page)
    checks += _check_canonical(page)
    checks += _check_schema(page)
    checks += _check_open_graph(page)

    # Content depth
    checks += _check_word_count(page)
    checks += _check_internal_links(page)
    checks += _check_external_links(page)

    # E-E-A-T
    checks += _check_author(page)
    checks += _check_date_signals(page)
    checks += _check_expert_citations(page)
    checks += _check_named_sources(page)
    checks += _check_corrections_policy(page)

    # Technical
    checks += _check_https(page)
    checks += _check_paywalled(page)

    return checks


# ─── Scoring helpers ─────────────────────────────────────────────────────────

def overall(*, passed: int, total: int, critical: int, warning: int) -> int:
    """
    Compute 0-100 score.
    Formula: max(0, int((passed/total)*100) - critical*12 - warning*4)
    Guard: total == 0 → 0. Uses int() truncation to match the original
    discover-dashboard score (not round()).
    """
    if total == 0:
        return 0
    raw = int((passed / total) * 100) - (critical * 12) - (warning * 4)
    return max(0, raw)


def grade(score: int) -> str:
    """A≥80, B≥65, C≥50, D≥35, else F."""
    if score >= 80:
        return "A"
    if score >= 65:
        return "B"
    if score >= 50:
        return "C"
    if score >= 35:
        return "D"
    return "F"


def score_checks(page: "Page", trend: str = "") -> dict:
    """
    Run all checks and return a scored result dict.

    Returns:
        {
          "checks": list[dict],
          "score":  int,
          "grade":  str,
          "counts": {"critical": int, "warning": int, "ok": int},
        }
    """
    checks = run_checks(page, trend)
    counts = {
        "critical": sum(1 for c in checks if c["severity"] == "critical"),
        "warning":  sum(1 for c in checks if c["severity"] == "warning"),
        "ok":       sum(1 for c in checks if c["severity"] == "ok"),
    }
    sc = overall(
        passed=counts["ok"],
        total=len(checks),
        critical=counts["critical"],
        warning=counts["warning"],
    )
    return {
        "checks": checks,
        "score":  sc,
        "grade":  grade(sc),
        "counts": counts,
    }
