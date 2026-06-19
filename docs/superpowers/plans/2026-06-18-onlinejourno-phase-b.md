# OnlineJourno Phase B — "where you stand" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "baseline pending" placeholders on the FRAME·Analyse (`/trends`) topic cards with real position tags (`NO ANGLE` / `BEHIND` / `ON IT` / `PEAK`) + fact-slotted editorial implications, measured against a per-tenant peer baseline.

**Architecture:** Request-time compute in `apps/web/lib/`. A pure module (`framing-position.ts`) derives the tag + implication from per-topic standings. `db.ts` supplies standings: **own coverage** from the tenant's own `stories` (published work), **peer coverage** from `signals` whose `raw_payload.domain` is in `tenants.config.peers`. The page composes them per card. Real tenants use their own configured peer set + own inflow (vendor-neutral); a separate seeded `demo` tenant shows the rich news-intel corpus, viewable via a `TENANT_SLUG` switch. No migration (peers live in `config` jsonb; corpus in existing tables).

**Tech Stack:** Next.js 15 / React 19 (App Router, server components), TypeScript, `pg`, Postgres (Neon). Python (`psycopg`, stdlib `sqlite3`) for the demo seed. Tests via `node:test` + `tsx`.

**Spec:** `docs/superpowers/specs/2026-06-18-onlinejourno-phase-b-design.md`.

**Refinement vs spec (reconciled):** the spec's data-flow loosely wrote `ownRecent = TopicTrend.recent` (signals) and "broaden card set to own∪peer." The correct, simpler mechanism: **own coverage comes from `stories`** (the tenant's own published work — that is what "your angle" means), while the existing field-momentum topic set (built from signal entities) already spans peer-covered topics. So `NO ANGLE` fires naturally when own-stories = 0 on a trending topic; no separate set-union is needed. Spec patched to match.

**Post-implementation correction (2026-06-19, from verification):** Task 1's `PEAKED` set below lists `near peak — may plateau`, but verification on seeded data showed `predictTrajectory` returns that string for any topic at its max heat (peakRatio≈1) — an *ascending* topic — so PEAK swallowed ON IT/BEHIND. The shipped code (commit `009430f`) drops `near peak — may plateau` from `PEAKED` (only `at peak` / `fading` / `cooling` are PEAK). The Task 1 test fixture's `still building — peak not yet reached` is also unreachable in `predictTrajectory` and was replaced. Treat the shipped `framing-position.ts` + spec as canonical over the Task 1 snippet here.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/lib/framing-position.ts` | **NEW.** Pure, DB-free. `derivePosition()` (the tag ladder + confidence + framing-nuance flags) and `implicationFor()` (templated, fact-slotted copy). The only place the editorial logic lives. |
| `apps/web/lib/framing-position.test.ts` | **NEW.** `node:test` golden cases for every ladder branch, confidence boundary, and omitted-slot case. |
| `apps/web/package.json` | **MODIFY.** Add `tsx` devDep + a `test` script. |
| `apps/web/lib/db.ts` | **MODIFY.** Add `tenantPeers()`, `ownTopicStandings()`, `peerTopicStandings()` + their row types. SQL only; no editorial logic. |
| `apps/web/app/[locale]/trends/page.tsx` | **MODIFY.** Fetch peers + standings; per card compute the position and render the tag chip + implication; drop the "Phase B pending" deck note. Composition only. |
| `infra/seeds/self_peers.sql` | **NEW.** Sets `self`'s `config.peers` (vendor-neutral, the outlet's own peer set). Enables real tags on the live `self` tenant. |
| `infra/seeds/import_newsintel_peers.py` | **NEW.** Creates/loads a `demo` tenant: `entities`→`config.peers`, `coded_articles`→`signals.enrichment.framing`. Idempotent; demo-tenant-only. |

---

## Task 1: Pure derivation module + test runner

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/lib/framing-position.ts`
- Test: `apps/web/lib/framing-position.test.ts`

- [ ] **Step 1: Add the test runner**

Run:
```bash
cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web add -D tsx
```
Then add the `test` script to `apps/web/package.json` `"scripts"` (keep the others):
```json
    "type-check": "tsc --noEmit",
    "test": "node --import tsx --test \"lib/**/*.test.ts\""
```
(Requires Node ≥ 20.6 for `--import`; the repo already targets `@types/node ^20`.)

- [ ] **Step 2: Write the failing test**

Create `apps/web/lib/framing-position.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { derivePosition, implicationFor, type PositionInputs } from "./framing-position";

const base: PositionInputs = {
  ownRecent: 3, peerRecent: 10, peerCount: 4, peerMedian: 2,
  trajectory: "still building — peak not yet reached",
  ownCombative: 1, ownExplanatory: 2,
  peerCombative: 8, peerExplanatory: 1,
  nOwn: 6, nPeer: 40,
};

test("NO ANGLE when own coverage is zero and peers cover it", () => {
  const p = derivePosition({ ...base, ownRecent: 0 });
  assert.equal(p.tag, "NO_ANGLE");
});

test("PEAK when own covers and trajectory has peaked", () => {
  const p = derivePosition({ ...base, trajectory: "at peak — watch for plateau" });
  assert.equal(p.tag, "PEAK");
});

test("BEHIND when rising and own is below the peer median", () => {
  const p = derivePosition({ ...base, ownRecent: 1, peerMedian: 5 });
  assert.equal(p.tag, "BEHIND");
});

test("ON IT when rising and own is at/above the peer median", () => {
  const p = derivePosition({ ...base, ownRecent: 5, peerMedian: 2 });
  assert.equal(p.tag, "ON_IT");
});

test("confidence: full ≥30, amber 5–29, low <5", () => {
  assert.equal(derivePosition({ ...base, nPeer: 30 }).confidence, "full");
  assert.equal(derivePosition({ ...base, nPeer: 29 }).confidence, "amber");
  assert.equal(derivePosition({ ...base, nPeer: 5 }).confidence, "amber");
  assert.equal(derivePosition({ ...base, nPeer: 4 }).confidence, "low");
});

test("low confidence suppresses the framing nuance", () => {
  const p = derivePosition({ ...base, ownRecent: 0, nPeer: 3 });
  assert.equal(p.peersCombativeHeavy, false);
});

test("NO ANGLE implication names the peer count and the explanatory opening", () => {
  const p = derivePosition({ ...base, ownRecent: 0 });
  assert.equal(
    implicationFor(p, { momentum: 70, peerCount: 4 }),
    "Peer-led (4 outlets). No angle from you yet. Explanatory angle open.",
  );
});

test("BEHIND implication omits unknown slots, keeps known ones", () => {
  const p = derivePosition({ ...base, ownRecent: 1, peerMedian: 5 });
  assert.equal(implicationFor(p, { momentum: 70, peerCount: 4 }), "Peers ahead — you're light on it.");
  assert.equal(
    implicationFor(p, { momentum: 70, peerCount: 4, event: "the HC stay", briefReady: true }),
    "Peers ahead since the HC stay — you're light on it. You have a brief ready.",
  );
});

test("ON IT implication is the explanatory window when peers are combative and you're thin", () => {
  const p = derivePosition({ ...base, ownRecent: 5, peerMedian: 2, ownExplanatory: 0, ownCombative: 1 });
  assert.equal(implicationFor(p, { momentum: 50, peerCount: 4 }), "Explanatory window still open.");
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:
```bash
cd /Users/subhashrai/projects/platform/apps/web && pnpm test
```
Expected: FAIL — `Cannot find module './framing-position'`.

- [ ] **Step 4: Write the implementation**

Create `apps/web/lib/framing-position.ts`:
```ts
// Pure "where you stand" derivation — the editorial logic for the FRAME·Analyse
// cards. No DB, no React; fully unit-tested. See docs/superpowers/specs/
// 2026-06-18-onlinejourno-phase-b-design.md.

export type PositionTag = "NO_ANGLE" | "BEHIND" | "ON_IT" | "PEAK";
export type Confidence = "full" | "amber" | "low";

export type PositionInputs = {
  ownRecent: number; // own published stories on the topic in the window
  peerRecent: number; // peer signals on the topic in the window
  peerCount: number; // distinct peer outlets covering it
  peerMedian: number; // median per-peer mention count
  trajectory: string; // from lib/trends.ts predictTrajectory
  ownCombative: number;
  ownExplanatory: number;
  peerCombative: number;
  peerExplanatory: number;
  nOwn: number; // own framing-coded count on the topic
  nPeer: number; // peer framing-coded count on the topic
};

export type Position = {
  tag: PositionTag;
  confidence: Confidence;
  peersCombativeHeavy: boolean; // framing nuance, only when confidence allows
  ownThinExplanatory: boolean;
};

// Trajectory strings (lib/trends.ts predictTrajectory) that mean the topic has
// crested. Everything else among live topics is treated as rising.
const PEAKED = new Set<string>([
  "near peak — may plateau",
  "at peak — watch for plateau",
  "fading fast — post-peak",
  "cooling — interest declining",
]);

function confidenceFor(nPeer: number): Confidence {
  if (nPeer >= 30) return "full";
  if (nPeer >= 5) return "amber";
  return "low";
}

export function derivePosition(i: PositionInputs): Position {
  const confidence = confidenceFor(i.nPeer);
  // Never assert a framing nuance on too small a sample (honest-data).
  const peersCombativeHeavy =
    confidence !== "low" && i.peerCombative > i.peerExplanatory && i.peerCombative > 0;
  const ownThinExplanatory = i.ownExplanatory === 0 || i.ownExplanatory < i.ownCombative;

  let tag: PositionTag;
  if (i.ownRecent === 0) {
    tag = "NO_ANGLE"; // page only passes topics that peers (or you) cover
  } else if (PEAKED.has(i.trajectory)) {
    tag = "PEAK";
  } else if (i.ownRecent < i.peerMedian) {
    tag = "BEHIND";
  } else {
    tag = "ON_IT";
  }
  return { tag, confidence, peersCombativeHeavy, ownThinExplanatory };
}

export type ImplicationSlots = {
  momentum: number;
  peerCount: number;
  event?: string | null; // omitted if no clear driver — never fabricated
  briefReady?: boolean; // a matching calendar_event / story_lead exists
};

export function implicationFor(pos: Position, s: ImplicationSlots): string {
  switch (pos.tag) {
    case "NO_ANGLE": {
      const base = `Peer-led (${s.peerCount} outlet${s.peerCount === 1 ? "" : "s"}). No angle from you yet.`;
      return pos.peersCombativeHeavy ? `${base} Explanatory angle open.` : base;
    }
    case "BEHIND": {
      const since = s.event ? ` since ${s.event}` : "";
      const brief = s.briefReady ? " You have a brief ready." : "";
      return `Peers ahead${since} — you're light on it.${brief}`;
    }
    case "ON_IT":
      return pos.peersCombativeHeavy && pos.ownThinExplanatory
        ? "Explanatory window still open."
        : "On it — keeping pace.";
    case "PEAK":
      return "Past peak — your angle's live.";
  }
}

// CSS class for the tag chip (classes already in globals.css from Phase A).
export function tagClass(tag: PositionTag): string {
  return {
    NO_ANGLE: "ds-tag-noangle",
    BEHIND: "ds-tag-behind",
    ON_IT: "ds-tag-onit",
    PEAK: "ds-tag-peak",
  }[tag];
}

export function tagLabel(tag: PositionTag): string {
  return { NO_ANGLE: "NO ANGLE", BEHIND: "BEHIND", ON_IT: "ON IT", PEAK: "PEAK" }[tag];
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
cd /Users/subhashrai/projects/platform/apps/web && pnpm test
```
Expected: PASS — all tests (`# pass 9`).

- [ ] **Step 6: Commit**

```bash
cd /Users/subhashrai/projects/platform
git add apps/web/lib/framing-position.ts apps/web/lib/framing-position.test.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(trends): pure where-you-stand position derivation + tests"
```

---

## Task 2: Standings queries in `db.ts`

**Files:**
- Modify: `apps/web/lib/db.ts` (add three functions + types near `tenantOutletDomain`)

No DB unit harness exists; this task is verified by `type-check` + `build` + the live verify in Task 6. Write the SQL exactly as below.

- [ ] **Step 1: Add `tenantPeers()` (mirrors `tenantOutletDomain`)**

Append to `apps/web/lib/db.ts`:
```ts
// ── Phase B: competitive standings ───────────────────────────────────────────

export type Peer = { domain: string; name: string; tier: string };

/** The tenant's peer set from config (vendor-neutral — never hardcoded).
 *  config.peers = [{domain, name, tier}]. Empty array when unset. */
export async function tenantPeers(tenantId: string): Promise<Peer[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ peers: Peer[] | null }>(
    "select config->'peers' as peers from tenants where id = $1",
    [tenantId],
  );
  const raw = rows[0]?.peers;
  return Array.isArray(raw) ? raw.filter((p) => p && typeof p.domain === "string") : [];
}
```

- [ ] **Step 2: Add `ownTopicStandings()` (own published stories)**

Append to `apps/web/lib/db.ts`:
```ts
export type OwnStanding = {
  topic: string;
  ownRecent: number;
  ownCombative: number;
  ownExplanatory: number;
  nOwn: number;
};

/** Per-topic own-coverage from the tenant's published stories in the window.
 *  Topic match is headline ILIKE — stories may not carry the analyse-entity
 *  array that signals do. Framing group from stories.enrichment->'framing'. */
export async function ownTopicStandings(
  tenantId: string,
  topics: string[],
  windowHours: number,
): Promise<Map<string, OwnStanding>> {
  if (topics.length === 0) return new Map();
  const pool = getPool();
  const { rows } = await pool.query<OwnStanding>(
    `
    select t.topic,
           count(st.id)::int as "ownRecent",
           count(*) filter (where st.enrichment->'framing'->>'frame_group' = 'combative')::int   as "ownCombative",
           count(*) filter (where st.enrichment->'framing'->>'frame_group' = 'explanatory')::int as "ownExplanatory",
           count(*) filter (where st.enrichment->'framing' is not null)::int as "nOwn"
      from unnest($2::text[]) as t(topic)
      left join stories st
        on st.tenant_id = $1
       and st.status = 'published'
       and st.headline ilike '%' || t.topic || '%'
       and coalesce(st.published_at, st.created_at)
           >= now() - make_interval(hours => $3)
     group by t.topic
    `,
    [tenantId, topics, windowHours],
  );
  return new Map(rows.map((r) => [r.topic, r]));
}
```

- [ ] **Step 3: Add `peerTopicStandings()` (peer-domain signals)**

Append to `apps/web/lib/db.ts`:
```ts
export type PeerStanding = {
  topic: string;
  peerRecent: number;
  peerCount: number;
  perDomain: number[]; // per-peer mention counts (for the median)
  peerCombative: number;
  peerExplanatory: number;
  nPeer: number;
};

/** Per-topic peer-coverage from signals whose raw_payload.domain is in the
 *  peer set. Topic match uses the analyse-entity array (as topicMomentum does).
 *  perDomain feeds the median computed in the page. */
export async function peerTopicStandings(
  tenantId: string,
  topics: string[],
  windowHours: number,
  peerDomains: string[],
): Promise<Map<string, PeerStanding>> {
  if (topics.length === 0 || peerDomains.length === 0) return new Map();
  const pool = getPool();
  const { rows } = await pool.query<{
    topic: string;
    peerRecent: number;
    peerCount: number;
    perDomain: number[];
    peerCombative: number;
    peerExplanatory: number;
    nPeer: number;
  }>(
    `
    with hits as (
      select t.topic,
             s.raw_payload->>'domain' as domain,
             s.enrichment->'framing'->>'frame_group' as frame_group,
             (s.enrichment->'framing' is not null) as coded
        from unnest($2::text[]) as t(topic)
        join signals s
          on s.tenant_id = $1
         and s.raw_payload->>'domain' = any($4::text[])
         and s.enrichment->'analyse'->'entities' @> to_jsonb(array[t.topic])
         and coalesce(s.published_at, s.fetched_at)
             >= now() - make_interval(hours => $3)
    ),
    per_domain as (
      select topic, domain, count(*)::int as n from hits group by topic, domain
    )
    select h.topic,
           count(*)::int as "peerRecent",
           count(distinct h.domain)::int as "peerCount",
           coalesce((select array_agg(pd.n) from per_domain pd where pd.topic = h.topic), '{}')::int[] as "perDomain",
           count(*) filter (where h.frame_group = 'combative')::int as "peerCombative",
           count(*) filter (where h.frame_group = 'explanatory')::int as "peerExplanatory",
           count(*) filter (where h.coded)::int as "nPeer"
      from hits h
     group by h.topic
    `,
    [tenantId, topics, windowHours, peerDomains],
  );
  return new Map(rows.map((r) => [r.topic, r]));
}
```

- [ ] **Step 4: Verify it type-checks**

Run:
```bash
cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/subhashrai/projects/platform
git add apps/web/lib/db.ts
git commit -m "feat(trends): per-topic own (stories) + peer (signals) standings queries"
```

---

## Task 3: Wire the cards in `trends/page.tsx`

**Files:**
- Modify: `apps/web/app/[locale]/trends/page.tsx`

- [ ] **Step 1: Import the new helpers**

In the `@/lib/db` import block (top of file) add `tenantPeers`, `ownTopicStandings`, `peerTopicStandings`. Add a new import line below the trends import:
```ts
import {
  derivePosition,
  implicationFor,
  tagClass,
  tagLabel,
  type PositionInputs,
} from "@/lib/framing-position";
```

- [ ] **Step 2: Add a median helper near the top-level helpers (after `direction`)**
```ts
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
```

- [ ] **Step 3: Fetch peers + standings**

After `topics` is computed (the `topicMomentum(...).slice(0, TOP)` result) and after `tenantId` is known, add:
```ts
  const topicNames = topics.map((t) => t.topic);
  const peers = await tenantPeers(tenantId);
  const peerDomains = peers.map((p) => p.domain);
  const [ownStandings, peerStandings] = await Promise.all([
    ownTopicStandings(tenantId, topicNames, windowHours),
    peerTopicStandings(tenantId, topicNames, windowHours, peerDomains),
  ]);
```

- [ ] **Step 4: Replace the "baseline pending" span**

In the `topics.map((t) => { ... })` block, replace these lines (currently ~:208–222):
```tsx
              const label = momentumLabel(t.momentum);
              const color = labelColor(label);
              const dir = direction(t.recent, t.prior);
              return (
                <div key={t.topic} className="ds-card">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h3
                      className="text-base font-semibold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {t.topic}
                    </h3>
                    <span className="ds-tag" style={{ color: "var(--color-fg-tertiary)" }}>
                      baseline pending
                    </span>
                  </div>
```
with:
```tsx
              const label = momentumLabel(t.momentum);
              const color = labelColor(label);
              const dir = direction(t.recent, t.prior);
              const own = ownStandings.get(t.topic);
              const peer = peerStandings.get(t.topic);
              const hasPeerData = (peer?.peerRecent ?? 0) > 0;
              const inputs: PositionInputs = {
                ownRecent: own?.ownRecent ?? 0,
                peerRecent: peer?.peerRecent ?? 0,
                peerCount: peer?.peerCount ?? 0,
                peerMedian: median(peer?.perDomain ?? []),
                trajectory: t.trajectory,
                ownCombative: own?.ownCombative ?? 0,
                ownExplanatory: own?.ownExplanatory ?? 0,
                peerCombative: peer?.peerCombative ?? 0,
                peerExplanatory: peer?.peerExplanatory ?? 0,
                nOwn: own?.nOwn ?? 0,
                nPeer: peer?.nPeer ?? 0,
              };
              const pos = hasPeerData ? derivePosition(inputs) : null;
              const implication = pos
                ? implicationFor(pos, { momentum: t.momentum, peerCount: inputs.peerCount })
                : null;
              return (
                <div key={t.topic} className="ds-card">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <h3
                      className="text-base font-semibold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {t.topic}
                    </h3>
                    {pos ? (
                      <span
                        className={`ds-tag ${tagClass(pos.tag)}${pos.confidence === "amber" ? " ds-amber" : ""}`}
                      >
                        {tagLabel(pos.tag)}
                      </span>
                    ) : (
                      <span className="ds-tag" style={{ color: "var(--color-fg-tertiary)" }}>
                        no peer data
                      </span>
                    )}
                  </div>
```

- [ ] **Step 5: Render the implication line**

Immediately after the closing `</div>` of the title row added above (before the `<p className="text-sm mb-2" ...>` momentum line), insert:
```tsx
                  {implication && (
                    <p
                      className="text-sm mb-2"
                      style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
                    >
                      {implication}
                      {pos?.confidence === "amber" && (
                        <span className="ds-amber"> · low confidence</span>
                      )}
                    </p>
                  )}
```

- [ ] **Step 6: Update the deck copy (drop the Phase-B-pending note)**

Replace the deck paragraph (currently ~:140–144):
```tsx
        <p className="ds-deck">
          The framing landscape plus what&rsquo;s trending — by topic and by place — measured
          against your baseline. <span className="ds-amber">Competitive positioning lights up
          once your peer set is wired (Phase B).</span>
        </p>
```
with:
```tsx
        <p className="ds-deck">
          The framing landscape plus what&rsquo;s trending — by topic and by place — measured
          against your peer baseline: where you&rsquo;re ahead, behind, or have no angle yet.
        </p>
```

- [ ] **Step 7: Verify type-check + build**

Run:
```bash
cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build
```
Expected: type-check clean; `next build` completes with no errors.

- [ ] **Step 8: Commit**

```bash
cd /Users/subhashrai/projects/platform
git add "apps/web/app/[locale]/trends/page.tsx"
git commit -m "feat(trends): render position tags + implications on Analyse cards"
```

---

## Task 4: Configure `self`'s peer set (vendor-neutral)

**Files:**
- Create: `infra/seeds/self_peers.sql`

This lights real tags on the live `self` tenant from its own inflow. Peers are the outlet's own competitive set — config, never hardcoded in source.

- [ ] **Step 1: Write the seed**

Create `infra/seeds/self_peers.sql`:
```sql
-- Phase B: self tenant's peer set (vendor-neutral; config, not source).
-- Domains must match raw_payload->>'domain' values present in self's signal
-- inflow so peer standings have data. Adjust the list to the real peer set.
update tenants
   set config = coalesce(config, '{}'::jsonb) || jsonb_build_object(
         'peers', jsonb_build_array(
           jsonb_build_object('domain','thehindu.com','name','The Hindu','tier','peer'),
           jsonb_build_object('domain','indianexpress.com','name','The Indian Express','tier','peer'),
           jsonb_build_object('domain','timesofindia.indiatimes.com','name','The Times of India','tier','peer'),
           jsonb_build_object('domain','hindustantimes.com','name','Hindustan Times','tier','peer'),
           jsonb_build_object('domain','ndtv.com','name','NDTV','tier','peer')
         )
       )
 where slug = 'self';
```

- [ ] **Step 2: Apply against the database and confirm**

Run (uses the same `DATABASE_URL` the app uses):
```bash
cd /Users/subhashrai/projects/platform
psql "$DATABASE_URL" -f infra/seeds/self_peers.sql
psql "$DATABASE_URL" -c "select config->'peers' from tenants where slug='self';"
```
Expected: the `peers` array prints with five entries.

- [ ] **Step 3: Commit**

```bash
git add infra/seeds/self_peers.sql
git commit -m "feat(seed): self tenant peer set for Phase B standings"
```

---

## Task 5: Demo tenant + news-intel importer + tenant switch

**Files:**
- Create: `infra/seeds/import_newsintel_peers.py`
- Modify: `apps/web/app/[locale]/trends/page.tsx` (make `TENANT_SLUG` switchable)

The rich 30-outlet showcase, isolated on a `demo` tenant. Never touches `self`.

- [ ] **Step 1: Make the page tenant switchable**

In `apps/web/app/[locale]/trends/page.tsx`, replace:
```ts
const TENANT_SLUG = "self";
```
with:
```ts
const TENANT_SLUG = process.env.OJ_TENANT_SLUG ?? "self";
```

- [ ] **Step 2: Write the importer**

Create `infra/seeds/import_newsintel_peers.py`:
```python
#!/usr/bin/env python3
"""Seed a `demo` tenant from the news-intel SQLite: entities -> config.peers,
coded_articles -> signals.enrichment.framing. Idempotent; demo-tenant-only.

Usage: DATABASE_URL=... python infra/seeds/import_newsintel_peers.py \
         ~/projects/news-intel/data/news_intel.db
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from urllib.parse import urlparse

import psycopg
from psycopg.types.json import Json

# news-intel snake_case frame -> platform PEJ Title-Case (framing.py FRAME_GROUPS keys).
FRAME_MAP = {
    "conflict": "Conflict",
    "horse_race": "Horse Race",
    "wrongdoing": "Wrongdoing Exposed",
    "process": "Process",
    "trend": "Trend",
    "straight_news": "Straight News",
    "policy_explored": "Policy Explored",
    "conjecture": "Conjecture",
    "reaction": "Reaction",
    "reality_check": "Reality Check",
    "personality_profile": "Personality Profile",
}


def domain_of(url: str) -> str:
    return (urlparse(url).hostname or "").removeprefix("www.")


def main(sqlite_path: str) -> None:
    sdb = sqlite3.connect(sqlite_path)
    sdb.row_factory = sqlite3.Row
    pg = psycopg.connect(os.environ["DATABASE_URL"])

    with pg, pg.cursor() as cur:
        # 1. demo tenant (idempotent)
        cur.execute(
            """
            insert into tenants (slug, name, tier)
            values ('demo', 'Demo Newsroom', 'tier_3')
            on conflict (slug) do update set name = excluded.name
            returning id
            """
        )
        tenant_id = cur.fetchone()[0]

        # 2. peers from entities
        entities = sdb.execute("select id, name, url, tier from entities").fetchall()
        peers = [
            {"domain": domain_of(e["url"]), "name": e["name"], "tier": e["tier"]}
            for e in entities
            if domain_of(e["url"])
        ]
        cur.execute(
            "update tenants set config = coalesce(config,'{}'::jsonb) || jsonb_build_object('peers', %s::jsonb) where id = %s",
            (Json(peers), tenant_id),
        )

        # 3. a synthetic source for the imported signals (signals.source_id is NOT NULL).
        # Select-first so re-runs don't add duplicate source rows (idempotent
        # regardless of the sources unique constraint).
        cur.execute(
            "select id from sources where tenant_id = %s and url = 'urn:newsintel'",
            (tenant_id,),
        )
        row = cur.fetchone()
        if row:
            source_id = row[0]
        else:
            cur.execute(
                "insert into sources (tenant_id, kind, name, url) "
                "values (%s, 'manual', 'news-intel import', 'urn:newsintel') returning id",
                (tenant_id,),
            )
            source_id = cur.fetchone()[0]

        # 4. coded_articles -> signals (entities axis = the PEJ topic; demo-coherent)
        rows = sdb.execute(
            """
            select a.url, a.headline, a.published_at, e.url as entity_url,
                   c.topic, c.frame, c.frame_group, c.confidence
              from coded_articles c
              join articles a on a.id = c.article_id
              join entities e on e.id = a.entity_id
            """
        ).fetchall()
        inserted = 0
        for r in rows:
            domain = domain_of(r["entity_url"])
            topic = (r["topic"] or "").strip()
            if not domain or not topic:
                continue
            framing = {
                "frame": FRAME_MAP.get(r["frame"], r["frame"]),
                "frame_group": r["frame_group"],
                "topic": topic,
                "confidence": r["confidence"],
                "coder_version": "newsintel-import",
            }
            enrichment = {"analyse": {"entities": [topic]}, "framing": framing}
            url_hash = f"newsintel:{r['url']}"
            cur.execute(
                """
                insert into signals
                  (tenant_id, source_id, url, url_hash, headline, published_at,
                   raw_payload, enrichment)
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (tenant_id, url_hash) do update set enrichment = excluded.enrichment
                """,
                (
                    tenant_id, source_id, r["url"], url_hash, r["headline"],
                    r["published_at"], Json({"domain": domain}), Json(enrichment),
                ),
            )
            inserted += 1
        print(f"demo tenant {tenant_id}: {len(peers)} peers, {inserted} coded signals")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/projects/news-intel/data/news_intel.db"))
```

- [ ] **Step 3: Run the importer and confirm counts**

Run:
```bash
cd /Users/subhashrai/projects/platform
DATABASE_URL="$DATABASE_URL" python infra/seeds/import_newsintel_peers.py
```
Expected: prints `demo tenant <uuid>: 30 peers, 159 coded signals`.

- [ ] **Step 4: Re-run to confirm idempotency**

Run the same command again. Expected: same counts, no duplicate-key error.

- [ ] **Step 5: Commit**

```bash
git add infra/seeds/import_newsintel_peers.py "apps/web/app/[locale]/trends/page.tsx"
git commit -m "feat(seed): demo tenant from news-intel + OJ_TENANT_SLUG switch"
```

---

## Task 6: Verification + vendor-neutral gate

**Files:** none (verification only).

- [ ] **Step 1: Unit + type + build gate**

Run:
```bash
cd /Users/subhashrai/projects/platform
pnpm --filter @onlinejourno/web test
pnpm --filter @onlinejourno/web type-check
pnpm --filter @onlinejourno/web build
```
Expected: tests pass; type-check clean; build completes.

- [ ] **Step 2: Vendor-neutral source grep (must be empty)**

Run:
```bash
cd /Users/subhashrai/projects/platform
grep -rniE "thehindu|news[_-]intel" apps/web/ packages/ --include=*.ts --include=*.tsx | grep -v node_modules
```
Expected: **no matches** in `apps/web` / `packages` source. (Hits are allowed only in `infra/seeds/` and `docs/`.)

- [ ] **Step 3: Live verify `self` (real feature, own inflow)**

Start the dev server and load `self`:
```bash
cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web dev
```
On `/en/trends` (authed), confirm: the deck no longer says "Phase B"; cards show a position tag chip (not "baseline pending"); low-n topics show " · low confidence"; topics with no peer signals show "no peer data" rather than a fake tag. Capture a screenshot.

- [ ] **Step 4: Live verify the rich `demo` tenant**

Restart dev with the switch:
```bash
cd /Users/subhashrai/projects/platform && OJ_TENANT_SLUG=demo pnpm --filter @onlinejourno/web dev
```
On `/en/trends`, confirm all four tags (`NO ANGLE` / `BEHIND` / `ON IT` / `PEAK`) appear across cards with real peer counts + implications; combative-heavy topics show "Explanatory angle open." / "Explanatory window still open."

- [ ] **Step 5: Done-line check against the spec success criteria**

Confirm every spec success criterion (design doc "Testing & success criteria"): placeholders replaced, four tags present on demo, amber on low-n, real values only, `self` degrades gracefully, build green. Note any gap as a follow-up issue.

---

## Notes for the executor
- DRY/YAGNI: all editorial logic lives in `framing-position.ts`; `db.ts` is SQL-only; `page.tsx` composes. Do not duplicate the ladder anywhere.
- The `{event}` driver slot and `{briefReady}` calendar slot are wired in `implicationFor` but the page passes neither yet (honest-data: omit until a reliable source exists). Wiring `briefReady` from `story_leads`/`calendar_event` is a clean follow-up, not part of this plan.
- If `pnpm test` errors on `--import` (Node < 20.6), fall back to `node --loader tsx --test`.
```
