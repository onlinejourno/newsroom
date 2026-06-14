# SEO + E-E-A-T Audit Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the elaborate SEO + E-E-A-T audit from the original `discover-dashboard` Streamlit project into the platform (`packages/scoring-py` engine + `/en/scores` render), faithfully preserving every formula/weight/threshold/advice string, and add a Core Web Vitals dimension.

**Architecture:** Vendor the original's Python audit modules into the `scoring-py` package (the stub created for exactly this), exposed as one `onlinejourno-scoring audit <url> --json` CLI. The Next.js `/en/scores` page runs it per-story via a server action (mirroring `analyze.ts` → `distribution_fit.py`), caches the JSON in a `seo_audit` table, and renders every section with dependency-free SVG charts. Spec: `docs/superpowers/specs/2026-06-14-seo-eeat-audit-port-design.md`.

**Tech Stack:** Python 3.11 + requests + beautifulsoup4 + feedparser + lxml + pytest (`scoring-py`); Next.js 15 App Router + pg (web). No TS test runner — TS verified by `pnpm --filter @onlinejourno/web type-check` + the running app.

**Porting rule (applies to every Python task):** The named original file under `/Users/subhashrai/Data Protection/discover-dashboard/` (path has a space — quote it) is the behavioral source of truth. Read it, port the logic **verbatim** (same constants, thresholds, grade bands, branch order, and advice strings), adapting only: (a) remove Streamlit, (b) take a normalized `Page`/`raw` dict as input, (c) return plain dicts. The tests in each task pin the behavior; do not change a threshold to make a test pass — fix the port.

**Testing note:** Run pytest from `packages/scoring-py` via `uv run --with pytest pytest` (pytest is not a declared dep, matching `agents-py`). Fetchers that hit external APIs are tested only for shape + graceful degradation (no live calls in tests).

---

## File Structure

**Python engine — create under `packages/scoring-py/src/onlinejourno_scoring/`:**
- `__init__.py`, `models.py` (the `Page` dataclass + `Signal`/`Check`/`Channel` TypedDicts), `fetch.py`, `seo_checks.py`, `channels.py`, `sqeg.py`, `recirculation.py`, `potential.py`, `cwv.py`, `signals_radar.py`, `ai_queries.py`, `youtube.py`, `gdelt.py`, `keywords_everywhere.py`, `advisory.py`, `audit.py`, `cli.py`
- Tests under `packages/scoring-py/tests/test_*.py`
- Modify `packages/scoring-py/pyproject.toml` (deps + script entry)

**Persistence + web data:**
- Create `infra/migrations/0020_seo_audit.sql`
- Modify `apps/web/lib/db.ts` (`seoAuditFor`, `upsertSeoAudit`)
- Create `apps/web/lib/seoAudit.ts`

**Web render:**
- Create `apps/web/components/scores/seo-audit/*.tsx` (one component per section)
- Modify `apps/web/app/[locale]/scores/page.tsx` (server action + per-row trigger + render)

---

## Part A — Python engine (`scoring-py`)

### Task 1: Package scaffold + CLI skeleton

**Files:**
- Modify: `packages/scoring-py/pyproject.toml`
- Create: `packages/scoring-py/src/onlinejourno_scoring/__init__.py`
- Create: `packages/scoring-py/src/onlinejourno_scoring/cli.py`
- Test: `packages/scoring-py/tests/test_cli.py`

- [ ] **Step 1: Set deps + script entry in `pyproject.toml`** — replace the `dependencies = []` line and add a script + hatch packages config:

```toml
dependencies = [
  "requests>=2.31",
  "beautifulsoup4>=4.12",
  "lxml>=5.0",
  "feedparser>=6.0",
]

[project.scripts]
onlinejourno-scoring = "onlinejourno_scoring.cli:main"

[tool.hatch.build.targets.wheel]
packages = ["src/onlinejourno_scoring"]
```
(Remove the existing `bypass-selection = true` wheel block — it's replaced by the `packages` line above.)

- [ ] **Step 2: Write the failing test**

```python
# packages/scoring-py/tests/test_cli.py
from onlinejourno_scoring.cli import build_parser


def test_audit_subcommand_exists():
    p = build_parser()
    ns = p.parse_args(["audit", "https://example.com/x", "--trend", "Iran", "--json"])
    assert ns.url == "https://example.com/x"
    assert ns.trend == "Iran"
    assert ns.json is True
```

- [ ] **Step 3: Run it — expect fail** — `cd packages/scoring-py && uv run --with pytest pytest tests/test_cli.py -q` → ModuleNotFoundError / no `build_parser`.

- [ ] **Step 4: Write `__init__.py` (empty) and `cli.py`**

```python
# packages/scoring-py/src/onlinejourno_scoring/cli.py
"""CLI for the SEO + E-E-A-T audit (ADR: discover-dashboard port)."""
from __future__ import annotations

import argparse
import json as _json


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="onlinejourno-scoring")
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("audit", help="full SEO + E-E-A-T audit for a URL")
    a.add_argument("url")
    a.add_argument("--trend", default="")
    a.add_argument("--need", default="")
    a.add_argument("--json", action="store_true")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.cmd == "audit":
        from onlinejourno_scoring.audit import run_audit

        result = run_audit(args.url, trend=args.trend, need=args.need)
        print(_json.dumps(result) if args.json else result)
        return 0
    return 1
```

- [ ] **Step 5: Run test — expect pass.** (`run_audit` is imported lazily, so the parser test passes before `audit.py` exists.)

- [ ] **Step 6: Commit**

```bash
git add packages/scoring-py/pyproject.toml packages/scoring-py/src/onlinejourno_scoring/__init__.py packages/scoring-py/src/onlinejourno_scoring/cli.py packages/scoring-py/tests/test_cli.py
git commit -m "scoring: scaffold onlinejourno-scoring package + audit CLI"
```

---

### Task 2: `models.py` — `Page` + result types

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/models.py`
- Test: `packages/scoring-py/tests/test_models.py`

The `Page` dataclass is the normalized input every scorer consumes (the platform's clean replacement for the original's `raw` dict from `_extract_raw`). Fields mirror what the original `_check_*` functions read.

- [ ] **Step 1: Write the failing test**

```python
# packages/scoring-py/tests/test_models.py
from onlinejourno_scoring.models import Page


def test_page_defaults():
    p = Page(url="https://x.com/a")
    assert p.url == "https://x.com/a"
    assert p.title == "" and p.word_count == 0
    assert p.h1s == [] and p.schema_types == []
    assert p.cf_blocked is False and p.is_live_blog is False
    assert p.internal_links == 0 and p.external_links == 0
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement `models.py`**

```python
# packages/scoring-py/src/onlinejourno_scoring/models.py
"""Normalized page model + result types for the SEO + E-E-A-T audit."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class Page:
    url: str
    title: str = ""
    meta_description: str = ""
    canonical: str = ""
    og_title: str = ""
    og_image: str = ""
    image_url: str = ""              # primary/rss image
    images_total: int = 0
    images_without_alt: int = 0
    h1s: list[str] = field(default_factory=list)
    h2s: list[str] = field(default_factory=list)
    schema_types: list[str] = field(default_factory=list)
    author: str = ""
    has_byline: bool = False
    published: str = ""             # ISO or human; "" if absent
    modified: str = ""
    published_dt: datetime | None = None
    word_count: int = 0
    internal_links: int = 0
    external_links: int = 0
    named_sources: list[str] = field(default_factory=list)
    anon_sources: int = 0
    body_text: str = ""
    section_path: str = ""          # taxonomy "Section > Sub"
    topic: str = ""
    tags: list[str] = field(default_factory=list)
    # flags
    cf_blocked: bool = False
    is_live_blog: bool = False
    js_rendered: bool = False
    paywalled: bool = False
    hard_paywall: bool = False
    is_wire: bool = False
    https: bool = True
    # recirculation raw
    same_section_links: int = 0
    deeper_taxonomy_links: int = 0
    good_anchors: int = 0
    weak_anchors: int = 0
    has_related_block: bool = False
```

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/models.py packages/scoring-py/tests/test_models.py
git commit -m "scoring: Page model — normalized audit input"
```

---

### Task 3: `seo_checks.py` — SEJ periodic-table checks + overall score

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/seo_checks.py`
- Test: `packages/scoring-py/tests/test_seo_checks.py`

**Port from:** `analyze/seo_eeat.py` functions `_chk`, `_check_title`, `_check_meta_description`, `_check_headings`, `_check_images`, `_check_canonical`, `_check_schema`, `_check_open_graph`, `_check_word_count`, `_check_internal_links`, `_check_external_links`, `_check_author`, `_check_date_signals`, `_check_expert_citations`, `_check_named_sources`, `_check_corrections_policy`, `_check_https`, `_check_paywalled`, plus the overall-score + grade logic. Adapt each `_check_*(raw, …)` to read from `Page`. Preserve every severity rule, finding template, recommendation string, and PT element code (Ti/Ds/Hd/Mm/Sd/Cn/Il/El/Au/Fr/Tr/Sc/Ar/Sh/Ac).

- [ ] **Step 1: Write the failing test** (pins grade bands + the highest-value severity rules from the design enumeration)

```python
# packages/scoring-py/tests/test_seo_checks.py
from onlinejourno_scoring.models import Page
from onlinejourno_scoring.seo_checks import run_checks, overall, grade


def _find(checks, signal):
    return next(c for c in checks if c["signal"].lower().startswith(signal.lower()))


def test_grade_bands():
    assert grade(85) == "A" and grade(70) == "B" and grade(55) == "C"
    assert grade(40) == "D" and grade(10) == "F"


def test_overall_formula():
    # 8 of 10 passed, 1 critical, 1 warning → 80 - 12 - 4 = 64
    assert overall(passed=8, total=10, critical=1, warning=1) == 64
    assert overall(passed=0, total=10, critical=5, warning=5) == 0  # floored


def test_https_critical_when_not_secure():
    c = _find(run_checks(Page(url="http://x.com/a", https=False)), "HTTPS")
    assert c["severity"] == "critical" and c["element"] == "Sc"


def test_title_length_warning_when_too_long():
    p = Page(url="https://x.com/a", title="x" * 90)
    c = _find(run_checks(p), "Title length")
    assert c["severity"] == "warning"


def test_author_critical_when_no_byline():
    c = _find(run_checks(Page(url="https://x.com/a", has_byline=False)), "Author")
    assert c["severity"] == "critical" and c["element"] == "Au"


def test_schema_critical_when_absent():
    c = _find(run_checks(Page(url="https://x.com/a", schema_types=[])), "Structured")
    assert c["severity"] == "critical" and c["element"] == "Sd"


def test_word_count_critical_when_thin():
    c = _find(run_checks(Page(url="https://x.com/a", word_count=120)), "Word count")
    assert c["severity"] == "critical"
```

- [ ] **Step 2: Run — expect fail** (no module).

- [ ] **Step 3: Implement `seo_checks.py`** — port the `_check_*` functions (reading from `Page`), `grade(score)` (A≥80, B≥65, C≥50, D≥35 else F), and:
  - `run_checks(page: Page) -> list[dict]` — call every check, return the list of `{element, signal, severity, finding, recommendation}` (use the original's `_chk` shape; `severity ∈ {critical,warning,ok}`).
  - `overall(*, passed, total, critical, warning) -> int` = `max(0, round((passed/total)*100) - critical*12 - warning*4)`.
  - `score_checks(page) -> dict` = `{"checks": [...], "score": overall(...), "grade": grade(score), "counts": {"critical":…,"warning":…,"ok":…}}` (passed = count of `ok`).
  Preserve the Cloudflare/paywall/live-blog/JS-rendered special cases from each original `_check_*`.

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/seo_checks.py packages/scoring-py/tests/test_seo_checks.py
git commit -m "scoring: SEJ periodic-table checks + overall score (port seo_eeat checks)"
```

---

### Task 4: `channels.py` — Discover / News / Search scorers

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/channels.py`
- Test: `packages/scoring-py/tests/test_channels.py`

**Port from:** `analyze/channel_scorer.py` (the rich Discover/News/Search scorers). Adapt inputs to `Page` + `trend_alignment: float` + `today`. Preserve the exact per-signal point caps and band logic from the design enumeration (Discover: image 25 / freshness 25 / title 15 / trend 20 / E-E-A-T 10 / https 5; News: schema 20 / byline 20 / pubdate 15 / original-reporting 20 / sitemap 10 / freshness 15; Search: title-kw 20 / meta 10 / H-structure 10 / depth 15 / internal 10 / external 10 / schema 15 / https 10) and all CF-blocked fallbacks.

- [ ] **Step 1: Write the failing test**

```python
# packages/scoring-py/tests/test_channels.py
from datetime import date, datetime, timezone
from onlinejourno_scoring.models import Page
from onlinejourno_scoring.channels import score_discover, score_news, score_search, grade

FRESH = datetime(2026, 6, 14, 10, tzinfo=timezone.utc)


def _sig(res, name):
    return next(s for s in res["signals"] if s["name"].lower().startswith(name.lower()))


def test_discover_freshness_full_when_under_6h():
    p = Page(url="https://x.com/a", published_dt=FRESH)
    r = score_discover(p, trend_alignment=0.0, now=datetime(2026, 6, 14, 12, tzinfo=timezone.utc))
    assert _sig(r, "Fresh")["value"] == 25


def test_discover_https_signal():
    r = score_discover(Page(url="https://x.com/a", https=True), trend_alignment=0.0, now=FRESH)
    assert _sig(r, "Mobile")["max"] == 5 or _sig(r, "HTTPS")["max"] == 5


def test_news_byline_zero_without_author():
    r = score_news(Page(url="https://x.com/a", has_byline=False), now=FRESH)
    assert _sig(r, "Author")["value"] == 0 and _sig(r, "Author")["max"] == 20


def test_search_depth_full_at_800_words():
    r = score_search(Page(url="https://x.com/a", word_count=900), trend="", now=FRESH)
    assert _sig(r, "Word")["value"] == 15


def test_grade_bands():
    assert grade(80) == "A" and grade(34) == "F"
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement `channels.py`** — `score_discover(page, *, trend_alignment, now)`, `score_news(page, *, now)`, `score_search(page, *, trend, now)`, each returning `{"score": int, "grade": grade(score), "signals": [{"name","value","max","note"}]}`; `grade()` reused from `seo_checks` (import it). Port each signal's banding + CF fallbacks verbatim from `channel_scorer.py`.

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/channels.py packages/scoring-py/tests/test_channels.py
git commit -m "scoring: Discover/News/Search channel scorers (port channel_scorer)"
```

---

### Task 5: `sqeg.py` — YMYL + Page Quality + Needs Met

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/sqeg.py`
- Test: `packages/scoring-py/tests/test_sqeg.py`

**Port from:** `analyze/sqeg.py`. Preserve YMYL section/keyword maps + the 4 levels + requirements lists; PQ signals (MC max10, Experience max8, Authoritativeness max8, Trustworthiness max8, Date Transparency max8, Beneficial Purpose max8, Website Reputation 5) with SQEG §refs; PQ grade bands (High≥80, Medium-High≥60, Medium≥40, Low-Medium≥20, else Low) computed as `round(points/total*100)`; Needs-Met levels (Highly≥0.7, Moderately≥0.4, Partially>0, else Fails) + query-intent; lowest-quality risk flags.

- [ ] **Step 1: Write the failing test**

```python
# packages/scoring-py/tests/test_sqeg.py
from onlinejourno_scoring.models import Page
from onlinejourno_scoring.sqeg import classify_ymyl, page_quality, needs_met


def test_ymyl_health_is_critical():
    y = classify_ymyl(Page(url="https://x.com/h", section_path="Health", body_text="vaccine rollout"))
    assert y["level"] == "Critical YMYL" and y["is_ymyl"] is True


def test_ymyl_sport_is_low():
    y = classify_ymyl(Page(url="https://x.com/s", section_path="Sport"))
    assert y["level"] == "Low YMYL"


def test_pq_anonymous_news_flags_risk():
    pq = page_quality(Page(url="https://x.com/a", has_byline=False, word_count=120, schema_types=[]))
    assert any("nonymous" in f for f in pq["risk_flags"])
    assert pq["grade"].endswith("PQ")


def test_needs_met_fails_when_no_overlap():
    nm = needs_met(Page(url="https://x.com/a", section_path="Sport", title="Cricket score"), trend="election")
    assert nm["needs_met"] == "Fails to Meet" and nm["alignment_ratio"] == 0.0
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement `sqeg.py`** — `classify_ymyl(page) -> dict`, `page_quality(page) -> dict` (`{score, grade, signals:[{name,points,max,ref,note}], risk_flags:[...]}`), `needs_met(page, trend) -> dict`. Port maps/thresholds/strings verbatim.

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/sqeg.py packages/scoring-py/tests/test_sqeg.py
git commit -m "scoring: SQEG — YMYL, Page Quality, Needs Met (port sqeg)"
```

---

### Task 6: `recirculation.py` — internal-link quality

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/recirculation.py`
- Test: `packages/scoring-py/tests/test_recirculation.py`

**Port from:** `analyze/recirculation.py`. Preserve the score formula (volume ≤30, same-section relevance ≤30, anchor quality ≤25, related-block 10, deeper-taxonomy ≤5) and the rule-based recommendations.

- [ ] **Step 1: Write the failing test**

```python
# packages/scoring-py/tests/test_recirculation.py
from onlinejourno_scoring.models import Page
from onlinejourno_scoring.recirculation import recirculation


def test_zero_links_low_score_with_advice():
    r = recirculation(Page(url="https://x.com/a", internal_links=0))
    assert r["score"] == 0
    assert any("internal link" in rec.lower() for rec in r["recommendations"])


def test_strong_recirc_scores_high():
    p = Page(url="https://x.com/a", internal_links=10, same_section_links=8,
             good_anchors=9, weak_anchors=1, has_related_block=True, deeper_taxonomy_links=3)
    r = recirculation(p)
    assert r["score"] >= 80
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement `recirculation.py`** — `recirculation(page) -> {"score": int, "metrics": {...}, "recommendations": [...]}`. Port verbatim.

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/recirculation.py packages/scoring-py/tests/test_recirculation.py
git commit -m "scoring: recirculation / internal-link quality (port recirculation)"
```

---

### Task 7: `potential.py` — Discover potential score

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/potential.py`
- Test: `packages/scoring-py/tests/test_potential.py`

**Port from:** `predict/scorer.py` + weights in `config.py` (`0.40 trend_momentum + 0.30 content_alignment + 0.20 domain_authority + 0.10 freshness`; freshness age bands; labels HIGH≥75/MEDIUM≥55/LOW≥35/VERY LOW). Inputs are pre-computed component scores (the audit passes them in; no live trend fetch here).

- [ ] **Step 1: Write the failing test**

```python
# packages/scoring-py/tests/test_potential.py
from onlinejourno_scoring.potential import potential_score, label, freshness_from_hours


def test_weighted_composite():
    s = potential_score(trend_momentum=100, content_alignment=100, domain_authority=100, freshness=100)
    assert s == 100.0
    s2 = potential_score(trend_momentum=50, content_alignment=0, domain_authority=0, freshness=0)
    assert round(s2, 1) == 20.0  # 0.40*50


def test_labels():
    assert label(80) == "HIGH" and label(60) == "MEDIUM" and label(40) == "LOW" and label(10) == "VERY LOW"


def test_freshness_bands():
    assert freshness_from_hours(1) == 100 and freshness_from_hours(100) == 10
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement `potential.py`** — `potential_score(*, trend_momentum, content_alignment, domain_authority, freshness) -> float`, `label(score) -> str`, `freshness_from_hours(hours) -> int`. Port bands/weights verbatim.

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/potential.py packages/scoring-py/tests/test_potential.py
git commit -m "scoring: Discover potential score (port predict/scorer weights)"
```

---

### Task 8: `cwv.py` — Core Web Vitals (PSI) — NEW dimension

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/cwv.py`
- Test: `packages/scoring-py/tests/test_cwv.py`

**Port from:** `news-intel/src/collect_pagespeed.py` (PSI v5 URL, mobile/performance, metric extractors). Adapt to a single-URL call returning a graded dict; never raise — on missing `PAGESPEED_API_KEY`, 429, or timeout return `{"available": False, "reason": …}`. Pure grading is tested; the live call is not.

- [ ] **Step 1: Write the failing test**

```python
# packages/scoring-py/tests/test_cwv.py
from onlinejourno_scoring.cwv import grade_cwv, page_experience


def test_grade_cwv_good():
    g = grade_cwv(performance_score=95, lcp_ms=2000, cls_score=0.05, tbt_ms=150, fcp_ms=1200)
    assert g["grade"] in ("A", "B") and g["available"] is True
    assert g["metrics"]["lcp_ms"] == 2000


def test_grade_cwv_poor():
    g = grade_cwv(performance_score=25, lcp_ms=6000, cls_score=0.4, tbt_ms=900, fcp_ms=4000)
    assert g["grade"] in ("D", "F")


def test_page_experience_no_key_degrades(monkeypatch):
    monkeypatch.delenv("PAGESPEED_API_KEY", raising=False)
    r = page_experience("https://x.com/a")
    assert r["available"] is False and "reason" in r
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement `cwv.py`**
  - `grade_cwv(*, performance_score, lcp_ms, cls_score, tbt_ms, fcp_ms) -> dict` — derive a Page-Experience grade (use Google CWV thresholds: LCP good ≤2500ms / poor >4000ms; CLS good ≤0.1 / poor >0.25; TBT good ≤200ms / poor >600ms as the INP lab proxy; blend with `performance_score`). Return `{"available": True, "performance_score", "grade", "metrics": {lcp_ms,cls_score,tbt_ms,fcp_ms,performance_score}, "recommendations": [...]}` with remediation text per failing metric.
  - `page_experience(url) -> dict` — read `PAGESPEED_API_KEY`; if absent return `{"available": False, "reason": "no PAGESPEED_API_KEY"}`. Else GET `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` with `{url, strategy:"mobile", category:"performance", key}`, 90s timeout; extract the 5 metrics (lighthouseResult paths from the source) and return `grade_cwv(...)`. On any exception/429 return `{"available": False, "reason": str(e)}`.

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/cwv.py packages/scoring-py/tests/test_cwv.py
git commit -m "scoring: Core Web Vitals via PSI (new dimension, graceful degrade)"
```

---

### Task 9: `signals_radar.py` — 5-axis rollup

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/signals_radar.py`
- Test: `packages/scoring-py/tests/test_signals_radar.py`

**Port from:** the radar logic in `dashboard/app.py` (Content depth, E-E-A-T, Technical SEO, Freshness, Distribution readiness), taking the already-computed channel results + CWV.

- [ ] **Step 1: Write the failing test**

```python
# packages/scoring-py/tests/test_signals_radar.py
from onlinejourno_scoring.signals_radar import radar


def test_radar_axes_and_range():
    discover = {"signals": [{"name": "og:image (large)", "value": 25, "max": 25},
                            {"name": "Freshness", "value": 20, "max": 25},
                            {"name": "E-E-A-T", "value": 8, "max": 10}]}
    news = {"signals": [{"name": "Author byline", "value": 20, "max": 20},
                        {"name": "Freshness", "value": 12, "max": 15},
                        {"name": "News sitemap section", "value": 10, "max": 10}]}
    search = {"signals": [{"name": "Word count / content depth", "value": 15, "max": 15},
                          {"name": "Structured data schema", "value": 15, "max": 15},
                          {"name": "HTTPS", "value": 10, "max": 10}]}
    r = radar(discover, news, search, cwv={"available": True, "grade": "A", "performance_score": 95})
    axes = {a["axis"] for a in r}
    assert axes == {"Content depth", "E-E-A-T", "Technical SEO", "Freshness", "Distribution readiness"}
    assert all(0 <= a["value"] <= 100 for a in r)
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement `signals_radar.py`** — `radar(discover, news, search, *, cwv) -> list[{"axis","value"}]`. Each axis normalized to 0–100 (value/max*100) per the dashboard's mapping; Technical SEO blends schema/https with CWV performance_score when `cwv["available"]`.

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/signals_radar.py packages/scoring-py/tests/test_signals_radar.py
git commit -m "scoring: 5-axis signal radar rollup (port dashboard radar)"
```

---

### Task 10: `fetch.py` — fetch + parse → `Page`

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/fetch.py`
- Test: `packages/scoring-py/tests/test_fetch.py`

**Port from:** `analyze/seo_eeat.py` functions `_extract_raw`, `_resolve_article_url`, `_is_cloudflare_blocked`, `_gnews_article_lookup`, `extract_taxonomy`. Produce a `Page`. Parsing-from-HTML is unit-tested with a fixture string; the live fetch + gnews fallback are isolated in `fetch_page(url)` and not called in tests.

- [ ] **Step 1: Write the failing test**

```python
# packages/scoring-py/tests/test_fetch.py
from onlinejourno_scoring.fetch import parse_html

HTML = """
<html><head><title>Example Headline About Iran</title>
<meta name="description" content="A test description that is reasonably long enough.">
<link rel="canonical" href="https://x.com/a">
<meta property="og:title" content="OG Title"><meta property="og:image" content="https://x.com/i.jpg">
<script type="application/ld+json">{"@type":"NewsArticle","author":{"name":"Jane Doe"}}</script>
</head><body><h1>Example Headline</h1><h2>Sub</h2>
<p>word word word word word</p><img src="a.jpg" alt="x"><img src="b.jpg"></body></html>
"""


def test_parse_html_basics():
    p = parse_html(HTML, url="https://x.com/a")
    assert p.title.startswith("Example Headline")
    assert p.canonical == "https://x.com/a"
    assert p.og_image == "https://x.com/i.jpg"
    assert "NewsArticle" in p.schema_types
    assert p.has_byline is True and "Jane Doe" in p.author
    assert len(p.h1s) == 1 and len(p.h2s) == 1
    assert p.images_total == 2 and p.images_without_alt == 1
    assert p.https is True
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement `fetch.py`**
  - `parse_html(html: str, *, url: str, meta_hints: dict | None = None) -> Page` — BeautifulSoup parse populating every `Page` field (port `_extract_raw` + `extract_taxonomy` logic, incl. live-blog/paywall/JS-rendered/wire detection, named/anon source heuristics, internal-vs-external + same-section + anchor-quality + related-block counts).
  - `fetch_page(url: str, *, meta_hints: dict | None = None) -> Page` — requests GET (browser UA, timeout), `_resolve_article_url`, `_is_cloudflare_blocked` → set `cf_blocked` + `_gnews_article_lookup` fallback, then `parse_html`. Never raise — on network error return a `Page` with `cf_blocked=True` and any `meta_hints`.

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/fetch.py packages/scoring-py/tests/test_fetch.py
git commit -m "scoring: fetch + parse HTML into Page (port _extract_raw/taxonomy)"
```

---

### Task 11: External fetchers — `ai_queries`, `youtube`, `gdelt`, `keywords_everywhere`, `advisory`

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/ai_queries.py`, `youtube.py`, `gdelt.py`, `keywords_everywhere.py`, `advisory.py`
- Test: `packages/scoring-py/tests/test_fetchers.py`

**Port from:** `data/ai_queries_fetcher.py` (Google Suggest), `data/youtube_fetcher.py` (autocomplete + angle tags), `data/gdelt_fetcher.py` (domain authority), `data/ke_client.py` (Keywords Everywhere — env key already present as `KEYWORDS_EVERYWHERE`), and `_premium_distribution_advice` from `seo_eeat.py` (→ `advisory.py`, pure). Every network fetcher must return `{"available": False, "reason": …}` (or empty list) on any error/missing key — never raise.

- [ ] **Step 1: Write the failing test** (shape + graceful degradation only; no live calls)

```python
# packages/scoring-py/tests/test_fetchers.py
from onlinejourno_scoring.advisory import premium_distribution_advice
from onlinejourno_scoring import ai_queries, youtube, gdelt, keywords_everywhere


def test_advisory_high_urgency_when_paywalled_and_trending():
    adv = premium_distribution_advice(paywalled=True, hard_paywall=True, discover_score=70,
                                      is_trending=True, matched_trend="Iran", word_count=120)
    assert adv["urgency"] == "HIGH"
    assert len(adv["options"]) >= 1


def test_advisory_none_when_not_paywalled():
    adv = premium_distribution_advice(paywalled=False, hard_paywall=False, discover_score=70,
                                      is_trending=True, matched_trend="Iran", word_count=900)
    assert adv["urgency"] == "LOW" or adv["options"] == []


def test_fetchers_degrade_without_network(monkeypatch):
    monkeypatch.setenv("KEYWORDS_EVERYWHERE", "")  # force no-key path
    assert keywords_everywhere.ranking_keywords("https://x.com/a")["available"] is False
    # network fetchers return list/dict, never raise (call with an unresolvable host)
    assert isinstance(ai_queries.reader_questions("zzz"), dict)
    assert isinstance(youtube.search_queries("zzz"), dict)
    assert isinstance(gdelt.domain_authority("zzz"), dict)
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement the 5 modules.** Public functions (each returns a dict with `available`):
  - `ai_queries.reader_questions(keyword) -> {available, questions:[...], search_angles:[...]}`; `ai_queries.content_gap(keyword, headline) -> {...}`.
  - `youtube.search_queries(keyword) -> {available, queries:[...], angles:[...]}`.
  - `gdelt.domain_authority(topic) -> {available, score:float}`.
  - `keywords_everywhere.ranking_keywords(url) -> {available, keywords:[...]}`, `.related(keyword)`, `.pasf(keyword)`, `.backlinks(url)` — read `KEYWORDS_EVERYWHERE` env; empty/missing → `{"available": False}`.
  - `advisory.premium_distribution_advice(*, paywalled, hard_paywall, discover_score, is_trending, matched_trend, word_count) -> {urgency, note, options:[{rank,title,rationale,effort,impact}]}` — pure; port the ranked-options logic verbatim.

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/ai_queries.py packages/scoring-py/src/onlinejourno_scoring/youtube.py packages/scoring-py/src/onlinejourno_scoring/gdelt.py packages/scoring-py/src/onlinejourno_scoring/keywords_everywhere.py packages/scoring-py/src/onlinejourno_scoring/advisory.py packages/scoring-py/tests/test_fetchers.py
git commit -m "scoring: external fetchers (ai-queries/youtube/gdelt/KE) + premium advisory"
```

---

### Task 12: `audit.py` — orchestrator + end-to-end CLI

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/audit.py`
- Test: `packages/scoring-py/tests/test_audit.py`

**Assembles** every module into one JSON. Port the top-level orchestration order from `analyse_story()` in `seo_eeat.py` (which calls extract → checks → channels → sqeg → recirc → advisory) and the dashboard's section assembly.

- [ ] **Step 1: Write the failing test** (drives orchestration off a parsed `Page`, no network — inject a `Page` via `audit_page`)

```python
# packages/scoring-py/tests/test_audit.py
from onlinejourno_scoring.models import Page
from onlinejourno_scoring.audit import audit_page


def test_audit_page_assembles_all_sections():
    p = Page(url="https://x.com/a", title="A reasonably good headline about Iran sanctions",
             has_byline=True, author="Jane Doe", word_count=900, schema_types=["NewsArticle"],
             https=True, section_path="International", internal_links=6, same_section_links=4,
             good_anchors=5)
    a = audit_page(p, trend="Iran", need="", with_external=False)
    for key in ("overall", "checks", "channels", "sqeg", "recirculation", "radar", "taxonomy"):
        assert key in a
    assert set(a["channels"]) == {"discover", "news", "search"}
    assert a["overall"]["grade"] in list("ABCDF")
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Implement `audit.py`**
  - `audit_page(page, *, trend, need, with_external=True, cwv=None) -> dict` — pure assembly: `score_checks`, channel scorers (discover/news/search, passing `trend_alignment` from a simple title-trend overlap), `classify_ymyl`+`page_quality`+`needs_met`, `recirculation`, `potential_score` (components: trend overlap, content alignment, gdelt authority-or-default, freshness), `radar`, taxonomy block, `premium_distribution_advice` (when paywalled), and (when `with_external`) `ai_queries`/`youtube`/`keywords_everywhere`/`cwv` sections — each guarded by its `available` flag.
  - `run_audit(url, *, trend="", need="") -> dict` — `fetch_page(url)` → `cwv = page_experience(url)` → `audit_page(page, trend=trend, need=need, with_external=True, cwv=cwv)`; add `{"url", "fetched_at"? omit (no clock in tests)}`. Wrap in try/except returning `{"error": str(e)}`.

- [ ] **Step 4: Run — expect pass.** Then end-to-end smoke against a real URL: `cd packages/scoring-py && PAGESPEED_API_KEY= uv run onlinejourno-scoring audit "https://www.thehindu.com/" --json | head -c 400` → prints JSON with the section keys (CWV `available:false` without a key — fine).

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/audit.py packages/scoring-py/tests/test_audit.py
git commit -m "scoring: audit orchestrator + end-to-end CLI (assemble full JSON)"
```

**Checkpoint — the Python engine is complete and runnable.** Part B wires it to the web app.

---

## Part B — Persistence + web data layer

### Task 13: `seo_audit` migration + db.ts helpers

**Files:**
- Create: `infra/migrations/0020_seo_audit.sql`
- Modify: `apps/web/lib/db.ts` (after the calendar/scores helpers)

- [ ] **Step 1: Write the migration**

```sql
-- infra/migrations/0020_seo_audit.sql
create table if not exists seo_audit (
  tenant_id  uuid not null,
  story_id   uuid not null,
  url        text not null,
  audit      jsonb not null,
  computed_at timestamptz not null default now(),
  primary key (tenant_id, story_id)
);
```

- [ ] **Step 2: Apply it to the dev DB**

Run: `psql "postgresql:///onlinejourno_dev" -f infra/migrations/0020_seo_audit.sql`
Expected: `CREATE TABLE`.

- [ ] **Step 3: Add `db.ts` helpers** (place after the existing calendar helpers from the fusion slice)

```typescript
export type SeoAuditRow = { url: string; audit: unknown; computed_at: Date };

export async function seoAuditFor(
  tenantId: string,
  storyId: string,
): Promise<SeoAuditRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<SeoAuditRow>(
    "select url, audit, computed_at from seo_audit where tenant_id = $1 and story_id = $2",
    [tenantId, storyId],
  );
  return rows[0] ?? null;
}

export async function upsertSeoAudit(
  tenantId: string,
  storyId: string,
  url: string,
  audit: unknown,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into seo_audit (tenant_id, story_id, url, audit, computed_at)
     values ($1, $2, $3, $4, now())
     on conflict (tenant_id, story_id)
       do update set url = excluded.url, audit = excluded.audit, computed_at = now()`,
    [tenantId, storyId, url, JSON.stringify(audit)],
  );
}
```

- [ ] **Step 4: Type-check** — `pnpm --filter @onlinejourno/web type-check` → no errors.

- [ ] **Step 5: Commit**

```bash
git add infra/migrations/0020_seo_audit.sql apps/web/lib/db.ts
git commit -m "seo-audit: seo_audit table + db helpers (cache audit JSON)"
```

---

### Task 14: `seoAudit.ts` — subprocess + cache

**Files:**
- Create: `apps/web/lib/seoAudit.ts`

**Mirror** `apps/web/lib/analyze.ts` exactly (execFile, REPO_ROOT, --json), but call `onlinejourno-scoring audit`.

- [ ] **Step 1: Implement `seoAudit.ts`**

```typescript
// apps/web/lib/seoAudit.ts
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { seoAuditFor, upsertSeoAudit } from "@/lib/db";

const execFileP = promisify(execFile);
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

export type SeoAudit = Record<string, unknown> & { error?: string };

/** Run the full SEO + E-E-A-T audit CLI for a URL (server-side only). */
export async function runSeoAudit(
  url: string,
  opts: { trend?: string; need?: string } = {},
): Promise<SeoAudit> {
  if (!/^https?:\/\//i.test(url)) return { error: "URL must start with http(s)://" };
  const args = ["run", "--package", "onlinejourno-scoring", "onlinejourno-scoring",
    "audit", url, "--json"];
  if (opts.trend) args.push("--trend", opts.trend);
  if (opts.need) args.push("--need", opts.need);
  try {
    const { stdout } = await execFileP("uv", args, {
      cwd: REPO_ROOT, timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
    });
    return JSON.parse(stdout) as SeoAudit;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Cached read; runs + persists when missing or when force is set. */
export async function getOrRunSeoAudit(
  tenantId: string, storyId: string, url: string,
  opts: { trend?: string; need?: string; force?: boolean } = {},
): Promise<SeoAudit> {
  if (!opts.force) {
    const cached = await seoAuditFor(tenantId, storyId);
    if (cached) return cached.audit as SeoAudit;
  }
  const audit = await runSeoAudit(url, opts);
  if (!audit.error) await upsertSeoAudit(tenantId, storyId, url, audit);
  return audit;
}
```

- [ ] **Step 2: Type-check** → no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/seoAudit.ts
git commit -m "seo-audit: runSeoAudit subprocess + cached getOrRun"
```

---

## Part C — Web render

> Components live in `apps/web/components/scores/seo-audit/`. Each takes a typed slice of the audit JSON and renders one section, matching the original's layout + its educational/remediation text. Charts are inline SVG (no new dependency). The audit JSON is `unknown` at the boundary; each component defines a local `type` for its slice and the page narrows with small guards. Verify with `type-check` after each.

### Task 15: Audit shell + Scorecard + Periodic Table

**Files:**
- Create: `apps/web/components/scores/seo-audit/AuditView.tsx`, `AuditScorecard.tsx`, `PeriodicTable.tsx`

- [ ] **Step 1: Implement `AuditScorecard.tsx`** — props `{ score: number; grade: string; counts: {critical:number;warning:number;ok:number} }`; render the big score + grade chip + a stacked severity bar + a `<details>` "How is this score calculated?" explaining `(passed/total)×100 − crit×12 − warn×4` and the A/B/C/D/F bands.

- [ ] **Step 2: Implement `PeriodicTable.tsx`** — props `{ checks: {element:string;signal:string;severity:"critical"|"warning"|"ok";finding:string;recommendation:string}[] }`; group by `element` (Ar/Au/Cn/El/Fr/Hd/Il/Ds/Mm/Sc/Sh/Sd/Ti/Tr/Ac), each group a `<details>` showing per-check severity chip + signal + finding + indented recommendation. Map element code → readable label inline.

- [ ] **Step 3: Implement `AuditView.tsx`** — props `{ audit: SeoAudit }`; narrows the JSON and renders the section components in order (this task: Scorecard + PeriodicTable; later tasks add the rest). Export a `SeoAudit` type alias re-exported from `seoAudit.ts`.

- [ ] **Step 4: Type-check** → no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/scores/seo-audit/AuditView.tsx apps/web/components/scores/seo-audit/AuditScorecard.tsx apps/web/components/scores/seo-audit/PeriodicTable.tsx
git commit -m "seo-audit ui: shell + scorecard + SEJ periodic table"
```

---

### Task 16: Channel cards + Signal Radar (SVG)

**Files:**
- Create: `apps/web/components/scores/seo-audit/ChannelCards.tsx`, `SignalRadar.tsx`

- [ ] **Step 1: Implement `ChannelCards.tsx`** — props `{ channels: Record<"discover"|"news"|"search", {score:number;grade:string;signals:{name:string;value:number;max:number;note:string}[]}> }`; three cards (score + grade + `<details>` per-signal breakdown with value/max + note).

- [ ] **Step 2: Implement `SignalRadar.tsx`** — props `{ axes: {axis:string;value:number}[] }`; render a 5-axis radar as inline SVG (pentagon grid rings at 20/40/60/80/100, axis labels, filled polygon of the values). No external chart lib.

- [ ] **Step 3: Wire both into `AuditView.tsx`.**

- [ ] **Step 4: Type-check** → no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/scores/seo-audit/ChannelCards.tsx apps/web/components/scores/seo-audit/SignalRadar.tsx apps/web/components/scores/seo-audit/AuditView.tsx
git commit -m "seo-audit ui: channel cards + SVG signal radar"
```

---

### Task 17: SQEG panel + Recirculation + Taxonomy

**Files:**
- Create: `apps/web/components/scores/seo-audit/SqegPanel.tsx`, `Recirculation.tsx`, `Taxonomy.tsx`

- [ ] **Step 1: Implement `SqegPanel.tsx`** — props `{ ymyl:{level:string;requirements:string[];is_ymyl:boolean}; pq:{score:number;grade:string;signals:{name:string;points:number;max:number;ref:string;note:string}[];risk_flags:string[]}; nm:{needs_met:string;query_intent:string;alignment_ratio:number} }`; 3-up header (YMYL / PQ / Needs-Met) + PQ signal bars with SQEG §refs + red risk-flag boxes + YMYL requirements list.

- [ ] **Step 2: Implement `Recirculation.tsx`** — props `{ score:number; metrics:Record<string,number|boolean>; recommendations:string[] }`; score + metric tiles + amber recommendation boxes.

- [ ] **Step 3: Implement `Taxonomy.tsx`** — props `{ section_path:string; topic:string; tags:string[] }`; section path + tag pills.

- [ ] **Step 4: Wire into `AuditView.tsx`. Type-check** → no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/scores/seo-audit/SqegPanel.tsx apps/web/components/scores/seo-audit/Recirculation.tsx apps/web/components/scores/seo-audit/Taxonomy.tsx apps/web/components/scores/seo-audit/AuditView.tsx
git commit -m "seo-audit ui: SQEG panel + recirculation + taxonomy"
```

---

### Task 18: Core Web Vitals + Potential + Premium Advisory

**Files:**
- Create: `apps/web/components/scores/seo-audit/CoreWebVitals.tsx`, `PotentialPanel.tsx`, `PremiumDistributionAdvisory.tsx`

- [ ] **Step 1: Implement `CoreWebVitals.tsx`** — props `{ cwv: {available:boolean; reason?:string; grade?:string; performance_score?:number; metrics?:{lcp_ms:number;cls_score:number;tbt_ms:number;fcp_ms:number;performance_score:number}; recommendations?:string[]} }`; when `available` render metric tiles (LCP, CLS, TBT-as-INP-proxy, FCP, perf score) + grade + remediation; when not, render a muted "Core Web Vitals unavailable — set PAGESPEED_API_KEY" note.

- [ ] **Step 2: Implement `PotentialPanel.tsx`** — props `{ potential_score:number; trend_momentum:number; content_alignment:number; domain_authority:number; freshness:number; label:string; matched_trend:string }`; 4 component tiles + the composite + label.

- [ ] **Step 3: Implement `PremiumDistributionAdvisory.tsx`** — props `{ advisory:{urgency:string;note:string;options:{rank:number;title:string;rationale:string;effort:string;impact:string}[]} | null }`; render only when present: urgency chip + note + ranked options with effort/impact chips.

- [ ] **Step 4: Wire into `AuditView.tsx`. Type-check** → no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/scores/seo-audit/CoreWebVitals.tsx apps/web/components/scores/seo-audit/PotentialPanel.tsx apps/web/components/scores/seo-audit/PremiumDistributionAdvisory.tsx apps/web/components/scores/seo-audit/AuditView.tsx
git commit -m "seo-audit ui: Core Web Vitals + potential + premium advisory"
```

---

### Task 19: YouTube + AI-assistant queries + Keywords intelligence

**Files:**
- Create: `apps/web/components/scores/seo-audit/YouTubeQueries.tsx`, `AiAssistantQueries.tsx`, `KeywordsIntelligence.tsx`

- [ ] **Step 1: Implement `YouTubeQueries.tsx`** — props `{ yt:{available:boolean; queries?:string[]; angles?:string[]} }`; render query list + angle tags when available; else nothing.

- [ ] **Step 2: Implement `AiAssistantQueries.tsx`** — props `{ ai:{available:boolean; questions?:string[]; search_angles?:string[]} }`; 2-column "What readers ask AI assistants" / "Search angles to cover" when available.

- [ ] **Step 3: Implement `KeywordsIntelligence.tsx`** — props `{ ke:{available:boolean; keywords?:{keyword:string;vol:number;cpc:number;competition:number}[]; backlinks?:{url:string;da:number;pa:number;spam:number}[]} }`; ranking-keywords table + backlinks table when available; else nothing.

- [ ] **Step 4: Wire into `AuditView.tsx`. Type-check** → no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/scores/seo-audit/YouTubeQueries.tsx apps/web/components/scores/seo-audit/AiAssistantQueries.tsx apps/web/components/scores/seo-audit/KeywordsIntelligence.tsx apps/web/components/scores/seo-audit/AuditView.tsx
git commit -m "seo-audit ui: YouTube + AI-assistant queries + keywords intelligence"
```

---

### Task 20: Wire the audit into `/en/scores`

**Files:**
- Modify: `apps/web/app/[locale]/scores/page.tsx`

- [ ] **Step 1: Add the server action + per-row trigger.** In `scores/page.tsx`, import `getOrRunSeoAudit` from `@/lib/seoAudit`, `seoAuditFor` from `@/lib/db`, and `AuditView`. Add a `"use server"` action `runStoryAudit(formData)` that resolves tenant + story + url, calls `getOrRunSeoAudit(tenantId, storyId, url, { trend, force: true })`, and `revalidatePath`s the page. For each scored story row, render a `<form action={runStoryAudit}>` with hidden `storyId`/`url`/`trend` and a **"Run SEO + E-E-A-T Audit"** submit button; when a cached `seoAuditFor` exists for that story, render `<AuditView audit={cached.audit} />` inline below the row.

- [ ] **Step 2: Type-check** — `pnpm --filter @onlinejourno/web type-check` → no errors.

- [ ] **Step 3: Verify against the dev DB + a real story.** With the dev server up, on `/en/scores` click "Run SEO + E-E-A-T Audit" for one story → the full audit renders (scorecard, channel cards, radar, SQEG, periodic table, recirculation, CWV note, etc.). Note: `/en/scores` is auth-gated; if you cannot authenticate, instead run the CLI directly on that story's URL (`uv run onlinejourno-scoring audit "<url>" --json`) and confirm the JSON has every section — the controller will flag the visual check.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/[locale]/scores/page.tsx"
git commit -m "seo-audit: wire full audit into /en/scores (run + render per story)"
```

---

## Self-review checklist (done while writing)

- **Spec coverage:** engine in `scoring-py` ✓ (T1-T12); periodic table ✓ (T3); rich channels ✓ (T4); SQEG ✓ (T5); recirculation ✓ (T6); potential ✓ (T7); CWV ✓ (T8); radar ✓ (T9); fetch/parse ✓ (T10); external fetchers + advisory ✓ (T11); orchestrator+CLI ✓ (T12); persistence ✓ (T13); subprocess+cache ✓ (T14); all render sections ✓ (T15-T19); page wiring ✓ (T20); graceful degradation via `available` flags ✓; GSC omitted ✓; SVG charts, no new web dep ✓.
- **Placeholders:** none — every Python task has complete test code + an exact source file to port from with the invariants to preserve; web tasks specify exact props/types.
- **Type consistency:** `Page` fields (T2) are consumed by T3-T12; channel `{score,grade,signals[{name,value,max,note}]}` shape is consistent T4→T9→T16; `audit_page` keys (T12) match the component props (T15-T19); `getOrRunSeoAudit`/`seoAuditFor`/`upsertSeoAudit` signatures match across T13/T14/T20; `grade()` defined in T3 and imported by T4.
- **Known assumptions:** `getPool()` + dict/JSONB conventions confirmed from existing `db.ts`; `uv run --package` subprocess pattern confirmed from `analyze.ts`; pytest via `--with pytest` confirmed from the fusion slice; migration `0020` is the next number after the uncommitted `0019`.
