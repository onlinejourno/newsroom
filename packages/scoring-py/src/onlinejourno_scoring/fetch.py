"""
Fetch + parse layer — produces a `Page` from raw HTML or a live URL.

Ported from discover-dashboard/analyze/seo_eeat.py:
  _extract_raw       → parse_html (core HTML → Page field extraction)
  extract_taxonomy   → _extract_taxonomy (URL-path section/tag parsing)
  _resolve_article_url
  _is_cloudflare_blocked
  _gnews_article_lookup

Public API
----------
parse_html(html, *, url, meta_hints=None) -> Page
fetch_page(url, *, meta_hints=None) -> Page   # never raises
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs

import requests
from bs4 import BeautifulSoup

from onlinejourno_scoring.models import Page

# ── Constants ─────────────────────────────────────────────────────────────────

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}
_TIMEOUT = 15

# Hosts whose URL paths carry no article-taxonomy information
_OPAQUE_HOSTS = {"news.google.com", "consent.google.com", "www.google.com"}

# Article body selectors — cascade order (ported verbatim)
_ARTICLE_SELECTORS = [
    '[itemprop="articleBody"]',
    "article",
    ".article-body", ".article-body-content", ".articlebodycontent",
    ".story-element", ".story-body", ".story-content",
    ".article-text", ".article__body", ".article-section",
    ".content-body", ".post-content", ".entry-content",
    '[data-testid="article-body"]', '[class*="ArticleBody"]',
    "main",
]

# Weak anchor phrases for recirculation (ported from recirculation.py)
_WEAK_ANCHORS = {
    "click here", "read more", "here", "more", "link", "this", "article",
    "story", "page", "continue reading", "read this", "click", "tap here",
    "find out more", "learn more", "see more", "view more",
}

# Related-articles block CSS selectors (ported from recirculation.py)
_RELATED_BLOCK_SELECTORS = [
    '[class*="related"]',
    '[class*="also-read"]',
    '[class*="more-stories"]',
    '[class*="recommended"]',
    '[class*="you-may-like"]',
    '[id*="related"]',
    '[id*="recommended"]',
    '[data-widget*="related"]',
]


# ── Taxonomy extraction ───────────────────────────────────────────────────────

def _extract_taxonomy(url: str, soup: BeautifulSoup | None = None) -> dict:
    """
    Extract article taxonomy from URL path and meta tags.

    Ported from seo_eeat.extract_taxonomy + _extract_raw meta-tag supplement.

    Returns dict: section_path (list), primary_section, tags, category, image_url
    """
    parsed = urlparse(url)

    if parsed.netloc in _OPAQUE_HOSTS:
        return {
            "section_path": [], "primary_section": "",
            "tags": [], "category": "", "image_url": "",
        }

    path_parts = [p for p in parsed.path.split("/") if p]

    section_parts: list[str] = []
    for part in path_parts:
        clean = re.sub(r'\.\w+$', '', part)
        if re.match(r'^article\d+', clean):
            break
        if re.match(r'^\d+$', clean):
            break
        if len(clean) > 40 and clean.count('-') > 3:
            break
        if len(section_parts) >= 2 and '-' in clean:
            break
        section_parts.append(clean.replace("-", " ").lower())

    primary_section = (
        section_parts[1] if len(section_parts) > 1
        else (section_parts[0] if section_parts else "")
    )

    tags: list[str] = []
    category = ""
    image_url = ""

    # Supplement from HTML meta tags when soup is provided
    if soup is not None:
        for meta_name in ['article:tag', 'news_keywords', 'keywords']:
            tag_el = soup.select_one(
                f'meta[property="{meta_name}"], meta[name="{meta_name}"]'
            )
            if tag_el:
                content = tag_el.get("content", "")
                for kw in re.split(r'[,;]', content):
                    kw = kw.strip()
                    if kw and kw not in tags:
                        tags.append(kw)

        meta_section_el = soup.select_one('meta[property="article:section"]')
        if meta_section_el:
            category = meta_section_el.get("content", "").strip()

        og_image_el = soup.select_one('meta[property="og:image"]')
        if og_image_el:
            image_url = og_image_el.get("content", "").strip()

    return {
        "section_path": section_parts,
        "primary_section": primary_section,
        "tags": tags,
        "category": category,
        "image_url": image_url,
    }


# ── Core HTML parse ───────────────────────────────────────────────────────────

def parse_html(
    html: str,
    *,
    url: str,
    meta_hints: dict | None = None,
) -> Page:
    """
    Parse raw HTML and populate every Page field.

    Ported from seo_eeat._extract_raw + seo_eeat.extract_taxonomy.
    meta_hints (optional dict) provides RSS-derived fallbacks:
        title, published (datetime|str), author, image_url
    """
    soup = BeautifulSoup(html, "lxml")
    meta_hints = meta_hints or {}

    parsed_url = urlparse(url)
    domain = parsed_url.netloc

    # ── R2: is_homepage — empty or "/" path ──────────────────────────────────
    path = parsed_url.path
    is_homepage = path in ("", "/")

    # ── https ────────────────────────────────────────────────────────────────
    https = url.startswith("https://")

    # ── Title ────────────────────────────────────────────────────────────────
    title_tag = soup.find("title")
    title = title_tag.get_text().strip() if title_tag else ""

    # ── Meta description ─────────────────────────────────────────────────────
    meta_description = ""
    for sel in ['meta[name="description"]', 'meta[property="og:description"]']:
        tag = soup.select_one(sel)
        if tag:
            meta_description = tag.get("content", "").strip()
            break

    # ── Headings ─────────────────────────────────────────────────────────────
    h1s = [t.get_text().strip() for t in soup.find_all("h1")]
    h2s = [t.get_text().strip() for t in soup.find_all("h2")]

    # ── Canonical ─────────────────────────────────────────────────────────────
    canonical_tag = soup.find("link", {"rel": "canonical"})
    raw_canonical = canonical_tag.get("href", "") if canonical_tag else ""
    _canon_host = urlparse(raw_canonical).netloc if raw_canonical else ""
    canonical = raw_canonical if _canon_host not in _OPAQUE_HOSTS else ""

    # ── Open Graph ────────────────────────────────────────────────────────────
    og_title_el = soup.select_one('meta[property="og:title"]')
    og_title = og_title_el.get("content", "").strip() if og_title_el else ""

    og_image_el = soup.select_one('meta[property="og:image"]')
    og_image = og_image_el.get("content", "").strip() if og_image_el else ""

    # ── Schema (JSON-LD) ──────────────────────────────────────────────────────
    schema_types: list[str] = []
    for script in soup.find_all("script", {"type": "application/ld+json"}):
        try:
            obj = json.loads(script.string or "")
            if isinstance(obj, list):
                schema_types += [o.get("@type", "") for o in obj if isinstance(o, dict)]
            elif isinstance(obj, dict):
                schema_types.append(obj.get("@type", ""))
        except Exception:
            pass
    schema_types = [t for t in schema_types if t]

    # ── Images ────────────────────────────────────────────────────────────────
    imgs = soup.find_all("img")
    images_total = len(imgs)
    images_without_alt = sum(1 for i in imgs if not i.get("alt"))

    # ── Author ────────────────────────────────────────────────────────────────
    author = ""
    has_byline = False

    for sel in [
        '[itemprop="author"]',
        '[rel="author"]',
        '[class*="author-name"]', '[class*="authorName"]',
        '[class*="author"]',
        ".byline", ".reporter", ".author",
        '[name="author"]',
    ]:
        tag = soup.select_one(sel)
        if tag:
            candidate = tag.get("content") or tag.get_text().strip()
            if candidate and len(candidate) > 2:
                author = candidate
                has_byline = True
                break

    # JSON-LD fallback
    if not has_byline:
        for script in soup.find_all("script", {"type": "application/ld+json"}):
            try:
                obj = json.loads(script.string or "")
                objs = obj if isinstance(obj, list) else [obj]
                for o in objs:
                    if not isinstance(o, dict):
                        continue
                    auth_field = o.get("author")
                    if not auth_field:
                        continue
                    if isinstance(auth_field, dict):
                        name = auth_field.get("name", "").strip()
                    elif isinstance(auth_field, list) and auth_field:
                        first = auth_field[0]
                        name = (
                            first.get("name", "") if isinstance(first, dict)
                            else str(first)
                        ).strip()
                    elif isinstance(auth_field, str):
                        name = auth_field.strip()
                    else:
                        name = ""
                    if name and len(name) > 2:
                        author = name
                        has_byline = True
                        break
            except Exception:
                pass
            if has_byline:
                break

    # <meta name="author"> final fallback
    if not has_byline:
        meta_author = soup.select_one('meta[name="author"]')
        if meta_author:
            candidate = meta_author.get("content", "").strip()
            if candidate and len(candidate) > 2:
                author = candidate
                has_byline = True

    # ── Date signals ──────────────────────────────────────────────────────────
    published = ""
    modified = ""

    for sel in [
        '[itemprop="datePublished"]', '[property="article:published_time"]',
        'time[datetime]', '.article-datestamp', '.publish-time',
    ]:
        tag = soup.select_one(sel)
        if tag:
            published = (
                tag.get("datetime") or tag.get("content") or tag.get_text().strip()
            )
            break

    for sel in [
        '[itemprop="dateModified"]', '[property="article:modified_time"]',
    ]:
        tag = soup.select_one(sel)
        if tag:
            modified = tag.get("content") or tag.get("datetime") or ""
            break

    # Parse published_dt
    published_dt: datetime | None = None
    if published:
        try:
            from dateutil import parser as dateparser
            published_dt = dateparser.parse(published)
            if published_dt and published_dt.tzinfo is None:
                published_dt = published_dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass

    # ── Body text ─────────────────────────────────────────────────────────────
    body_text = ""
    for sel in _ARTICLE_SELECTORS:
        el = soup.select_one(sel)
        if el:
            paras = el.find_all("p")
            if paras:
                body_text = " ".join(
                    p.get_text(separator=" ") for p in paras
                ).strip()
                if len(body_text.split()) > 50:
                    break
            candidate = el.get_text(separator=" ").strip()
            if len(candidate.split()) > 50:
                body_text = candidate
                break

    # Fallback: all <p> tags with >20 words
    if len(body_text.split()) < 100:
        content_ps = [
            p.get_text(separator=" ").strip()
            for p in soup.find_all("p")
            if len(p.get_text().split()) > 20
        ]
        if content_ps:
            body_text = " ".join(content_ps)

    # Detect JS-rendered page
    page_total_words = len(soup.get_text().split())
    js_rendered = page_total_words < 400 and len(body_text.split()) < 150

    # JSON-LD wordCount / articleBody supplement
    estimated_word_count: int | None = None
    for script in soup.find_all("script"):
        script_text = script.string or ""
        if not script_text:
            continue
        wc_match = re.search(r'"wordCount"\s*:\s*(\d+)', script_text)
        if wc_match:
            estimated_word_count = int(wc_match.group(1))
            break
        ab_match = re.search(r'"articleBody"\s*:\s*"([^"]{200,})"', script_text)
        if ab_match:
            body_text = (
                ab_match.group(1).replace("\\n", " ").replace("\\u003c", "<")
            )
            break

    word_count = len(body_text.split())
    if estimated_word_count and word_count < 100:
        word_count = estimated_word_count

    # ── Links ─────────────────────────────────────────────────────────────────
    all_links = soup.find_all("a", href=True)
    internal_link_els = [
        a for a in all_links if domain in a["href"]
    ]
    external_link_els = [
        a for a in all_links
        if "http" in a["href"] and domain not in a["href"]
    ]
    internal_links = len(internal_link_els)
    external_links = len(external_link_els)

    # ── Named / anonymous sources ─────────────────────────────────────────────
    # Pattern A: verb-first → "said Vishwas Katkar"
    verb_first = re.findall(
        r'(?:said|told|according to|stated|added|noted|explained|confirmed)\s+'
        r'([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,2})',
        body_text,
    )
    # Pattern B: name-first → "Vishwas Katkar said"
    name_first = re.findall(
        r'([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20}){1,2})'
        r'(?:\s*,\s*[^,\.]{0,60}?)?\s*,?\s*'
        r'(?:said|told|stated|added|noted|explained|confirmed)\b',
        body_text,
    )
    named_sources = list({
        n.strip() for n in verb_first + name_first
        if len(n.strip()) > 6 and " " in n.strip()
    })[:10]

    text_lower = body_text.lower()
    anon_patterns = re.findall(
        r'(?:source|official|person|spokesperson)\s+(?:who|said|told)',
        text_lower,
    )
    anon_sources = len(anon_patterns)

    # ── Live blog detection ────────────────────────────────────────────────────
    url_lower = url.lower()
    title_lower = title.lower()
    _live_url = any(
        p in url_lower
        for p in ("live-update", "live-blog", "liveblog", "live_update")
    )
    _live_title = (
        title_lower.startswith("live")
        or ": live" in title_lower
        or "live updates" in title_lower
    )
    _live_schema = any("LiveBlog" in (t or "") for t in schema_types)
    is_live_blog = _live_url or _live_title or _live_schema

    # ── Paywall ───────────────────────────────────────────────────────────────
    paywalled = bool(
        soup.select_one('[class*="paywall"], [class*="subscriber"], [id*="paywall"]')
    )
    hard_paywall = paywalled and word_count < 100
    is_wire = False  # not derivable from HTML alone; leave for caller to set

    # ── Recirculation signals ─────────────────────────────────────────────────
    taxonomy = _extract_taxonomy(url, soup=soup)
    section_path_list: list[str] = taxonomy["section_path"]
    primary_section = section_path_list[0].lower() if section_path_list else ""
    secondary_section = (
        section_path_list[1].lower() if len(section_path_list) > 1 else ""
    )

    same_section_count = 0
    deeper_taxonomy_count = 0
    good_anchor_count = 0
    weak_anchor_count = 0

    for a in internal_link_els:
        href = a.get("href", "").lower()
        if primary_section and f"/{primary_section}/" in href:
            same_section_count += 1
            if secondary_section and f"/{secondary_section}/" in href:
                deeper_taxonomy_count += 1

    for a in internal_link_els:
        text = a.get_text(separator=" ").strip().lower()
        text_clean = re.sub(r'[^\w\s]', '', text).strip()
        if not text_clean:
            continue
        if text_clean in _WEAK_ANCHORS or len(text_clean.split()) <= 1:
            weak_anchor_count += 1
        else:
            good_anchor_count += 1

    # Related block detection
    has_related_block = False
    for sel in _RELATED_BLOCK_SELECTORS:
        if soup.select_one(sel):
            has_related_block = True
            break
    if not has_related_block:
        for heading in soup.find_all(["h2", "h3", "h4", "div", "section"]):
            text = heading.get_text().lower().strip()
            if any(
                kw in text
                for kw in ("related", "also read", "more stories", "you may like", "recommended")
            ):
                has_related_block = True
                break

    # ── Taxonomy → Page fields ────────────────────────────────────────────────
    section_path_str = " > ".join(
        s.title() for s in section_path_list
    ) if section_path_list else ""
    topic = taxonomy.get("primary_section", "")
    tags: list[str] = taxonomy.get("tags", [])
    image_url = taxonomy.get("image_url", "") or og_image

    # ── meta_hints fallbacks (RSS-provided, used when HTML lacks signal) ──────
    if meta_hints:
        if meta_hints.get("title") and not title:
            title = meta_hints["title"]
        if not published and meta_hints.get("published"):
            pub_hint = meta_hints["published"]
            if hasattr(pub_hint, "isoformat"):
                published = pub_hint.isoformat()
                published_dt = pub_hint if hasattr(pub_hint, "tzinfo") else published_dt
            else:
                published = str(pub_hint)
        if not has_byline and meta_hints.get("author"):
            author = meta_hints["author"]
            has_byline = True
        if not image_url and meta_hints.get("image_url"):
            image_url = meta_hints["image_url"]

    return Page(
        url=url,
        title=title,
        meta_description=meta_description,
        canonical=canonical,
        og_title=og_title,
        og_image=og_image,
        image_url=image_url,
        images_total=images_total,
        images_without_alt=images_without_alt,
        h1s=h1s,
        h2s=h2s,
        schema_types=schema_types,
        author=author,
        has_byline=has_byline,
        published=published,
        modified=modified,
        published_dt=published_dt,
        word_count=word_count,
        internal_links=internal_links,
        external_links=external_links,
        named_sources=named_sources,
        anon_sources=anon_sources,
        body_text=body_text[:2000],
        section_path=section_path_str,
        topic=topic,
        tags=tags,
        # flags
        cf_blocked=False,
        is_live_blog=is_live_blog,
        js_rendered=js_rendered,
        paywalled=paywalled,
        hard_paywall=hard_paywall,
        is_wire=is_wire,
        https=https,
        is_homepage=is_homepage,
        # recirculation
        same_section_links=same_section_count,
        deeper_taxonomy_links=deeper_taxonomy_count,
        good_anchors=good_anchor_count,
        weak_anchors=weak_anchor_count,
        has_related_block=has_related_block,
    )


# ── URL resolution helpers ────────────────────────────────────────────────────

def _resolve_article_url(original_url: str, resp) -> str:
    """
    Return the true article URL after redirects.

    Handles GNews redirect, consent.google.com redirect, and direct CF blocks.
    Ported verbatim from seo_eeat._resolve_article_url.
    """
    final = resp.url

    if "consent.google.com" in final:
        qs = parse_qs(urlparse(final).query)
        for key in ("continue", "next", "destination"):
            real = qs.get(key, [None])[0]
            if real and real.startswith("http"):
                return real
        return original_url

    if "news.google.com" in final:
        return original_url

    return final


def _is_cloudflare_blocked(resp, soup: BeautifulSoup, original_url: str = "") -> bool:
    """
    Return True if the response is a Cloudflare/consent block.

    Ported verbatim from seo_eeat._is_cloudflare_blocked.
    Note: cf-ray header alone is NOT a block signal (thehindu uses CF as CDN).
    """
    if resp.status_code in (403, 503):
        return True

    if "consent.google.com" in (resp.url or ""):
        return True

    if original_url and "news.google.com" not in original_url:
        orig_host = urlparse(original_url).netloc
        final_host = urlparse(resp.url).netloc
        if orig_host and final_host and orig_host != final_host:
            return True

    title_el = soup.find("title")
    raw_title = title_el.get_text().lower().strip() if title_el else ""

    if "just a moment" in raw_title:
        return True

    if len(resp.text) < 5000 and "cf-" in resp.text[:2000].lower():
        return True

    return False


def _gnews_article_lookup(url: str) -> dict:
    """
    Search Google News RSS for metadata when the article is CF-blocked.

    Ported verbatim from seo_eeat._gnews_article_lookup.
    Returns dict: { found, title, published, image_url, summary }
    """
    try:
        import feedparser
        from dateutil import parser as dateparser
    except ImportError:
        return {"found": False}

    parsed = urlparse(url)
    domain = parsed.netloc.replace("www.", "")
    domain_core = domain.split(".")[0].lower()

    path = parsed.path
    slug_match = re.search(
        r'/([a-z][a-z0-9-]{15,}?)(?:/article\d|\.ece|/$)', path
    )
    if not slug_match:
        return {"found": False}

    slug = slug_match.group(1)
    words = [w for w in slug.split("-") if len(w) > 3][:6]
    if not words:
        return {"found": False}

    from urllib.parse import quote_plus
    query = f"site:{domain} {' '.join(words)}"
    gnews_url = (
        f"https://news.google.com/rss/search"
        f"?q={quote_plus(query)}&hl=en-IN&gl=IN&ceid=IN:en"
    )

    try:
        feed = feedparser.parse(gnews_url)
        for entry in feed.entries[:20]:
            src = getattr(entry, "source", None) or {}
            src_title = (
                src.get("title", "") if isinstance(src, dict)
                else getattr(src, "title", "")
            )
            src_href = (
                src.get("href", "") if isinstance(src, dict)
                else getattr(src, "href", "")
            )

            if (domain_core not in src_title.lower()
                    and domain not in src_href.lower()):
                continue

            entry_title = entry.get("title", "").strip()
            entry_title = re.sub(
                r'\s*[-–]\s*[A-Z][^\-–]{3,40}\s*$', '', entry_title
            ).strip()
            if not entry_title:
                continue

            published_iso = ""
            for field_name in ("published", "updated"):
                val = entry.get(field_name)
                if val:
                    try:
                        published_iso = (
                            dateparser.parse(val)
                            .astimezone(timezone.utc)
                            .isoformat()
                        )
                        break
                    except Exception:
                        pass

            image_url = ""
            media = entry.get("media_content", [])
            if media and isinstance(media, list) and isinstance(media[0], dict):
                image_url = media[0].get("url", "")
            if not image_url:
                thumbs = entry.get("media_thumbnail", [])
                if thumbs and isinstance(thumbs, list) and isinstance(thumbs[0], dict):
                    image_url = thumbs[0].get("url", "")

            return {
                "found": True,
                "title": entry_title,
                "published": published_iso,
                "image_url": image_url,
                "summary": entry.get("summary", "")[:300],
            }
    except Exception as e:
        print(f"[fetch] GNews article lookup error: {e}")

    return {"found": False}


# ── fetch_page ────────────────────────────────────────────────────────────────

def fetch_page(url: str, *, meta_hints: dict | None = None) -> Page:
    """
    Fetch a URL and return a populated Page.  Never raises.

    Steps:
      1. GET with browser User-Agent (15 s timeout)
      2. _resolve_article_url — unwrap GNews / consent redirects
      3. _is_cloudflare_blocked → set cf_blocked; try _gnews_article_lookup
      4. parse_html with gnews_meta applied as priority-1 override

    On any network/parse error, returns a minimal Page with cf_blocked=True
    and meta_hints-derived fields where available.
    """
    meta_hints = meta_hints or {}

    def _fallback_page(reason: str) -> Page:
        """Minimal Page on failure; populate what meta_hints provides."""
        title = meta_hints.get("title", "")
        published_raw = meta_hints.get("published", "")
        published_str = ""
        published_dt: datetime | None = None
        if published_raw:
            if hasattr(published_raw, "isoformat"):
                published_str = published_raw.isoformat()
                published_dt = published_raw
            else:
                published_str = str(published_raw)

        return Page(
            url=url,
            title=title,
            author=meta_hints.get("author", ""),
            has_byline=bool(meta_hints.get("author")),
            image_url=meta_hints.get("image_url", ""),
            published=published_str,
            published_dt=published_dt,
            cf_blocked=True,
            https=url.startswith("https://"),
        )

    try:
        resp = requests.get(
            url, headers=_HEADERS, timeout=_TIMEOUT, allow_redirects=True
        )
        soup = BeautifulSoup(resp.text, "lxml")
    except Exception as e:
        print(f"[fetch] network error for {url}: {e}")
        return _fallback_page(str(e))

    try:
        article_url = _resolve_article_url(url, resp)
        cf_blocked = _is_cloudflare_blocked(resp, soup, original_url=url)

        gnews_meta: dict = {}
        if cf_blocked:
            gnews_meta = _gnews_article_lookup(article_url)
            print(
                f"[fetch] blocked {url} → {article_url} "
                f"— GNews: {'found' if gnews_meta.get('found') else 'miss'}"
            )

        # Build combined hints: gnews overrides meta_hints when CF-blocked
        effective_hints = dict(meta_hints)
        if cf_blocked and gnews_meta.get("found"):
            if gnews_meta.get("title"):
                effective_hints["title"] = gnews_meta["title"]
            if gnews_meta.get("published") and not effective_hints.get("published"):
                effective_hints["published"] = gnews_meta["published"]
            if gnews_meta.get("image_url") and not effective_hints.get("image_url"):
                effective_hints["image_url"] = gnews_meta["image_url"]

        page = parse_html(resp.text, url=article_url, meta_hints=effective_hints)
        # Stamp CF flag (parse_html always sets cf_blocked=False)
        if cf_blocked:
            page.cf_blocked = True
        return page

    except Exception as e:
        print(f"[fetch] parse error for {url}: {e}")
        return _fallback_page(str(e))
