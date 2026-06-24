# Masthead Audit Instrument — Design Spec

**Date:** 2026-06-24  
**Status:** Approved for implementation  
**Repo:** `masthead-audit` (new private repo, laptop-only)

---

## Purpose

A pre-meeting CLI + local web viewer that ingests 90 days of public data for any newsroom domain, scores it against trending topics, and produces two outputs:

1. A dashboard you open on a laptop during the client meeting
2. A print-to-PDF Galley report you hand over at the end

No cloud deployment. No client access required before the meeting. Runs entirely offline once the ingestor has completed.

---

## Architecture

```
masthead-audit/
├── ingestor/
│   ├── pyproject.toml          # feedparser, requests, bs4, pytrends, sklearn, numpy
│   ├── ingest.py               # CLI entry: python ingest.py <domain> --days 90
│   ├── sitemap.py              # sitemap.xml → article list + section inference
│   ├── collectors/
│   │   ├── rss.py              # VENDORED from platform packages/ingest-py
│   │   ├── gdelt.py            # VENDORED from platform packages/ingest-py
│   │   └── base.py             # VENDORED from platform packages/ingest-py
│   ├── trends.py               # ADAPTED from discover-dashboard data/trends_fetcher.py
│   └── score.py                # VENDORED from platform packages/scoring-py
│
├── viewer/
│   ├── package.json            # Next.js 15, Tailwind, Recharts
│   ├── app/
│   │   ├── page.tsx            # 90-day dashboard
│   │   └── report/
│   │       └── page.tsx        # Galley report (print-ready)
│   ├── data/                   # JSON written by ingestor — committed per audit
│   │   ├── articles.json
│   │   ├── trends.json
│   │   └── findings.json
│   └── components/
│       ├── charts/
│       │   ├── InterestTrajectory.tsx   # Recharts ComposedChart: lines + scatter markers
│       │   └── TopicMomentum.tsx        # Recharts BarChart: horizontal, gap_score sorted
│       └── galley/
│           ├── GradeBlock.tsx
│           └── Finding.tsx
│
└── README.md
```

**Usage:**
```bash
# Before the meeting (takes 5–15 min)
cd ingestor && python ingest.py thehindu.com --days 90

# At the meeting (offline-capable after ingest)
cd viewer && yarn dev
# localhost:3000        → dashboard
# localhost:3000/report → Galley PDF (browser print)
```

---

## Ingestor Pipeline

Six sequential steps. All output writes to `viewer/data/`.

### Step 1 — Sitemap crawl (`sitemap.py`)

Fetches `https://{domain}/sitemap.xml`, follows sub-sitemap indexes (Google News sitemaps, dated indexes). Filters by `<news:publication_date>` or `<lastmod>` within the 90-day window. Extracts: `url`, `title`, `published_at`, `section` (inferred from URL path segments). Skips non-news paths (static pages, epaper, subscribe, etc.) using the same `_NON_NEWS_PATH_SEGMENTS` logic from the discover-dashboard.

Output: list of article dicts → passed to Steps 2–6.

### Step 2 — RSS enrichment (`collectors/rss.py`)

Uses the vendored `RSSCollector` from `platform/packages/ingest-py`. Constructs a `source` dict per section feed (or falls back to the root feed). `tenant_id` and `source_id` are generated as `uuid4()` — no Postgres. Returns `list[Signal]` with `headline`, `published_at`, `language`, `raw_payload`. Merges into the sitemap article list by URL.

### Step 3 — Article metadata extraction

For each article URL, fetches HTML (rate-limited, robots.txt respected). Extracts via `schema.org/NewsArticle` markup: `author`, `wordCount`, `description`. Falls back to `og:` tags + byline patterns. Adds `author` and `word_count` to article dict.

### Step 4 — Topic clustering

Groups articles by URL section. Within each section, extracts top noun phrases from titles using a simple noun-phrase extractor (no external API). Produces 10–20 named topic clusters with keyword lists. Each article gets a `matched_topics` list (cluster IDs where TF-IDF cosine similarity > 0.20).

### Step 5 — Trend alignment (`trends.py`)

Adapted from `discover-dashboard/data/trends_fetcher.py`. For each topic cluster, queries pytrends `interest_over_time()` with daily resolution over the 90-day window. Returns `series_values` (list of ints 0–100, 90 points) and `series_labels` (ISO date strings).

**Fallback:** When pytrends returns all-zeros (rate-limiting or low-volume topic), falls back to GDELT article volume for that cluster as the trend proxy, normalised to 0–100. Marks the topic `trend_source: "gdelt"` instead of `"pytrends"`.

### Step 6 — GDELT competitive analysis (`collectors/gdelt.py`)

Uses the vendored `GDELTCollector`. For each topic cluster (top 5 by gap score), queries the GDELT DOC API for the 90-day window. Returns: external citations per article (`gdelt_pickup`) and top competitor domains per topic (`competitor_domains` with count + share_pct). Highlights the target domain's rank among competitors.

### Scoring (`score.py`)

Vendored from `platform/packages/scoring-py`. Per article:

```
story_score = 0.40 × trend_momentum
            + 0.30 × content_alignment    (TF-IDF cosine to best-matching topic)
            + 0.20 × gdelt_pickup_norm    (GDELT citations, normalised 0–100)
            + 0.10 × freshness            (recency decay)
```

Per topic cluster:
```
gap_score = trend_score × (1 − coverage_ratio)
```
where `coverage_ratio = articles_published / articles_expected` (articles_expected = trend peak ÷ 10, floored at 1).

**Grade** (from median `story_score`): A ≥ 80 · B 60–79 · C 40–59 · D 20–39 · F < 20

**Findings** = top 3 topic clusters by `gap_score`.

---

## JSON Data Model

### `articles.json`
```json
[{
  "id": "<url-hash>",
  "url": "https://...",
  "title": "...",
  "published_at": "2026-03-24T09:00:00Z",
  "section": "business",
  "author": "Name Surname",
  "word_count": 1200,
  "story_score": 72,
  "trend_alignment": 0.84,
  "gdelt_pickup": 3,
  "matched_topics": ["rbi-monetary-policy", "repo-rate"]
}]
```

### `trends.json`
```json
[{
  "topic": "rbi-monetary-policy",
  "label": "RBI Monetary Policy",
  "keywords": ["RBI rate", "repo rate", "monetary policy"],
  "series_values": [12, 18, 45, 89, 67, ...],
  "series_labels": ["2026-03-24", "2026-03-25", ...],
  "article_dates": ["2026-04-03", "2026-04-07"],
  "trend_source": "pytrends",
  "gap_score": 68.4,
  "articles_published": 3,
  "articles_expected": 9,
  "trend_peak_date": "2026-04-05",
  "competitor_domains": [
    {"domain": "economictimes.com", "count": 47, "share_pct": 31},
    {"domain": "livemint.com", "count": 38, "share_pct": 25},
    {"domain": "thehindu.com", "count": 3, "share_pct": 2}
  ]
}]
```

### `findings.json`
```json
{
  "outlet": "thehindu.com",
  "window_days": 90,
  "generated_at": "2026-06-24T12:00:00Z",
  "grade": "C",
  "median_story_score": 54,
  "findings": [{
    "rank": 1,
    "topic": "rbi-monetary-policy",
    "label": "RBI Monetary Policy",
    "trend_peak_date": "2026-04-05",
    "trend_score": 89,
    "articles_published": 3,
    "articles_expected": 9,
    "gap_score": 84.2,
    "headline": "Missed the RBI rate cycle at its peak",
    "detail": "Trends peaked Apr 3–7 (interest 89/100). Published 3 articles in that window vs. peer average of 9.",
    "recommendation": "Assign dedicated RBI correspondent with standing brief for rate cycle coverage.",
    "competitor_domains": [...]
  }]
}
```

---

## Viewer — Dashboard (`/`)

### Summary strip
Three metrics: articles published · topics covered · grade (A–F with colour)

### Interest Trajectory chart
`Recharts ComposedChart`. One `Line` per topic cluster (up to 5 selected). X-axis: dates (90 daily points). Y-axis: Google Trends interest 0–100. `ReferenceDot` components at `article_dates` = publication markers ("you published here"). Colour per trend direction matching discover-dashboard convention: rising = red, stable = amber, falling = grey.

### Topic Momentum chart
`Recharts BarChart` horizontal. Y-axis: topic labels. X-axis: `gap_score` (0–100). Sorted descending. Colour: OJDS semantic tokens (high gap = red, medium = amber, low = green). Reference line at 50.

### Article feed
Sorted by `story_score` descending. Each row: score badge (HIGH/MEDIUM/LOW/VERY LOW) · title · section · published_at · trend label. No pagination — full 90-day list.

---

## Viewer — Galley Report (`/report`)

Print-optimised (`@media print` hides nav, adds page breaks). Designed for A4.

```
┌─────────────────────────────────────────────┐
│  [OUTLET]  Editorial Intelligence Audit      │
│  90-day window: [start] – [end]              │
│                                              │
│  Grade: C    Median score: 54/100            │
├─────────────────────────────────────────────┤
│  Finding 1: RBI Monetary Policy              │
│  Trend peak: Apr 5 · Interest: 89/100        │
│  Published: 3 articles · Expected: 9         │
│                                              │
│  Who owned this story:                       │
│  Economic Times 31% · Livemint 25% · [you] 2%│
│                                              │
│  Recommendation:                             │
│  Assign dedicated RBI correspondent...       │
├─────────────────────────────────────────────┤
│  Finding 2: ...                              │
├─────────────────────────────────────────────┤
│  Finding 3: ...                              │
├─────────────────────────────────────────────┤
│  What implementation looks like              │
│  [Authored per engagement — not generated.   │
│   Typically: beat brief template, editorial  │
│   calendar alignment, 3-week scope.]         │
└─────────────────────────────────────────────┘
```

`GradeBlock.tsx` renders grade with OJDS colour tokens (A=green, B=blue, C=amber, D=amber, F=red). `Finding.tsx` renders one finding with competitor bar chart inline.

Print button at top: `window.print()`. Hides on print.

---

## Styling

OJDS design tokens are CSS custom properties defined in `platform/apps/web/app/globals.css` (e.g. `--color-paper`, `--color-ink-900`, `--color-ioj-green-600`). Copy that file verbatim into `viewer/app/globals.css`. No shared package import. Tailwind config uses the same CSS variable references.

---

## What is NOT in scope

- Auth / login
- Tenant selection
- Settings UI
- Cloud deployment
- External API calls during the demo (all data pre-fetched)
- Support for multiple concurrent audits (one `viewer/data/` at a time; git branch per engagement)

---

## Build order

1. Ingestor first — can't demo without data
2. Galley report second — the leave-behind is what converts
3. Dashboard charts third — the screen is the context for the findings

---

## Discover-dashboard client-neutrality (separate task)

The discover-dashboard (`~/discover-dashboard/discover-dashboard`) has hardcoded references to "The Hindu" / "THGP" in `app.py` and thehindu.com RSS feeds in `config.py`. This should be genericized so it works for any domain. Tracked separately — does not block masthead-audit.
