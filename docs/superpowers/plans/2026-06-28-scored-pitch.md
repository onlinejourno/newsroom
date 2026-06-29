
> **STATUS: ✅ SHIPPED 2026-06-29 — merged + pushed to origin/main (98befff); prod cron-fill added. Unchecked boxes below are historical.**
# Scored Pitch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let reporters pitch stories that are scored at compose time by the existing engine, ranked by a merit-driven `pitch_weight`, and surfaced (with the *why*) on the newslist, calendar, and the entity they touch.

**Architecture:** Reuse `story_leads` (additive columns, no new lead table). A new name-grained `entity_coverage` index (derived from `signals.enrichment`) powers an `authority×staleness` archival signal. A pure `pitch_weight.decide()` blends engine merit/reach with archival + a bounded conviction modifier. A `pitch-scan` CLI extracts entities + scores synchronously; the web calls it via the existing `execFile("uv", …)` bridge so the reporter sees entities and weight before submitting.

**Tech Stack:** Python 3.11 + psycopg + pytest (`packages/agents-py`, `packages/scoring-py`); Next.js 15 App Router + pg (`apps/web`). No TS test runner — TS verified by `pnpm --filter @onlinejourno/web type-check` + running the CLI and loading pages.

**Spec:** `docs/superpowers/specs/2026-06-28-scored-pitch-design.md`.

**Conventions (verified in-repo):**
- Pure decisions use `@dataclass(slots=True)` + a `decide(...)` fn, mirroring `agents-py/.../calendar_fuse.py`.
- Engine weights live in `scoring-py/.../potential.py`: `potential_score(*, trend_momentum, content_alignment, domain_authority, freshness, merit=None)`, `reach_score(*, …)`, `_W_MERIT = 0.35`.
- CLI commands: `def cmd_x(args) -> int`, registered via `sub.add_parser("name", …)` + `p.set_defaults(func=cmd_x)` in `agents-py/.../cli.py`; command body imports its module locally (see `cmd_calendar_fuse`).
- Web→Python: `execFileP("uv", ["run","--package","onlinejourno-agents","onlinejourno-agents","<cmd>", …,"--json"], {cwd: REPO_ROOT, timeout, maxBuffer})`, parse the **last** stdout line as JSON (see `apps/web/lib/analyze.ts`).

---

## File Structure

**Slice 1 — entity coverage index:**
- Create: `infra/migrations/0027_scored_pitch.sql` — `entity_coverage` + additive `story_leads` columns (one migration for the whole feature).
- Create: `packages/agents-py/src/onlinejourno_agents/entity_coverage.py` — pure aggregation + `coverage_for()` reader + `refresh_entity_coverage()`.
- Create: `packages/agents-py/tests/test_entity_coverage.py`.
- Modify: `packages/agents-py/src/onlinejourno_agents/cli.py` — `entity-coverage` refresh command.

**Slice 2 — weight engine:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/pitch_weight.py` — pure `archival_weight()` + `decide()`.
- Create: `packages/scoring-py/tests/test_pitch_weight.py`.

**Slice 3 — pitch scan:**
- Create: `packages/agents-py/src/onlinejourno_agents/pitch_scan.py` — Gate + `coerce_entities()` + `scan_pitch()`.
- Create: `packages/agents-py/tests/test_pitch_scan.py`.
- Modify: `packages/agents-py/src/onlinejourno_agents/cli.py` — `pitch-scan` command.
- Create: `apps/web/lib/pitchScan.ts` — `execFile` bridge.

**Slice 4 — compose + ranked column:**
- Modify: `apps/web/app/[locale]/newslist/page.tsx` — Scan/confirm composer, persist scores, sort + badge + why-chip.
- Modify: `apps/web/lib/db.ts` — read new lead columns; persist entities/scores/conviction.

**Slice 5 — calendar badge:**
- Modify: `apps/web/components/calendar/CalendarApp.tsx` — weight badge on pitched events.

**Slice 6 — entity + signal surfaces:**
- Create: `apps/web/app/[locale]/entity/[type]/[name]/page.tsx` — coverage history + open pitches.
- Modify: `apps/web/app/[locale]/signal/[id]/page.tsx` — "Reporters pitched on this".
- Modify: `apps/web/lib/db.ts` — `entityCoverage()`, `pitchesForEntities()`.

---

## Slice 1 — Entity coverage index

### Task 1: Migration — entity_coverage + lead columns

**Files:**
- Create: `infra/migrations/0027_scored_pitch.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0027_scored_pitch.sql — Scored Pitch (spec 2026-06-28).
-- (a) name-grained entity coverage index, derived from signals.enrichment.
-- (b) additive pitch-scoring columns on story_leads.

create table if not exists entity_coverage (
  tenant_id        uuid not null references tenants(id) on delete cascade,
  entity_type      text not null,   -- Location|Person|Organisation|Topic|Named Entity
  entity_name      text not null,
  appearance_count integer not null default 0,
  last_seen        timestamptz,
  story_ids        uuid[] not null default '{}',
  refreshed_at     timestamptz not null default now(),
  primary key (tenant_id, entity_type, entity_name)
);
create index if not exists idx_entity_coverage_name
  on entity_coverage (tenant_id, entity_name);

alter table story_leads
  add column if not exists entities        jsonb   not null default '[]',
  add column if not exists merit           integer,
  add column if not exists reach           integer,
  add column if not exists potential       integer,
  add column if not exists archival_weight integer,
  add column if not exists conviction      text not null default 'normal'
                            check (conviction in ('low','normal','high')),
  add column if not exists pitch_weight    integer,
  add column if not exists pitch_why       text;

create index if not exists idx_leads_pitch_weight
  on story_leads (tenant_id, status, pitch_weight desc);
```

- [ ] **Step 2: Apply against the dev DB**

Run: `cd ~/projects/platform && uv run --package onlinejourno-agents onlinejourno-agents --help >/dev/null && psql "$DATABASE_URL" -f infra/migrations/0027_scored_pitch.sql`
Expected: `CREATE TABLE` / `ALTER TABLE` / `CREATE INDEX`, no error. (If the project applies migrations via a runner, use it instead — check `infra/` for a migrate script.)

- [ ] **Step 3: Commit**

```bash
git add infra/migrations/0027_scored_pitch.sql
git commit -m "feat(db): entity_coverage index + scored-pitch columns (0027)"
```

### Task 2: Pure coverage aggregation

**Files:**
- Create: `packages/agents-py/src/onlinejourno_agents/entity_coverage.py`
- Test: `packages/agents-py/tests/test_entity_coverage.py`

- [ ] **Step 1: Write the failing test**

```python
# packages/agents-py/tests/test_entity_coverage.py
"""Pure entity-coverage aggregation (spec 2026-06-28 §C1)."""
from __future__ import annotations

from datetime import datetime, timezone

from onlinejourno_agents.entity_coverage import CoverageRow, aggregate

def _sig(story_id, when, entities):
    return {"story_id": story_id, "published_at": when, "entities": entities}

T0 = datetime(2026, 6, 1, tzinfo=timezone.utc)
T1 = datetime(2026, 6, 10, tzinfo=timezone.utc)

def test_aggregate_counts_and_last_seen():
    sigs = [
        _sig("s1", T0, [{"type": "Person", "name": "Rao"}, {"type": "Topic", "name": "Water"}]),
        _sig("s2", T1, [{"type": "Person", "name": "Rao"}]),
    ]
    rows = {(r.entity_type, r.entity_name): r for r in aggregate(sigs)}
    rao = rows[("Person", "Rao")]
    assert rao.appearance_count == 2
    assert rao.last_seen == T1
    assert set(rao.story_ids) == {"s1", "s2"}
    assert rows[("Topic", "Water")].appearance_count == 1

def test_aggregate_skips_blank_names():
    rows = list(aggregate([_sig("s1", T0, [{"type": "Person", "name": ""}, {"type": "Person"}])]))
    assert rows == []

def test_aggregate_dedupes_entity_within_one_signal():
    rows = {(r.entity_type, r.entity_name): r for r in
            aggregate([_sig("s1", T0, [{"type": "Person", "name": "Rao"}, {"type": "Person", "name": "Rao"}])])}
    assert rows[("Person", "Rao")].appearance_count == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/projects/platform/packages/agents-py && uv run pytest tests/test_entity_coverage.py -v`
Expected: FAIL — `ModuleNotFoundError: onlinejourno_agents.entity_coverage`.

- [ ] **Step 3: Write minimal implementation**

```python
# packages/agents-py/src/onlinejourno_agents/entity_coverage.py
"""Name-grained entity coverage index (spec 2026-06-28 §C1).

`signals.enrichment.entities` holds entity NAMES per signal; the only existing
cross-signal aggregate (channel_affinity_log) is type-grained. This module
derives a (type, name) -> count/last_seen/story_ids index that powers both the
archival-weight signal and the entity page.
"""
from __future__ import annotations

from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(slots=True)
class CoverageRow:
    entity_type: str
    entity_name: str
    appearance_count: int = 0
    last_seen: datetime | None = None
    story_ids: list[str] = field(default_factory=list)


def aggregate(signals: Iterable[dict[str, Any]]) -> Iterator[CoverageRow]:
    """Fold per-signal enrichment entities into one row per (type, name).

    Each signal: {story_id, published_at: datetime|None, entities: [{type,name}]}.
    Dedupes a repeated entity within a single signal.
    """
    acc: dict[tuple[str, str], CoverageRow] = {}
    for sig in signals:
        seen: set[tuple[str, str]] = set()
        story_id = sig.get("story_id")
        when = sig.get("published_at")
        for ent in sig.get("entities") or []:
            etype = (ent.get("type") or "").strip()
            name = (ent.get("name") or "").strip()
            if not etype or not name:
                continue
            key = (etype, name)
            if key in seen:
                continue
            seen.add(key)
            row = acc.get(key)
            if row is None:
                row = acc[key] = CoverageRow(etype, name)
            row.appearance_count += 1
            if story_id and story_id not in row.story_ids:
                row.story_ids.append(story_id)
            if when is not None and (row.last_seen is None or when > row.last_seen):
                row.last_seen = when
    yield from acc.values()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/projects/platform/packages/agents-py && uv run pytest tests/test_entity_coverage.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/agents-py/src/onlinejourno_agents/entity_coverage.py packages/agents-py/tests/test_entity_coverage.py
git commit -m "feat(agents): pure entity-coverage aggregation + tests"
```

### Task 3: Coverage reader + refresh + CLI

**Files:**
- Modify: `packages/agents-py/src/onlinejourno_agents/entity_coverage.py`
- Modify: `packages/agents-py/src/onlinejourno_agents/cli.py`

- [ ] **Step 1: Add `coverage_for()` + `refresh_entity_coverage()`**

Append to `entity_coverage.py`:

```python
from onlinejourno_agents import db


def coverage_for(tenant_slug: str, entity_type: str, entity_name: str) -> CoverageRow:
    """Read one coverage row; zero-row if the entity has no prior coverage."""
    with db.connect() as conn, conn.cursor() as cur:
        cur.execute(
            """select appearance_count, last_seen, story_ids
                 from entity_coverage ec
                 join tenants t on t.id = ec.tenant_id
                where t.slug = %s and ec.entity_type = %s and ec.entity_name = %s""",
            (tenant_slug, entity_type, entity_name),
        )
        row = cur.fetchone()
    if not row:
        return CoverageRow(entity_type, entity_name)
    count, last_seen, story_ids = row
    return CoverageRow(entity_type, entity_name, count, last_seen, list(story_ids or []))


def refresh_entity_coverage(*, tenant_slug: str) -> int:
    """Rebuild entity_coverage for a tenant from signals.enrichment. Returns rows written."""
    with db.connect() as conn, conn.cursor() as cur:
        cur.execute(
            """select s.id, s.published_at, s.enrichment
                 from signals s join tenants t on t.id = s.tenant_id
                where t.slug = %s""",
            (tenant_slug,),
        )
        signals = [
            {
                "story_id": str(sid),
                "published_at": pub,
                "entities": (enr or {}).get("entities") or _entities_from_stages(enr or {}),
            }
            for sid, pub, enr in cur.fetchall()
        ]
        rows = list(aggregate(signals))
        cur.execute(
            "delete from entity_coverage ec using tenants t "
            "where ec.tenant_id = t.id and t.slug = %s",
            (tenant_slug,),
        )
        for r in rows:
            cur.execute(
                """insert into entity_coverage
                     (tenant_id, entity_type, entity_name, appearance_count, last_seen, story_ids)
                   select t.id, %s, %s, %s, %s, %s from tenants t where t.slug = %s""",
                (r.entity_type, r.entity_name, r.appearance_count, r.last_seen,
                 r.story_ids, tenant_slug),
            )
        conn.commit()
    return len(rows)


def _entities_from_stages(enrichment: dict[str, Any]) -> list[dict[str, Any]]:
    """Enrichment is keyed by stage (geneea/claude/sarvajna); pull entities from any stage."""
    for stage in ("claude", "sarvajna", "geneea"):
        ents = (enrichment.get(stage) or {}).get("entities")
        if ents:
            return ents
    return []
```

- [ ] **Step 2: Register the CLI command**

In `cli.py`, add the command function near `cmd_calendar_fuse`:

```python
def cmd_entity_coverage(args: argparse.Namespace) -> int:
    """Rebuild the entity_coverage index for a tenant."""
    from onlinejourno_agents.entity_coverage import refresh_entity_coverage

    n = refresh_entity_coverage(tenant_slug=args.tenant)
    print(f"entity_coverage: {n} rows for {args.tenant}")
    return 0
```

And register it in the parser block (next to the calendar-fuse parser):

```python
    p_ecov = sub.add_parser("entity-coverage", help="rebuild the entity_coverage index")
    p_ecov.add_argument("--tenant", required=True)
    p_ecov.set_defaults(func=cmd_entity_coverage)
```

- [ ] **Step 3: Verify the command runs**

Run: `cd ~/projects/platform && uv run --package onlinejourno-agents onlinejourno-agents entity-coverage --tenant demo`
Expected: `entity_coverage: <n> rows for demo` (n ≥ 0), no traceback.

- [ ] **Step 4: Commit**

```bash
git add packages/agents-py/src/onlinejourno_agents/entity_coverage.py packages/agents-py/src/onlinejourno_agents/cli.py
git commit -m "feat(agents): entity_coverage reader + refresh + CLI"
```

---

## Slice 2 — Weight engine

### Task 4: Pure archival_weight + decide

**Files:**
- Create: `packages/scoring-py/src/onlinejourno_scoring/pitch_weight.py`
- Test: `packages/scoring-py/tests/test_pitch_weight.py`

- [ ] **Step 1: Write the failing test**

```python
# packages/scoring-py/tests/test_pitch_weight.py
"""Pure pitch-weight decision (spec 2026-06-28 §C2)."""
from __future__ import annotations

from onlinejourno_scoring.pitch_weight import (
    MOD_CAP,
    archival_weight,
    decide,
)


def test_archival_needs_both_authority_and_staleness():
    # Deep archive but covered today -> no revive signal.
    assert archival_weight(appearance_count=20, days_since_last=0) == 0
    # Deep archive AND long quiet -> strong revive signal.
    assert archival_weight(appearance_count=20, days_since_last=60) > 50
    # Never covered (no authority) -> zero regardless of staleness.
    assert archival_weight(appearance_count=0, days_since_last=None) == 0


def test_merit_is_the_spine():
    hi = decide(merit=90, reach=40, archival=0, conviction="normal").weight
    lo = decide(merit=20, reach=40, archival=0, conviction="normal").weight
    assert hi > lo  # merit drives ordering


def test_modifiers_are_bounded():
    base = decide(merit=50, reach=50, archival=0, conviction="normal").weight
    boosted = decide(merit=50, reach=50, archival=100, conviction="high").weight
    assert 0 < boosted - base <= MOD_CAP  # cannot exceed the cap


def test_merit_none_falls_back_to_reach():
    assert decide(merit=None, reach=70, archival=0, conviction="normal").weight == 70


def test_why_is_human_readable():
    why = decide(merit=80, reach=50, archival=70, conviction="high").why
    assert "HIGH" in why or "MEDIUM" in why
    assert "own" in why.lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/projects/platform/packages/scoring-py && uv run pytest tests/test_pitch_weight.py -v`
Expected: FAIL — `ModuleNotFoundError: onlinejourno_scoring.pitch_weight`.

- [ ] **Step 3: Write minimal implementation**

```python
# packages/scoring-py/src/onlinejourno_scoring/pitch_weight.py
"""Pitch weight (spec 2026-06-28 §C2): merit-spine + bounded modifiers.

base   = potential (merit blends in at _W_MERIT; reach is the pre-composited
         reach scalar produced by pitch_scan via reach_score()).
archival = authority × staleness — high only when we own the entity AND have
           gone quiet on it.
modifiers (conviction + archival) are clamped to ±MOD_CAP so they can nudge,
never invert, the merit ordering.
"""
from __future__ import annotations

from dataclasses import dataclass

from onlinejourno_scoring.potential import _W_MERIT, label

MOD_CAP = 12                 # max total swing from base, in points
_ARCHIVAL_GAIN = 0.12        # archival(0–100) → up to +12
_CONVICTION = {"low": -5, "normal": 0, "high": 8}
_AUTHORITY_PER_HIT = 12      # appearances → authority, capped at 100
_STALE_PER_DAY = 1.8         # days quiet → staleness, capped at 100


def _clamp(x: float, lo: float, hi: float) -> int:
    return int(round(max(lo, min(hi, x))))


def archival_weight(*, appearance_count: int, days_since_last: int | None) -> int:
    """authority × staleness, both 0–100, combined so BOTH must be high (0–100)."""
    if appearance_count <= 0 or days_since_last is None:
        return 0
    authority = min(100.0, appearance_count * _AUTHORITY_PER_HIT)
    staleness = min(100.0, days_since_last * _STALE_PER_DAY)
    return _clamp(authority * staleness / 100.0, 0, 100)


@dataclass(slots=True)
class PitchWeight:
    weight: int
    why: str
    base: int
    archival: int


def decide(*, merit: int | None, reach: int, archival: int, conviction: str) -> PitchWeight:
    base = reach if merit is None else _W_MERIT * merit + (1.0 - _W_MERIT) * reach
    base_i = _clamp(base, 0, 100)

    mod = _CONVICTION.get(conviction, 0) + archival * _ARCHIVAL_GAIN
    mod = max(-MOD_CAP, min(MOD_CAP, mod))
    weight = _clamp(base_i + mod, 0, 100)

    parts = [label(weight)]
    if merit is not None and merit >= reach:
        parts.append("strong merit")
    if archival >= 40:
        parts.append("we own this, gone quiet — revive")
    if conviction == "high":
        parts.append("reporter conviction high")
    why = " · ".join(parts)
    return PitchWeight(weight=weight, why=why, base=base_i, archival=archival)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/projects/platform/packages/scoring-py && uv run pytest tests/test_pitch_weight.py -v`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/scoring-py/src/onlinejourno_scoring/pitch_weight.py packages/scoring-py/tests/test_pitch_weight.py
git commit -m "feat(scoring): pure pitch_weight (merit spine + bounded modifiers) + tests"
```

---

## Slice 3 — Pitch scan (extract + score)

### Task 5: Pure entity coercion + gate

**Files:**
- Create: `packages/agents-py/src/onlinejourno_agents/pitch_scan.py`
- Test: `packages/agents-py/tests/test_pitch_scan.py`

- [ ] **Step 1: Write the failing test**

```python
# packages/agents-py/tests/test_pitch_scan.py
"""Pure parts of pitch-scan (spec 2026-06-28 §C3)."""
from __future__ import annotations

from onlinejourno_agents.pitch_scan import ENTITY_TYPES, coerce_entities, has_scannable_text


def test_gate_rejects_blank():
    assert has_scannable_text("") is False
    assert has_scannable_text("   ") is False
    assert has_scannable_text("Metro phase 2 funding delayed") is True


def test_coerce_keeps_known_types_and_trims():
    raw = [
        {"type": "Person", "name": "  Rao  "},
        {"type": "Location", "name": "Hyderabad"},
        {"type": "Gibberish", "name": "x"},   # unknown type -> Named Entity
        {"type": "Topic", "name": ""},         # blank name -> dropped
    ]
    out = coerce_entities(raw)
    assert {"type": "Person", "name": "Rao"} in out
    assert {"type": "Named Entity", "name": "x"} in out
    assert all(e["name"] for e in out)
    assert all(e["type"] in ENTITY_TYPES for e in out)


def test_coerce_dedupes():
    out = coerce_entities([{"type": "Person", "name": "Rao"}, {"type": "Person", "name": "Rao"}])
    assert len(out) == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/projects/platform/packages/agents-py && uv run pytest tests/test_pitch_scan.py -v`
Expected: FAIL — `ModuleNotFoundError: onlinejourno_agents.pitch_scan`.

- [ ] **Step 3: Write minimal implementation (pure parts)**

```python
# packages/agents-py/src/onlinejourno_agents/pitch_scan.py
"""pitch-scan (spec 2026-06-28 §C3): extract entities/topic from a pitch and
score it. Mirrors claim_extract.py — a cheap Gate, a pure coercer, then a
cost-capped LLM call, then the (pure) scoring engine.
"""
from __future__ import annotations

from typing import Any

ENTITY_TYPES = {"Location", "Person", "Organisation", "Topic", "Named Entity"}


def has_scannable_text(text: str) -> bool:
    """Gate: skip empty/whitespace pitches before any LLM spend."""
    return bool(text and text.strip())


def coerce_entities(raw: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Validate LLM entity output: known type (else 'Named Entity'), non-blank
    trimmed name, deduped."""
    out: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for ent in raw or []:
        name = (ent.get("name") or "").strip()
        if not name:
            continue
        etype = (ent.get("type") or "").strip()
        if etype not in ENTITY_TYPES:
            etype = "Named Entity"
        key = (etype, name)
        if key in seen:
            continue
        seen.add(key)
        out.append({"type": etype, "name": name})
    return out
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/projects/platform/packages/agents-py && uv run pytest tests/test_pitch_scan.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/agents-py/src/onlinejourno_agents/pitch_scan.py packages/agents-py/tests/test_pitch_scan.py
git commit -m "feat(agents): pitch-scan gate + pure entity coercion + tests"
```

### Task 6: scan_pitch orchestration + CLI

**Files:**
- Modify: `packages/agents-py/src/onlinejourno_agents/pitch_scan.py`
- Modify: `packages/agents-py/src/onlinejourno_agents/cli.py`

- [ ] **Step 1: Add the orchestrator**

Append to `pitch_scan.py`:

```python
from datetime import datetime, timezone

from onlinejourno_scoring.pitch_weight import archival_weight, decide
from onlinejourno_scoring.potential import reach_score

from onlinejourno_agents import db
from onlinejourno_agents.client import Completion
from onlinejourno_agents.entity_coverage import coverage_for

# Pitch-stage reach inputs: a pitch is an idea, not a published story. trend and
# alignment default neutral; domain_authority is the tenant's constant; freshness
# is full (a fresh idea). Entity-specific authority lives in archival, not here,
# to avoid double-counting.
_PITCH_TREND = 50.0
_PITCH_ALIGNMENT = 50.0
_PITCH_DOMAIN_AUTHORITY = 50.0
_PITCH_FRESHNESS = 100.0


def _days_since(when: datetime | None, today: datetime) -> int | None:
    return None if when is None else max(0, (today - when).days)


def scan_pitch(*, tenant_slug: str, text: str, conviction: str = "normal",
               complete: "Completion | None" = None,
               today: datetime | None = None) -> dict[str, Any]:
    """Extract entities/topic, score the pitch, return the full payload (the CLI
    serialises this to JSON). `complete` is injectable for tests; defaults to the
    shared client. On LLM failure the pitch still scores from reach only
    (degraded=True)."""
    today = today or datetime.now(timezone.utc)
    if not has_scannable_text(text):
        return _score(tenant_slug, [], None, conviction, today, degraded=False)

    try:
        from onlinejourno_agents.client import complete as _default_complete
        from onlinejourno_agents.prompts import build_pitch_entity_prompt
        runner = complete or _default_complete
        res = runner(build_pitch_entity_prompt(text), max_usd=0.02)
        entities = coerce_entities(res.json.get("entities", []))
        topic = (res.json.get("topic") or "").strip() or None
        degraded = False
    except Exception:
        entities, topic, degraded = [], None, True

    return _score(tenant_slug, entities, topic, conviction, today, degraded=degraded)


def _score(tenant_slug, entities, topic, conviction, today, *, degraded):
    # Archival = strongest (authority×staleness) entity in the pitch.
    best = 0
    for ent in entities:
        cov = coverage_for(tenant_slug, ent["type"], ent["name"])
        best = max(best, archival_weight(
            appearance_count=cov.appearance_count,
            days_since_last=_days_since(cov.last_seen, today),
        ))
    reach = int(round(reach_score(
        trend_momentum=_PITCH_TREND, content_alignment=_PITCH_ALIGNMENT,
        domain_authority=_PITCH_DOMAIN_AUTHORITY, freshness=_PITCH_FRESHNESS)))
    pw = decide(merit=None, reach=reach, archival=best, conviction=conviction)
    return {
        "entities": entities, "topic": topic,
        "merit": None, "reach": reach, "potential": pw.base,
        "archival_weight": best, "pitch_weight": pw.weight,
        "pitch_why": pw.why, "degraded": degraded,
    }
```

> NOTE for the engineer: `build_pitch_entity_prompt` must be added to `prompts.py` mirroring `build_claim_prompt` — a prompt instructing the model to return `{"entities":[{"type","name"}],"topic":"…"}` using the five `ENTITY_TYPES`. Add it as the first sub-step here, copying the structure of the existing `build_claim_prompt`.

- [ ] **Step 2: Add `build_pitch_entity_prompt` to prompts.py**

In `packages/agents-py/src/onlinejourno_agents/prompts.py`, add (mirroring `build_claim_prompt`):

```python
def build_pitch_entity_prompt(text: str) -> str:
    return (
        "Extract the named entities and the single best topic from this story "
        "pitch. Return JSON only: "
        '{"entities":[{"type":"Person|Location|Organisation|Topic|Named Entity",'
        '"name":"…"}],"topic":"short topic label"}.\n\nPITCH:\n' + text
    )
```

- [ ] **Step 3: Register the CLI command**

In `cli.py`, near `cmd_calendar_fuse`:

```python
def cmd_pitch_scan(args: argparse.Namespace) -> int:
    """Scan + score a pitch; emit JSON on the last stdout line."""
    import json

    from onlinejourno_agents.pitch_scan import scan_pitch

    payload = scan_pitch(tenant_slug=args.tenant, text=args.text,
                         conviction=args.conviction)
    print(json.dumps(payload))
    return 0
```

Register in the parser block:

```python
    p_pscan = sub.add_parser("pitch-scan", help="extract entities + score a pitch")
    p_pscan.add_argument("--tenant", required=True)
    p_pscan.add_argument("--text", required=True)
    p_pscan.add_argument("--conviction", default="normal",
                         choices=["low", "normal", "high"])
    p_pscan.add_argument("--json", action="store_true")  # accepted for parity; output is always JSON
    p_pscan.set_defaults(func=cmd_pitch_scan)
```

- [ ] **Step 4: Verify end-to-end from the CLI**

Run: `cd ~/projects/platform && uv run --package onlinejourno-agents onlinejourno-agents pitch-scan --tenant demo --text "Metro phase 2 funding delayed again" --conviction high --json`
Expected: one JSON line with keys `entities, topic, merit, reach, potential, archival_weight, pitch_weight, pitch_why, degraded`; `pitch_weight` is an int 0–100.

- [ ] **Step 5: Commit**

```bash
git add packages/agents-py/src/onlinejourno_agents/pitch_scan.py packages/agents-py/src/onlinejourno_agents/prompts.py packages/agents-py/src/onlinejourno_agents/cli.py
git commit -m "feat(agents): scan_pitch orchestration + pitch-scan CLI"
```

### Task 7: Web bridge (execFile)

**Files:**
- Create: `apps/web/lib/pitchScan.ts`

- [ ] **Step 1: Write the bridge (mirrors analyze.ts)**

```typescript
// apps/web/lib/pitchScan.ts — server-only bridge to the pitch-scan CLI.
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

export type PitchEntity = { type: string; name: string };
export type PitchScan = {
  entities: PitchEntity[];
  topic: string | null;
  merit: number | null;
  reach: number;
  potential: number;
  archival_weight: number;
  pitch_weight: number;
  pitch_why: string;
  degraded: boolean;
  error?: string;
};

export async function scanPitch(
  tenant: string,
  text: string,
  conviction: "low" | "normal" | "high" = "normal",
): Promise<PitchScan> {
  if (!text.trim()) {
    return {
      entities: [], topic: null, merit: null, reach: 0, potential: 0,
      archival_weight: 0, pitch_weight: 0, pitch_why: "", degraded: false,
      error: "empty pitch",
    };
  }
  const args = [
    "run", "--package", "onlinejourno-agents", "onlinejourno-agents",
    "pitch-scan", "--tenant", tenant, "--text", text,
    "--conviction", conviction, "--json",
  ];
  try {
    const { stdout } = await execFileP("uv", args, {
      cwd: REPO_ROOT, timeout: 45_000, maxBuffer: 1024 * 1024,
    });
    const line = stdout.trim().split("\n").pop() ?? "{}";
    return JSON.parse(line) as PitchScan;
  } catch (err) {
    return {
      entities: [], topic: null, merit: null, reach: 0, potential: 0,
      archival_weight: 0, pitch_weight: 0, pitch_why: "", degraded: true,
      error: `scan failed: ${err instanceof Error ? err.message.slice(0, 200) : "unknown"}`,
    };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd ~/projects/platform && pnpm --filter @onlinejourno/web type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/pitchScan.ts
git commit -m "feat(web): pitch-scan execFile bridge"
```

---

## Slice 4 — Compose + confirm + ranked Pitched column

> Verified anchors: `newslist/page.tsx` already has a pitch composer
> (`isDesk ? "Commission" : "Pitch"`, `origin: desk ? "requested" : "pitched"`),
> a Pitched column, and "pitched by [pitcher]" attribution. This slice adds a
> Scan step before submit, persists the scan payload, and sorts/decorates the
> column.

### Task 8: Persist scan payload on pitch submit

**Files:**
- Modify: `apps/web/lib/db.ts` (lead-insert helper used by the pitch action)
- Modify: `apps/web/app/[locale]/newslist/page.tsx` (the `pitch` server action)

- [ ] **Step 1: Extend the lead-insert to accept scan fields**

In `apps/web/lib/db.ts`, locate the insert used by the newslist pitch action (search `into story_leads`). Add the new columns to the insert and a typed param object:

```typescript
// apps/web/lib/db.ts — extend the pitch insert with scan fields.
export type PitchScanFields = {
  entities: { type: string; name: string }[];
  reach: number | null;
  potential: number | null;
  archival_weight: number | null;
  conviction: "low" | "normal" | "high";
  pitch_weight: number | null;
  pitch_why: string | null;
};

// in the insert: add columns + placeholders
//   entities, reach, potential, archival_weight, conviction, pitch_weight, pitch_why
// values: JSON.stringify(scan.entities), scan.reach, scan.potential,
//   scan.archival_weight, scan.conviction, scan.pitch_weight, scan.pitch_why
```

- [ ] **Step 2: Wire the server action to scan then persist**

In `newslist/page.tsx`, in the `pitch` server action, call `scanPitch` before insert and pass the fields:

```typescript
import { scanPitch } from "@/lib/pitchScan";
// inside pitch(formData):
const title = String(formData.get("title") ?? "");
const conviction = (String(formData.get("conviction") ?? "normal")) as "low" | "normal" | "high";
const scan = await scanPitch(tenantSlug, title, conviction);
await createPitchLead({
  /* existing fields … */ origin: "pitched", status: "pitched",
  entities: scan.entities, reach: scan.reach, potential: scan.potential,
  archival_weight: scan.archival_weight, conviction,
  pitch_weight: scan.pitch_weight, pitch_why: scan.pitch_why,
});
```

- [ ] **Step 3: Type-check + run**

Run: `cd ~/projects/platform && pnpm --filter @onlinejourno/web type-check`
Then load `/en/newslist`, submit a pitch, and confirm a row appears with a non-null `pitch_weight` (check via `psql "$DATABASE_URL" -c "select title, pitch_weight, pitch_why from story_leads order by created_at desc limit 1;"`).
Expected: type-check clean; the new row has `pitch_weight` and `pitch_why` set.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/db.ts apps/web/app/[locale]/newslist/page.tsx
git commit -m "feat(web): persist pitch scan (entities/scores/conviction) on submit"
```

### Task 9: Scan-preview composer + ranked column with why-chip

**Files:**
- Modify: `apps/web/app/[locale]/newslist/page.tsx`

- [ ] **Step 1: Add a conviction select + Scan preview to the composer**

Add a `conviction` `<select>` (low/normal/high, default normal) to the existing pitch `<form>`, and a server action `scanPreview` that returns `scanPitch(...)` so the reporter sees entities + weight + why before final submit. Render returned entity chips (editable: a hidden input carrying the confirmed `entities` JSON) and the weight badge + `pitch_why`.

```tsx
// minimal preview action + render
async function scanPreview(formData: FormData) {
  "use server";
  const text = String(formData.get("title") ?? "");
  const conviction = String(formData.get("conviction") ?? "normal") as "low"|"normal"|"high";
  return scanPitch(tenantSlug, text, conviction); // surfaced into a client preview panel
}
// in JSX: <WeightBadge value={scan.pitch_weight} /> <span className="why">{scan.pitch_why}</span>
//         {scan.entities.map(e => <Chip key={e.type+e.name}>{e.type}: {e.name}</Chip>)}
```

- [ ] **Step 2: Sort the Pitched column by weight + show the badge**

Where the Pitched column maps leads, sort by `pitch_weight` desc (nulls last) and render the badge + truncated `pitch_why` on each card:

```tsx
const pitched = leads
  .filter((l) => l.status === "pitched")
  .sort((a, b) => (b.pitch_weight ?? -1) - (a.pitch_weight ?? -1));
// card: <WeightBadge value={l.pitch_weight} title={l.pitch_why ?? ""} />
//       existing "pitched by {l.pitcher}"
```

(Add a small `WeightBadge` presentational component — colour by `pitch_weight` band, reusing OJDS tokens; no new colours.)

- [ ] **Step 3: Type-check + run**

Run: `cd ~/projects/platform && pnpm --filter @onlinejourno/web type-check`
Then on `/en/newslist`: write a pitch → see entity chips + weight + why in the preview → submit → it lands in the Pitched column, highest weight on top, badge + why visible.
Expected: type-check clean; ranking + badges render; attribution still shows the journalist.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/[locale]/newslist/page.tsx
git commit -m "feat(web): scan-preview composer + weight-ranked Pitched column"
```

---

## Slice 5 — Calendar weight badge

### Task 10: Weight badge on pitched calendar events

**Files:**
- Modify: `apps/web/components/calendar/CalendarApp.tsx`
- Modify: `apps/web/lib/db.ts` (calendar query — include `pitch_weight` on lead-linked events)

- [ ] **Step 1: Thread `pitch_weight` onto the calendar event type**

In `lib/db.ts`, the calendar query that joins `calendar_event`→`story_leads` (the fusion link) selects the lead; add `pitch_weight` to the selected columns and to the `CalEvent` type in `CalendarApp.tsx`:

```typescript
// CalendarApp.tsx
type CalEvent = { /* existing fields */ leadId?: string | null; pitchWeight?: number | null };
```

- [ ] **Step 2: Render the badge on the Gantt bar**

In the event bar render (where `EventDrawer`/bar shows lead info), add the existing `WeightBadge` when `pitchWeight != null`:

```tsx
{ev.pitchWeight != null && <WeightBadge value={ev.pitchWeight} />}
```

- [ ] **Step 3: Type-check + run**

Run: `cd ~/projects/platform && pnpm --filter @onlinejourno/web type-check`
Then load `/en/calendar` with a pitched lead carrying an `eta`; confirm the bar shows its weight badge.
Expected: type-check clean; badge appears on lead-linked pitched events.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/CalendarApp.tsx apps/web/lib/db.ts
git commit -m "feat(web): pitch-weight badge on calendar events"
```

---

## Slice 6 — Entity page + signal-page "pitched on this"

### Task 11: Entity coverage + pitches queries

**Files:**
- Modify: `apps/web/lib/db.ts`

- [ ] **Step 1: Add the two reads**

```typescript
// apps/web/lib/db.ts
export type EntityCoverage = {
  entity_type: string; entity_name: string;
  appearance_count: number; last_seen: string | null; story_ids: string[];
};

export async function entityCoverage(
  tenant: string, type: string, name: string,
): Promise<EntityCoverage | null> {
  const { rows } = await query(
    `select ec.entity_type, ec.entity_name, ec.appearance_count,
            ec.last_seen, ec.story_ids
       from entity_coverage ec join tenants t on t.id = ec.tenant_id
      where t.slug = $1 and ec.entity_type = $2 and ec.entity_name = $3`,
    [tenant, type, name],
  );
  return rows[0] ?? null;
}

export async function pitchesForEntities(
  tenant: string, entities: { type: string; name: string }[],
): Promise<{ id: string; title: string; pitch_weight: number | null; pitcher: string | null }[]> {
  if (entities.length === 0) return [];
  const { rows } = await query(
    `select l.id, l.title, l.pitch_weight, u.name as pitcher
       from story_leads l
       join tenants t on t.id = l.tenant_id
       left join users u on u.id = l.assignee_id
      where t.slug = $1 and l.status = 'pitched'
        and l.entities @> $2::jsonb
      order by l.pitch_weight desc nulls last`,
    [tenant, JSON.stringify(entities.map((e) => ({ type: e.type, name: e.name })))],
  );
  return rows;
}
```

> NOTE: `l.entities @> $2::jsonb` matches leads whose entities array contains
> *all* of the passed objects. For "any of these entities" on the signal page,
> call `pitchesForEntities` per entity and merge, or switch to a `jsonb_path_exists`
> OR-query — pick the per-entity merge (simpler, small N).

- [ ] **Step 2: Type-check**

Run: `cd ~/projects/platform && pnpm --filter @onlinejourno/web type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/db.ts
git commit -m "feat(web): entityCoverage + pitchesForEntities reads"
```

### Task 12: Entity page route

**Files:**
- Create: `apps/web/app/[locale]/entity/[type]/[name]/page.tsx`

- [ ] **Step 1: Build the page**

```tsx
// apps/web/app/[locale]/entity/[type]/[name]/page.tsx
import { entityCoverage, pitchesForEntities } from "@/lib/db";
import { tenantSlugFromRequest } from "@/lib/tenant"; // existing tenant resolver

export default async function EntityPage({
  params,
}: {
  params: Promise<{ type: string; name: string }>;
}) {
  const { type, name } = await params;
  const t = decodeURIComponent(type), n = decodeURIComponent(name);
  const tenant = await tenantSlugFromRequest();
  const cov = await entityCoverage(tenant, t, n);
  const pitches = await pitchesForEntities(tenant, [{ type: t, name: n }]);

  return (
    <main>
      <h1>{n} <small>{t}</small></h1>
      {cov ? (
        <p>
          Covered <strong>{cov.appearance_count}</strong> times · last seen{" "}
          {cov.last_seen ? new Date(cov.last_seen).toLocaleDateString() : "—"}
        </p>
      ) : (
        <p>No prior coverage of this entity.</p>
      )}
      <section>
        <h2>Reporters pitched on this</h2>
        {pitches.length === 0 ? <p>No open pitches.</p> : (
          <ul>
            {pitches.map((p) => (
              <li key={p.id}>{p.title} — weight {p.pitch_weight ?? "—"}{p.pitcher ? ` · ${p.pitcher}` : ""}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
```

> Use the project's existing tenant resolver (search `tenantSlug` in `apps/web/lib`) — replace `tenantSlugFromRequest` with the real helper name if it differs.

- [ ] **Step 2: Type-check + run**

Run: `cd ~/projects/platform && pnpm --filter @onlinejourno/web type-check`
Then load `/en/entity/Person/<a-known-name>`; confirm coverage line + any open pitches render.
Expected: type-check clean; page renders coverage + pitches.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/[locale]/entity/[type]/[name]/page.tsx"
git commit -m "feat(web): entity page — coverage history + open pitches"
```

### Task 13: Signal-page "Reporters pitched on this"

**Files:**
- Modify: `apps/web/app/[locale]/signal/[id]/page.tsx`

- [ ] **Step 1: Add the section**

In the signal page, read the signal's entities (from its enrichment, already available on the signal record), then merge per-entity pitches and render:

```tsx
import { pitchesForEntities } from "@/lib/db";
// after loading `signal`:
const sigEntities = (signal.enrichment?.entities ?? []) as { type: string; name: string }[];
const merged = (
  await Promise.all(sigEntities.map((e) => pitchesForEntities(tenant, [e])))
).flat();
const pitches = Array.from(new Map(merged.map((p) => [p.id, p])).values())
  .sort((a, b) => (b.pitch_weight ?? -1) - (a.pitch_weight ?? -1));
// render: <h2>Reporters pitched on this</h2> + list (title · weight · pitcher)
```

- [ ] **Step 2: Type-check + run**

Run: `cd ~/projects/platform && pnpm --filter @onlinejourno/web type-check`
Then load a `/en/signal/<id>` whose entities overlap an open pitch; confirm the section lists it.
Expected: type-check clean; overlapping pitches appear, weight-sorted.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/[locale]/signal/[id]/page.tsx"
git commit -m "feat(web): signal page — reporters pitched on this entity"
```

---

## Final verification (whole feature)

- [ ] **Python suites green**

Run: `cd ~/projects/platform && uv run pytest packages/agents-py/tests/test_entity_coverage.py packages/agents-py/tests/test_pitch_scan.py packages/scoring-py/tests/test_pitch_weight.py -v`
Expected: all PASS.

- [ ] **Type-check green**

Run: `pnpm --filter @onlinejourno/web type-check`
Expected: no errors.

- [ ] **Security + DoD gate (per deploy rule)**

Run `/caveman-review` (security focus) on the branch; confirm tenant isolation holds on `entity_coverage` and the new `story_leads` columns (every read filters by tenant). No ship without a green gate.

- [ ] **Wire the refresh into cron (so the index stays warm)**

In `infra/cron/pipeline.sh` and `infra/cron/pipeline-fly.sh`, add an `entity-coverage --tenant "$TENANT"` step after enrichment (mirrors the existing `calendar-fuse` step). Commit:

```bash
git add infra/cron/pipeline.sh infra/cron/pipeline-fly.sh
git commit -m "chore(cron): refresh entity_coverage after enrichment"
```

---

## Self-review notes (author)

- **Spec coverage:** §C1 → Tasks 1–3; §C2 → Task 4; §C3 → Tasks 5–7; §C4 → Task 1; §C5 → Tasks 8–9; §C6 → Tasks 11–13. Error-handling (degraded scan, unknown entity → archival 0) → Task 6 `scan_pitch` + Task 4 `archival_weight`. Cron refresh → final verification.
- **Type consistency:** `pitch_weight` (int), `pitch_why` (str), `entities` (`[{type,name}]`), `conviction` (`low|normal|high`), `scanPitch`/`PitchScan` shape match across Python payload, `pitchScan.ts`, and `db.ts`.
- **Open implementer choices (called out inline, not blocking):** `entity_coverage` table-refresh (chosen) vs view; per-entity merge vs OR-query on the signal page (per-entity merge chosen); real tenant-resolver helper name.
```