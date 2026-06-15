# IA Slice 2 — Story Scores (locale-aware, competitor-aware labels, published stories)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Fix the Story Scores model per the founder critique — a US-trending story must not score 90/100 for an India outlet. Make the score **locale/market-aware** (down-weight + label off-market trends using `tenants.region` + entity geo), rank **published stories** (not the inflow signals), and **relabel** the components so a journalist knows *alignment to what* and *authority whose*.

**Architecture:** The scoring is TS — `apps/web/lib/potential.ts` `scorePotential` (powers `/potential`). Make it source-agnostic + locale-aware; add a published-stories fetch in `db.ts`; rewire `/potential` to rank published stories with the outlet's region, and relabel the render. True competitor-relative authority needs the Topic→Domains/GDELT data → **Slice 4**; this slice relabels authority as "your coverage share" + locale-scopes it.

**Decisions (founder, 2026-06-15):** off-market trends → **down-weight + label** (not hard-filter); authority → **relabel now, competitors in Slice 4**.

**Tech Stack:** Next.js 15 + TS. No TS test runner → verify with `type-check` + a `tsx` sanity check of `scorePotential` for the exact Oliver-Tree (US, foreign) case + a local case. `/potential` is auth-gated → flag the visual.

**Spec:** `docs/superpowers/specs/2026-06-15-ia-realignment-design.md` (fix #7) + memory `onlinejourno-locale-relative-scoring`.

---

## File Structure
- Modify: `apps/web/lib/potential.ts` — locale-aware `scorePotential` + relabeled semantics; source-agnostic input.
- Modify: `apps/web/lib/db.ts` — `publishedStoriesForScoring(tenantId, hours)` + `tenantRegion(tenantId)`.
- Modify: `apps/web/app/[locale]/potential/page.tsx` — rank published stories, pass region, relabel render + "how calculated" + what/why/how.

---

### Task 1: Locale-aware `scorePotential` + relabel

**Files:** Modify `apps/web/lib/potential.ts`. Sanity: `apps/web/lib/potential.sanity.mts` (temp, not committed).

Current: `alignment = matched ? (inHeadline ? 100 : 60) : 0`; `authority = host share among our coverage`; momentum/freshness fine. The trend isn't locale-scoped → a US trend → alignment 100.

- [ ] **Step 1: Write a `tsx` sanity check** (temp file `apps/web/lib/potential.sanity.mts`) that imports `scorePotential` and asserts: a **local** (region-matching) matched trend keeps full alignment; a **foreign** matched trend (entity geo / story region outside the outlet region) gets a **reduced** alignment and `foreign === true`; momentum/freshness unchanged. Use the Oliver-Tree shape (US trend, India outlet) → expect `foreign` + lower potential than the same story if it were local.

- [ ] **Step 2: Run it — expect FAIL** (no locale param yet). `cd apps/web && pnpm exec tsx lib/potential.sanity.mts` (if `tsx` is absent, `pnpm add -D tsx` in apps/web, or use `pnpm dlx tsx`). Expected: error / wrong values.

- [ ] **Step 3: Implement locale-awareness in `scorePotential`**
  - Add params: `outletRegion: string` (e.g. `"IN"`) and the item's geo signal. Make the function source-agnostic — it already takes a `signal`-like object; document it accepts `{ host, published_at, headline, entities, region }` (a story or a signal). 
  - Add `marketRelevance(trend, item, outletRegion) -> { local: boolean, factor: number }`: derive the matched trend's/ item's dominant geo from entity geo / `item.region`; if it is within `outletRegion` → `local`, factor `1.0`; if clearly foreign → `local:false`, factor `0.4` (the down-weight). Default to `local:true, 1.0` when geo is unknown (don't penalise unknowns).
  - `alignment = baseAlignment * factor` (baseAlignment = the current 100/60/0). Add `foreign: boolean` (= `!local`) and `marketFactor: number` to `PotentialScore`.
  - **Relabel semantics** (comments + any label constants): `alignment` → "Trend fit (your market)"; `authority` → "Topic ownership (your coverage share)" — note in a comment that competitor-relative authority lands in Slice 4 (Topic→Domains). Keep the `authority` value computation as-is for now (host share), just clearly labeled.
  - Keep `WEIGHTS`, momentum, freshness, `potentialLabel` unchanged.

- [ ] **Step 4: Run sanity — expect PASS** (foreign down-weighted + flagged; local unchanged). Then `pnpm --filter @onlinejourno/web type-check` → clean. Delete the temp `.mts`.

- [ ] **Step 5: Commit**
```bash
git add apps/web/lib/potential.ts
git commit -m "story-scores: locale-aware scoring — down-weight + flag off-market trends; relabel alignment/authority"
```

---

### Task 2: Published-stories source + tenant region

**Files:** Modify `apps/web/lib/db.ts`.

- [ ] **Step 1: Add `tenantRegion(tenantId)`** — `select region from tenants where id=$1` → string (default `"IN"` if null). And **`publishedStoriesForScoring(tenantId, hours = 168)`** — `select id, url, headline, published_at, section, region, enrichment from stories where tenant_id=$1 and status='published' and coalesce(published_at, created_at) >= now() - make_interval(hours => $2) order by coalesce(published_at, created_at) desc` → typed rows exposing `headline`, `url` (→ host via `new URL`), `published_at`, `region`, and `enrichment.analyse.entities` (string[]). Mirror the existing `storiesWithScores` row-typing + `getPool()` idiom.

- [ ] **Step 2: Type-check** → clean.

- [ ] **Step 3: Commit**
```bash
git add apps/web/lib/db.ts
git commit -m "story-scores: publishedStoriesForScoring + tenantRegion db helpers"
```

---

### Task 3: `/potential` ranks published stories, locale-aware render

**Files:** Modify `apps/web/app/[locale]/potential/page.tsx`.

- [ ] **Step 1: Swap the data source** — replace `fetchLatestSignals(...)` with `publishedStoriesForScoring(tenantId, ...)`; fetch `tenantRegion(tenantId)`. Score each story with `scorePotential(story, topics, now, outletRegion)` (map story → the `{host, published_at, headline, entities, region}` shape). Keep `topicMomentum` for the trend set.

- [ ] **Step 2: Relabel the render + add context** — in the per-story line, change `alignment {x} · authority {y}` to **`trend fit {x} · topic ownership {y}`**; when `score.foreign`, show a muted **"foreign trend"** chip next to the matched-trend tag with a tooltip/aside "trending outside your market — down-weighted." Update the "How is the Discover Potential score calculated?" block to explain, in plain language for a non-digital journalist: momentum (how fast the topic moves), **trend fit — to a trend in *your* market** (foreign trends count less), **topic ownership — your coverage share on the topic** (competitor comparison arrives with Topic→Domains), freshness. Update the page intro if needed to say "published stories."

- [ ] **Step 3: Type-check** → clean.

- [ ] **Step 4: Verify** — `/potential` is auth-gated; if you can't sign in, confirm via `type-check` + that the page compiles and the data path resolves, and flag the visual for the controller. If you can run the dev server + a story exists, confirm a foreign-trend story now scores lower + shows the "foreign trend" chip.

- [ ] **Step 5: Commit**
```bash
git add "apps/web/app/[locale]/potential/page.tsx"
git commit -m "story-scores: rank published stories, locale-aware labels (trend fit / topic ownership)"
```

---

## Self-review checklist
- **Critique coverage:** US-trend-90 fixed via market down-weight + `foreign` flag (T1) ✓; "alignment to what" → "trend fit (your market)" (T1+T3) ✓; "authority whose" → "topic ownership (your coverage share)" + Slice-4 competitor note (T1+T3) ✓; "published stories not inflow" → `publishedStoriesForScoring` (T2+T3) ✓; momentum/freshness untouched ✓.
- **Decisions honored:** down-weight+label (factor 0.4 + chip), not hard-filter; relabel-now, competitors Slice 4.
- **Placeholders:** none.
- **Type consistency:** `PotentialScore` gains `foreign:boolean` + `marketFactor:number`, used in T3 render; `scorePotential` new `outletRegion` param threaded from `tenantRegion` (T2) in T3.
- **Testing caveat:** TS scoring verified via `tsx` sanity (temp) + type-check (no committed TS test runner — consistent with the platform).
