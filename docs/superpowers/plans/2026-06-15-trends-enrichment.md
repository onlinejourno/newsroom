# Trends Enrichment — match the original's Trending Topics

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Bring `/trends` (Trending Topics) up to the original discover-dashboard's richness. Founder named two missing pieces — **Channel Performance & Entity Affinity** and **Top Keywords (90d)** — plus the tab is otherwise thin (just a momentum list). Add: Top Keywords (KE), Channel Performance & Entity Affinity (logged per refresh, like the original), and an Editorial Overview table.

**Architecture:**
- **Top Keywords** — the outlet's ranking keywords from Keywords Everywhere (`scoring-py` `keywords_everywhere.ranking_keywords(domain)`), cached in a small TTL table.
- **Channel Affinity** — port the original's `performance_log.py` model: an **append-only** `channel_affinity_log` (entity_type, channel, section, momentum, ts), written each pipeline refresh by a Python step that classifies entity types via the existing NLP connector; `affinity_stats(tenant, 90d)` aggregates → which entity types/sections the outlet performs on per channel. Seeded once from existing stories so it isn't empty.
- **Editorial Overview** — a richer table computed from the existing `topicMomentum` (Topic, Type, Signal, Score, Direction, Prediction).
- **Deferred (note in UI):** hourly Interest Trajectory (needs pytrends + hourly logging), breaking-surge cards, Google-News story clusters — follow-ons.

**Tech:** Python (agents-py) + Next.js. pytest for the Python; `type-check` + CLI/psql for the rest. `/trends` auth-gated → flag visual.

**Order (so a named gap ships first even if later tasks are cut):** T1 Top Keywords → T2 affinity log+stats (Python) → T3 affinity db read + /trends display → T4 Editorial Overview table.

---

### Task 1: Top Keywords (90d) — KE, cached

**Files:** Create `infra/migrations/00NN_outlet_keywords.sql`; Modify `apps/web/lib/db.ts`; Create `apps/web/lib/outletKeywords.ts`.

- [ ] **Step 1: Migration** (next free number — `ls infra/migrations/`; 0021 is `topic_domains`, so likely `0022`):
```sql
create table if not exists outlet_keywords (
  tenant_id uuid not null,
  domain text not null,
  keywords jsonb not null,            -- [{keyword, vol, cpc, competition, position}]
  computed_at timestamptz not null default now(),
  primary key (tenant_id, domain)
);
```
Apply to dev: `psql "postgresql:///onlinejourno_dev" -f infra/migrations/00NN_outlet_keywords.sql`.

- [ ] **Step 2: db.ts** — `cachedOutletKeywords(tenantId, domain, ttlHours=72)` (read cache, null if stale) + `upsertOutletKeywords(tenantId, domain, keywords)`. Mirror `cachedTopicDomains`/`upsertTopicDomains` (jsonb coercion, TTL).

- [ ] **Step 3: `lib/outletKeywords.ts`** — `fetchOutletKeywords(domain)` mirrors `lib/topicDomains.ts` (subprocess): `uv run --package onlinejourno-scoring onlinejourno-scoring ...`. **First add a CLI subcommand** `ranking-keywords <domain> --json` to `packages/scoring-py/src/onlinejourno_scoring/cli.py` (calls `keywords_everywhere.ranking_keywords(domain)`), mirroring the `topic-domains` subcommand. Then `getOrFetchOutletKeywords(tenantId, domain)` = cache-or-run+upsert.

- [ ] **Step 4:** Type-check clean; CLI e2e `uv run onlinejourno-scoring ranking-keywords thehindu.com --json | head -c 200` (returns `available` + keywords, or `available:false` w/o KE key — note).

- [ ] **Step 5: Commit** `git commit -m "trends: Top Keywords (90d) — KE ranking keywords, cached + CLI"`

---

### Task 2: Channel Affinity log + stats (Python)

**Files:** Create `infra/migrations/00NN_channel_affinity.sql`; Create `packages/agents-py/src/onlinejourno_agents/affinity.py`; Modify `cli.py` + `infra/cron/pipeline.sh`; Test `tests/test_affinity.py`.

Port the model of `/Users/subhashrai/Data Protection/discover-dashboard/data/performance_log.py` (read it): append-only appearance log + `affinity_stats()` aggregation.

- [ ] **Step 1: Migration** `channel_affinity_log (id, tenant_id, entity_type text, channel text, section text, momentum real, story_id uuid, logged_at timestamptz default now())` + index `(tenant_id, logged_at)`.

- [ ] **Step 2: Failing test** `test_affinity.py` — `affinity_stats(rows, days=90)` (pure aggregation over a list of log dicts) returns, per entity_type: `{entity_type, appearances, top_channels:[...], top_sections:[...]}` sorted by appearances; + per-channel totals `{google_news, discover, search}`. Pin: given sample rows, the busiest entity_type ranks first; channel totals sum correctly.

- [ ] **Step 3: Implement `affinity.py`**
  - `entity_type_of(name, nlp)` — classify via the existing NLP connector (`connectors.make_connector("nlp")` → spaCy labels): GPE/LOC→"Location", PERSON→"Person", ORG→"Organisation", else "Named Entity"; topics (non-NER tokens) → "Topic". (Coarse map; reuse `connectors.py` labels.)
  - `affinity_stats(rows, days=90)` — pure aggregation (tested in Step 2).
  - `run_affinity_log(tenant_slug)` — for the tenant's recent stories/trending matches, determine (entity_type, channel, section, momentum) per appearance and INSERT into `channel_affinity_log` (append-only). Channel = where it surfaced (trending_match/discover/google_news per the existing pipeline signals). Idempotent-ish (it's a time-series log; dedup by (story_id, channel, logged-day) if cheap).

- [ ] **Step 4: CLI + cron** — add `affinity-log --tenant` subcommand (calls `run_affinity_log`) to agents `cli.py`; add the step to `infra/cron/pipeline.sh` after `calendar-fuse`. Seed once: run it against dev.

- [ ] **Step 5:** pytest green (`affinity_stats`); e2e `affinity-log --tenant self` inserts rows (psql count). **Commit** `git commit -m "trends: channel-affinity append-only log + affinity_stats + pipeline step"`

---

### Task 3: Affinity db read + /trends display

**Files:** Modify `apps/web/lib/db.ts`; Modify `apps/web/app/[locale]/trends/page.tsx`.

- [ ] **Step 1: db.ts** — `channelAffinity(tenantId, days=90)`: read `channel_affinity_log` within the window, aggregate in TS (mirror `affinity_stats`): per entity_type → appearances + top channels + top sections; + per-channel totals (Google News / Discover / Search appearances). Return a typed object.

- [ ] **Step 2: /trends display** — add a **"Channel Performance & Entity Affinity"** section: the 3 channel-appearance counts (Google News / Discover / Search) as stat cards + a "By entity type" table (Entity type · Appearances · Top channels · Top sections). Explainer ("which entity types & sections you perform on across channels — logged every refresh, grows over time"). Graceful empty ("logging just started — fills as the pipeline runs"). House `ds-*` styles. No `any`.

- [ ] **Step 3:** Type-check clean. **Commit** `git commit -m "trends: Channel Performance & Entity Affinity section (db read + display)"`

---

### Task 4: Editorial Overview table + Top-Keywords display

**Files:** Modify `apps/web/app/[locale]/trends/page.tsx`.

- [ ] **Step 1: Editorial Overview table** — from the existing `topicMomentum` topics, render a table: Topic · Type (coarse: a topic whose name is a known geo/region → "Location", else "Topic"; refine later from affinity) · Signal (🔥 Breaking surge ≥ X / → Building / ~ Holding, from `momentumLabel`) · Score (momentum) · Direction (rising/stable/falling from recent vs prior) · Prediction (a short label from the band). Keep the existing momentum list or fold it into this table.

- [ ] **Step 2: Top Keywords section** — call `getOrRunOutletKeywords`/`getOrFetchOutletKeywords` (T1) for the outlet domain (derive like Story Scores does, or tenant config) → render "Top Keywords (90d)" table (keyword · volume · CPC · competition · position) with graceful empty/unavailable. (Read-only on load if cached; a small "refresh keywords" action like the competitor refresh, bounded.)

- [ ] **Step 3:** Type-check clean; verify (auth-gated → flag). **Commit** `git commit -m "trends: Editorial Overview table + Top Keywords section"`

---

## Self-review
- **Named gaps:** Channel Performance & Entity Affinity (T2+T3) ✓; Top Keywords 90d (T1+T4) ✓. Plus Editorial Overview richness (T4).
- **Fidelity:** affinity is logged per-refresh + aggregated 90d (matches `performance_log.py`); entity types via the existing NLP connector; keywords via KE.
- **Deferred (noted in UI):** hourly Interest Trajectory (pytrends/hourly logging), breaking-surge cards, story clusters.
- **Assumption:** the NLP connector is available for entity-type classification at log time; KE key present (degrades if not).
