"""Site placement crawl (Hidden Gems' burial detection).

Crawls the masthead's homepage + the section fronts derived from its own
story URLs, and records where each story is actually listed:

  stories.enrichment['placement'] = {
      "homepage": bool,
      "listed_in": ["/news/national", ...],   # front paths listing the story
      "only_in_subsection": bool,             # buried: not homepage, not its
                                              # top-level section front
      "checked_at": iso8601,
  }

Generic by construction: fronts come from the stories' URL structure, not a
hardcoded site map — any masthead the demo points at works.
"""

from __future__ import annotations

from datetime import UTC, datetime
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from onlinejourno_agents import db
from onlinejourno_scoring.url_guard import UrlNotAllowed, validate_url

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124 Safari/537.36"
)
MAX_FRONTS = 12


def _path(url: str) -> str:
    return urlparse(url).path.rstrip("/")


def derive_fronts(story_urls: list[str]) -> list[str]:
    """Front paths to crawl, from the corpus's own URL structure:
    each story's parent directory (sub-section front) and its first-level
    section front. Most-common first, capped."""
    counts: dict[str, int] = {}
    for u in story_urls:
        parts = [p for p in _path(u).split("/") if p][:-1]  # drop the slug
        for depth in (1, len(parts)):
            if depth < 1 or not parts[:depth]:
                continue
            front = "/" + "/".join(parts[:depth])
            counts[front] = counts.get(front, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: -kv[1])
    return [f for f, _ in ranked[:MAX_FRONTS]]


def _links_on(page_url: str, session: requests.Session) -> set[str]:
    try:
        validate_url(page_url)  # SSRF: skip links that resolve to non-public hosts
    except UrlNotAllowed:
        return set()
    resp = session.get(page_url, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    return {
        _path(urljoin(page_url, a["href"]))
        for a in soup.find_all("a", href=True)
    }


def run_site_crawl(*, tenant_slug: str, host: str) -> dict[str, int]:
    """Crawl homepage + derived fronts; write placement onto matching stories."""
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, tenant_slug)
        rows = db.stories_for_host(conn, tenant_id, host_like=host)
        if not rows:
            return {"stories": 0, "fronts": 0, "updated": 0}

        base = f"https://www.{host}" if not host.startswith("http") else host
        session = requests.Session()
        session.headers["User-Agent"] = _UA

        fronts = derive_fronts([r["url"] for r in rows])
        listings: dict[str, set[str]] = {}
        try:
            listings["/"] = _links_on(base + "/", session)
        except requests.RequestException:
            listings["/"] = set()
        crawled = 1
        for front in fronts:
            try:
                listings[front] = _links_on(base + front + "/", session)
                crawled += 1
            except requests.RequestException:
                continue

        now = datetime.now(UTC).isoformat(timespec="seconds")
        updated = 0
        for r in rows:
            spath = _path(r["url"])
            on_home = spath in listings.get("/", set())
            listed_in = [
                f for f, links in listings.items() if f != "/" and spath in links
            ]
            parts = [p for p in spath.split("/") if p][:-1]
            top_front = "/" + parts[0] if parts else ""
            only_sub = (
                not on_home
                and bool(listed_in)
                and top_front not in listed_in
            )
            db.update_story_placement(
                conn,
                tenant_id=tenant_id,
                story_id=r["id"],
                placement={
                    "homepage": on_home,
                    "listed_in": sorted(listed_in),
                    "only_in_subsection": only_sub,
                    "checked_at": now,
                },
            )
            updated += 1
        conn.commit()
    return {"stories": len(rows), "fronts": crawled, "updated": updated}
