# IA Slice 4a — Topic → Domains (GDELT competitor view)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Build the **Topic → Domains** tab (from the original discover-dashboard): for any topic, which domains own the coverage — so a desk sees *who they're up against* on a story. Port the GDELT (+ Google News fallback) fetch into `scoring-py`, expose a CLI, render the tab. This also supplies the data to close the Slice-2 "competitor-relative authority" loop later.

**Architecture:** Extend `packages/scoring-py/src/onlinejourno_scoring/gdelt.py` with `top_domains(topic, days)` (port the original's `get_topic_top_domains`); add a `topic-domains` CLI subcommand; a TS subprocess wrapper (`lib/topicDomains.ts`, mirrors `lib/seoAudit.ts`) + the `topic-domains` page (replace the Slice-1 stub).

**Tech Stack:** Python (scoring-py) + Next.js. Verify: pytest (shape + graceful degrade, no live calls in tests) + CLI e2e + `type-check`. `/en/topic-domains` is auth-gated → flag the visual.

**Porting source:** `/Users/subhashrai/Data Protection/discover-dashboard/data/gdelt_fetcher.py` — `get_topic_top_domains(keyword, max_records=100, days=7)`, `_gdelt_top_domains`, `_gnews_top_domains`, `_pub_to_domain_slug`. (Platform `gdelt.py` already has `domain_authority` + `_query_story_count` + `GDELT_DOC_API` + `_GDELT_TIMEOUT` — extend it; reuse those.) Slice 4 = 3 tabs; this is **4a**; Local Pulse (4b) + EIP Signals (4c) follow.

---

### Task 1: `gdelt.top_domains(topic, days)`

**Files:** Modify `packages/scoring-py/src/onlinejourno_scoring/gdelt.py`; Test `packages/scoring-py/tests/test_gdelt.py`.

- [ ] **Step 1: Failing test** (shape + graceful degrade — NO live network)
```python
# packages/scoring-py/tests/test_gdelt.py
from onlinejourno_scoring import gdelt


def test_top_domains_shape_and_degrade():
    r = gdelt.top_domains("zzqqxx-no-such-topic", days=7)
    assert isinstance(r, dict) and "available" in r
    # never raises; on no data / network fail → available False or empty domains
    assert "domains" in r or r["available"] is False


def test_domain_authority_still_works():
    r = gdelt.domain_authority("zzqqxx", domain="thehindu.com", days=7)
    assert isinstance(r, dict) and "available" in r
```

- [ ] **Step 2: Run — expect FAIL** (`cd packages/scoring-py && uv run --with pytest pytest tests/test_gdelt.py -q`).

- [ ] **Step 3: Implement `top_domains(topic: str, days: int = 7, max_records: int = 100) -> dict`** — port `get_topic_top_domains` from the source: query GDELT DOC API (`GDELT_DOC_API`, `mode=artlist`/domain aggregation as the original does), aggregate by domain → `[{domain, count}]` sorted desc; if GDELT empty/errors, fall back to `_gnews_top_domains` (Google News RSS volume by domain) and mark `source`. Return `{"available": bool, "topic": topic, "days": days, "source": "GDELT"|"GoogleNews", "domains": [{"domain": str, "count": int}], "reason"?: str}`. NEVER raise (try/except → `{"available": False, "reason": str(e), "domains": []}`). Reuse `GDELT_DOC_API`, `_GDELT_TIMEOUT`, `HEADERS`, `_pub_to_domain_slug` (port the slug helper).

- [ ] **Step 4: Run — expect PASS.** Then full suite `uv run --with pytest pytest -q` green.

- [ ] **Step 5: Commit**
```bash
git add packages/scoring-py/src/onlinejourno_scoring/gdelt.py packages/scoring-py/tests/test_gdelt.py
git commit -m "scoring: gdelt.top_domains — who owns a topic (port get_topic_top_domains)"
```

---

### Task 2: `topic-domains` CLI subcommand

**Files:** Modify `packages/scoring-py/src/onlinejourno_scoring/cli.py`.

- [ ] **Step 1: Add the subparser + handler** in `build_parser`/`main` (next to `audit`):
```python
    td = sub.add_parser("topic-domains", help="which domains own a topic (GDELT)")
    td.add_argument("topic")
    td.add_argument("--days", type=int, default=7)
    td.add_argument("--json", action="store_true")
```
In `main`, when `args.cmd == "topic-domains"`: `from onlinejourno_scoring.gdelt import top_domains; res = top_domains(args.topic, days=args.days); print(json.dumps(res) if args.json else res); return 0`.

- [ ] **Step 2: Verify** `cd packages/scoring-py && uv run onlinejourno-scoring topic-domains --help` shows it; then e2e `uv run onlinejourno-scoring topic-domains "Iran" --days 7 --json | head -c 300` → a JSON dict with `domains` (or `available:false` if GDELT unreachable — acceptable, note it).

- [ ] **Step 3: Commit**
```bash
git add packages/scoring-py/src/onlinejourno_scoring/cli.py
git commit -m "scoring: topic-domains CLI subcommand"
```

---

### Task 3: `topic-domains` web page

**Files:** Create `apps/web/lib/topicDomains.ts`; Modify `apps/web/app/[locale]/topic-domains/page.tsx` (replace the Slice-1 stub).

- [ ] **Step 1: `lib/topicDomains.ts`** — mirror `lib/seoAudit.ts`'s subprocess pattern:
```typescript
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");

export type TopicDomains = {
  available: boolean; topic?: string; days?: number; source?: string;
  domains?: { domain: string; count: number }[]; reason?: string;
};

export async function fetchTopicDomains(topic: string, days = 7): Promise<TopicDomains> {
  if (!topic.trim()) return { available: false, reason: "no topic" };
  try {
    const { stdout } = await execFileP(
      "uv",
      ["run", "--package", "onlinejourno-scoring", "onlinejourno-scoring",
       "topic-domains", topic, "--days", String(days), "--json"],
      { cwd: REPO_ROOT, timeout: 30_000, maxBuffer: 4 * 1024 * 1024 },
    );
    return JSON.parse(stdout) as TopicDomains;
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
```

- [ ] **Step 2: The page** — auth-gated server component (match the `story-analyser` page's auth + `searchParams` pattern). `?topic=` + `?days=` → `fetchTopicDomains(topic, days)` → render: a topic input + lookback select (3/7/14/30) form (GET); when results, a "Top domains for '{topic}'" table (rank, domain, story count, a bar) with the outlet's own domain highlighted; show the `source` ("GDELT" / "Google News fallback") + a graceful note if `!available`. Keep the explainer ("who owns this topic — your competition") for non-digital journalists. House `ds-*` styling.

- [ ] **Step 3: Type-check** `pnpm --filter @onlinejourno/web type-check` → clean.

- [ ] **Step 4: Verify** — auth-gated; confirm via type-check + the CLI e2e (Task 2). Flag the visual.

- [ ] **Step 5: Commit**
```bash
git add apps/web/lib/topicDomains.ts "apps/web/app/[locale]/topic-domains/page.tsx"
git commit -m "topic-domains: wire the tab — GDELT top domains for a topic"
```

---

## Self-review
- **Scope:** Topic→Domains tab (4a) — gdelt.top_domains ✓ (T1), CLI ✓ (T2), page ✓ (T3). The Story-Scores competitor-authority integration (using `domain_authority`/`top_domains` per story) is a follow-on (per-story GDELT call → needs caching; deferred, not 4a). Local Pulse (4b) + EIP (4c) follow.
- **No `any`** in TS; fetchers never raise; CLI mirrors `audit`; page mirrors `story-analyser`.
- **Assumption:** GDELT DOC API reachable; tests are offline-safe (degrade), e2e may show `available:false` if GDELT is down — acceptable.
