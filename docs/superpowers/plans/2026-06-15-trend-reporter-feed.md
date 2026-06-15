# Trend → Reporter Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface and rank `trend_score`/`trend_reason` in the reporter's pull feed, with a trajectory-derived act-now cue, so the feed leads with trending-on-beat signals and explains the urgency.

**Architecture:** A new pure `feed_view.py` (`urgency_cue` + `format_feed_signal`) renders each feed line; `db.signals_for_journalist` is extended to carry the trend columns and rank by them; `cmd_feed` renders via `format_feed_signal`. Reuses existing trend data (`cmd_trends`); backend-only.

**Tech Stack:** Python 3.11, `psycopg`, `pytest`.

**Spec:** `docs/superpowers/specs/2026-06-15-trend-reporter-feed-design.md`

---

## File Structure

- **Create** `packages/agents-py/src/onlinejourno_agents/feed_view.py` — `urgency_cue`, `format_feed_signal` (pure).
- **Create** `packages/agents-py/tests/test_feed_view.py` — pure unit tests.
- **Modify** `packages/agents-py/src/onlinejourno_agents/db.py` — `signals_for_journalist` SELECT + ORDER BY.
- **Modify** `packages/agents-py/src/onlinejourno_agents/cli.py` — `cmd_feed` render via `format_feed_signal`.

Test commands run from `packages/agents-py`.

---

## Task 1: Pure `feed_view` — `urgency_cue` + `format_feed_signal`

**Files:**
- Create: `packages/agents-py/src/onlinejourno_agents/feed_view.py`
- Test: `packages/agents-py/tests/test_feed_view.py`

- [ ] **Step 1: Write the failing tests**

Create `packages/agents-py/tests/test_feed_view.py`:

```python
"""feed_view tests — pure rendering, no I/O."""

from __future__ import annotations

from onlinejourno_agents.feed_view import format_feed_signal, urgency_cue


def test_urgency_cue_maps_each_trajectory():
    assert urgency_cue("still building — peak not yet reached · SEBI") == "act now — still rising"
    assert urgency_cue("near peak — may plateau · RBI") == "move fast — near peak"
    assert urgency_cue("at peak — watch for plateau · NSE") == "now or never — at peak"
    assert urgency_cue("cooling — interest declining · X") == "likely late — cooling"
    assert urgency_cue("fading fast — post-peak · Y") == "likely late — cooling"
    assert urgency_cue("momentum holding steady · Z") == ""
    assert urgency_cue("no signal yet · Q") == ""
    assert urgency_cue(None) == ""


def test_format_trending_signal_shows_score_cue_why():
    sig = {
        "beat": "Markets", "region": "Mumbai",
        "headline": "SEBI tightens IPO disclosure norms",
        "trend_score": 82.0,
        "trend_reason": "still building — peak not yet reached · SEBI",
    }
    line = format_feed_signal(sig)
    assert "[Markets/Mumbai]" in line
    assert "🔥82" in line
    assert "act now — still rising" in line
    assert "why: still building — peak not yet reached · SEBI" in line


def test_format_non_trending_signal_is_plain():
    sig = {
        "beat": "Markets", "region": "Mumbai",
        "headline": "Some routed headline",
        "entities": ["Alpha", "Beta", "Gamma", "Delta"],
    }
    line = format_feed_signal(sig)
    assert "🔥" not in line
    assert "why:" not in line
    assert "Alpha, Beta, Gamma" in line  # first 3 entities only
    assert "Delta" not in line
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/agents-py && uv run pytest tests/test_feed_view.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'onlinejourno_agents.feed_view'`.

- [ ] **Step 3: Write the module**

Create `packages/agents-py/src/onlinejourno_agents/feed_view.py`:

```python
"""Render a reporter-feed line that surfaces trend momentum + the why/urgency.

`cmd_trends` writes trend_score (0-100) and trend_reason (e.g.
"still building — peak not yet reached · SEBI") onto signals. This layer turns
that into an act-now prompt so the feed *educates* the reporter (shows why this
is worth chasing now), rather than only routing an item.
"""

from __future__ import annotations

from typing import Any


def urgency_cue(trend_reason: str | None) -> str:
    """Map the trajectory vocabulary in trend_reason to an act-now label.

    Keys off the fixed phrases from trend_score.predict_trajectory. Unknown /
    steady / absent reasons yield no cue.
    """
    if not trend_reason:
        return ""
    r = trend_reason.lower()
    if "building" in r:
        return "act now — still rising"
    if "near peak" in r:
        return "move fast — near peak"
    if "at peak" in r:
        return "now or never — at peak"
    if "cooling" in r or "fading" in r:
        return "likely late — cooling"
    return ""


def format_feed_signal(signal: dict[str, Any]) -> str:
    """One reporter-feed line. Trending signals lead with score + cue + why;
    non-trending signals keep the plain routed format."""
    beat = signal.get("beat") or "-"
    region = signal.get("region") or "-"
    headline = (signal.get("headline") or signal.get("url") or "")[:54]

    score = signal.get("trend_score")
    if score is not None:
        cue = urgency_cue(signal.get("trend_reason"))
        cue_part = f" {cue}" if cue else ""
        reason = signal.get("trend_reason") or ""
        why = f" · why: {reason}" if reason else ""
        return f"  [{beat}/{region}] 🔥{score:.0f}{cue_part} · {headline}{why}"

    ents = ", ".join((signal.get("entities") or [])[:3])
    return f"  [{beat}/{region}] {headline}  · {ents}"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/agents-py && uv run pytest tests/test_feed_view.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add packages/agents-py/src/onlinejourno_agents/feed_view.py \
        packages/agents-py/tests/test_feed_view.py
git commit -m "feat(agents): feed_view — trend act-now cue + reporter line renderer"
```

---

## Task 2: Rank + carry trend in `signals_for_journalist`

**Files:**
- Modify: `packages/agents-py/src/onlinejourno_agents/db.py` (the `signals_for_journalist` query, ~lines 384-401)

> No unit test: a SQL query over Postgres; this package has no DB test harness
> (agents are tested with fakes/pure helpers). Exercised by Task 4 live verify.

- [ ] **Step 1: Add the trend columns to the SELECT**

In `packages/agents-py/src/onlinejourno_agents/db.py`, in `signals_for_journalist`, change the SELECT list from:

```python
            select s.id, s.headline, s.url, s.beat, s.region, s.district,
                   s.enrichment->'analyse'->'entities' as entities,
                   coalesce(s.published_at, s.fetched_at) as at
```

to:

```python
            select s.id, s.headline, s.url, s.beat, s.region, s.district,
                   s.trend_score, s.trend_reason,
                   s.enrichment->'analyse'->'entities' as entities,
                   coalesce(s.published_at, s.fetched_at) as at
```

- [ ] **Step 2: Rank by trend, then recency**

In the same query, change:

```python
             order by coalesce(s.published_at, s.fetched_at) desc
```

to:

```python
             order by s.trend_score desc nulls last,
                      coalesce(s.published_at, s.fetched_at) desc
```

- [ ] **Step 3: Verify the module imports + the agents suite is unaffected**

Run: `cd packages/agents-py && uv run python -c "from onlinejourno_agents import db; print('ok')" && uv run pytest -q`
Expected: prints `ok`; existing tests still pass (no behavior depends on the old feed ordering in unit tests).

- [ ] **Step 4: Commit**

```bash
git add packages/agents-py/src/onlinejourno_agents/db.py
git commit -m "feat(agents): rank reporter feed by trend_score, carry trend_reason"
```

---

## Task 3: Render the act-now feed in `cmd_feed`

**Files:**
- Modify: `packages/agents-py/src/onlinejourno_agents/cli.py` (`cmd_feed`, ~lines 349-354)

> No unit test: CLI print orchestration over the tested `format_feed_signal`.
> Exercised by Task 4.

- [ ] **Step 1: Replace the render loop**

In `packages/agents-py/src/onlinejourno_agents/cli.py`, in `cmd_feed`, replace:

```python
    print(f"{len(rows)} signals routed to {args.journalist}:")
    for r in rows:
        ents = ", ".join((r.get("entities") or [])[:3])
        head = (r.get("headline") or r.get("url") or "")[:54]
        print(f"  [{r.get('beat')}/{r.get('region') or '-'}] {head}  · {ents}")
    return 0
```

with:

```python
    from onlinejourno_agents.feed_view import format_feed_signal

    print(f"{len(rows)} signals routed to {args.journalist}:")
    for r in rows:
        print(format_feed_signal(r))
    return 0
```

(Local import mirrors the other `cmd_*` handlers and avoids touching the shared
top-of-file import block.)

- [ ] **Step 2: Verify the CLI runs + suite passes**

Run: `cd packages/agents-py && uv run onlinejourno-agents feed --help && uv run pytest -q`
Expected: `feed --help` prints usage; suite green (incl. the 3 new `feed_view` tests).

- [ ] **Step 3: Commit**

```bash
git add packages/agents-py/src/onlinejourno_agents/cli.py
git commit -m "feat(agents): cmd_feed renders trend-ranked act-now lines"
```

---

## Task 4: Live verification (manual — DB)

**Files:** none (verification only)

- [ ] **Step 1: Pick a journalist with routed signals**

Run: `psql "$DATABASE_URL" -c "select slug from journalist_profiles where slug like 'td-%' limit 5;"`
Expected: a few `td-*` slugs (e.g. `td-mariana-silva`). Pick one on a markets/business beat.

- [ ] **Step 2: Compute trends, then view the feed**

Run:
```bash
cd packages/agents-py
uv run onlinejourno-agents trends --tenant self
uv run onlinejourno-agents feed --tenant self --journalist td-mariana-silva
```
Expected: the feed prints highest-`trend_score` on-beat signals first; trending lines show `🔥<score>`, an act-now cue when the trajectory matches (e.g. `act now — still rising`), and `· why: <trend_reason>`. Unscored items (if any) appear last in the plain format. Records spec success criteria 1–3.

---

## Self-Review

- **Spec coverage:** `urgency_cue` + `format_feed_signal` (Task 1); SELECT carries `trend_score`/`trend_reason` and ORDER BY ranks trend-first nulls-last (Task 2); `cmd_feed` renders via `format_feed_signal` (Task 3); live ranked/act-now check (Task 4). All spec sections covered.
- **Placeholder scan:** none — complete code in every code step; `$DATABASE_URL` / journalist slug in Task 4 are runtime values.
- **Type consistency:** `urgency_cue(trend_reason: str | None) -> str` and `format_feed_signal(signal: dict) -> str` defined in Task 1 and called in Task 3; the dict keys read by `format_feed_signal` (`beat`, `region`, `headline`, `url`, `trend_score`, `trend_reason`, `entities`) are exactly the columns Task 2's SELECT returns (`entities` aliased; `at` unused by the renderer). Trajectory phrases in the `urgency_cue` tests match `trend_score.predict_trajectory`'s output strings.
