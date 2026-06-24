# Story Optimisation Platform — Plan 1: Audit-a-URL foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the standalone `story-optimiser` repo and ship a working, keyless vertical slice — `POST /audit {url}` returns real per-surface scores + SEO/E-E-A-T findings + CWV by wrapping the existing `onlinejourno-scoring` library.

**Architecture:** A Python backend (FastAPI) that loads a vendor-neutral `newsroom.yaml` into a typed config, calls `onlinejourno_scoring.audit.run_audit(url, surfaces=...)`, and maps the raw audit dict into a clean `StoryReport`. The scoring brain is reused as a dependency — never reimplemented. Deterministic mapping + a network-free integration test against `audit_page` keep it testable.

**Tech Stack:** Python 3.11, FastAPI, pydantic v2, PyYAML, uv (deps), pytest, ruff, mypy. Dependency: `onlinejourno-scoring` (from the platform monorepo, pinned by path during dev).

**Plan sequence (this is Plan 1 of 5):**
1. **Audit-a-URL foundation** ← this plan
2. Connectors + Wikidata-enriched trends
3. Schema.org suggester
4. Next.js web UI (the screens)
5. AI tier (decoupled `agents-py`)

---

## File Structure

New repo at `/Users/subhashrai/projects/story-optimiser` (sibling of `platform/`). All paths below are repo-root-relative.

```
pyproject.toml                      # package + deps; onlinejourno-scoring path source
newsroom.example.yaml               # vendor-neutral sample config (meridian.example)
.env.example                        # optional keys (unused in this slice)
README.md                           # run instructions
src/story_optimiser/__init__.py
src/story_optimiser/config.py       # NewsroomConfig + load_config + ConfigError
src/story_optimiser/report.py       # StoryReport + SurfaceScore + _to_report mapping
src/story_optimiser/core.py         # audit_url / audit_page_obj adapters over onlinejourno-scoring
src/story_optimiser/api.py          # FastAPI app: GET /health, POST /audit
src/story_optimiser/cli.py          # `story-optimiser audit <url>`
tests/conftest.py                   # shared fixtures (sample raw dict, sample Page)
tests/test_config.py
tests/test_report.py
tests/test_core.py
tests/test_api.py
```

Responsibilities: `config` owns parsing/validation only; `report` owns the public output shape + pure mapping; `core` owns the library call; `api`/`cli` are thin transports. Each is independently testable.

---

### Task 1: Scaffold the repo

**Files:**
- Create: `/Users/subhashrai/projects/story-optimiser/pyproject.toml`
- Create: `src/story_optimiser/__init__.py`
- Create: `.env.example`, `newsroom.example.yaml`, `README.md`

- [ ] **Step 1: Create the repo and git-init**

```bash
mkdir -p /Users/subhashrai/projects/story-optimiser/src/story_optimiser /Users/subhashrai/projects/story-optimiser/tests
cd /Users/subhashrai/projects/story-optimiser
git init -b main
printf "__pycache__/\n*.pyc\n.venv/\n.env\n.pytest_cache/\n.ruff_cache/\n" > .gitignore
```

- [ ] **Step 2: Write `pyproject.toml`**

```toml
[project]
name = "story-optimiser"
version = "0.0.1"
description = "OnlineJourno Story Optimisation Platform — standalone, vendor-neutral story optimiser."
requires-python = ">=3.11"
license = { text = "Apache-2.0" }
dependencies = [
  "fastapi>=0.110",
  "uvicorn>=0.29",
  "pydantic>=2.6",
  "pyyaml>=6.0",
  "onlinejourno-scoring",
]

[project.scripts]
story-optimiser = "story_optimiser.cli:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/story_optimiser"]

[tool.uv.sources]
# Dev pin to the monorepo package. Switch to a published/git pin later (spec §17.2).
onlinejourno-scoring = { path = "../platform/packages/scoring-py", editable = true }

[dependency-groups]
dev = ["pytest>=8.0", "httpx>=0.27", "ruff>=0.4", "mypy>=1.9"]

[tool.ruff]
line-length = 100
target-version = "py311"
```

- [ ] **Step 3: Write `src/story_optimiser/__init__.py`**

```python
"""OnlineJourno Story Optimisation Platform — standalone tool."""
__version__ = "0.0.1"
```

- [ ] **Step 4: Write `newsroom.example.yaml` (vendor-neutral — no real outlet)**

```yaml
outlet:
  name: "Meridian News"
  domain: "meridian.example"
  locale: en-IN
  market: IN
surfaces: [discover, google_news, google_search]
sources:
  rss: []
  sitemap: ""
llm:
  provider: ""
  endpoint: ""
  api_key: ""
```

- [ ] **Step 5: Write `.env.example` and a minimal `README.md`**

`.env.example`:
```
# Optional. Unused in the foundation slice.
LLM_API_KEY=
```

`README.md`:
```markdown
# story-optimiser

Audit a story URL for surface readiness + SEO/E-E-A-T, keyless.

## Run
    uv sync
    uv run uvicorn story_optimiser.api:app --reload
    curl -X POST localhost:8000/audit -H 'content-type: application/json' -d '{"url":"https://example.com/article"}'
```

- [ ] **Step 6: Install and verify the toolchain resolves**

Run: `cd /Users/subhashrai/projects/story-optimiser && uv sync`
Expected: resolves successfully, including `onlinejourno-scoring` from the path source.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold story-optimiser repo"
```

---

### Task 2: Config model + loader

**Files:**
- Create: `src/story_optimiser/config.py`
- Test: `tests/test_config.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_config.py
import textwrap
import pytest
from story_optimiser.config import load_config, NewsroomConfig, ConfigError


def _write(tmp_path, body: str):
    p = tmp_path / "newsroom.yaml"
    p.write_text(textwrap.dedent(body))
    return p


def test_load_valid_config(tmp_path):
    path = _write(tmp_path, """
        outlet:
          name: Meridian News
          domain: meridian.example
          locale: en-IN
          market: IN
        surfaces: [discover, google_news]
    """)
    cfg = load_config(path)
    assert isinstance(cfg, NewsroomConfig)
    assert cfg.outlet.name == "Meridian News"
    assert cfg.surfaces == ["discover", "google_news"]


def test_surfaces_default_when_omitted(tmp_path):
    path = _write(tmp_path, """
        outlet:
          name: Meridian News
          domain: meridian.example
    """)
    cfg = load_config(path)
    assert cfg.surfaces == ["discover", "google_news", "google_search"]


def test_missing_outlet_name_raises_configerror(tmp_path):
    path = _write(tmp_path, """
        outlet:
          domain: meridian.example
    """)
    with pytest.raises(ConfigError) as exc:
        load_config(path)
    assert "outlet" in str(exc.value).lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: story_optimiser.config`.

- [ ] **Step 3: Write minimal implementation**

```python
# src/story_optimiser/config.py
from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field, ValidationError


class ConfigError(Exception):
    """Raised when newsroom.yaml is missing required fields or is malformed."""


class Outlet(BaseModel):
    name: str
    domain: str = ""
    locale: str = "en"
    market: str = ""


class Sources(BaseModel):
    rss: list[str] = Field(default_factory=list)
    sitemap: str = ""


class LLM(BaseModel):
    provider: str = ""
    endpoint: str = ""
    api_key: str = ""


class NewsroomConfig(BaseModel):
    outlet: Outlet
    surfaces: list[str] = Field(default_factory=lambda: ["discover", "google_news", "google_search"])
    sources: Sources = Field(default_factory=Sources)
    llm: LLM = Field(default_factory=LLM)


def load_config(path: str | Path) -> NewsroomConfig:
    raw = yaml.safe_load(Path(path).read_text()) or {}
    try:
        return NewsroomConfig.model_validate(raw)
    except ValidationError as exc:
        raise ConfigError(f"Invalid newsroom config: {exc}") from exc
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_config.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add src/story_optimiser/config.py tests/test_config.py
git commit -m "feat: newsroom.yaml config loader with validation"
```

---

### Task 3: StoryReport model + pure mapping

**Files:**
- Create: `src/story_optimiser/report.py`
- Create: `tests/conftest.py`
- Test: `tests/test_report.py`

- [ ] **Step 1: Add the sample raw-audit fixture to `tests/conftest.py`**

This mirrors the keys `onlinejourno_scoring.audit.audit_page` returns.

```python
# tests/conftest.py
import pytest


@pytest.fixture
def sample_raw_audit() -> dict:
    return {
        "url": "https://meridian.example/a",
        "overall": {"score": 72.0, "grade": "B", "counts": {"pass": 9, "warn": 3, "fail": 1}},
        "checks": [{"id": "title", "status": "pass"}],
        "surfaces": {
            "discover": {"score": 84.0, "signals": [{"label": "1200px image", "ok": True}]},
            "google_search": {"score": 61.0, "signals": []},
        },
        "composite": {"composite": 70.0},
        "sqeg": {"ymyl": False, "page_quality": "High", "needs_met": "Mostly"},
        "potential": {"score": 66.0, "label": "Medium", "components": {}},
        "taxonomy": {"section_path": "Business", "topic": "monsoon", "tags": ["weather"]},
        "cwv": {"available": False},
    }


@pytest.fixture
def sample_error_audit() -> dict:
    return {"error": "fetch failed: 403", "url": "https://meridian.example/x"}
```

- [ ] **Step 2: Write the failing test**

```python
# tests/test_report.py
from story_optimiser.report import StoryReport, _to_report


def test_to_report_maps_core_fields(sample_raw_audit):
    rep = _to_report(sample_raw_audit)
    assert isinstance(rep, StoryReport)
    assert rep.url == "https://meridian.example/a"
    assert rep.overall_score == 72.0
    assert rep.grade == "B"
    assert rep.surfaces["discover"].score == 84.0
    assert rep.cwv == {"available": False}
    assert rep.error is None


def test_to_report_carries_error(sample_error_audit):
    rep = _to_report(sample_error_audit)
    assert rep.error == "fetch failed: 403"
    assert rep.overall_score is None
    assert rep.surfaces == {}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `uv run pytest tests/test_report.py -v`
Expected: FAIL — `ModuleNotFoundError: story_optimiser.report`.

- [ ] **Step 4: Write minimal implementation**

```python
# src/story_optimiser/report.py
from __future__ import annotations

from pydantic import BaseModel, Field


class SurfaceScore(BaseModel):
    score: float
    signals: list = Field(default_factory=list)


class StoryReport(BaseModel):
    url: str
    overall_score: float | None = None
    grade: str | None = None
    surfaces: dict[str, SurfaceScore] = Field(default_factory=dict)
    cwv: dict = Field(default_factory=dict)
    potential: dict | None = None
    sqeg: dict | None = None
    taxonomy: dict | None = None
    error: str | None = None


def _to_report(raw: dict) -> StoryReport:
    """Map the onlinejourno_scoring audit dict into the public StoryReport shape."""
    if raw.get("error"):
        return StoryReport(url=raw.get("url", ""), error=str(raw["error"]))

    overall = raw.get("overall") or {}
    surfaces = {
        key: SurfaceScore(score=float(val.get("score", 0.0)), signals=val.get("signals", []))
        for key, val in (raw.get("surfaces") or {}).items()
    }
    return StoryReport(
        url=raw.get("url", ""),
        overall_score=overall.get("score"),
        grade=overall.get("grade"),
        surfaces=surfaces,
        cwv=raw.get("cwv") or {},
        potential=raw.get("potential"),
        sqeg=raw.get("sqeg"),
        taxonomy=raw.get("taxonomy"),
    )
```

- [ ] **Step 5: Run test to verify it passes**

Run: `uv run pytest tests/test_report.py -v`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
git add src/story_optimiser/report.py tests/test_report.py tests/conftest.py
git commit -m "feat: StoryReport model + pure audit-dict mapping"
```

---

### Task 4: Scoring-core adapters (`audit_url`, `audit_page_obj`)

**Files:**
- Create: `src/story_optimiser/core.py`
- Test: `tests/test_core.py`

- [ ] **Step 1: Add the sample `Page` fixture to `tests/conftest.py`**

Append to the existing file.

```python
# tests/conftest.py  (append)
from onlinejourno_scoring.models import Page


@pytest.fixture
def sample_page() -> Page:
    return Page(
        url="https://meridian.example/business/monsoon",
        title="Monsoon arrives early, reshaping the kharif calendar",
        meta_description="An early monsoon shifts sowing.",
        h1s=["Monsoon arrives early"],
        schema_types=[],
        author="A. Reporter",
        has_byline=True,
        word_count=620,
        section_path="Business",
        topic="",  # empty on purpose: keeps audit_page fully offline (no GDELT domain-authority lookup)
        tags=["weather"],
        https=True,
    )
```

- [ ] **Step 2: Write the failing test**

```python
# tests/test_core.py
from story_optimiser import core
from story_optimiser.config import NewsroomConfig, Outlet
from story_optimiser.report import StoryReport


def _cfg() -> NewsroomConfig:
    return NewsroomConfig(outlet=Outlet(name="Meridian News"), surfaces=["discover", "google_search"])


def test_audit_url_maps_library_output(monkeypatch, sample_raw_audit):
    captured = {}

    def fake_run_audit(url, *, trend="", need="", surfaces=None):
        captured["url"] = url
        captured["surfaces"] = surfaces
        return sample_raw_audit

    monkeypatch.setattr(core, "run_audit", fake_run_audit)
    rep = core.audit_url("https://meridian.example/a", _cfg())
    assert isinstance(rep, StoryReport)
    assert rep.overall_score == 72.0
    assert captured["surfaces"] == ["discover", "google_search"]


def test_audit_page_obj_real_integration(sample_page):
    # No network: audit_page is pure; with_external disabled in the adapter.
    rep = core.audit_page_obj(sample_page, _cfg())
    assert isinstance(rep, StoryReport)
    assert isinstance(rep.overall_score, float)
    assert "discover" in rep.surfaces
    assert rep.surfaces["discover"].score >= 0.0
```

- [ ] **Step 3: Run test to verify it fails**

Run: `uv run pytest tests/test_core.py -v`
Expected: FAIL — `ModuleNotFoundError: story_optimiser.core`.

- [ ] **Step 4: Write minimal implementation**

```python
# src/story_optimiser/core.py
from __future__ import annotations

from onlinejourno_scoring.audit import run_audit, audit_page
from onlinejourno_scoring.models import Page

from story_optimiser.config import NewsroomConfig
from story_optimiser.report import StoryReport, _to_report


def audit_url(url: str, config: NewsroomConfig) -> StoryReport:
    """Live path: fetch + score the URL via onlinejourno-scoring (keyless core)."""
    raw = run_audit(url, surfaces=config.surfaces)
    return _to_report(raw)


def audit_page_obj(page: Page, config: NewsroomConfig) -> StoryReport:
    """Network-free path: score a pre-built Page (used in tests + future ingestion)."""
    raw = audit_page(
        page,
        trend="",
        need="",
        surfaces=config.surfaces,
        with_external=False,
        cwv={"available": False},
    )
    raw.setdefault("url", page.url)
    return _to_report(raw)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `uv run pytest tests/test_core.py -v`
Expected: PASS (2 passed). The second test exercises the real `onlinejourno-scoring` assembler with no network.

- [ ] **Step 6: Commit**

```bash
git add src/story_optimiser/core.py tests/test_core.py tests/conftest.py
git commit -m "feat: scoring-core adapters over onlinejourno-scoring"
```

---

### Task 5: FastAPI app (`GET /health`, `POST /audit`)

**Files:**
- Create: `src/story_optimiser/api.py`
- Test: `tests/test_api.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_api.py
from fastapi.testclient import TestClient

from story_optimiser import core
from story_optimiser.api import app
from story_optimiser.report import StoryReport

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_audit_endpoint(monkeypatch):
    def fake_audit_url(url, config):
        return StoryReport(url=url, overall_score=72.0, grade="B")

    monkeypatch.setattr(core, "audit_url", fake_audit_url)
    r = client.post("/audit", json={"url": "https://meridian.example/a"})
    assert r.status_code == 200
    body = r.json()
    assert body["url"] == "https://meridian.example/a"
    assert body["overall_score"] == 72.0
    assert body["grade"] == "B"


def test_audit_requires_url():
    r = client.post("/audit", json={})
    assert r.status_code == 422
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_api.py -v`
Expected: FAIL — `ModuleNotFoundError: story_optimiser.api`.

- [ ] **Step 3: Write minimal implementation**

Note: the endpoint calls `core.audit_url` via the module (not a direct import) so the test's monkeypatch takes effect.

```python
# src/story_optimiser/api.py
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

from story_optimiser import core
from story_optimiser.config import NewsroomConfig, Outlet, load_config
from story_optimiser.report import StoryReport

app = FastAPI(title="Story Optimiser")


def _config() -> NewsroomConfig:
    path = os.environ.get("NEWSROOM_CONFIG", "newsroom.yaml")
    if Path(path).exists():
        return load_config(path)
    return NewsroomConfig(outlet=Outlet(name="Newsroom"))


class AuditRequest(BaseModel):
    url: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/audit", response_model=StoryReport)
def audit(req: AuditRequest) -> StoryReport:
    return core.audit_url(req.url, _config())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_api.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add src/story_optimiser/api.py tests/test_api.py
git commit -m "feat: FastAPI /health and /audit endpoints"
```

---

### Task 6: CLI (`story-optimiser audit <url>`)

**Files:**
- Create: `src/story_optimiser/cli.py`
- Test: `tests/test_cli.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_cli.py
import json

from story_optimiser import core, cli
from story_optimiser.report import StoryReport


def test_cli_audit_prints_json(monkeypatch, capsys):
    monkeypatch.setattr(core, "audit_url", lambda url, config: StoryReport(url=url, overall_score=72.0))
    rc = cli.main(["audit", "https://meridian.example/a"])
    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert out["url"] == "https://meridian.example/a"
    assert out["overall_score"] == 72.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_cli.py -v`
Expected: FAIL — `AttributeError: module 'story_optimiser.cli' has no attribute 'main'` (or ModuleNotFound).

- [ ] **Step 3: Write minimal implementation**

```python
# src/story_optimiser/cli.py
from __future__ import annotations

import argparse

from story_optimiser import core
from story_optimiser.config import NewsroomConfig, Outlet


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="story-optimiser")
    sub = parser.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("audit", help="audit a story URL")
    a.add_argument("url")
    args = parser.parse_args(argv)

    if args.cmd == "audit":
        report = core.audit_url(args.url, NewsroomConfig(outlet=Outlet(name="Newsroom")))
        print(report.model_dump_json(indent=2))
        return 0
    return 1
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_cli.py -v`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add src/story_optimiser/cli.py tests/test_cli.py
git commit -m "feat: story-optimiser audit CLI"
```

---

### Task 7: Full suite, lint, and a real end-to-end smoke

**Files:**
- Modify: `README.md` (add the verified commands)

- [ ] **Step 1: Run the whole suite**

Run: `uv run pytest -v`
Expected: PASS — all tests across config/report/core/api/cli green (11 tests).

- [ ] **Step 2: Lint**

Run: `uv run ruff check src tests`
Expected: no errors (fix any reported, re-run).

- [ ] **Step 3: Real end-to-end smoke (network — manual confirm)**

Run:
```bash
uv run uvicorn story_optimiser.api:app --port 8000 &
sleep 2
curl -s -X POST localhost:8000/audit -H 'content-type: application/json' \
  -d '{"url":"https://www.bbc.com/news"}' | python -m json.tool | head -40
kill %1
```
Expected: a JSON `StoryReport` with a numeric `overall_score`, a `surfaces` map containing `discover`/`google_search`, and a `cwv` object. (A real article URL scores more meaningfully than a homepage.)

- [ ] **Step 4: Record the verified run command in `README.md`** (replace the Run section with the exact commands used in Step 3).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: verified run + smoke instructions"
```

---

## What this slice deliberately omits (later plans)

- Connectors (RSS/sitemap/GSC/**Wikidata**/trends) → Plan 2.
- Schema.org **suggestion** (corrected JSON-LD) → Plan 3.
- Next.js web UI + the OnlineJourno design system → Plan 4.
- AI tier (8 user needs, agentic GEO/SEO; decoupled `agents-py`) → Plan 5.
- SQLite/Postgres store, Docker compose, onboarding wizard, MCP server → folded into Plans 2/4.

Done means: `POST /audit {url}` returns real surface scores + audit + CWV from the reused `onlinejourno-scoring` core, with a green test suite — the spec's keyless Tier-0 audit, proven end to end.
