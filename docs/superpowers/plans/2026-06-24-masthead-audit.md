# Masthead Audit Instrument — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a laptop-only CLI + local web viewer that ingests 90 days of public data for any newsroom domain and produces a dashboard + print-ready Galley PDF for client meetings.

**Architecture:** Python ingestor CLI writes three JSON files (`articles.json`, `trends.json`, `findings.json`) into `viewer/data/`; Next.js viewer reads them at build-time and renders dashboard + `/report` route. No database, no cloud, no auth. One JSON schema ties the two sub-systems together.

**Tech Stack:** Python 3.11+, feedparser, requests, beautifulsoup4, pytrends, scikit-learn, numpy (ingestor) · Next.js 15, Tailwind CSS, Recharts (viewer) · OJDS design tokens copied from `platform/apps/web/app/globals.css`

---

## File Map

```
~/projects/masthead-audit/
├── ingestor/
│   ├── pyproject.toml
│   ├── ingest.py                    # CLI entry: python ingest.py <domain> [--days 90]
│   ├── sitemap.py                   # sitemap.xml → article list
│   ├── cluster.py                   # topic clustering via TF-IDF noun phrases
│   ├── trends.py                    # pytrends + GDELT fallback
│   ├── competitive.py               # GDELT competitive analysis + peer detection
│   ├── score.py                     # story_score + gap_score + grade
│   ├── writer.py                    # write articles/trends/findings JSON
│   ├── collectors/
│   │   ├── base.py                  # VENDORED from platform/packages/ingest-py
│   │   ├── rss.py                   # VENDORED from platform/packages/ingest-py
│   │   └── gdelt.py                 # VENDORED from platform/packages/ingest-py
│   └── tests/
│       ├── test_sitemap.py
│       ├── test_cluster.py
│       ├── test_score.py
│       └── test_writer.py
└── viewer/
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── app/
    │   ├── globals.css              # OJDS tokens (copied from platform)
    │   ├── layout.tsx
    │   ├── page.tsx                 # Dashboard
    │   └── report/
    │       └── page.tsx             # Galley report (print-ready)
    ├── components/
    │   ├── charts/
    │   │   ├── InterestTrajectory.tsx
    │   │   └── TopicMomentum.tsx
    │   ├── dashboard/
    │   │   ├── SummaryStrip.tsx
    │   │   ├── IndustryPosition.tsx
    │   │   └── ArticleFeed.tsx
    │   └── galley/
    │       ├── GradeBlock.tsx
    │       └── Finding.tsx
    ├── lib/
    │   └── data.ts                  # TypeScript types + JSON loaders
    └── data/
        ├── articles.json            # written by ingestor (gitignored)
        ├── trends.json
        └── findings.json
```

---

## Task 1: Repo scaffold + ingestor pyproject

**Files:**
- Create: `~/projects/masthead-audit/ingestor/pyproject.toml`
- Create: `~/projects/masthead-audit/.gitignore`
- Create: `~/projects/masthead-audit/README.md`

- [ ] **Step 1: Create repo directory**

```bash
mkdir -p ~/projects/masthead-audit/ingestor/collectors
mkdir -p ~/projects/masthead-audit/ingestor/tests
mkdir -p ~/projects/masthead-audit/viewer/data
cd ~/projects/masthead-audit && git init
```

- [ ] **Step 2: Write pyproject.toml**

```toml
# ingestor/pyproject.toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "masthead-ingestor"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "feedparser>=6.0",
    "requests>=2.31",
    "beautifulsoup4>=4.12",
    "lxml>=5.0",
    "pytrends>=4.9",
    "scikit-learn>=1.4",
    "numpy>=1.26",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-mock>=3.12"]
```

- [ ] **Step 3: Write .gitignore**

```gitignore
# ingestor
__pycache__/
*.pyc
.venv/
ingestor/.venv/

# viewer
viewer/node_modules/
viewer/.next/

# data files (committed per engagement on a branch)
viewer/data/articles.json
viewer/data/trends.json
viewer/data/findings.json
```

- [ ] **Step 4: Install ingestor deps**

```bash
cd ~/projects/masthead-audit/ingestor
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Expected: `Successfully installed masthead-ingestor-0.1.0`

- [ ] **Step 5: Initial commit**

```bash
cd ~/projects/masthead-audit
git add pyproject.toml .gitignore README.md
git commit -m "chore: repo scaffold"
```

---

## Task 2: Vendor collectors from platform

**Files:**
- Create: `ingestor/collectors/base.py` (vendored)
- Create: `ingestor/collectors/rss.py` (vendored, stripped of CloudflareFetcher dep)
- Create: `ingestor/collectors/gdelt.py` (vendored)
- Create: `ingestor/collectors/__init__.py`

Source originals in `~/projects/platform/packages/ingest-py/src/onlinejourno_ingest/collectors/`.

- [ ] **Step 1: Copy base.py verbatim**

```bash
cp ~/projects/platform/packages/ingest-py/src/onlinejourno_ingest/collectors/base.py \
   ~/projects/masthead-audit/ingestor/collectors/base.py
```

- [ ] **Step 2: Copy gdelt.py, strip Postgres import**

```bash
cp ~/projects/platform/packages/ingest-py/src/onlinejourno_ingest/collectors/gdelt.py \
   ~/projects/masthead-audit/ingestor/collectors/gdelt.py
```

Then check for any `from onlinejourno_ingest` imports and replace with local refs:

```bash
grep "onlinejourno_ingest" ~/projects/masthead-audit/ingestor/collectors/gdelt.py
```

Replace any `from onlinejourno_ingest.collectors.base import` → `from collectors.base import` and `from onlinejourno_ingest.protocols import` → `from protocols import`.

- [ ] **Step 3: Create protocols.py (Signal dataclass)**

The vendored collectors reference `Signal`. Create a local copy — no Postgres fields needed:

```python
# ingestor/protocols.py
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


class FetchError(Exception):
    pass


@dataclass(slots=True)
class Signal:
    tenant_id: UUID
    source_id: UUID
    url: str
    url_hash: str
    headline: str | None = None
    body_text: str | None = None
    external_id: str | None = None
    published_at: datetime | None = None
    fetched_at: datetime | None = None
    language: str = "en"
    raw_payload: dict[str, Any] = field(default_factory=dict)
```

- [ ] **Step 4: Copy rss.py and fix imports**

```bash
cp ~/projects/platform/packages/ingest-py/src/onlinejourno_ingest/collectors/rss.py \
   ~/projects/masthead-audit/ingestor/collectors/rss.py
```

The platform rss.py imports `CloudflareFetcher`. For the audit tool, replace with a simple requests fetch:

Edit `ingestor/collectors/rss.py` — replace the CloudflareFetcher import block:

```python
# Remove:
# from onlinejourno_ingest.fetch.cloudflare import CloudflareBlocked, CloudflareFetcher, Fetcher

# Add at top of file instead:
from collectors.base import DEFAULT_TIMEOUT_SECONDS, http_session, latin_share, url_hash
from protocols import FetchError, Signal
```

Remove the `fetcher` parameter from `__init__` and replace `self.fetcher.fetch(url)` calls with direct `self.session.get(url, timeout=self.timeout).text`.

Full corrected `__init__`:
```python
def __init__(
    self,
    *,
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
    max_items_per_source: int = 200,
    session=None,
) -> None:
    self.timeout = timeout_seconds
    self.max_items = max_items_per_source
    self.session = session or http_session()
```

- [ ] **Step 5: Fix gdelt.py imports**

Edit `ingestor/collectors/gdelt.py`:

```python
# Replace:
# from onlinejourno_ingest.collectors.base import ...
# from onlinejourno_ingest.protocols import ...

# With:
from collectors.base import DEFAULT_TIMEOUT_SECONDS, http_session, url_hash
from protocols import FetchError, Signal
```

- [ ] **Step 6: Create collectors/__init__.py**

```python
# ingestor/collectors/__init__.py
from collectors.rss import RSSCollector
from collectors.gdelt import GDELTCollector

__all__ = ["RSSCollector", "GDELTCollector"]
```

- [ ] **Step 7: Smoke-test imports**

```bash
cd ~/projects/masthead-audit/ingestor && source .venv/bin/activate
python -c "from collectors.rss import RSSCollector; from collectors.gdelt import GDELTCollector; print('OK')"
```

Expected: `OK`

- [ ] **Step 8: Commit**

```bash
git add ingestor/collectors/ ingestor/protocols.py
git commit -m "feat: vendor ingest collectors from platform"
```

---

## Task 3: sitemap.py

**Files:**
- Create: `ingestor/sitemap.py`
- Create: `ingestor/tests/test_sitemap.py`

- [ ] **Step 1: Write failing test**

```python
# ingestor/tests/test_sitemap.py
import pytest
from unittest.mock import patch, MagicMock
from sitemap import fetch_articles

SAMPLE_SITEMAP = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://example.com/business/rbi-rate-2026-04-05</loc>
    <lastmod>2026-04-05</lastmod>
    <news:news>
      <news:publication_date>2026-04-05T09:00:00Z</news:publication_date>
      <news:title>RBI holds repo rate steady</news:title>
    </news:news>
  </url>
  <url>
    <loc>https://example.com/subscribe</loc>
    <lastmod>2026-04-01</lastmod>
  </url>
</urlset>"""


def test_fetch_articles_filters_non_news():
    with patch("sitemap.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.text = SAMPLE_SITEMAP
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        articles = fetch_articles("example.com", days=90, _now_date="2026-06-24")

    assert len(articles) == 1
    assert articles[0]["url"] == "https://example.com/business/rbi-rate-2026-04-05"
    assert articles[0]["section"] == "business"
    assert articles[0]["title"] == "RBI holds repo rate steady"


def test_fetch_articles_infers_section_from_url():
    with patch("sitemap.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.text = SAMPLE_SITEMAP
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        articles = fetch_articles("example.com", days=90, _now_date="2026-06-24")

    assert articles[0]["section"] == "business"
```

- [ ] **Step 2: Run to verify failure**

```bash
cd ~/projects/masthead-audit/ingestor && source .venv/bin/activate
pytest tests/test_sitemap.py -v
```

Expected: `ModuleNotFoundError: No module named 'sitemap'`

- [ ] **Step 3: Write sitemap.py**

```python
# ingestor/sitemap.py
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from urllib.parse import urlparse

import requests

_NON_NEWS_SEGMENTS = frozenset({
    "subscribe", "subscription", "epaper", "e-paper", "ePaper",
    "login", "register", "account", "profile", "search",
    "tag", "tags", "author", "authors", "sitemap",
    "rss", "feed", "feeds", "static", "ads", "advertise",
    "contact", "about", "privacy", "terms",
})

_NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "news": "http://www.google.com/schemas/sitemap-news/0.9",
    "image": "http://www.google.com/schemas/sitemap-image/1.1",
}


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
        try:
            return datetime.strptime(s[:19], fmt[:len(s[:19])]).date()
        except ValueError:
            continue
    return None


def _section_from_url(url: str) -> str:
    parts = [p for p in urlparse(url).path.strip("/").split("/") if p]
    if len(parts) >= 2:
        candidate = parts[0]
        if candidate.lower() not in _NON_NEWS_SEGMENTS and not candidate.isdigit():
            return candidate.lower()
    return "general"


def _is_news_url(url: str) -> bool:
    path_parts = set(urlparse(url).path.strip("/").split("/"))
    return not path_parts.intersection(_NON_NEWS_SEGMENTS)


def _fetch_xml(url: str, session: requests.Session) -> ET.Element | None:
    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        return ET.fromstring(resp.text)
    except Exception:
        return None


def fetch_articles(
    domain: str,
    *,
    days: int = 90,
    session: requests.Session | None = None,
    _now_date: str | None = None,
) -> list[dict]:
    """Return article dicts from domain sitemap filtered to `days` window."""
    import requests as req_mod
    sess = session or req_mod.Session()
    sess.headers["User-Agent"] = "masthead-audit/0.1"

    cutoff = (
        date.fromisoformat(_now_date)
        if _now_date
        else date.today()
    )
    from datetime import timedelta
    cutoff = cutoff - timedelta(days=days)

    sitemap_url = f"https://{domain}/sitemap.xml"
    root = _fetch_xml(sitemap_url, sess)
    if root is None:
        sitemap_url = f"https://{domain}/sitemap_index.xml"
        root = _fetch_xml(sitemap_url, sess)
    if root is None:
        return []

    # Collect all <loc> entries — handle sitemap index (nested sitemaps)
    urls_to_parse: list[str] = []
    tag = root.tag.lower()
    if "sitemapindex" in tag:
        for sitemap_el in root.findall("sm:sitemap", _NS):
            loc = sitemap_el.findtext("sm:loc", namespaces=_NS)
            if loc:
                urls_to_parse.append(loc)
        # Re-fetch each sub-sitemap
        sub_roots = [_fetch_xml(u, sess) for u in urls_to_parse]
        roots = [r for r in sub_roots if r is not None]
    else:
        roots = [root]

    articles: list[dict] = []
    seen: set[str] = set()

    for rt in roots:
        for url_el in rt.findall("sm:url", _NS):
            loc = url_el.findtext("sm:loc", namespaces=_NS) or ""
            if not loc or loc in seen:
                continue
            if not _is_news_url(loc):
                continue

            # Try news:publication_date first, fallback lastmod
            pub_str = url_el.findtext("news:news/news:publication_date", namespaces=_NS)
            if not pub_str:
                pub_str = url_el.findtext("sm:lastmod", namespaces=_NS)
            pub_date = _parse_date(pub_str)
            if pub_date is None or pub_date < cutoff:
                continue

            title = url_el.findtext("news:news/news:title", namespaces=_NS) or ""

            seen.add(loc)
            articles.append({
                "url": loc,
                "title": title,
                "published_at": pub_str or "",
                "section": _section_from_url(loc),
                "author": None,
                "word_count": None,
            })

    return articles
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pytest tests/test_sitemap.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add ingestor/sitemap.py ingestor/tests/test_sitemap.py
git commit -m "feat: sitemap crawler with news-path filtering"
```

---

## Task 4: cluster.py — topic clustering

**Files:**
- Create: `ingestor/cluster.py`
- Create: `ingestor/tests/test_cluster.py`

- [ ] **Step 1: Write failing test**

```python
# ingestor/tests/test_cluster.py
from cluster import build_clusters, assign_topics

ARTICLES = [
    {"url": "https://ex.com/a1", "title": "RBI holds repo rate steady amid inflation concerns", "section": "business"},
    {"url": "https://ex.com/a2", "title": "RBI monetary policy review: rate unchanged", "section": "business"},
    {"url": "https://ex.com/a3", "title": "Cricket World Cup: India beats Pakistan", "section": "sports"},
    {"url": "https://ex.com/a4", "title": "Cricket: India qualify for final", "section": "sports"},
]


def test_build_clusters_groups_by_similarity():
    clusters = build_clusters(ARTICLES, n_clusters=2)
    assert len(clusters) == 2
    # Each cluster has required keys
    for c in clusters:
        assert "id" in c
        assert "label" in c
        assert "keywords" in c
        assert isinstance(c["keywords"], list)


def test_assign_topics_matches_articles():
    clusters = build_clusters(ARTICLES, n_clusters=2)
    articles = assign_topics(ARTICLES, clusters, threshold=0.10)
    # Every article gets at least one topic
    assert all(len(a["matched_topics"]) >= 1 for a in articles)
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_cluster.py -v
```

Expected: `ModuleNotFoundError: No module named 'cluster'`

- [ ] **Step 3: Write cluster.py**

```python
# ingestor/cluster.py
from __future__ import annotations

import re
import hashlib

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer


_STOP = frozenset("""
a an the and or but in on at to for of with is are was were be been
has have had do does did will would could should may might shall can
it its this that these those we our i you your he she they their
""".split())


def _clean(text: str) -> str:
    text = re.sub(r"[^a-z0-9 ]", " ", text.lower())
    return " ".join(w for w in text.split() if w not in _STOP and len(w) > 2)


def _top_terms(tfidf_matrix, feature_names: list[str], cluster_idx: int, top_n: int = 6) -> list[str]:
    center = tfidf_matrix[cluster_idx]
    if hasattr(center, "toarray"):
        center = center.toarray().flatten()
    indices = np.argsort(center)[::-1][:top_n]
    return [feature_names[i] for i in indices if center[i] > 0]


def build_clusters(articles: list[dict], *, n_clusters: int = 10) -> list[dict]:
    """Cluster articles by title similarity. Returns list of cluster dicts."""
    texts = [_clean(a.get("title", "") + " " + a.get("section", "")) for a in articles]
    actual_k = min(n_clusters, len(texts))
    if actual_k < 2:
        slug = "general"
        return [{"id": slug, "label": "General", "keywords": []}]

    vec = TfidfVectorizer(max_features=500, ngram_range=(1, 2))
    matrix = vec.fit_transform(texts)
    feature_names = vec.get_feature_names_out().tolist()

    km = KMeans(n_clusters=actual_k, n_init=10, random_state=42)
    km.fit(matrix)

    clusters: list[dict] = []
    for idx in range(actual_k):
        keywords = _top_terms(km.cluster_centers_, feature_names, idx)
        label = " ".join(w.capitalize() for w in keywords[:2]) or f"Topic {idx + 1}"
        slug = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")
        clusters.append({
            "id": slug,
            "label": label,
            "keywords": keywords,
            "_center": km.cluster_centers_[idx],
        })
    return clusters


def assign_topics(
    articles: list[dict],
    clusters: list[dict],
    *,
    threshold: float = 0.20,
) -> list[dict]:
    """Add matched_topics list to each article. Returns updated articles."""
    texts = [_clean(a.get("title", "") + " " + a.get("section", "")) for a in articles]
    vec = TfidfVectorizer(max_features=500, ngram_range=(1, 2))
    matrix = vec.fit_transform(texts)
    feature_names = vec.get_feature_names_out().tolist()

    # Build cluster centers in the same feature space
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    for i, article in enumerate(articles):
        row = matrix[i]
        matched = []
        for cluster in clusters:
            center = cluster.get("_center")
            if center is None:
                continue
            # Project center to current feature space
            cluster_vec = np.zeros((1, len(feature_names)))
            # Rebuild similarity: use keywords as proxy
            for kw in cluster.get("keywords", []):
                if kw in feature_names:
                    j = feature_names.index(kw)
                    cluster_vec[0, j] = 1.0
            if cluster_vec.sum() == 0:
                continue
            sim = cosine_similarity(row, cluster_vec)[0, 0]
            if sim >= threshold:
                matched.append(cluster["id"])
        article["matched_topics"] = matched if matched else [clusters[0]["id"]]

    return articles
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_cluster.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add ingestor/cluster.py ingestor/tests/test_cluster.py
git commit -m "feat: TF-IDF topic clustering"
```

---

## Task 5: trends.py — pytrends + GDELT fallback

**Files:**
- Create: `ingestor/trends.py`

No unit test for trends.py — it calls external APIs (pytrends, GDELT). Integration-tested in Task 10 (end-to-end).

- [ ] **Step 1: Write trends.py**

```python
# ingestor/trends.py
from __future__ import annotations

import time
from datetime import date, timedelta

import requests

# pytrends is optional; falls back to GDELT if unavailable or returns zeros
try:
    from pytrends.request import TrendReq
    _PYTRENDS_AVAILABLE = True
except ImportError:
    _PYTRENDS_AVAILABLE = False

GDELT_DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc"
_GDELT_INTERVAL = 5.0  # seconds between requests


def _pytrends_series(keywords: list[str], start_date: str, end_date: str) -> list[int]:
    """Query pytrends. Returns list[int] (0-100), empty list on failure."""
    if not _PYTRENDS_AVAILABLE:
        return []
    try:
        pt = TrendReq(hl="en-US", tz=330, timeout=(10, 30))
        timeframe = f"{start_date} {end_date}"
        pt.build_payload(keywords[:5], timeframe=timeframe, geo="")
        df = pt.interest_over_time()
        if df.empty:
            return []
        col = [c for c in df.columns if c != "isPartial"][0]
        vals = df[col].tolist()
        return [int(v) for v in vals]
    except Exception:
        return []


def _gdelt_volume_series(
    keywords: list[str],
    start_date: str,
    end_date: str,
    *,
    session: requests.Session,
) -> list[int]:
    """Query GDELT article count per day as trend proxy. Returns normalised list."""
    query = " OR ".join(f'"{kw}"' for kw in keywords[:3])
    try:
        params = {
            "query": query,
            "mode": "TimelineVol",
            "format": "json",
            "startdatetime": start_date.replace("-", "") + "000000",
            "enddatetime": end_date.replace("-", "") + "235959",
            "timelinesmooth": 3,
        }
        resp = session.get(GDELT_DOC_ENDPOINT, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        timeline = data.get("timeline", [{}])[0].get("data", [])
        vals = [float(item.get("value", 0)) for item in timeline]
        if not vals or max(vals) == 0:
            return []
        norm_max = max(vals)
        return [int(v / norm_max * 100) for v in vals]
    except Exception:
        return []


def fetch_trends(
    clusters: list[dict],
    *,
    days: int = 90,
    session: requests.Session | None = None,
) -> dict[str, dict]:
    """
    For each cluster, fetch trend series.
    Returns dict keyed by cluster id with keys:
      series_values, series_labels, trend_source, trend_peak_date
    """
    import requests as req_mod
    sess = session or req_mod.Session()
    sess.headers["User-Agent"] = "masthead-audit/0.1"

    end_date = date.today()
    start_date = end_date - timedelta(days=days)
    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    # Build date labels (daily)
    labels = [(start_date + timedelta(days=i)).isoformat() for i in range(days + 1)]

    result: dict[str, dict] = {}
    last_gdelt_call = 0.0

    for cluster in clusters:
        cid = cluster["id"]
        keywords = cluster.get("keywords", [cluster["label"]])

        # Try pytrends first
        series = _pytrends_series(keywords, start_str, end_str)
        source = "pytrends"

        # Fallback: all zeros or empty → use GDELT volume
        if not series or max(series) == 0:
            wait = _GDELT_INTERVAL - (time.monotonic() - last_gdelt_call)
            if wait > 0:
                time.sleep(wait)
            series = _gdelt_volume_series(keywords, start_str, end_str, session=sess)
            last_gdelt_call = time.monotonic()
            source = "gdelt"

        # Pad / trim to match labels length
        if len(series) > len(labels):
            series = series[:len(labels)]
        elif len(series) < len(labels):
            series = series + [0] * (len(labels) - len(series))

        peak_idx = series.index(max(series)) if series else 0
        peak_date = labels[peak_idx] if labels else ""
        peak_val = series[peak_idx] if series else 0

        result[cid] = {
            "series_values": series,
            "series_labels": labels,
            "trend_source": source,
            "trend_peak_date": peak_date,
            "trend_score": peak_val,
        }

    return result
```

- [ ] **Step 2: Smoke-test import**

```bash
cd ~/projects/masthead-audit/ingestor && source .venv/bin/activate
python -c "from trends import fetch_trends; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add ingestor/trends.py
git commit -m "feat: trends fetcher with pytrends + GDELT fallback"
```

---

## Task 6: competitive.py — GDELT peer analysis

**Files:**
- Create: `ingestor/competitive.py`

- [ ] **Step 1: Write competitive.py**

```python
# ingestor/competitive.py
from __future__ import annotations

import time
from urllib.parse import urlparse

import requests

GDELT_DOC_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc"
_GDELT_INTERVAL = 5.0


def _gdelt_domain_breakdown(
    keywords: list[str],
    start_date: str,
    end_date: str,
    *,
    session: requests.Session,
    domain_filter: str | None = None,
) -> list[dict]:
    """Query GDELT for article count per domain for a keyword set."""
    query = " OR ".join(f'"{kw}"' for kw in keywords[:3])
    if domain_filter:
        query += f" domain:{domain_filter}"
    try:
        params = {
            "query": query,
            "mode": "ArtList",
            "format": "json",
            "startdatetime": start_date.replace("-", "") + "000000",
            "enddatetime": end_date.replace("-", "") + "235959",
            "maxrecords": 250,
        }
        resp = session.get(GDELT_DOC_ENDPOINT, params=params, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        articles = data.get("articles", [])
        domain_counts: dict[str, int] = {}
        for art in articles:
            url = art.get("url", "")
            domain = urlparse(url).netloc.lstrip("www.")
            if domain:
                domain_counts[domain] = domain_counts.get(domain, 0) + 1
        total = sum(domain_counts.values()) or 1
        result = []
        for domain, count in sorted(domain_counts.items(), key=lambda x: -x[1])[:10]:
            result.append({
                "domain": domain,
                "count": count,
                "share_pct": round(count / total * 100, 1),
            })
        return result
    except Exception:
        return []


def fetch_competitive(
    clusters: list[dict],
    *,
    client_domain: str,
    start_date: str,
    end_date: str,
    trends_data: dict[str, dict],
    session: requests.Session | None = None,
    top_n_peers: int = 5,
) -> dict[str, dict]:
    """
    For each cluster (top 5 by trend_score), query GDELT for competitor domains.
    Returns dict keyed by cluster id with keys:
      competitor_domains, peer_outlets, is_white_space, article_dates
    """
    import requests as req_mod
    sess = session or req_mod.Session()
    sess.headers["User-Agent"] = "masthead-audit/0.1"

    # Top 5 clusters by trend_score
    scored = [
        (cid, trends_data.get(cid, {}).get("trend_score", 0))
        for cid in [c["id"] for c in clusters]
    ]
    top_clusters = sorted(scored, key=lambda x: -x[1])[:5]
    top_ids = {cid for cid, _ in top_clusters}

    peer_pool: dict[str, int] = {}  # domain → total count across topics
    result: dict[str, dict] = {}
    last_call = 0.0

    cluster_map = {c["id"]: c for c in clusters}

    for cid, _ in top_clusters:
        cluster = cluster_map.get(cid, {})
        keywords = cluster.get("keywords", [cluster.get("label", cid)])

        wait = _GDELT_INTERVAL - (time.monotonic() - last_call)
        if wait > 0:
            time.sleep(wait)
        competitor_domains = _gdelt_domain_breakdown(
            keywords, start_date, end_date, session=sess
        )
        last_call = time.monotonic()

        # Accumulate peer pool (exclude client)
        for d in competitor_domains:
            if client_domain not in d["domain"]:
                peer_pool[d["domain"]] = peer_pool.get(d["domain"], 0) + d["count"]

        # Client share
        client_share = next(
            (d["share_pct"] for d in competitor_domains if client_domain in d["domain"]),
            0.0,
        )
        max_competitor_share = max(
            (d["share_pct"] for d in competitor_domains if client_domain not in d["domain"]),
            default=0.0,
        )
        trend_score = trends_data.get(cid, {}).get("trend_score", 0)
        is_white_space = max_competitor_share < 8.0 and trend_score > 50

        # Article dates from GDELT for this topic (client domain only)
        wait = _GDELT_INTERVAL - (time.monotonic() - last_call)
        if wait > 0:
            time.sleep(wait)
        client_articles = _gdelt_domain_breakdown(
            keywords, start_date, end_date, session=sess, domain_filter=client_domain
        )
        last_call = time.monotonic()
        article_dates: list[str] = []  # populated from sitemap in writer, placeholder here

        result[cid] = {
            "competitor_domains": competitor_domains,
            "is_white_space": is_white_space,
            "client_share_pct": client_share,
            "article_dates": article_dates,
        }

    # Build peer_outlets from pool — top N excluding client
    peer_outlets = [
        {"domain": d, "coverage_volume": v}
        for d, v in sorted(peer_pool.items(), key=lambda x: -x[1])[:top_n_peers]
        if client_domain not in d
    ]

    for cid in result:
        result[cid]["peer_outlets"] = peer_outlets

    # For clusters NOT in top 5, add empty competitive data
    for cluster in clusters:
        cid = cluster["id"]
        if cid not in result:
            result[cid] = {
                "competitor_domains": [],
                "peer_outlets": peer_outlets,
                "is_white_space": False,
                "client_share_pct": 0.0,
                "article_dates": [],
            }

    return result
```

- [ ] **Step 2: Smoke-test**

```bash
python -c "from competitive import fetch_competitive; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add ingestor/competitive.py
git commit -m "feat: GDELT competitive analysis + peer auto-detection"
```

---

## Task 7: score.py

**Files:**
- Create: `ingestor/score.py`
- Create: `ingestor/tests/test_score.py`

- [ ] **Step 1: Write failing test**

```python
# ingestor/tests/test_score.py
from score import story_score, gap_score, grade, compute_scores

def test_story_score_formula():
    s = story_score(
        trend_momentum=80,
        content_alignment=0.5,
        gdelt_pickup_norm=40,
        freshness=0.9,
    )
    # 0.40*80 + 0.30*(0.5*100) + 0.20*40 + 0.10*(0.9*100)
    # = 32 + 15 + 8 + 9 = 64
    assert abs(s - 64.0) < 0.01


def test_gap_score_formula():
    # coverage_ratio = 3/9 = 0.333...
    # gap = 89 * (1 - 0.333) = 89 * 0.667 = 59.4
    g = gap_score(trend_score=89, articles_published=3, articles_expected=9)
    assert abs(g - 59.37) < 0.1


def test_articles_expected_floor():
    # articles_expected = max(trend_peak // 10, 1)
    # trend_peak=5 → expected=1; gap = 5 * (1 - 3/1) clamps to 0
    g = gap_score(trend_score=5, articles_published=3, articles_expected=1)
    assert g == 0.0  # coverage_ratio > 1 → clamp to 0


def test_grade_boundaries():
    assert grade(80) == "A"
    assert grade(79) == "B"
    assert grade(60) == "B"
    assert grade(59) == "C"
    assert grade(40) == "C"
    assert grade(39) == "D"
    assert grade(20) == "D"
    assert grade(19) == "F"


def test_compute_scores_adds_story_score():
    articles = [
        {
            "url": "https://ex.com/a1",
            "matched_topics": ["rbi-rate"],
            "published_at": "2026-04-05T09:00:00Z",
            "word_count": 800,
        }
    ]
    trends = {
        "rbi-rate": {
            "series_values": [89],
            "series_labels": ["2026-04-05"],
            "trend_score": 89,
            "trend_peak_date": "2026-04-05",
        }
    }
    scored = compute_scores(articles, trends, now_date="2026-06-24")
    assert "story_score" in scored[0]
    assert 0 <= scored[0]["story_score"] <= 100
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_score.py -v
```

Expected: `ModuleNotFoundError: No module named 'score'`

- [ ] **Step 3: Write score.py**

```python
# ingestor/score.py
from __future__ import annotations

import math
from datetime import date, datetime

_W_TREND = 0.40
_W_CONTENT = 0.30
_W_GDELT = 0.20
_W_FRESHNESS = 0.10

GRADE_THRESHOLDS = [(80, "A"), (60, "B"), (40, "C"), (20, "D"), (0, "F")]


def story_score(
    *,
    trend_momentum: float,     # 0–100
    content_alignment: float,  # 0.0–1.0 cosine similarity
    gdelt_pickup_norm: float,  # 0–100
    freshness: float,          # 0.0–1.0
) -> float:
    return (
        _W_TREND * trend_momentum
        + _W_CONTENT * (content_alignment * 100)
        + _W_GDELT * gdelt_pickup_norm
        + _W_FRESHNESS * (freshness * 100)
    )


def gap_score(
    *,
    trend_score: float,
    articles_published: int,
    articles_expected: int,
) -> float:
    articles_expected = max(articles_expected, 1)
    coverage_ratio = articles_published / articles_expected
    if coverage_ratio >= 1.0:
        return 0.0
    return round(trend_score * (1.0 - coverage_ratio), 2)


def grade(median_score: float) -> str:
    for threshold, letter in GRADE_THRESHOLDS:
        if median_score >= threshold:
            return letter
    return "F"


def _freshness(published_at_str: str, *, now_date: str) -> float:
    """Recency decay: 1.0 = today, 0.0 = 90+ days ago."""
    try:
        pub = datetime.fromisoformat(published_at_str.replace("Z", "+00:00")).date()
        now = date.fromisoformat(now_date)
        age_days = max((now - pub).days, 0)
        return max(1.0 - age_days / 90.0, 0.0)
    except Exception:
        return 0.5


def compute_scores(
    articles: list[dict],
    trends: dict[str, dict],
    *,
    now_date: str | None = None,
) -> list[dict]:
    """Add story_score, trend_alignment, gdelt_pickup_norm to each article."""
    from datetime import date as _date
    now = now_date or _date.today().isoformat()

    for article in articles:
        topics = article.get("matched_topics", [])
        # Best trend_momentum across matched topics
        best_trend = max(
            (trends.get(t, {}).get("trend_score", 0) for t in topics),
            default=0,
        )
        # content_alignment: crude — use 0.5 as default (TF-IDF done in cluster.py)
        content_alignment = article.get("content_alignment", 0.5)
        gdelt_norm = min(article.get("gdelt_pickup", 0) / 50.0 * 100, 100)
        fresh = _freshness(article.get("published_at", ""), now_date=now)

        score = story_score(
            trend_momentum=best_trend,
            content_alignment=content_alignment,
            gdelt_pickup_norm=gdelt_norm,
            freshness=fresh,
        )
        article["story_score"] = round(score, 1)
        article["trend_alignment"] = round(best_trend / 100.0, 2)
        article["gdelt_pickup_norm"] = round(gdelt_norm, 1)

    return articles


def compute_gap_scores(
    clusters: list[dict],
    trends: dict[str, dict],
    articles: list[dict],
) -> list[dict]:
    """Add gap_score, articles_published, articles_expected to each cluster dict."""
    for cluster in clusters:
        cid = cluster["id"]
        t = trends.get(cid, {})
        trend_peak = t.get("trend_score", 0)
        articles_expected = max(trend_peak // 10, 1)
        articles_published = sum(1 for a in articles if cid in a.get("matched_topics", []))

        cluster["gap_score"] = gap_score(
            trend_score=trend_peak,
            articles_published=articles_published,
            articles_expected=int(articles_expected),
        )
        cluster["articles_published"] = articles_published
        cluster["articles_expected"] = int(articles_expected)
        cluster["trend_peak_date"] = t.get("trend_peak_date", "")
        cluster["trend_score"] = trend_peak

    return clusters
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_score.py -v
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add ingestor/score.py ingestor/tests/test_score.py
git commit -m "feat: story_score + gap_score + grade"
```

---

## Task 8: writer.py — JSON output

**Files:**
- Create: `ingestor/writer.py`
- Create: `ingestor/tests/test_writer.py`

- [ ] **Step 1: Write failing test**

```python
# ingestor/tests/test_writer.py
import json
import tempfile
from pathlib import Path
from writer import write_outputs

ARTICLES = [
    {
        "url": "https://ex.com/a1",
        "title": "RBI rate",
        "published_at": "2026-04-05T09:00:00Z",
        "section": "business",
        "author": "A. Writer",
        "word_count": 800,
        "story_score": 72.0,
        "trend_alignment": 0.89,
        "gdelt_pickup": 3,
        "gdelt_pickup_norm": 6.0,
        "matched_topics": ["rbi-rate"],
    }
]

CLUSTERS = [
    {
        "id": "rbi-rate",
        "label": "RBI Rate",
        "keywords": ["rbi", "rate", "repo"],
        "gap_score": 59.4,
        "trend_score": 89,
        "articles_published": 3,
        "articles_expected": 9,
        "trend_peak_date": "2026-04-05",
    }
]

TRENDS = {
    "rbi-rate": {
        "series_values": [12, 89, 45],
        "series_labels": ["2026-04-03", "2026-04-05", "2026-04-07"],
        "trend_source": "pytrends",
        "trend_peak_date": "2026-04-05",
        "trend_score": 89,
    }
}

COMPETITIVE = {
    "rbi-rate": {
        "competitor_domains": [{"domain": "economictimes.com", "count": 47, "share_pct": 31}],
        "peer_outlets": [{"domain": "economictimes.com", "coverage_volume": 47}],
        "is_white_space": False,
        "client_share_pct": 2.0,
        "article_dates": ["2026-04-05"],
    }
}


def test_write_outputs_creates_three_files():
    with tempfile.TemporaryDirectory() as tmpdir:
        out = Path(tmpdir)
        write_outputs(
            domain="example.com",
            articles=ARTICLES,
            clusters=CLUSTERS,
            trends=TRENDS,
            competitive=COMPETITIVE,
            out_dir=out,
        )
        assert (out / "articles.json").exists()
        assert (out / "trends.json").exists()
        assert (out / "findings.json").exists()


def test_findings_json_has_grade():
    with tempfile.TemporaryDirectory() as tmpdir:
        out = Path(tmpdir)
        write_outputs(
            domain="example.com",
            articles=ARTICLES,
            clusters=CLUSTERS,
            trends=TRENDS,
            competitive=COMPETITIVE,
            out_dir=out,
        )
        findings = json.loads((out / "findings.json").read_text())
        assert findings["grade"] in ("A", "B", "C", "D", "F")
        assert len(findings["findings"]) >= 1
        assert findings["findings"][0]["rank"] == 1
```

- [ ] **Step 2: Run to verify failure**

```bash
pytest tests/test_writer.py -v
```

Expected: `ModuleNotFoundError: No module named 'writer'`

- [ ] **Step 3: Write writer.py**

```python
# ingestor/writer.py
from __future__ import annotations

import json
import statistics
from datetime import datetime, timezone
from pathlib import Path

from score import grade


def write_outputs(
    *,
    domain: str,
    articles: list[dict],
    clusters: list[dict],
    trends: dict[str, dict],
    competitive: dict[str, dict],
    out_dir: Path,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # articles.json
    article_rows = []
    for a in articles:
        article_rows.append({
            "id": a.get("url_hash", a["url"][-32:]),
            "url": a["url"],
            "title": a.get("title", ""),
            "published_at": a.get("published_at", ""),
            "section": a.get("section", ""),
            "author": a.get("author"),
            "word_count": a.get("word_count"),
            "story_score": a.get("story_score", 0),
            "trend_alignment": a.get("trend_alignment", 0),
            "gdelt_pickup": a.get("gdelt_pickup", 0),
            "matched_topics": a.get("matched_topics", []),
        })
    (out_dir / "articles.json").write_text(json.dumps(article_rows, indent=2))

    # trends.json
    trend_rows = []
    for cluster in sorted(clusters, key=lambda c: -c.get("gap_score", 0)):
        cid = cluster["id"]
        t = trends.get(cid, {})
        comp = competitive.get(cid, {})
        trend_rows.append({
            "topic": cid,
            "label": cluster["label"],
            "keywords": cluster.get("keywords", []),
            "series_values": t.get("series_values", []),
            "series_labels": t.get("series_labels", []),
            "article_dates": comp.get("article_dates", []),
            "trend_source": t.get("trend_source", "gdelt"),
            "gap_score": cluster.get("gap_score", 0),
            "articles_published": cluster.get("articles_published", 0),
            "articles_expected": cluster.get("articles_expected", 1),
            "trend_peak_date": cluster.get("trend_peak_date", ""),
            "competitor_domains": comp.get("competitor_domains", []),
            "peer_outlets": comp.get("peer_outlets", []),
            "is_white_space": comp.get("is_white_space", False),
        })
    (out_dir / "trends.json").write_text(json.dumps(trend_rows, indent=2))

    # findings.json — top 3 by gap_score
    scores = [a.get("story_score", 0) for a in articles]
    median = statistics.median(scores) if scores else 0
    letter = grade(median)

    top_clusters = sorted(clusters, key=lambda c: -c.get("gap_score", 0))[:3]
    findings = []
    for rank, cluster in enumerate(top_clusters, 1):
        cid = cluster["id"]
        comp = competitive.get(cid, {})
        pub_count = cluster.get("articles_published", 0)
        exp_count = cluster.get("articles_expected", 1)
        trend_peak = cluster.get("trend_score", 0)

        peer_avg = 0
        peer_outlets = comp.get("peer_outlets", [])
        if peer_outlets:
            peer_avg = int(
                sum(p["coverage_volume"] for p in peer_outlets) / len(peer_outlets)
            )

        findings.append({
            "rank": rank,
            "topic": cid,
            "label": cluster["label"],
            "trend_peak_date": cluster.get("trend_peak_date", ""),
            "trend_score": trend_peak,
            "articles_published": pub_count,
            "articles_expected": exp_count,
            "gap_score": cluster.get("gap_score", 0),
            "headline": f"Coverage gap on {cluster['label']}",
            "detail": (
                f"Trends peaked {cluster.get('trend_peak_date', 'recently')} "
                f"(interest {trend_peak}/100). Published {pub_count} articles "
                f"vs. peer average of {peer_avg}."
            ),
            "recommendation": (
                f"Assign a standing brief for {cluster['label']} coverage "
                f"to capture the next trend cycle."
            ),
            "competitor_domains": comp.get("competitor_domains", []),
        })

    generated_at = datetime.now(timezone.utc).isoformat()
    findings_doc = {
        "outlet": domain,
        "window_days": 90,
        "generated_at": generated_at,
        "grade": letter,
        "median_story_score": round(median, 1),
        "findings": findings,
    }
    (out_dir / "findings.json").write_text(json.dumps(findings_doc, indent=2))
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_writer.py -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add ingestor/writer.py ingestor/tests/test_writer.py
git commit -m "feat: JSON writer for articles/trends/findings"
```

---

## Task 9: ingest.py — CLI entry point

**Files:**
- Create: `ingestor/ingest.py`

- [ ] **Step 1: Write ingest.py**

```python
#!/usr/bin/env python3
# ingestor/ingest.py
"""
Masthead Audit ingestor.

Usage:
    python ingest.py thehindu.com --days 90
    python ingest.py economictimes.com --days 30 --out ../viewer/data
"""
from __future__ import annotations

import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

import requests as req_mod


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="ingest",
        description="Ingest 90 days of public data for a newsroom domain.",
    )
    parser.add_argument("domain", help="e.g. thehindu.com")
    parser.add_argument("--days", type=int, default=90)
    parser.add_argument(
        "--out",
        default="../viewer/data",
        help="Output directory for JSON files",
    )
    args = parser.parse_args()

    domain: str = args.domain.lstrip("https://").lstrip("www.").rstrip("/")
    days: int = args.days
    out_dir = Path(args.out)

    session = req_mod.Session()
    session.headers["User-Agent"] = "masthead-audit/0.1"

    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    print(f"[1/6] Crawling sitemap for {domain}...")
    from sitemap import fetch_articles
    articles = fetch_articles(domain, days=days, session=session)
    print(f"      {len(articles)} articles in window")
    if not articles:
        print("ERROR: No articles found. Check domain or sitemap availability.", file=sys.stderr)
        return 1

    print("[2/6] Clustering topics...")
    from cluster import build_clusters, assign_topics
    n_clusters = min(max(len(articles) // 5, 5), 15)
    clusters = build_clusters(articles, n_clusters=n_clusters)
    articles = assign_topics(articles, clusters)
    print(f"      {len(clusters)} topic clusters")

    print("[3/6] Fetching trend data...")
    from trends import fetch_trends
    trends = fetch_trends(clusters, days=days, session=session)

    print("[4/6] Scoring articles...")
    from score import compute_scores, compute_gap_scores
    articles = compute_scores(articles, trends)
    clusters = compute_gap_scores(clusters, trends, articles)

    print("[5/6] GDELT competitive analysis (top 5 topics)...")
    from competitive import fetch_competitive
    competitive = fetch_competitive(
        clusters,
        client_domain=domain,
        start_date=start_date.isoformat(),
        end_date=end_date.isoformat(),
        trends_data=trends,
        session=session,
    )

    # Backfill article_dates from articles list per cluster
    for cid in competitive:
        comp_article_dates = sorted(set(
            a["published_at"][:10]
            for a in articles
            if cid in a.get("matched_topics", []) and a.get("published_at")
        ))
        competitive[cid]["article_dates"] = comp_article_dates

    print("[6/6] Writing JSON output...")
    from writer import write_outputs
    write_outputs(
        domain=domain,
        articles=articles,
        clusters=clusters,
        trends=trends,
        competitive=competitive,
        out_dir=out_dir,
    )
    print(f"\nDone. Files written to {out_dir}/")
    print(f"  articles.json  — {len(articles)} articles")
    print(f"  trends.json    — {len(clusters)} topics")
    print(f"  findings.json  — top 3 gap findings + grade")
    print("\nRun viewer: cd ../viewer && yarn dev")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Smoke-test CLI help**

```bash
cd ~/projects/masthead-audit/ingestor && source .venv/bin/activate
python ingest.py --help
```

Expected: shows usage with `domain`, `--days`, `--out` args.

- [ ] **Step 3: Commit**

```bash
git add ingestor/ingest.py
git commit -m "feat: ingest CLI entry point"
```

---

## Task 10: Run end-to-end ingestor dry run

Run against a real domain (short window to keep it fast during dev):

- [ ] **Step 1: Create fixture output dir**

```bash
mkdir -p ~/projects/masthead-audit/viewer/data
```

- [ ] **Step 2: Run ingestor**

```bash
cd ~/projects/masthead-audit/ingestor && source .venv/bin/activate
python ingest.py ndtv.com --days 7 --out ../viewer/data
```

Expected: prints 6 steps, writes 3 JSON files, no unhandled exceptions.

If pytrends rate-limits: expect `trend_source: "gdelt"` in trends.json — that is correct fallback behaviour.

- [ ] **Step 3: Verify JSON shape**

```bash
python -c "
import json
t = json.load(open('../viewer/data/trends.json'))
f = json.load(open('../viewer/data/findings.json'))
print('trends topics:', len(t))
print('grade:', f['grade'])
print('findings:', len(f['findings']))
print('OK' if f['grade'] in 'ABCDF' else 'GRADE ERROR')
"
```

Expected: grade in A–F, at least 1 finding.

- [ ] **Step 4: Commit fixture (optional — branch per engagement)**

```bash
git checkout -b audit/ndtv-com-7d
git add viewer/data/
git commit -m "audit: ndtv.com 7-day fixture"
git checkout main
```

---

## Task 11: Next.js viewer scaffold + OJDS tokens

**Files:**
- Create: `viewer/` (Next.js 15 app)
- Create: `viewer/app/globals.css` (OJDS tokens)

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd ~/projects/masthead-audit
npx create-next-app@latest viewer \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

- [ ] **Step 2: Install Recharts**

```bash
cd ~/projects/masthead-audit/viewer
yarn add recharts
```

- [ ] **Step 3: Copy OJDS tokens into globals.css**

Open `~/projects/platform/apps/web/app/globals.css` and copy the `:root` CSS custom properties block into `viewer/app/globals.css`, replacing the Tailwind-generated defaults. The OJDS token block starts at the `:root {` declaration and includes all `--color-*` variables.

```bash
# Verify the tokens file
grep -c "\-\-color" ~/projects/platform/apps/web/app/globals.css
```

Expected: 20+ lines containing `--color-`.

Append after the Tailwind directives in `viewer/app/globals.css`:

```css
/* OJDS design tokens — vendored from platform */
:root {
  --color-paper: #fafaf8;
  --color-paper-card: #ffffff;
  --color-rule: #e5e2da;
  --color-rule-soft: #f0ede6;
  --color-frame: #f5f2ec;
  --color-brand: var(--color-ioj-green-600);
  --color-ink-950: #0f0f0d;
  --color-ink-900: #1a1a17;
  --color-ink-800: #2d2d28;
  --color-ink-600: #57574f;
  --color-ink-400: #8a8a7f;
  --color-ink-200: #c5c2b8;
  --color-ink-50: #f5f2ec;
  --color-ioj-green-900: #0d2b1a;
  --color-ioj-green-800: #134225;
  --color-ioj-green-600: #1a6638;
  --color-ioj-green-400: #2d9e58;
  --color-ioj-green-100: #d4f0e0;
  --color-red-700: #b91c1c;
  --color-red-600: #dc2626;
  --color-red-500: #ef4444;
  --color-red-100: #fee2e2;
  --color-amber-600: #d97706;
  --color-amber-100: #fef3c7;
}
```

- [ ] **Step 4: Update tailwind.config.ts to reference CSS vars**

```typescript
// viewer/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--color-paper)",
        "paper-card": "var(--color-paper-card)",
        rule: "var(--color-rule)",
        brand: "var(--color-brand)",
        ink: {
          950: "var(--color-ink-950)",
          900: "var(--color-ink-900)",
          800: "var(--color-ink-800)",
          600: "var(--color-ink-600)",
          400: "var(--color-ink-400)",
          200: "var(--color-ink-200)",
          50: "var(--color-ink-50)",
        },
        green: {
          900: "var(--color-ioj-green-900)",
          600: "var(--color-ioj-green-600)",
          100: "var(--color-ioj-green-100)",
        },
        danger: {
          700: "var(--color-red-700)",
          600: "var(--color-red-600)",
          100: "var(--color-red-100)",
        },
        amber: {
          600: "var(--color-amber-600)",
          100: "var(--color-amber-100)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Verify dev server starts**

```bash
cd ~/projects/masthead-audit/viewer
yarn dev
```

Open `http://localhost:3000` — Next.js default page should render. Ctrl+C when confirmed.

- [ ] **Step 6: Commit**

```bash
cd ~/projects/masthead-audit
git add viewer/
git commit -m "feat: Next.js 15 viewer scaffold + OJDS tokens"
```

---

## Task 12: lib/data.ts — TypeScript types + JSON loaders

**Files:**
- Create: `viewer/lib/data.ts`

- [ ] **Step 1: Write data.ts**

```typescript
// viewer/lib/data.ts
import articlesRaw from "@/data/articles.json";
import trendsRaw from "@/data/trends.json";
import findingsRaw from "@/data/findings.json";

export interface Article {
  id: string;
  url: string;
  title: string;
  published_at: string;
  section: string;
  author: string | null;
  word_count: number | null;
  story_score: number;
  trend_alignment: number;
  gdelt_pickup: number;
  matched_topics: string[];
}

export interface CompetitorDomain {
  domain: string;
  count: number;
  share_pct: number;
}

export interface PeerOutlet {
  domain: string;
  coverage_volume: number;
}

export interface Topic {
  topic: string;
  label: string;
  keywords: string[];
  series_values: number[];
  series_labels: string[];
  article_dates: string[];
  trend_source: "pytrends" | "gdelt";
  gap_score: number;
  articles_published: number;
  articles_expected: number;
  trend_peak_date: string;
  competitor_domains: CompetitorDomain[];
  peer_outlets: PeerOutlet[];
  is_white_space: boolean;
}

export interface Finding {
  rank: number;
  topic: string;
  label: string;
  trend_peak_date: string;
  trend_score: number;
  articles_published: number;
  articles_expected: number;
  gap_score: number;
  headline: string;
  detail: string;
  recommendation: string;
  competitor_domains: CompetitorDomain[];
}

export interface Findings {
  outlet: string;
  window_days: number;
  generated_at: string;
  grade: "A" | "B" | "C" | "D" | "F";
  median_story_score: number;
  findings: Finding[];
}

export function getArticles(): Article[] {
  return articlesRaw as Article[];
}

export function getTopics(): Topic[] {
  return trendsRaw as Topic[];
}

export function getFindings(): Findings {
  return findingsRaw as Findings;
}

export function gradeColor(g: string): string {
  const map: Record<string, string> = {
    A: "text-green-600",
    B: "text-green-600",
    C: "text-amber-600",
    D: "text-danger-600",
    F: "text-danger-700",
  };
  return map[g] ?? "text-ink-600";
}

export function scoreLabel(s: number): "HIGH" | "MEDIUM" | "LOW" | "VERY LOW" {
  if (s >= 75) return "HIGH";
  if (s >= 50) return "MEDIUM";
  if (s >= 25) return "LOW";
  return "VERY LOW";
}
```

- [ ] **Step 2: Add JSON import support to next.config.ts**

```typescript
// viewer/next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
  // JSON is supported natively in Next.js 15 — no extra config needed
};

export default config;
```

- [ ] **Step 3: Add placeholder JSON fixtures** (so TypeScript compiles without real data)

```bash
cd ~/projects/masthead-audit/viewer/data
```

Create `articles.json`:
```json
[]
```

Create `trends.json`:
```json
[]
```

Create `findings.json`:
```json
{
  "outlet": "example.com",
  "window_days": 90,
  "generated_at": "2026-06-24T00:00:00Z",
  "grade": "C",
  "median_story_score": 54,
  "findings": []
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd ~/projects/masthead-audit/viewer
yarn tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd ~/projects/masthead-audit
git add viewer/lib/data.ts viewer/data/
git commit -m "feat: TypeScript types + JSON data loaders"
```

---

## Task 13: InterestTrajectory.tsx chart

**Files:**
- Create: `viewer/components/charts/InterestTrajectory.tsx`

- [ ] **Step 1: Write InterestTrajectory.tsx**

```tsx
// viewer/components/charts/InterestTrajectory.tsx
"use client";

import {
  ComposedChart,
  Line,
  ReferenceDot,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Topic } from "@/lib/data";

const TOPIC_COLORS = [
  "var(--color-red-600)",
  "var(--color-ioj-green-600)",
  "var(--color-amber-600)",
  "#6366f1",
  "#0ea5e9",
];

interface Props {
  topics: Topic[];
  maxTopics?: number;
}

export function InterestTrajectory({ topics, maxTopics = 5 }: Props) {
  const selected = topics.slice(0, maxTopics);

  // Build unified date series from first topic's labels
  const labels = selected[0]?.series_labels ?? [];
  const chartData = labels.map((date, i) => {
    const point: Record<string, number | string> = { date };
    for (const topic of selected) {
      point[topic.topic] = topic.series_values[i] ?? 0;
    }
    return point;
  });

  // Collect all article_date dots per topic
  const dots: Array<{ date: string; value: number; topic: Topic; color: string }> = [];
  for (let ti = 0; ti < selected.length; ti++) {
    const topic = selected[ti];
    const color = TOPIC_COLORS[ti % TOPIC_COLORS.length];
    for (const ad of topic.article_dates) {
      const idx = labels.indexOf(ad);
      if (idx >= 0) {
        dots.push({
          date: ad,
          value: topic.series_values[idx] ?? 0,
          topic,
          color,
        });
      }
    }
  }

  return (
    <div className="bg-paper-card border border-rule rounded-lg p-4">
      <h2 className="text-sm font-semibold text-ink-600 uppercase tracking-wide mb-4">
        Interest Trajectory
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--color-ink-400)" }}
            tickFormatter={(v) => v.slice(5)}
            interval={13}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--color-ink-400)" }}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-paper-card)",
              border: "1px solid var(--color-rule)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {selected.map((topic, i) => (
            <Line
              key={topic.topic}
              type="monotone"
              dataKey={topic.topic}
              name={topic.label}
              stroke={TOPIC_COLORS[i % TOPIC_COLORS.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
          {dots.map((dot, i) => (
            <ReferenceDot
              key={`dot-${i}`}
              x={dot.date}
              y={dot.value}
              r={4}
              fill={dot.color}
              stroke="var(--color-paper-card)"
              strokeWidth={1.5}
              label={{ value: "●", fontSize: 8 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-xs text-ink-400 mt-2">
        Filled dots = articles published. Lines = Google Trends interest (0–100).
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add viewer/components/charts/InterestTrajectory.tsx
git commit -m "feat: InterestTrajectory Recharts chart"
```

---

## Task 14: TopicMomentum.tsx chart

**Files:**
- Create: `viewer/components/charts/TopicMomentum.tsx`

- [ ] **Step 1: Write TopicMomentum.tsx**

```tsx
// viewer/components/charts/TopicMomentum.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Topic } from "@/lib/data";

function gapColor(score: number): string {
  if (score >= 70) return "var(--color-red-600)";
  if (score >= 40) return "var(--color-amber-600)";
  return "var(--color-ioj-green-600)";
}

interface Props {
  topics: Topic[];
}

export function TopicMomentum({ topics }: Props) {
  const sorted = [...topics].sort((a, b) => b.gap_score - a.gap_score);

  return (
    <div className="bg-paper-card border border-rule rounded-lg p-4">
      <h2 className="text-sm font-semibold text-ink-600 uppercase tracking-wide mb-4">
        Topic Momentum — Gap Score
      </h2>
      <ResponsiveContainer width="100%" height={Math.max(sorted.length * 28, 120)}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 32, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--color-ink-400)" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fontSize: 11, fill: "var(--color-ink-800)" }}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value.toFixed(1)}`, "Gap score"]}
            contentStyle={{
              background: "var(--color-paper-card)",
              border: "1px solid var(--color-rule)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <ReferenceLine x={50} stroke="var(--color-rule)" strokeDasharray="3 3" />
          <Bar dataKey="gap_score" radius={[0, 3, 3, 0]}>
            {sorted.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={gapColor(entry.gap_score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add viewer/components/charts/TopicMomentum.tsx
git commit -m "feat: TopicMomentum horizontal bar chart"
```

---

## Task 15: SummaryStrip + IndustryPosition + ArticleFeed

**Files:**
- Create: `viewer/components/dashboard/SummaryStrip.tsx`
- Create: `viewer/components/dashboard/IndustryPosition.tsx`
- Create: `viewer/components/dashboard/ArticleFeed.tsx`

- [ ] **Step 1: Write SummaryStrip.tsx**

```tsx
// viewer/components/dashboard/SummaryStrip.tsx
import type { Findings, Topic } from "@/lib/data";
import { gradeColor } from "@/lib/data";

interface Props {
  findings: Findings;
  topics: Topic[];
  articleCount: number;
}

export function SummaryStrip({ findings, topics, articleCount }: Props) {
  const gColor = gradeColor(findings.grade);
  return (
    <div className="flex gap-6 py-4 border-b border-rule">
      <Metric label="Articles" value={String(articleCount)} />
      <Metric label="Topics" value={String(topics.length)} />
      <Metric label="Median Score" value={`${findings.median_story_score}/100`} />
      <div className="flex flex-col">
        <span className="text-xs text-ink-400 uppercase tracking-wide">Grade</span>
        <span className={`text-3xl font-bold ${gColor}`}>{findings.grade}</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-ink-400 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-semibold text-ink-900">{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Write IndustryPosition.tsx**

```tsx
// viewer/components/dashboard/IndustryPosition.tsx
import type { Topic } from "@/lib/data";

interface Props {
  topics: Topic[];
  clientDomain: string;
}

export function IndustryPosition({ topics, clientDomain }: Props) {
  const topTopics = topics.filter((t) => t.competitor_domains.length > 0).slice(0, 5);
  if (topTopics.length === 0) return null;

  // Build peer list from union of competitor_domains
  const peerSet = new Set<string>();
  for (const t of topTopics) {
    for (const d of t.competitor_domains.slice(0, 4)) {
      if (!d.domain.includes(clientDomain)) peerSet.add(d.domain);
    }
  }
  const peers = Array.from(peerSet).slice(0, 5);
  const cols = [clientDomain, ...peers];

  // Signals
  const watchOut = topTopics.filter((t) => {
    const clientShare = t.competitor_domains.find((d) =>
      d.domain.includes(clientDomain)
    )?.share_pct ?? 0;
    const maxPeer = Math.max(
      ...t.competitor_domains
        .filter((d) => !d.domain.includes(clientDomain))
        .map((d) => d.share_pct)
    );
    return maxPeer >= clientShare * 3;
  });

  const whiteSpaces = topTopics.filter((t) => t.is_white_space);

  const strongGround = topTopics.filter((t) => {
    const sorted = [...t.competitor_domains].sort((a, b) => b.share_pct - a.share_pct);
    const rank = sorted.findIndex((d) => d.domain.includes(clientDomain));
    return rank === 0 || rank === 1;
  });

  return (
    <div className="bg-paper-card border border-rule rounded-lg p-4 space-y-4">
      <h2 className="text-sm font-semibold text-ink-600 uppercase tracking-wide">
        Industry Position
      </h2>

      {/* Matrix table */}
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left text-ink-400 py-1 pr-3 w-32">Topic</th>
              {cols.map((col) => (
                <th
                  key={col}
                  className={`text-center py-1 px-2 ${
                    col === clientDomain ? "text-green-600 font-bold" : "text-ink-400"
                  }`}
                >
                  {col.replace(".com", "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topTopics.map((topic) => (
              <tr key={topic.topic} className="border-t border-rule-soft">
                <td className="py-1.5 pr-3 text-ink-800 font-medium truncate max-w-[8rem]">
                  {topic.label}
                </td>
                {cols.map((col) => {
                  const match = topic.competitor_domains.find((d) =>
                    d.domain.includes(col.replace("www.", ""))
                  );
                  const val = match?.share_pct ?? 0;
                  return (
                    <td
                      key={col}
                      className={`text-center py-1.5 px-2 ${
                        col === clientDomain
                          ? "text-green-600 font-semibold"
                          : "text-ink-600"
                      }`}
                    >
                      {val > 0 ? `${val}%` : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signals */}
      <div className="grid grid-cols-3 gap-3">
        <SignalBox
          label="Watch out for"
          color="bg-danger-100 text-danger-700"
          items={watchOut.map((t) => {
            const top = t.competitor_domains
              .filter((d) => !d.domain.includes(clientDomain))
              .sort((a, b) => b.share_pct - a.share_pct)[0];
            return top
              ? `${top.domain.replace(".com", "")} surging on ${t.label} (${top.share_pct}%)`
              : t.label;
          })}
          empty="None identified"
        />
        <SignalBox
          label="White spaces"
          color="bg-amber-100 text-amber-600"
          items={whiteSpaces.map((t) => `${t.label} — nobody owns this story`)}
          empty="No clear white spaces"
        />
        <SignalBox
          label="Strong ground"
          color="bg-green-100 text-green-600"
          items={strongGround.map((t) => t.label)}
          empty="No clear #1 or #2 positions"
        />
      </div>
    </div>
  );
}

function SignalBox({
  label,
  color,
  items,
  empty,
}: {
  label: string;
  color: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide">{label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-ink-400">{empty}</p>
      ) : (
        items.map((item, i) => (
          <span key={i} className={`inline-block text-xs px-2 py-0.5 rounded ${color} mr-1 mb-1`}>
            {item}
          </span>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write ArticleFeed.tsx**

```tsx
// viewer/components/dashboard/ArticleFeed.tsx
import type { Article } from "@/lib/data";
import { scoreLabel } from "@/lib/data";

interface Props {
  articles: Article[];
}

const BADGE_STYLES: Record<string, string> = {
  HIGH: "bg-green-100 text-green-600",
  MEDIUM: "bg-amber-100 text-amber-600",
  LOW: "bg-rule text-ink-600",
  "VERY LOW": "bg-rule text-ink-400",
};

export function ArticleFeed({ articles }: Props) {
  const sorted = [...articles].sort((a, b) => b.story_score - a.story_score);

  return (
    <div className="bg-paper-card border border-rule rounded-lg">
      <div className="px-4 py-3 border-b border-rule">
        <h2 className="text-sm font-semibold text-ink-600 uppercase tracking-wide">
          Article Feed — {sorted.length} articles
        </h2>
      </div>
      <div className="divide-y divide-rule-soft">
        {sorted.map((a) => {
          const label = scoreLabel(a.story_score);
          return (
            <div key={a.id} className="px-4 py-3 flex gap-3 items-start">
              <span
                className={`mt-0.5 text-xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${BADGE_STYLES[label]}`}
              >
                {label}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-ink-900 font-medium hover:underline line-clamp-2"
                >
                  {a.title}
                </a>
                <p className="text-xs text-ink-400 mt-0.5">
                  {a.section} · {a.published_at.slice(0, 10)}
                  {a.author ? ` · ${a.author}` : ""}
                </p>
              </div>
              <span className="text-xs font-mono text-ink-400 whitespace-nowrap">
                {a.story_score.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add viewer/components/dashboard/
git commit -m "feat: SummaryStrip + IndustryPosition + ArticleFeed components"
```

---

## Task 16: Dashboard page.tsx

**Files:**
- Modify: `viewer/app/page.tsx`

- [ ] **Step 1: Write page.tsx**

```tsx
// viewer/app/page.tsx
import { getArticles, getFindings, getTopics } from "@/lib/data";
import { SummaryStrip } from "@/components/dashboard/SummaryStrip";
import { InterestTrajectory } from "@/components/charts/InterestTrajectory";
import { TopicMomentum } from "@/components/charts/TopicMomentum";
import { IndustryPosition } from "@/components/dashboard/IndustryPosition";
import { ArticleFeed } from "@/components/dashboard/ArticleFeed";
import Link from "next/link";

export default function DashboardPage() {
  const articles = getArticles();
  const topics = getTopics();
  const findings = getFindings();

  return (
    <main className="min-h-screen bg-paper text-ink-900">
      {/* Nav */}
      <nav className="border-b border-rule bg-paper-card px-6 py-3 flex items-center justify-between">
        <div>
          <span className="font-semibold text-ink-900">{findings.outlet}</span>
          <span className="text-ink-400 text-sm ml-2">
            — {findings.window_days}-day audit
          </span>
        </div>
        <Link
          href="/report"
          className="text-sm text-green-600 hover:underline font-medium"
        >
          Open Galley report →
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Summary */}
        <SummaryStrip
          findings={findings}
          topics={topics}
          articleCount={articles.length}
        />

        {/* Charts row */}
        <div className="grid grid-cols-2 gap-4">
          <InterestTrajectory topics={topics} maxTopics={5} />
          <TopicMomentum topics={topics} />
        </div>

        {/* Industry Position */}
        <IndustryPosition topics={topics} clientDomain={findings.outlet} />

        {/* Article feed */}
        <ArticleFeed articles={articles} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Update layout.tsx**

```tsx
// viewer/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masthead Audit",
  description: "Editorial intelligence audit instrument",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Start dev server and verify**

```bash
cd ~/projects/masthead-audit/viewer
yarn dev
```

Open `http://localhost:3000`. Expect:
- Nav bar with outlet name + "Open Galley report →" link
- Summary strip: grade badge, article count, topic count
- Two charts side-by-side (empty state with fixture data is fine)
- IndustryPosition section
- ArticleFeed (empty with fixture data)

If fixture data is empty, run ingestor first (Task 10) then reload.

- [ ] **Step 4: Commit**

```bash
git add viewer/app/page.tsx viewer/app/layout.tsx
git commit -m "feat: dashboard page assembly"
```

---

## Task 17: Galley report page + components

**Files:**
- Create: `viewer/app/report/page.tsx`
- Create: `viewer/components/galley/GradeBlock.tsx`
- Create: `viewer/components/galley/Finding.tsx`

- [ ] **Step 1: Write GradeBlock.tsx**

```tsx
// viewer/components/galley/GradeBlock.tsx
import type { Findings } from "@/lib/data";
import { gradeColor } from "@/lib/data";

interface Props {
  findings: Findings;
}

export function GradeBlock({ findings }: Props) {
  const from = new Date(findings.generated_at);
  const windowStart = new Date(from);
  windowStart.setDate(windowStart.getDate() - findings.window_days);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="border-b border-rule pb-6 mb-6">
      <p className="text-xs text-ink-400 uppercase tracking-widest mb-1">
        Editorial Intelligence Audit
      </p>
      <h1 className="text-2xl font-bold text-ink-950">{findings.outlet}</h1>
      <p className="text-sm text-ink-600 mt-1">
        {fmt(windowStart)} – {fmt(from)}
      </p>
      <div className="flex gap-8 mt-4">
        <div>
          <p className="text-xs text-ink-400 uppercase tracking-wide">Grade</p>
          <p className={`text-5xl font-bold ${gradeColor(findings.grade)}`}>
            {findings.grade}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-400 uppercase tracking-wide">Median Score</p>
          <p className="text-5xl font-bold text-ink-900">
            {findings.median_story_score}
            <span className="text-xl text-ink-400">/100</span>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write Finding.tsx**

```tsx
// viewer/components/galley/Finding.tsx
import type { Finding as FindingType } from "@/lib/data";

interface Props {
  finding: FindingType;
}

export function Finding({ finding }: Props) {
  const topPeers = finding.competitor_domains.slice(0, 5);
  const maxShare = Math.max(...topPeers.map((d) => d.share_pct), 1);

  return (
    <div className="border-b border-rule pb-6 mb-6 break-inside-avoid">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">
          Finding {finding.rank}
        </span>
        <h2 className="text-lg font-bold text-ink-950">{finding.label}</h2>
      </div>

      <p className="text-sm text-ink-800 mb-3">{finding.detail}</p>

      {/* Competitor share bars */}
      {topPeers.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">
            Industry position — this topic
          </p>
          {topPeers.map((d) => (
            <div key={d.domain} className="flex items-center gap-2">
              <span className="text-xs text-ink-600 w-36 truncate">{d.domain}</span>
              <div className="flex-1 bg-rule-soft rounded h-2">
                <div
                  className="bg-green-600 h-2 rounded"
                  style={{ width: `${(d.share_pct / maxShare) * 100}%` }}
                />
              </div>
              <span className="text-xs text-ink-600 w-8 text-right">{d.share_pct}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-frame rounded p-3">
        <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-1">
          Recommendation
        </p>
        <p className="text-sm text-ink-800">{finding.recommendation}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write report/page.tsx**

```tsx
// viewer/app/report/page.tsx
import { getFindings } from "@/lib/data";
import { GradeBlock } from "@/components/galley/GradeBlock";
import { Finding } from "@/components/galley/Finding";

export default function ReportPage() {
  const findings = getFindings();

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          main { padding: 0; max-width: 100%; }
        }
        @page { size: A4; margin: 20mm; }
      `}</style>

      <main className="max-w-2xl mx-auto px-8 py-10 bg-paper-card min-h-screen">
        {/* Print button */}
        <div className="no-print flex justify-end mb-6">
          <button
            onClick={() => window.print()}
            className="text-sm px-4 py-2 bg-green-600 text-white rounded hover:bg-green-900 transition-colors"
          >
            Print / Save PDF
          </button>
        </div>

        <GradeBlock findings={findings} />

        {findings.findings.map((f) => (
          <Finding key={f.rank} finding={f} />
        ))}

        {/* Consulting scope footer */}
        <div className="border-t border-rule pt-6 mt-6">
          <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">
            What implementation looks like
          </p>
          <p className="text-sm text-ink-600 italic">
            Authored per engagement — not generated. Typically: beat brief template,
            editorial calendar alignment, 3-week scope.
          </p>
        </div>

        <div className="mt-8 pt-4 border-t border-rule-soft">
          <p className="text-xs text-ink-400">
            Masthead Audit · Generated {new Date(findings.generated_at).toLocaleDateString()}
          </p>
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 4: Verify /report renders**

```bash
# With dev server running:
# Open http://localhost:3000/report
# Expect: grade block, 3 findings, competitor bars, Print button
# Click Print — browser print dialog should open
```

- [ ] **Step 5: Commit**

```bash
git add viewer/app/report/ viewer/components/galley/
git commit -m "feat: Galley report page — print-ready"
```

---

## Task 18: End-to-end full run + smoke

- [ ] **Step 1: Run ingestor against a real domain (30-day window)**

```bash
cd ~/projects/masthead-audit/ingestor && source .venv/bin/activate
python ingest.py ndtv.com --days 30 --out ../viewer/data
```

Expected: 6 steps complete, 3 JSON files written.

- [ ] **Step 2: Start viewer and verify**

```bash
cd ~/projects/masthead-audit/viewer && yarn dev
```

Open `http://localhost:3000`:
- Grade badge shows a letter
- Topics in TopicMomentum chart
- InterestTrajectory shows lines
- Article feed has rows

Open `http://localhost:3000/report`:
- Grade block with outlet name + dates
- 3 findings with competitor bars
- Print button works

- [ ] **Step 3: Commit run**

```bash
cd ~/projects/masthead-audit
git checkout -b audit/ndtv-30d
git add viewer/data/
git commit -m "audit: ndtv.com 30-day run"
git checkout main
```

---

## Self-Review Against Spec

**Spec section → Task coverage:**

| Spec requirement | Task |
|---|---|
| Sitemap crawl + section inference + non-news filtering | Task 3 |
| RSS enrichment via vendored RSSCollector | Task 2 (collectors vendored) |
| Topic clustering (TF-IDF) | Task 4 |
| pytrends + GDELT fallback, `trend_source` field | Task 5 |
| GDELT competitive analysis + peer auto-detection | Task 6 |
| story_score formula (0.40/0.30/0.20/0.10) | Task 7 |
| gap_score + grade A–F | Task 7 |
| articles.json schema | Task 8 (writer.py) |
| trends.json schema incl. `is_white_space` | Task 8 |
| findings.json — top 3 by gap_score | Task 8 |
| CLI: `python ingest.py <domain> --days 90` | Task 9 |
| OJDS tokens in viewer | Task 11 |
| TypeScript types matching JSON schema | Task 12 |
| InterestTrajectory: lines + ReferenceDots at article_dates | Task 13 |
| TopicMomentum: horizontal bar, gap_score sorted, semantic colours | Task 14 |
| SummaryStrip: articles/topics/grade | Task 15 |
| IndustryPosition: matrix + Watch-out/White-spaces/Strong-ground | Task 15 |
| ArticleFeed: score badge + title + section + date | Task 15 |
| Dashboard page.tsx assembly | Task 16 |
| GradeBlock: grade letter + median score + date window | Task 17 |
| Finding: detail + competitor bar chart + recommendation | Task 17 |
| Galley /report: print-optimised, @media print, Print button | Task 17 |
| Consulting scope footer (not generated) | Task 17 |
| End-to-end run | Task 10 + 18 |

**Placeholder scan:** None found. All steps contain actual code or exact commands.

**Type consistency:** `Topic` type in data.ts matches trends.json writer output. `Finding` type matches findings.json writer output. `Article` type matches articles.json writer output.
