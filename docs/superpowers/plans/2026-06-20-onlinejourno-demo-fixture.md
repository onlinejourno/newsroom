# Rich Demo Fixture Implementation Plan (Slice 2a)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extend the demo-tenant fixture so the `demo` tenant looks fleshed out across Calendar, Brief·Today, Scores/Potential/Gems, Signals, and Journalists — not just Trends.

**Architecture:** Append synthesized, idempotent, zero-LLM seed steps to `infra/seeds/import_newsintel_peers.py`, all on the `demo` tenant, keyed to the existing `ALLOWED_TOPICS`/`TOPIC_POLICY` so the surfaces tell one coherent story. Verified by running against the local dev DB + rendering each surface with `OJ_TENANT_SLUG=demo`.

**Tech Stack:** Python (psycopg), Postgres. Demo-tenant-only; never touches `self`.

**Spec:** `docs/superpowers/specs/2026-06-20-onlinejourno-demo-fixture-design.md`.

---

## Task 1: Extend the fixture with all-surface seed steps

**File:** `infra/seeds/import_newsintel_peers.py` — add steps 6–10 (after the existing own-stories step 5), and enrich step 4's signals with `classify`. All idempotent via delete-by-`demo`-tenant.

- [ ] **Step 1: Enrich peer signals with `classify`** (IN·Sources/Signals look full). In step 4, add a topic→need map near the top constants:
```python
NEED_BY_TOPIC = {
    "economics_business": "Understand", "politics": "Understand", "defense_foreign": "Context",
    "crime": "Stay safe", "health_medicine": "Stay safe", "environment": "Context",
    "sports": "Be entertained", "consumer": "Make a decision", "civic_action": "Take action",
    "human_interest": "Connect",
}
```
and change the `enrichment` dict built per signal to:
```python
enrichment = {
    "analyse": {"entities": [topic]},
    "classify": {"user_need": NEED_BY_TOPIC.get(topic, "Understand"), "region": "IN"},
    "framing": framing,
}
```

- [ ] **Step 2: Calendar promises** (PLAN·Calendar). After step 5, append:
```python
        # 6. demo calendar promises (PLAN·Calendar). Demo tenant owns only demo data.
        cur.execute("delete from calendar_event where tenant_id = %s", (tenant_id,))
        PROMISES = [
            ("Finance Ministry", "table the quarterly fiscal review", -2, "day", "economics_business"),
            ("Election Commission", "announce the bypoll schedule", 1, "day", "politics"),
            ("Reserve Bank", "publish the monetary policy minutes", 3, "day", "economics_business"),
            ("Health Ministry", "release the vaccine coverage report", 6, "day", "health_medicine"),
            ("Supreme Court", "hear the data-protection petition", 9, "day", "civic_action"),
            ("Defence Ministry", "commission the new frigate", 20, "month", "defense_foreign"),
            ("Environment Ministry", "notify the coastal zone rules", 45, "month", "environment"),
            ("Sports Authority", "name the squad for the championship", 0, "day", "sports"),
            ("Consumer Affairs", "roll out the new labelling norms", -5, "day", "consumer"),
            ("City Corporation", "open the flyover to traffic", 70, "quarter", "civic_action"),
        ]
        for i, (who, what, days, prec, topic) in enumerate(PROMISES):
            target = (now + timedelta(days=days)).date()
            cur.execute(
                "insert into calendar_event (tenant_id, who, what, target_date, precision, topic, claim_key, extractor_version) "
                "values (%s,%s,%s,%s,%s,%s,%s,'demo-fixture')",
                (tenant_id, who, what, target, prec, topic, f"demo:cal:{i}"),
            )
```

- [ ] **Step 3: Open leads** (BRIEF·Today "what to chase"). Append:
```python
        # 7. demo open leads (BRIEF·Today). Varied importance/trend_score → the ladder.
        cur.execute("delete from story_leads where tenant_id = %s", (tenant_id,))
        LEADS = [
            ("SEBI tightens disclosure norms — first-mover window", "markets", "urgent", "idea", 82, "economics_business", "HC stay lifted this morning; peers not yet on it"),
            ("Bypoll schedule expected within 48h", "politics", "high", "pitched", 71, "politics", "EC briefing flagged; prep the explainer"),
            ("Vaccine coverage gaps across three states", "health", "high", "assigned", 64, "health_medicine", "Ministry data drop due; localise it"),
            ("New frigate commissioning — backgrounder", "defence", "normal", "idea", 48, "defense_foreign", None),
            ("Coastal zone rules — who is affected", "environment", "normal", "pitched", 41, "environment", None),
            ("Labelling norms — consumer impact", "consumer", "low", "idea", 28, "consumer", None),
            ("Championship squad — reactions", "sports", "normal", "assigned", 52, "sports", None),
            ("Data-protection petition — what is at stake", "legal", "high", "idea", 67, "civic_action", "SC hearing in 9 days; own the framing"),
        ]
        for title, beat, imp, status, ts, topic, note in LEADS:
            cur.execute(
                "insert into story_leads (tenant_id, title, beat, importance, status, trend_score, topic, note) "
                "values (%s,%s,%s,%s,%s,%s,%s,%s)",
                (tenant_id, title, beat, imp, status, ts, topic, note),
            )
```

- [ ] **Step 4: Reporters** (Journalists surface + commission assignees). Append:
```python
        # 8. demo reporters.
        cur.execute("delete from journalist_profiles where tenant_id = %s", (tenant_id,))
        REPORTERS = [
            ("asha-menon", "Asha Menon", "markets", "Mumbai", "MH", "reporter"),
            ("ravi-iyer", "Ravi Iyer", "politics", "Delhi", "DL", "reporter"),
            ("neha-banerjee", "Neha Banerjee", "health", "Kolkata", "WB", "reporter"),
            ("sameer-khan", "Sameer Khan", "defence", "Delhi", "DL", "desk"),
            ("priya-nair", "Priya Nair", "environment", "Bengaluru", "KA", "reporter"),
        ]
        for slug, name, beat, city, region, role in REPORTERS:
            cur.execute(
                "insert into journalist_profiles (tenant_id, slug, name, email, bureau, city, region, beats, role) "
                "values (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (tenant_id, slug, name, f"{slug}@demo.onlinejourno.com", city, city, region, Json([beat]), role),
            )
```

- [ ] **Step 5: Score the own-stories** (SCORE·Audit / Potential / Gems). **First inspect the real columns** — the migration shows `signal_id NOT NULL` but `lib/db.ts` joins on `story_id`; reconcile against the live schema before inserting:
```bash
psql "$DATABASE_URL" -c "\d distribution_fit_scores"
```
Then append a step that, for each demo own-story (`stories.cms_ref like 'demo:%'`), inserts a `distribution_fit_scores` row per surface (`discover`/`news`/`search`) with `score`/`grade`/`top_fix`, populating whichever of `story_id`/`signal_id` the live schema requires (story_id per the query; if `signal_id` is also NOT NULL, link the story's source signal or relax via the actual schema):
```python
        # 9. score demo own-stories so Score·Audit / Potential / Gems render.
        cur.execute("select id from stories where tenant_id = %s and cms_ref like 'demo:%%'", (tenant_id,))
        story_ids = [r[0] for r in cur.fetchall()]
        cur.execute("delete from distribution_fit_scores where tenant_id = %s", (tenant_id,))
        SURFACES = [("discover", 78, "B"), ("news", 64, "C"), ("search", 86, "A")]
        for sid in story_ids:
            for surface, score, grade in SURFACES:
                cur.execute(
                    "insert into distribution_fit_scores (tenant_id, story_id, surface, score, grade, top_fix, signals) "
                    "values (%s,%s,%s,%s,%s,%s,%s)",
                    (tenant_id, sid, surface, score, grade, "Sharpen the headline for this surface", Json({})),
                )
```
Adjust the column list to match `\d` output exactly (add `signal_id` if required; add `published_at`/`url` to the step-5 own-stories if the scores/potential queries need them).

- [ ] **Step 6: Update the summary print** to include the new counts:
```python
        print(f"demo tenant {tenant_id}: {len(peers)} peers, {inserted} signals, {own} own stories, "
              f"{len(PROMISES)} promises, {len(LEADS)} leads, {len(REPORTERS)} reporters, {len(story_ids)*3} scores")
```

- [ ] **Step 7: Syntax check + commit.**
```bash
cd /Users/subhashrai/projects/platform
python3 -m py_compile infra/seeds/import_newsintel_peers.py
git add infra/seeds/import_newsintel_peers.py
git commit -m "feat(seed): flesh out demo tenant across all surfaces (calendar/leads/journalists/scores/classify)"
```

---

## Task 2: Run + verify locally

**Files:** none (verification).

- [ ] **Step 1: Run against the local dev DB.**
```bash
cd /Users/subhashrai/projects/platform
DATABASE_URL="postgres://localhost:5432/onlinejourno_dev" uv run --with psycopg infra/seeds/import_newsintel_peers.py ~/projects/news-intel/data/news_intel.db
```
Expected: summary line with non-zero peers/signals/own/promises/leads/reporters/scores.

- [ ] **Step 2: Idempotency — run it again.** Same counts, no duplicate-key errors.

- [ ] **Step 3: Verify per-surface counts.**
```bash
psql "postgres://localhost:5432/onlinejourno_dev" -c "
 with t as (select id from tenants where slug='demo')
 select 'promises', count(*) from calendar_event where tenant_id=(select id from t)
 union all select 'open_leads', count(*) from story_leads where tenant_id=(select id from t) and status in ('idea','pitched','assigned')
 union all select 'reporters', count(*) from journalist_profiles where tenant_id=(select id from t)
 union all select 'scores', count(*) from distribution_fit_scores where tenant_id=(select id from t)
 union all select 'signals_classified', count(*) from signals where tenant_id=(select id from t) and enrichment->'classify' is not null;"
```
Expected: promises 10, open_leads 8, reporters 5, scores 15, signals_classified > 0.

- [ ] **Step 4: Render check.** `OJ_TENANT_SLUG=demo pnpm --filter @onlinejourno/web dev`, then load (authed or via a quick smoke) `/en/calendar` (promises + now-block), `/en/brief` (ranked leads), `/en/scores` (scored), `/en/journalists` (reporters), `/en/trends` (unchanged). Each should look populated, not empty.

- [ ] **Step 5: Vendor-neutral + self-safety check.**
```bash
psql "postgres://localhost:5432/onlinejourno_dev" -c "select name from tenants where slug='demo';"  -- 'Demo Newsroom'
psql "postgres://localhost:5432/onlinejourno_dev" -c "select count(*) from calendar_event where tenant_id=(select id from tenants where slug='self');"  -- unchanged by this run
```

## Notes for the executor
- The demo tenant is fully synthetic → delete-by-`tenant_id` is the idempotency mechanism for the new tables (no cross-tenant risk; the script only ever writes the `demo` tenant).
- Zero LLM: every value is literal in the seed. No enrichment/pipeline calls.
- The one schema unknown is `distribution_fit_scores` (story_id vs signal_id NOT NULL) — Step 5 inspects `\d` first and matches the live columns. Don't guess; read the schema.
- Running on **prod** is a later ops step (after local verify), via the prod `DATABASE_URL` over `fly`.
