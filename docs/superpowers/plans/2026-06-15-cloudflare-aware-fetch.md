# Cloudflare-aware Fetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `RSSCollector` a two-tier (realistic-headers → Playwright) Cloudflare-aware fetch path so The Hindu / Moneycontrol / Business Standard feeds ingest with article-level URLs.

**Architecture:** A new `fetch/cloudflare.py` module exposes a `Fetcher` protocol and a `CloudflareFetcher` adapter (ADR 0007). Tier 1 sends browser-realistic headers via the existing `requests.Session`; on a 403/503 or a detected JS-challenge body it escalates to Tier 2, which clears the challenge in headless Chromium and pulls the raw feed bytes through the cleared browser context. `RSSCollector` depends only on the `Fetcher` interface (injected), so unit tests use a fake and never touch Playwright.

**Tech Stack:** Python 3.11, `requests`, `feedparser`, `beautifulsoup4`, `playwright` (new, hard dep), `pytest`.

**Spec:** `docs/superpowers/specs/2026-06-15-cloudflare-aware-fetch-design.md`

---

## File Structure

- **Create** `packages/ingest-py/src/onlinejourno_ingest/fetch/__init__.py` — package marker.
- **Create** `packages/ingest-py/src/onlinejourno_ingest/fetch/cloudflare.py` — `REALISTIC_HEADERS`, `is_cloudflare_challenge`, `CloudflareBlocked`, `Fetcher` protocol, `_site_root`, `CloudflareFetcher`.
- **Modify** `packages/ingest-py/src/onlinejourno_ingest/collectors/rss.py` — inject `Fetcher`; route the feed GET and `_discover_feed` homepage GET through it; map `CloudflareBlocked` → `FetchError`.
- **Modify** `packages/ingest-py/pyproject.toml` — add `playwright` dependency + register the `browser` pytest marker.
- **Modify** `infra/seeds/dev.sql` — enable The Hindu / Moneycontrol / Business Standard RSS sources.
- **Create** `packages/ingest-py/tests/test_cloudflare_fetch.py` — challenge detection + tier-1 + fallback-wiring tests (no network/browser).
- **Create** `packages/ingest-py/tests/test_rss.py` — `RSSCollector` with a fake `Fetcher`.
- **Create** `packages/ingest-py/tests/test_cloudflare_browser.py` — opt-in real-browser smoke test.

All `uv run pytest` commands assume the working directory `packages/ingest-py`.

---

## Task 1: Challenge detection, error type, headers, protocol

**Files:**
- Create: `packages/ingest-py/src/onlinejourno_ingest/fetch/__init__.py`
- Create: `packages/ingest-py/src/onlinejourno_ingest/fetch/cloudflare.py`
- Test: `packages/ingest-py/tests/test_cloudflare_fetch.py`

- [ ] **Step 1: Create the package marker**

Create `packages/ingest-py/src/onlinejourno_ingest/fetch/__init__.py` with a single line:

```python
"""Cloudflare-aware HTTP fetch seam for collectors."""
```

- [ ] **Step 2: Write the failing test**

Create `packages/ingest-py/tests/test_cloudflare_fetch.py`:

```python
"""Cloudflare fetch unit tests. Pure — no network, no browser."""

from __future__ import annotations

from onlinejourno_ingest.fetch.cloudflare import (
    CloudflareBlocked,
    is_cloudflare_challenge,
)


def test_challenge_detection():
    assert is_cloudflare_challenge("<html>Just a moment...</html>") is True
    assert is_cloudflare_challenge(b"<html>cf_chl_opt</html>") is True
    assert is_cloudflare_challenge("") is True
    # Short body that mentions cloudflare = challenge interstitial.
    assert is_cloudflare_challenge("blocked by cloudflare") is True
    # A real feed is long and has no challenge markers.
    assert is_cloudflare_challenge("<?xml version='1.0'?><rss>" + "x" * 9000 + "</rss>") is False


def test_cloudflare_blocked_carries_stage():
    err = CloudflareBlocked("https://x.test/feed", "headers")
    assert err.stage == "headers"
    assert "headers" in str(err)
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd packages/ingest-py && uv run pytest tests/test_cloudflare_fetch.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'onlinejourno_ingest.fetch.cloudflare'`.

- [ ] **Step 4: Write minimal implementation**

Create `packages/ingest-py/src/onlinejourno_ingest/fetch/cloudflare.py`:

```python
"""Cloudflare-aware fetch: realistic headers (Tier 1) + Playwright (Tier 2).

Ported from eip-handover/.../lib/cloudflare-fetch.ts. The Hindu, Moneycontrol,
and Business Standard sit behind Cloudflare's "Just a moment..." JS challenge:
a plain requests.get returns the challenge HTML or a 403/503, not the feed.
Tier 1 sends realistic browser headers; Tier 2 launches headless Chromium,
clears the challenge on the site root, then pulls the raw feed bytes through
the cleared browser context (page.content() would wrap the XML in HTML).
"""

from __future__ import annotations

import os
from typing import Protocol
from urllib.parse import urlsplit, urlunsplit

import requests

REALISTIC_HEADERS: dict[str, str] = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,image/apng,*/*;q=0.8"
    ),
    "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

_CHALLENGE_MARKERS = (
    "Just a moment...",
    "cf-mitigated",
    "cf_chl_",
    "Enable JavaScript and cookies to continue",
)


class CloudflareBlocked(Exception):
    """Raised when neither fetch tier can get past Cloudflare for a URL."""

    def __init__(self, url: str, stage: str) -> None:
        super().__init__(f"Cloudflare-blocked at {stage}: {url}")
        self.url = url
        self.stage = stage


def is_cloudflare_challenge(body: bytes | str) -> bool:
    """True if the body looks like a Cloudflare interstitial, not real content."""
    if not body:
        return True
    text = body.decode("utf-8", "ignore") if isinstance(body, bytes) else body
    peek = text[:5000]
    if any(marker in peek for marker in _CHALLENGE_MARKERS):
        return True
    return "cloudflare" in peek.lower() and len(text) < 8000


class Fetcher(Protocol):
    """Adapter contract (ADR 0007): fetch raw bytes for a URL."""

    def get_bytes(self, url: str, *, headers: dict[str, str] | None = None) -> bytes: ...


def _site_root(url: str) -> str:
    """scheme://netloc/ — the page Tier 2 loads to clear the challenge."""
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, "/", "", ""))
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/ingest-py && uv run pytest tests/test_cloudflare_fetch.py -v`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
git add packages/ingest-py/src/onlinejourno_ingest/fetch/__init__.py \
        packages/ingest-py/src/onlinejourno_ingest/fetch/cloudflare.py \
        packages/ingest-py/tests/test_cloudflare_fetch.py
git commit -m "feat(ingest): cloudflare challenge detection + fetch contract"
```

---

## Task 2: `CloudflareFetcher` — Tier 1 + escalation wiring

**Files:**
- Modify: `packages/ingest-py/src/onlinejourno_ingest/fetch/cloudflare.py` (append `CloudflareFetcher`)
- Test: `packages/ingest-py/tests/test_cloudflare_fetch.py` (add cases)

- [ ] **Step 1: Write the failing tests**

Append to `packages/ingest-py/tests/test_cloudflare_fetch.py`:

```python
import pytest

from onlinejourno_ingest.fetch.cloudflare import CloudflareFetcher


class _FakeResponse:
    def __init__(self, status_code: int, content: bytes):
        self.status_code = status_code
        self.content = content

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")


class _FakeSession:
    def __init__(self, response: _FakeResponse):
        self._response = response
        self.calls: list[tuple[str, dict]] = []

    def get(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return self._response


import requests  # noqa: E402  (after _FakeResponse for raise_for_status)


def test_tier1_returns_content_on_clean_200():
    body = b"<?xml version='1.0'?><rss>" + b"x" * 9000 + b"</rss>"
    fetcher = CloudflareFetcher(_FakeSession(_FakeResponse(200, body)))
    assert fetcher.get_bytes("https://x.test/feed") == body


def test_tier1_403_escalates_to_tier2(monkeypatch):
    fetcher = CloudflareFetcher(_FakeSession(_FakeResponse(403, b"")))
    monkeypatch.setattr(fetcher, "_tier_playwright", lambda url: b"<rss>browser</rss>")
    assert fetcher.get_bytes("https://x.test/feed") == b"<rss>browser</rss>"


def test_tier1_challenge_body_escalates_to_tier2(monkeypatch):
    challenge = b"<html>Just a moment...</html>"
    fetcher = CloudflareFetcher(_FakeSession(_FakeResponse(200, challenge)))
    monkeypatch.setattr(fetcher, "_tier_playwright", lambda url: b"<rss>browser</rss>")
    assert fetcher.get_bytes("https://x.test/feed") == b"<rss>browser</rss>"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/ingest-py && uv run pytest tests/test_cloudflare_fetch.py -v`
Expected: FAIL — `ImportError: cannot import name 'CloudflareFetcher'`.

- [ ] **Step 3: Write minimal implementation**

Append to `packages/ingest-py/src/onlinejourno_ingest/fetch/cloudflare.py`:

```python
class CloudflareFetcher:
    """Two-tier Fetcher. Tier 1 = realistic headers via requests; Tier 2 =
    headless Chromium that clears the JS challenge then pulls raw bytes."""

    def __init__(self, session: requests.Session, *, timeout_seconds: int = 20) -> None:
        self.session = session
        self.timeout = timeout_seconds

    def get_bytes(self, url: str, *, headers: dict[str, str] | None = None) -> bytes:
        try:
            return self._tier_headers(url, headers)
        except CloudflareBlocked:
            return self._tier_playwright(url)

    def _tier_headers(self, url: str, extra: dict[str, str] | None) -> bytes:
        merged = {**REALISTIC_HEADERS, **(extra or {})}
        if os.environ.get("CF_COOKIES"):
            merged["Cookie"] = os.environ["CF_COOKIES"]
        resp = self.session.get(url, headers=merged, timeout=self.timeout)
        if resp.status_code in (403, 503):
            raise CloudflareBlocked(url, "headers")
        resp.raise_for_status()
        if is_cloudflare_challenge(resp.content):
            raise CloudflareBlocked(url, "headers")
        return resp.content

    def _tier_playwright(self, url: str) -> bytes:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:  # pragma: no cover - install-time guard
            raise RuntimeError(
                "Playwright not installed. Run `uv add playwright` and "
                "`uv run playwright install chromium`."
            ) from exc

        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            )
            try:
                context = browser.new_context(
                    user_agent=REALISTIC_HEADERS["User-Agent"],
                    viewport={"width": 1440, "height": 900},
                    locale="en-IN",
                    timezone_id="Asia/Kolkata",
                    extra_http_headers={
                        "Accept-Language": REALISTIC_HEADERS["Accept-Language"],
                        "Sec-Ch-Ua": REALISTIC_HEADERS["Sec-Ch-Ua"],
                        "Sec-Ch-Ua-Mobile": "?0",
                        "Sec-Ch-Ua-Platform": '"macOS"',
                    },
                )
                context.add_init_script(
                    "Object.defineProperty(Navigator.prototype,'webdriver',{get:()=>undefined});"
                    "window.chrome={runtime:{},app:{}};"
                    "Object.defineProperty(navigator,'plugins',{get:()=>[1,2,3,4,5]});"
                    "Object.defineProperty(navigator,'languages',{get:()=>['en-IN','en-US','en']});"
                )
                page = context.new_page()
                page.goto(_site_root(url), wait_until="domcontentloaded", timeout=30_000)
                try:
                    page.wait_for_load_state("networkidle", timeout=20_000)
                except Exception:  # noqa: BLE001 - idle wait is best-effort
                    pass
                resp = context.request.get(url)
                body = resp.body()
                if is_cloudflare_challenge(body):
                    raise CloudflareBlocked(url, "playwright")
                return body
            finally:
                browser.close()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/ingest-py && uv run pytest tests/test_cloudflare_fetch.py -v`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add packages/ingest-py/src/onlinejourno_ingest/fetch/cloudflare.py \
        packages/ingest-py/tests/test_cloudflare_fetch.py
git commit -m "feat(ingest): two-tier CloudflareFetcher (headers + playwright)"
```

---

## Task 3: Wire `CloudflareFetcher` into `RSSCollector`

**Files:**
- Modify: `packages/ingest-py/src/onlinejourno_ingest/collectors/rss.py`
- Test: `packages/ingest-py/tests/test_rss.py`

- [ ] **Step 1: Write the failing test**

Create `packages/ingest-py/tests/test_rss.py`:

```python
"""RSSCollector tests via an injected fake Fetcher — no network."""

from __future__ import annotations

from uuid import uuid4

import pytest

from onlinejourno_ingest.collectors.rss import RSSCollector
from onlinejourno_ingest.fetch.cloudflare import CloudflareBlocked
from onlinejourno_ingest.protocols import FetchError

_FEED = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>T</title>
  <item>
    <title>SEBI tightens IPO disclosure norms</title>
    <link>https://www.thehindu.com/business/sebi-ipo/article99.ece</link>
    <description>Markets regulator update.</description>
    <pubDate>Mon, 15 Jun 2026 09:00:00 +0530</pubDate>
  </item>
</channel></rss>"""


class _FakeFetcher:
    def __init__(self, payload=None, exc=None):
        self._payload = payload
        self._exc = exc

    def get_bytes(self, url, *, headers=None):
        if self._exc is not None:
            raise self._exc
        return self._payload


def _source():
    return {
        "id": uuid4(),
        "tenant_id": uuid4(),
        "kind": "rss",
        "name": "The Hindu — Business",
        "url": "https://www.thehindu.com/business/",
        "rss_url": "https://www.thehindu.com/business/feeder/default.rss",
        "expected_languages": ["en"],
    }


def test_fetch_parses_article_url_from_fetcher():
    collector = RSSCollector(fetcher=_FakeFetcher(payload=_FEED))
    signals = collector.fetch(_source())
    assert len(signals) == 1
    assert signals[0].url == "https://www.thehindu.com/business/sebi-ipo/article99.ece"
    assert signals[0].headline == "SEBI tightens IPO disclosure norms"


def test_cloudflare_block_becomes_fetch_error():
    blocked = _FakeFetcher(exc=CloudflareBlocked("https://x.test/feed", "playwright"))
    collector = RSSCollector(fetcher=blocked)
    with pytest.raises(FetchError):
        collector.fetch(_source())
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/ingest-py && uv run pytest tests/test_rss.py -v`
Expected: FAIL — `TypeError: __init__() got an unexpected keyword argument 'fetcher'`.

- [ ] **Step 3: Edit `RSSCollector` imports and `__init__`**

In `packages/ingest-py/src/onlinejourno_ingest/collectors/rss.py`, add to the imports block:

```python
from onlinejourno_ingest.fetch.cloudflare import (
    CloudflareBlocked,
    CloudflareFetcher,
    Fetcher,
)
```

Replace the `__init__` body:

```python
    def __init__(
        self,
        *,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        max_items_per_source: int = 200,
        session: requests.Session | None = None,
        fetcher: Fetcher | None = None,
    ) -> None:
        self.timeout = timeout_seconds
        self.max_items = max_items_per_source
        self.session = session or http_session()
        self.fetcher = fetcher or CloudflareFetcher(self.session, timeout_seconds=timeout_seconds)
```

- [ ] **Step 4: Route the feed fetch through the fetcher**

In `fetch()`, replace this block:

```python
        try:
            response = self.session.get(
                feed_url, timeout=self.timeout, headers=headers or None
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise FetchError(f"fetch failed: {exc}") from exc

        parsed = feedparser.parse(response.content)
```

with:

```python
        try:
            raw = self.fetcher.get_bytes(feed_url, headers=headers or None)
        except CloudflareBlocked as exc:
            raise FetchError(f"cloudflare blocked at {exc.stage}: {feed_url}") from exc
        except requests.RequestException as exc:
            raise FetchError(f"fetch failed: {exc}") from exc

        parsed = feedparser.parse(raw)
```

- [ ] **Step 5: Route `_discover_feed`'s homepage GET through the fetcher**

In `_discover_feed()`, replace this block:

```python
        try:
            response = self.session.get(homepage, timeout=self.timeout)
            response.raise_for_status()
        except requests.RequestException:
            return None

        soup = BeautifulSoup(response.text, "lxml")
```

with:

```python
        try:
            raw = self.fetcher.get_bytes(homepage)
        except (CloudflareBlocked, requests.RequestException):
            return None

        soup = BeautifulSoup(raw, "lxml")
```

(The `COMMON_FEED_PATHS` `HEAD`-probe loop below stays unchanged — it is a best-effort fallback for open sites and `_discover_feed` only runs when a source has no `rss_url`.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/ingest-py && uv run pytest tests/test_rss.py tests/test_cloudflare_fetch.py -v`
Expected: PASS (7 passed).

- [ ] **Step 7: Commit**

```bash
git add packages/ingest-py/src/onlinejourno_ingest/collectors/rss.py \
        packages/ingest-py/tests/test_rss.py
git commit -m "feat(ingest): route RSSCollector through Cloudflare-aware fetcher"
```

---

## Task 4: Add Playwright dependency + register pytest marker

**Files:**
- Modify: `packages/ingest-py/pyproject.toml`

- [ ] **Step 1: Add the dependency**

In `packages/ingest-py/pyproject.toml`, add `"playwright>=1.44"` to the `dependencies` array:

```toml
dependencies = [
  "psycopg[binary]>=3.2",
  "feedparser>=6.0.11",
  "requests>=2.31",
  "beautifulsoup4>=4.12",
  "lxml>=5.0",
  "python-dotenv>=1.0",
  "pyyaml>=6.0",
  "playwright>=1.44",
]
```

- [ ] **Step 2: Register the `browser` marker**

Append to `packages/ingest-py/pyproject.toml`:

```toml
[tool.pytest.ini_options]
markers = [
  "browser: real headless-browser test, opt-in via PLAYWRIGHT_E2E=1",
]
```

- [ ] **Step 3: Sync the environment and install Chromium**

Run: `cd packages/ingest-py && uv sync && uv run playwright install chromium`
Expected: resolves with `playwright` added; Chromium downloads (~150–250 MB).

- [ ] **Step 4: Verify the existing suite still passes**

Run: `cd packages/ingest-py && uv run pytest -q`
Expected: PASS — existing tests plus the new `test_cloudflare_fetch.py` / `test_rss.py` (the opt-in browser test, added next, will report as skipped).

- [ ] **Step 5: Commit**

```bash
git add packages/ingest-py/pyproject.toml ../../uv.lock
git commit -m "build(ingest): add playwright dep + browser pytest marker"
```

(If `uv.lock` lives at the repo root and is shared, stage only it; if `uv sync` did not change it, drop it from the `git add`.)

---

## Task 5: Opt-in real-browser smoke test

**Files:**
- Create: `packages/ingest-py/tests/test_cloudflare_browser.py`

- [ ] **Step 1: Write the opt-in test**

Create `packages/ingest-py/tests/test_cloudflare_browser.py`:

```python
"""Opt-in: real headless-browser fetch of a live Cloudflare feed.

Skipped by default. Enable with:
    PLAYWRIGHT_E2E=1 uv run pytest tests/test_cloudflare_browser.py -v
Requires `uv run playwright install chromium`.
"""

from __future__ import annotations

import os
from uuid import uuid4

import pytest

from onlinejourno_ingest.collectors.rss import RSSCollector

pytestmark = [
    pytest.mark.browser,
    pytest.mark.skipif(
        os.environ.get("PLAYWRIGHT_E2E") != "1",
        reason="set PLAYWRIGHT_E2E=1 to run the real-browser smoke test",
    ),
]


def test_the_hindu_business_feed_yields_article_urls():
    source = {
        "id": uuid4(),
        "tenant_id": uuid4(),
        "kind": "rss",
        "name": "The Hindu — Business",
        "url": "https://www.thehindu.com/business/",
        "rss_url": "https://www.thehindu.com/business/feeder/default.rss",
        "expected_languages": ["en"],
    }
    signals = RSSCollector().fetch(source)
    assert signals, "expected at least one signal from The Hindu feed"
    assert any(".ece" in (s.url or "") for s in signals), "expected article-level .ece URLs"
```

- [ ] **Step 2: Verify it is skipped by default**

Run: `cd packages/ingest-py && uv run pytest tests/test_cloudflare_browser.py -v`
Expected: 1 skipped (reason mentions `PLAYWRIGHT_E2E=1`).

- [ ] **Step 3: Run it for real (manual, requires network + Chromium)**

Run: `cd packages/ingest-py && PLAYWRIGHT_E2E=1 uv run pytest tests/test_cloudflare_browser.py -v`
Expected: PASS — The Hindu feed returns signals with `.ece` URLs. (If Cloudflare's challenge has changed and it fails, that is real signal: capture the body and revisit the stealth/init-script.)

- [ ] **Step 4: Commit**

```bash
git add packages/ingest-py/tests/test_cloudflare_browser.py
git commit -m "test(ingest): opt-in browser smoke test for The Hindu feed"
```

---

## Task 6: Enable the Cloudflare-guarded sources

**Files:**
- Modify: `infra/seeds/dev.sql`

- [ ] **Step 1: Flip `enabled` to `true` for the three sources**

In `infra/seeds/dev.sql`, the three Class-B inserts currently end their `select` with `'mainstream', '{markets-regulatory}', '{en}', false`. Change `false` → `true` for each of these by name:

- The `select` for **'The Hindu — Business'** (`rss_url … /business/feeder/default.rss`).
- The `select` for **'Moneycontrol — Business'** (`rss_url … /rss/business.xml`).
- The `select` for **'Business Standard — Markets'** (`rss_url … /rss/markets-106.rss`).

Leave **'PIB — Finance Ministry'** (and all Class-C rows) at `false` — PIB RSS 404s; it is Phase 3.

After editing, the three lines read:

```sql
       'mainstream', '{markets-regulatory}', '{en}', true
```

- [ ] **Step 2: Confirm exactly three flips and PIB untouched**

Run: `git -C . diff infra/seeds/dev.sql`
Expected: exactly three `-… false` / `+… true` hunks, all under the Hindu / Moneycontrol / Business Standard inserts; the PIB insert unchanged.

- [ ] **Step 3: Commit**

```bash
git add infra/seeds/dev.sql
git commit -m "feat(ingest): enable Cloudflare-guarded RSS sources (Hindu, Moneycontrol, Business Standard)"
```

---

## Task 7: Live verification (manual — DB + network + Chromium)

**Files:** none (verification only)

- [ ] **Step 1: Re-seed sources and run a collect against The Hindu**

Run:
```bash
psql "$DATABASE_URL" -v tenant="'<self-tenant-uuid>'" -f infra/seeds/dev.sql
cd packages/ingest-py && uv run onlinejourno-ingest collect --tenant self --source-name "The Hindu — Business"
```
Expected: `The Hindu — Business   +N (M parsed)` with N ≥ 1 — not `FAILED: cloudflare blocked`.

- [ ] **Step 2: Confirm stored URLs are article-level, zero homepages**

Run:
```bash
psql "$DATABASE_URL" -c "select count(*) filter (where url ~ '/article[0-9]+\.ece') as articles, count(*) filter (where url ~ '^https?://[^/]+/?\$') as homepages from signals sig join sources s on s.id=sig.source_id where s.name='The Hindu — Business';"
```
Expected: `articles` > 0, `homepages` = 0.

- [ ] **Step 2 done = spec success criteria 1–3 met.** Record the counts in the PR description.

---

## Self-Review

- **Spec coverage:** module + headers/detection/error (Task 1), two-tier fetcher incl. solve-then-request-raw (Task 2), RSSCollector injection + `CloudflareBlocked`→`FetchError` (Task 3), Playwright hard dep + marker (Task 4), opt-in browser test (Task 5), source enablement minus PIB (Task 6), live success-criteria check (Task 7). All spec sections covered.
- **Placeholder scan:** none — every code/edit step shows complete content; `<self-tenant-uuid>` in Task 7 is a runtime value the operator supplies, not a code placeholder.
- **Type consistency:** `Fetcher.get_bytes(url, *, headers=None) -> bytes` is defined in Task 1 and used identically by `CloudflareFetcher` (Task 2), the `_FakeFetcher` and `RSSCollector` (Task 3), and the browser test (Task 5). `CloudflareBlocked(url, stage)` with `.stage` is consistent across Tasks 1–3.
