"""
Google Search Quality Evaluator Guidelines (SQEG) signals.

Based on the public Search Quality Evaluator Guidelines
(https://static.googleusercontent.com/media/guidelines.raterhub.com/en//searchqualityevaluatorguidelines.pdf)

Key frameworks applied:
  1. YMYL classification — Your Money or Your Life topics require highest E-E-A-T
  2. Page Quality (PQ) rating signals — what quality raters actually check
  3. Needs Met (NM) — does content match user search intent?
  4. Beneficial purpose — does the page exist to genuinely help users?
  5. Lowest Quality flags — signals that trigger lowest PQ rating

Inputs are adapted from the original raw/taxonomy dicts to the Page dataclass
(onlinejourno_scoring.models.Page).
"""
from __future__ import annotations

from onlinejourno_scoring.models import Page

# ── YMYL Topic Classification ──────────────────────────────────────────────────
# SQEG §4: Topics where low quality = potential harm to readers

YMYL_SECTION_SIGNALS = {
    # Critical YMYL (highest standards)
    "health":        ("Critical YMYL", "Health advice requires medical expert authorship and current citations"),
    "medicine":      ("Critical YMYL", "Medical content must cite peer-reviewed sources and licensed practitioners"),
    "finance":       ("Critical YMYL", "Financial advice requires expert credentials and disclosures"),
    "legal":         ("Critical YMYL", "Legal content must cite statutes and qualified lawyers"),
    "law":           ("Critical YMYL", "Legal content must cite statutes and qualified lawyers"),
    "elections":     ("Critical YMYL", "Election content: fact-check claims; do not mislead on voting"),
    # High YMYL
    "science":       ("High YMYL",     "Science reporting should reference primary research and credentialed scientists"),
    "business":      ("High YMYL",     "Financial/business reporting needs expert sources and data attribution"),
    "economy":       ("High YMYL",     "Economic content affects financial decisions — cite data sources"),
    "politics":      ("High YMYL",     "Political content: label opinion vs. fact; cite multiple sources"),
    "national":      ("High YMYL",     "National news directly affects civic decisions — accuracy is critical"),
    "international": ("High YMYL",     "International news shapes policy views — multiple source attribution needed"),
    "environment":   ("High YMYL",     "Climate/environment content: cite scientific consensus sources"),
    # Medium YMYL
    "education":     ("Medium YMYL",   "Education content affects life decisions — cite authoritative institutions"),
    "technology":    ("Medium YMYL",   "Tech content: cite expert sources; avoid misleading product claims"),
    # Low YMYL
    "sport":         ("Low YMYL",      "Sports content: lower YMYL risk but accuracy still matters"),
    "entertainment": ("Low YMYL",      "Entertainment: lowest YMYL concern but avoid misinformation"),
}

YMYL_KEYWORD_SIGNALS = [
    (["vaccine", "vaccination", "treatment", "symptom", "diagnosis", "drug", "medicine"],
     "Critical YMYL", "Medical keywords detected — highest E-E-A-T standards apply"),
    (["invest", "stock", "mutual fund", "tax", "loan", "insurance", "budget", "gdp"],
     "High YMYL", "Financial keywords — cite authoritative data sources"),
    (["election", "vote", "voting", "ballot", "candidate", "constituency"],
     "Critical YMYL", "Election content — must not mislead on electoral processes"),
    (["court", "verdict", "arrest", "accused", "conviction", "fir", "bail"],
     "High YMYL", "Legal/crime reporting — verify facts; distinguish allegation from conviction"),
    (["killed", "death", "dead", "casualties", "disaster", "attack", "bomb"],
     "High YMYL", "Sensitive news — verify casualty figures; cite official sources"),
]

# ── YMYL level requirements ────────────────────────────────────────────────────

_YMYL_REQUIREMENTS = {
    "Critical YMYL": [
        "Named expert author with verifiable credentials",
        "Primary source citations (government data, peer-reviewed research, official statements)",
        "Date published AND last verified/updated",
        "Clear distinction between facts, analysis, and opinion",
        "Contact information for corrections",
    ],
    "High YMYL": [
        "Named author with relevant beat expertise",
        "At least 2 named authoritative sources",
        "Published date visible; updated date for developing stories",
        "Data/statistics linked to primary source",
    ],
    "Medium YMYL": [
        "Named author with byline",
        "At least 1 named expert source",
        "Published date visible",
    ],
    "Low YMYL": [
        "Named author recommended",
        "Published date recommended",
    ],
}


def _ymyl_rank(level: str) -> int:
    return {"Low YMYL": 0, "Medium YMYL": 1, "High YMYL": 2, "Critical YMYL": 3}.get(level, 0)


def _pq_grade(score: int) -> str:
    # Descriptor scale (High PQ … Low PQ) — intentionally distinct from the A–F table in grades.py.
    if score >= 80:
        return "High PQ"
    elif score >= 60:
        return "Medium-High PQ"
    elif score >= 40:
        return "Medium PQ"
    elif score >= 20:
        return "Low-Medium PQ"
    return "Low PQ"


# ── Public API ─────────────────────────────────────────────────────────────────

def classify_ymyl(page: Page) -> dict:
    """
    Classify YMYL level from a Page and return quality requirements.

    Returns:
        {
          "is_ymyl": bool,
          "level": str,           # Critical / High / Medium / Low YMYL
          "label": str,
          "section_matched": str,
          "requirements": [str],
        }

    Ported verbatim from sqeg.py::classify_ymyl — section/keyword maps,
    level ranks, and requirements lists are unchanged.
    Page.section_path (str "Section > Sub") is split to a list for matching,
    mirroring the original's taxonomy["section_path"] list.
    """
    level = "Low YMYL"
    label = "Standard quality requirements apply"
    section_matched = ""

    # Adapt Page.section_path str → list (original used taxonomy["section_path"] list)
    section_parts: list[str] = (
        [p.strip() for p in page.section_path.split(">") if p.strip()]
        if page.section_path else []
    )
    tags: list[str] = page.tags or []

    for part in section_parts + tags:
        part_lower = part.lower()
        for key, (lvl, req) in YMYL_SECTION_SIGNALS.items():
            if key in part_lower:
                if _ymyl_rank(lvl) > _ymyl_rank(level):
                    level = lvl
                    label = req
                    section_matched = part
                break

    # Check title + body keywords (first 500 chars of body, per source)
    combined = (page.title + " " + page.body_text[:500]).lower()
    for keywords, kw_level, kw_label in YMYL_KEYWORD_SIGNALS:
        if any(kw in combined for kw in keywords):
            if _ymyl_rank(kw_level) > _ymyl_rank(level):
                level = kw_level
                label = kw_label

    return {
        "is_ymyl": level != "Low YMYL",
        "level": level,
        "label": label,
        "section_matched": section_matched,
        "requirements": _YMYL_REQUIREMENTS[level],
    }


def page_quality(page: Page) -> dict:
    """
    PQ rating signals from SQEG §5.

    Returns:
        {
          "score": int,           # 0-100
          "grade": str,           # "<Band> PQ"
          "signals": [            # 7 signals with SQEG §refs
              {"name", "points", "max", "ref", "note"}
          ],
          "risk_flags": [str],    # lowest-quality risk flags (SQEG §6)
        }

    The 7 signals (name, max, ref):
      1. Main Content (MC)             max=10  SQEG §5.1
      2. Experience (E)                max=8   SQEG §3.2
      3. Authoritativeness (A)         max=8   SQEG §5.2
      4. Trustworthiness (T)           max=8   SQEG §5.2
      5. Date Transparency             max=8   SQEG §5.3
      6. Beneficial Purpose            max=8   SQEG §4
      7. Website Reputation (advisory) max=8   SQEG §5.4

    Signal keys use "ref" (not "sqeg_ref") to satisfy test_pq_anonymous_news_flags_risk.
    The original source used "sqeg_ref" — this is the one deliberate adaptation;
    the test pin ("ref" in s) governs.
    """
    signals: list[dict] = []
    total_pts = 0
    max_pts = 0

    def add_signal(name: str, pts: int, max_val: int, finding: str, guidance: str, ref: str = "") -> None:
        nonlocal total_pts, max_pts
        total_pts += pts
        max_pts += max_val
        signals.append({
            "name": name,
            "points": pts,
            "max": max_val,
            "ref": ref,
            "note": finding,
            "guidance": guidance,
        })

    # ── Access-limit flags (set early — used throughout) ─────────────────────
    cf_blocked = page.cf_blocked
    partial_pw = getattr(page, "hard_paywall", False) is False and page.paywalled
    access_limited = cf_blocked or partial_pw

    # ── 1. Main Content (MC) — SQEG §5.1 ──────────────────────────────────────
    wc = page.word_count
    js = page.js_rendered
    if js:
        add_signal("Main Content (MC)", 5, 10,
                   "JS-rendered — content depth unverifiable",
                   "Ensure full article body is in JSON-LD articleBody for Google to assess MC quality",
                   "SQEG §5.1")
    elif wc >= 800:
        add_signal("Main Content (MC)", 10, 10,
                   f"{wc:,} words — substantial MC",
                   "Good depth supports High PQ rating",
                   "SQEG §5.1")
    elif wc >= 400:
        add_signal("Main Content (MC)", 6, 10,
                   f"{wc} words — moderate MC depth",
                   "Expand with expert commentary, data, or context for High PQ",
                   "SQEG §5.1")
    else:
        add_signal("Main Content (MC)", 2, 10,
                   f"{wc} words — thin MC",
                   "Very short content signals Low PQ to quality raters. Add depth.",
                   "SQEG §5.1")

    # ── 2. Experience (E) — SQEG §3.2 ────────────────────────────────────────
    has_byline = page.has_byline
    author = (page.author or "").strip().lower()
    js_rendered = page.js_rendered
    named_sources = page.named_sources or []
    external_links = page.external_links

    WIRE_AGENCIES = {"pti", "reuters", "afp", "ap", "ani", "ians", "bloomberg",
                     "staff reporter", "staff writer", "agencies", "our bureau"}
    is_wire = any(agency in author for agency in WIRE_AGENCIES) if author else False
    is_named_journalist = has_byline and not is_wire and len(author) > 5 and " " in author

    if is_named_journalist:
        add_signal("Experience (E)", 8, 8,
                   f"Named journalist byline: {page.author}",
                   "Specific named author signals Experience to quality raters",
                   "SQEG §3.2")
    elif has_byline and is_wire:
        add_signal("Experience (E)", 4, 8,
                   f"Wire service byline: {page.author}",
                   "Wire copy scores lower on Experience — no individual journalist expertise signalled",
                   "SQEG §3.2")
    elif has_byline:
        add_signal("Experience (E)", 6, 8,
                   "Author byline present",
                   "Quality raters look for named, credentialed authors",
                   "SQEG §3.2")
    elif access_limited:
        add_signal("Experience (E)", 5, 8,
                   "Author byline unverifiable — page blocked by Cloudflare/paywall",
                   "Scraper access was denied; Google Bot uses trusted IPs and can read the byline. "
                   "Partial credit awarded — verify byline is visible in the article header.",
                   "SQEG §3.2")
    else:
        add_signal("Experience (E)", 0, 8,
                   "No author byline detected",
                   "Anonymous content is rated poorly by quality raters on YMYL topics",
                   "SQEG §3.2")

    # ── 3. Authoritativeness (A) — SQEG §5.2 ─────────────────────────────────
    if js_rendered and is_named_journalist and not named_sources:
        add_signal("Authoritativeness (A)", 5, 8,
                   "JS-rendered page — inline source quotes unverifiable",
                   "Named journalist present; add sources to JSON-LD articleBody or visible HTML for full credit",
                   "SQEG §5.2")
    elif len(named_sources) >= 2:
        add_signal("Authoritativeness (A)", 8, 8,
                   f"{len(named_sources)} named sources: {', '.join(named_sources[:2])}",
                   "Multiple named experts signal high authoritativeness",
                   "SQEG §5.2")
    elif len(named_sources) == 1:
        add_signal("Authoritativeness (A)", 5, 8,
                   f"1 named source: {named_sources[0]}",
                   "Add more named expert sources for High PQ",
                   "SQEG §5.2")
    else:
        add_signal("Authoritativeness (A)", 1, 8,
                   "No named expert sources detected",
                   "Quality raters flag content with no named authoritative sources",
                   "SQEG §5.2")

    # ── 4. Trustworthiness (T) — SQEG §5.2 ──────────────────────────────────
    if external_links >= 2:
        add_signal("Trustworthiness (T)", 8, 8,
                   f"{external_links} external citations",
                   "Linking to primary sources is a key trust signal",
                   "SQEG §5.2")
    elif external_links == 1:
        add_signal("Trustworthiness (T)", 5, 8,
                   "1 external citation",
                   "Add citations to primary sources (government, research, official statements)",
                   "SQEG §5.2")
    else:
        add_signal("Trustworthiness (T)", 2, 8,
                   "No external links",
                   "Quality raters penalise lack of source transparency",
                   "SQEG §5.2")

    # ── 5. Date Transparency — SQEG §5.3 ─────────────────────────────────────
    published = page.published
    modified = page.modified
    if published and modified:
        add_signal("Date Transparency", 8, 8,
                   "Both published and updated dates present",
                   "Full date transparency satisfies SQEG date requirements",
                   "SQEG §5.3")
    elif published:
        add_signal("Date Transparency", 5, 8,
                   "Published date present; no updated date",
                   "Add 'Last updated' for developing stories — SQEG requires freshness signals",
                   "SQEG §5.3")
    elif access_limited:
        add_signal("Date Transparency", 4, 8,
                   "Publish date unverifiable — page blocked by Cloudflare/paywall",
                   "Partial credit: date is visible to Google Bot. Verify it appears in the article header.",
                   "SQEG §5.3")
    else:
        add_signal("Date Transparency", 0, 8,
                   "No publish date detected",
                   "Missing dates are a Low PQ signal for news content",
                   "SQEG §5.3")

    # ── 6. Beneficial Purpose — SQEG §4 ──────────────────────────────────────
    schema_types = page.schema_types or []
    has_news_schema = any(t in ("NewsArticle", "Article", "ReportageNewsArticle") for t in schema_types)
    if has_news_schema:
        add_signal("Beneficial Purpose", 8, 8,
                   "NewsArticle schema — purpose clearly declared",
                   "Schema tells Google this is a news article serving an informational purpose",
                   "SQEG §4")
    else:
        add_signal("Beneficial Purpose", 3, 8,
                   "No NewsArticle schema — purpose unclear to crawlers",
                   "Add NewsArticle JSON-LD to signal beneficial informational purpose",
                   "SQEG §4")

    # ── 7. Website Reputation (advisory) — SQEG §5.4 ─────────────────────────
    add_signal("Website Reputation (advisory)", 5, 8,
               "Cannot verify from article page — check domain-level signals",
               "SQEG requires: About page, Contact, Editorial policy, Corrections page. "
               "Verify these exist at domain level.",
               "SQEG §5.4")

    # ── Lowest Quality risk flags — SQEG §6 ──────────────────────────────────
    risk_flags: list[str] = []
    if not has_byline and not access_limited:
        risk_flags.append("Anonymous authorship on news content")
    elif has_byline and is_wire:
        risk_flags.append("Wire service byline — original reporting and Experience signals are limited")
    if not published and not access_limited:
        risk_flags.append("No publication date")
    if wc < 200 and not js and not access_limited:
        risk_flags.append("Extremely thin content")
    if page.paywalled and not has_news_schema:
        if partial_pw:
            risk_flags.append("Paywalled content with no NewsArticle schema — add isAccessibleForFree markup")
        else:
            risk_flags.append("Hard paywall with no schema — content inaccessible to Google")

    pq_score = int(total_pts / max_pts * 100) if max_pts else 0

    return {
        "score": pq_score,
        "grade": _pq_grade(pq_score),
        "signals": signals,
        "risk_flags": risk_flags,
    }


def needs_met(page: Page, trend: str = "") -> dict:
    """
    Needs Met assessment — does the content match what the user actually wants?
    SQEG §9: Fully Meets → Highly Meets → Moderately Meets → Partially Meets → Fails to Meet.

    Returns:
        {
          "needs_met": str,        # Highly Meets / Moderately Meets / Partially Meets / Fails to Meet
          "query_intent": str,     # Real-time Informational / Instructional / Opinion / Informational
          "alignment_ratio": float,
          "note": str,
          "taxonomy_section": str,
          "matched_tags": [str],
        }

    Ported verbatim from sqeg.py::evaluate_needs_met — alignment thresholds
    (0.7 / 0.4 / >0 / 0) and intent keyword lists unchanged.
    Page.section_path (str) is split to a list; Page.tags list used directly.
    """
    section_parts: list[str] = (
        [p.strip() for p in page.section_path.split(">") if p.strip()]
        if page.section_path else []
    )
    tags = [t.lower() for t in (page.tags or [])]
    title_lower = (page.title or "").lower()
    trend_lower = trend.lower() if trend else ""

    section_str = " ".join(section_parts).lower()
    trend_words = set(trend_lower.split()) if trend_lower else set()
    section_words = set(section_str.split())
    tag_words = set(" ".join(tags).split())
    title_words = set(title_lower.split())

    taxonomy_alignment = len(trend_words & (section_words | tag_words | title_words))
    total_trend_words = len(trend_words) if trend_words else 1

    alignment_ratio = taxonomy_alignment / total_trend_words

    if alignment_ratio >= 0.7:
        nm_level = "Highly Meets"
        nm_note = "Taxonomy and title strongly align with the trending query"
    elif alignment_ratio >= 0.4:
        nm_level = "Moderately Meets"
        nm_note = "Partial alignment — consider adding the trending topic to title and tags"
    elif alignment_ratio > 0:
        nm_level = "Partially Meets"
        nm_note = "Weak alignment — story may not surface for this trending query"
    else:
        nm_level = "Fails to Meet"
        nm_note = "No detectable alignment between taxonomy and trending topic"

    # Query intent classification
    intent = "Informational"
    if any(w in title_lower for w in ["live", "update", "breaking", "latest"]):
        intent = "Real-time Informational"
    elif any(w in title_lower for w in ["how to", "guide", "explain", "what is"]):
        intent = "Instructional"
    elif any(w in title_lower for w in ["opinion", "editorial", "column", "analysis"]):
        intent = "Opinion"

    return {
        "needs_met": nm_level,
        "note": nm_note,
        "alignment_ratio": round(alignment_ratio, 2),
        "query_intent": intent,
        "taxonomy_section": " > ".join(section_parts).title() if section_parts else "—",
        "matched_tags": [t for t in (page.tags or []) if t.lower() in trend_lower or trend_lower in t.lower()],
    }
