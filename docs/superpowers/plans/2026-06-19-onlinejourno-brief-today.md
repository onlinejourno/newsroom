# BRIEF · Today Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/brief` into the action-first BRIEF·Today home from the mockup — ranked "what to chase" leads + a newsroom-now panel + a framing self-check (stubbed until Phase B merges).

**Architecture:** Server-rendered editorial surface (like Calendar). A pure `lib/brief-today.ts` maps `story_leads` rows → lead-cards + shapes the now-stats; `db.ts` supplies the queries; a `TodayHome` server component composes header + leads + aside. The composed-digest view is preserved below a divider. No migration.

**Tech Stack:** Next.js 15 / React 19 server components, TypeScript, `pg`, `node:test` + `tsx`.

**Spec:** `docs/superpowers/specs/2026-06-19-onlinejourno-brief-today-design.md`.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/lib/brief-today.ts` | **NEW.** Pure `leadToCard` + `newsroomNow` + types. The lead/stat logic; no DB/React. |
| `apps/web/lib/brief-today.test.ts` | **NEW.** `node:test` golden cases. |
| `apps/web/lib/db.ts` | **MODIFY.** `openLeadsRanked`, `newsroomNowCounts`, `publishedPerDay`. SQL only. |
| `apps/web/components/brief/Sparkline.tsx` | **NEW.** Pure SVG (ported from the mockup). |
| `apps/web/components/brief/FramingFingerprintStub.tsx` | **NEW.** Neutral placeholder panel. |
| `apps/web/components/brief/TodayHome.tsx` | **NEW.** Server component: header + "What to chase" + aside. |
| `apps/web/app/[locale]/brief/page.tsx` | **MODIFY.** Fetch + render `TodayHome`; keep the digest below. |
| `apps/web/app/globals.css` | **MODIFY.** Today classes → ADR 0013 tokens. |

---

## Task 1: Pure helpers + test runner check

**Files:** Create `apps/web/lib/brief-today.ts`, `apps/web/lib/brief-today.test.ts`.

- [ ] **Step 1: Confirm the test runner.** `apps/web/package.json` should already have `"test": "node --import tsx --test \"lib/**/*.test.ts\""` and a `tsx` devDep (added in the Phase B branch). If this branch is off `main` and lacks it, add it: `pnpm --filter @onlinejourno/web add -D tsx` and add that `test` script. Verify: `cd apps/web && pnpm test` runs (even if "no test files" initially is fine).

- [ ] **Step 2: Write the failing test.** Create `apps/web/lib/brief-today.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { leadToCard, newsroomNow, type LeadRow } from "./brief-today";

const lead: LeadRow = {
  title: "SEBI tightens disclosure norms", beat: "markets", importance: "high",
  status: "idea", trend_score: 72, note: "HC stay lifted — first-mover window open",
  created_at: "2026-06-18T09:30:00+05:30",
};

test("severity maps from importance", () => {
  assert.equal(leadToCard({ ...lead, importance: "urgent" }, null, 1).severity, "high");
  assert.equal(leadToCard({ ...lead, importance: "high" }, null, 1).severity, "high");
  assert.equal(leadToCard({ ...lead, importance: "normal" }, null, 1).severity, "med");
  assert.equal(leadToCard({ ...lead, importance: "low" }, null, 1).severity, "low");
});

test("action maps from status", () => {
  assert.equal(leadToCard({ ...lead, status: "idea" }, null, 1).action, "compose");
  assert.equal(leadToCard({ ...lead, status: "pitched" }, null, 1).action, "compose");
  assert.equal(leadToCard({ ...lead, status: "assigned" }, null, 1).action, "analyse");
  assert.equal(leadToCard({ ...lead, status: "filed" }, null, 1).action, "audit");
  assert.equal(leadToCard({ ...lead, status: "approved" }, null, 1).action, "audit");
});

test("potential is trend_score >= 60", () => {
  assert.equal(leadToCard({ ...lead, trend_score: 60 }, null, 1).potential, true);
  assert.equal(leadToCard({ ...lead, trend_score: 59 }, null, 1).potential, false);
  assert.equal(leadToCard({ ...lead, trend_score: null }, null, 1).potential, false);
});

test("why falls back note -> signal.trend_reason -> empty", () => {
  assert.equal(leadToCard(lead, null, 1).why, "HC stay lifted — first-mover window open");
  assert.equal(leadToCard({ ...lead, note: null }, { trend_reason: "rising fast", user_need: null }, 1).why, "rising fast");
  assert.equal(leadToCard({ ...lead, note: null }, null, 1).why, "");
});

test("need from signal; sources floored at 1", () => {
  assert.equal(leadToCard(lead, { trend_reason: null, user_need: "Understand" }, 5).need, "Understand");
  assert.equal(leadToCard(lead, null, 0).sources, 1);
  assert.equal(leadToCard(lead, null, 4).sources, 4);
});

test("newsroomNow: leads tone is accent only when n>0", () => {
  const z = newsroomNow({ signalsIn: 3, leadsNeedingDecision: 0, sourcesLive: 9, publishedToday: 2 });
  assert.equal(z.find((s) => s.key === "leads")!.tone, "neutral");
  const a = newsroomNow({ signalsIn: 3, leadsNeedingDecision: 4, sourcesLive: 9, publishedToday: 2 });
  assert.equal(a.find((s) => s.key === "leads")!.tone, "accent");
  assert.deepEqual(a.map((s) => s.key), ["signalsIn", "leads", "sources", "published"]);
});
```

- [ ] **Step 3: Run — verify it fails.** `cd /Users/subhashrai/projects/platform/apps/web && pnpm test` → FAIL (`Cannot find module './brief-today'`).

- [ ] **Step 4: Implement.** Create `apps/web/lib/brief-today.ts`:
```ts
// Pure BRIEF·Today logic — story_leads rows → lead-cards, and newsroom-now stat
// shaping. No DB, no React; unit-tested. See docs/superpowers/specs/
// 2026-06-19-onlinejourno-brief-today-design.md.

export type LeadRow = {
  title: string;
  beat: string | null;
  importance: string; // low | normal | high | urgent
  status: string; // idea | pitched | assigned | filed | approved | published | killed
  trend_score: number | null;
  note: string | null;
  created_at: Date | string;
};

export type LeadSignal = { trend_reason: string | null; user_need: string | null } | null;
export type Severity = "high" | "med" | "low";
export type LeadAction = "compose" | "analyse" | "audit";

export type LeadCard = {
  ts: string;
  severity: Severity;
  beat: string;
  need: string | null;
  potential: boolean;
  headline: string;
  why: string;
  action: LeadAction;
  sources: number;
};

const SEVERITY: Record<string, Severity> = {
  urgent: "high",
  high: "high",
  normal: "med",
  low: "low",
};

const ACTION: Record<string, LeadAction> = {
  idea: "compose",
  pitched: "compose",
  assigned: "analyse",
  filed: "audit",
  approved: "audit",
  published: "audit",
  killed: "audit",
};

function istTime(v: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(v));
}

export function leadToCard(lead: LeadRow, signal: LeadSignal, sources: number): LeadCard {
  return {
    ts: istTime(lead.created_at),
    severity: SEVERITY[lead.importance] ?? "med",
    beat: lead.beat ?? "general",
    need: signal?.user_need ?? null,
    potential: lead.trend_score != null && lead.trend_score >= 60,
    headline: lead.title,
    why: lead.note ?? signal?.trend_reason ?? "",
    action: ACTION[lead.status] ?? "compose",
    sources: Math.max(1, sources),
  };
}

export type Tone = "neutral" | "good" | "info" | "warn" | "accent";
export type NowStat = { key: string; label: string; tone: Tone; n: number };
export type NowCounts = {
  signalsIn: number;
  leadsNeedingDecision: number;
  sourcesLive: number;
  publishedToday: number;
};

export function newsroomNow(c: NowCounts): NowStat[] {
  return [
    { key: "signalsIn", label: "Signals in · 24h", tone: "info", n: c.signalsIn },
    {
      key: "leads",
      label: "Leads need a decision",
      tone: c.leadsNeedingDecision > 0 ? "accent" : "neutral",
      n: c.leadsNeedingDecision,
    },
    { key: "sources", label: "Sources live", tone: "neutral", n: c.sourcesLive },
    { key: "published", label: "Published today", tone: "good", n: c.publishedToday },
  ];
}

export const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--color-fg-tertiary)",
  good: "var(--ioj-green-600)",
  info: "var(--color-brand)",
  warn: "var(--amber-600)",
  accent: "var(--color-brand)",
};
```

- [ ] **Step 5: Run — verify pass.** `cd /Users/subhashrai/projects/platform/apps/web && pnpm test` → all pass (6 tests).

- [ ] **Step 6: Commit.**
```bash
cd /Users/subhashrai/projects/platform
git add apps/web/lib/brief-today.ts apps/web/lib/brief-today.test.ts apps/web/package.json
git commit -m "feat(brief): pure Today lead-card + newsroom-now helpers + tests"
```

---

## Task 2: Queries in `db.ts`

**Files:** Modify `apps/web/lib/db.ts` (append three functions, reuse `getPool()`). Verified by `type-check`.

- [ ] **Step 1: Append the queries.**
```ts
// ── BRIEF·Today ──────────────────────────────────────────────────────────────

export type TodayLead = {
  id: string;
  title: string;
  beat: string | null;
  importance: string;
  status: string;
  trend_score: number | null;
  note: string | null;
  created_at: Date | string;
  trend_reason: string | null;
  user_need: string | null;
  sources: number;
};

/** Open leads (idea/pitched/assigned) ranked by importance then trend_score.
 *  sources = signals whose analyse-entities contain the lead topic (else the
 *  linked signal counts as 1). */
export async function openLeadsRanked(tenantId: string, limit: number): Promise<TodayLead[]> {
  const pool = getPool();
  const { rows } = await pool.query<TodayLead>(
    `
    select l.id, l.title, l.beat, l.importance, l.status, l.trend_score, l.note,
           l.created_at, s.trend_reason,
           s.enrichment->'classify'->>'user_need' as user_need,
           greatest(
             coalesce((select count(*) from signals s2
                        where s2.tenant_id = l.tenant_id and l.topic is not null
                          and s2.enrichment->'analyse'->'entities' @> to_jsonb(array[l.topic]))::int, 0),
             case when l.signal_id is not null then 1 else 0 end
           ) as sources
      from story_leads l
      left join signals s on s.id = l.signal_id
     where l.tenant_id = $1
       and l.status in ('idea','pitched','assigned')
     order by case l.importance
                when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
              l.trend_score desc nulls last,
              l.created_at desc
     limit $2
    `,
    [tenantId, limit],
  );
  return rows;
}

export type NowCountsRow = {
  signalsIn: number;
  leadsNeedingDecision: number;
  sourcesLive: number;
  publishedToday: number;
};

export async function newsroomNowCounts(tenantId: string): Promise<NowCountsRow> {
  const pool = getPool();
  const { rows } = await pool.query<NowCountsRow>(
    `
    select
      (select count(*) from signals where tenant_id = $1
         and coalesce(published_at, fetched_at) >= now() - interval '24 hours')::int as "signalsIn",
      (select count(*) from story_leads where tenant_id = $1
         and status in ('idea','pitched','assigned'))::int as "leadsNeedingDecision",
      (select count(*) from sources where tenant_id = $1 and enabled)::int as "sourcesLive",
      (select count(*) from stories where tenant_id = $1 and status = 'published'
         and published_at >= date_trunc('day', now() at time zone 'Asia/Kolkata'))::int as "publishedToday"
    `,
    [tenantId],
  );
  return rows[0] ?? { signalsIn: 0, leadsNeedingDecision: 0, sourcesLive: 0, publishedToday: 0 };
}

/** Published-story counts per IST day for the last `days` days (oldest first). */
export async function publishedPerDay(tenantId: string, days: number): Promise<number[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ n: number }>(
    `
    select count(s.id)::int as n
      from generate_series(
             (date_trunc('day', now() at time zone 'Asia/Kolkata') - make_interval(days => $2 - 1)),
             date_trunc('day', now() at time zone 'Asia/Kolkata'),
             interval '1 day') d(day)
      left join stories s on s.tenant_id = $1 and s.status = 'published'
        and date_trunc('day', s.published_at at time zone 'Asia/Kolkata') = d.day
     group by d.day
     order by d.day
    `,
    [tenantId, days],
  );
  return rows.map((r) => r.n);
}
```

- [ ] **Step 2: Type-check.** `cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check` → clean.

- [ ] **Step 3: Commit.**
```bash
cd /Users/subhashrai/projects/platform
git add apps/web/lib/db.ts
git commit -m "feat(brief): Today queries — ranked leads, now-counts, published-per-day"
```

---

## Task 3: Sparkline + FramingFingerprintStub components

**Files:** Create `apps/web/components/brief/Sparkline.tsx`, `apps/web/components/brief/FramingFingerprintStub.tsx`.

- [ ] **Step 1: Sparkline** (ported from the mockup's shared component, typed):
```tsx
// Pure SVG sparkline (ported from the OnlineJourno Redesign mockup's shared kit).
export default function Sparkline({
  data,
  width = 290,
  height = 34,
  color = "var(--color-fg-secondary)",
  area = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y] as const;
  });
  const d = "M " + pts.map((p) => p.join(",")).join(" L ");
  const areaD = `${d} L ${width},${height} L 0,${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden>
      {area && <path d={areaD} fill={color} opacity="0.10" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.25" />
      <circle cx={last[0]} cy={last[1]} r="1.6" fill={color} />
    </svg>
  );
}
```

- [ ] **Step 2: FramingFingerprintStub** (neutral; activates post-#109):
```tsx
// Neutral placeholder for "Your framing this week". Lights up once Phase B's
// framing data (frame_group on stories) is live on this tenant. Honest-data:
// no fabricated fingerprint.
export default function FramingFingerprintStub() {
  return (
    <div className="mini-frame">
      <h3 className="mini-frame__title">Your framing this week</h3>
      <p className="mini-frame__sub ds-amber">Lights up once framing analysis is live for your newsroom.</p>
      <div
        style={{
          height: 22,
          borderRadius: 2,
          marginTop: 10,
          background:
            "repeating-linear-gradient(135deg, var(--color-paper-card), var(--color-paper-card) 6px, var(--color-rule) 6px, var(--color-rule) 7px)",
        }}
        aria-hidden
      />
    </div>
  );
}
```

- [ ] **Step 3: Type-check + commit.**
```bash
cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check
git add apps/web/components/brief/Sparkline.tsx apps/web/components/brief/FramingFingerprintStub.tsx
git commit -m "feat(brief): Sparkline (real) + framing-fingerprint stub"
```

---

## Task 4: TodayHome component + Today CSS

**Files:** Create `apps/web/components/brief/TodayHome.tsx`; modify `apps/web/app/globals.css`.

This is the presentational reskin — match the mockup's `TodayScreen` structure. Build it, then iterate visually against the screenshot. The data is already shaped (Task 1/2).

- [ ] **Step 1: Create `TodayHome.tsx`** (server component). Props are the shaped data; it renders the three regions. Use the existing `.ds-lead`/`.ds-label` tokens for the header and the new `.lead-card`/`.now-stat` classes (Step 2) for the body:
```tsx
import Sparkline from "./Sparkline";
import FramingFingerprintStub from "./FramingFingerprintStub";
import { type LeadCard, type NowStat, TONE_COLOR } from "@/lib/brief-today";

const SEV_LABEL = { high: "high", med: "medium", low: "low" } as const;
const ACTION_LABEL = { compose: "✎ Compose brief", analyse: "Open analysis", audit: "Review & re-optimise" } as const;

export default function TodayHome({
  firstName,
  dateLabel,
  city,
  cards,
  stats,
  windowLabel,
  published7d,
}: {
  firstName: string;
  dateLabel: string;
  city: string | null;
  cards: LeadCard[];
  stats: NowStat[];
  windowLabel: string;
  published7d: number[];
}) {
  const high = cards.filter((c) => c.severity === "high").length;
  const pot = cards.filter((c) => c.potential).length;
  return (
    <main className="min-h-screen max-w-5xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">Today · {dateLabel}{city ? ` · ${city}` : ""}</p>
        <h1 className="ds-lead mb-3">Good morning, {firstName}.</h1>
        <p className="ds-deck">
          {high} {high === 1 ? "lead needs" : "leads need"} a decision this morning · {pot} carry strong story potential.
        </p>
      </header>

      <div className="today-grid">
        <section className="leads-col">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="ds-h2">What to chase</h2>
            <span className="ds-meta">ranked by severity &amp; first-mover window</span>
          </div>
          {cards.map((c, i) => (
            <article className="lead-card" key={i}>
              <div className={`lead-card__sev lead-card__sev--${c.severity}`} aria-hidden />
              <div className="lead-card__body">
                <div className="lead-card__top">
                  <span className="lead-card__time">{c.ts}</span>
                  <span className="tag tag--beat">{c.beat}</span>
                  {c.need && <span className="tag tag--need">{c.need}</span>}
                  {c.potential && <span className="tag tag--pot">● Story potential</span>}
                </div>
                <h3 className="lead-card__hl">{c.headline}</h3>
                {c.why && <p className="lead-card__why">{c.why}</p>}
                <div className="lead-card__actions">
                  <span className="act-btn act-btn--primary">{ACTION_LABEL[c.action]}</span>
                  <span className="lead-card__src">{c.sources} {c.sources === 1 ? "source" : "sources"} in · severity {SEV_LABEL[c.severity]}</span>
                </div>
              </div>
            </article>
          ))}
          {cards.length === 0 && <p className="empty-note">No open leads — inflow is quiet.</p>}
        </section>

        <aside className="today-side">
          <div className="side-panel">
            <div className="side-panel__head">
              <span className="ds-label">The newsroom now</span>
              <span className="ds-meta">{windowLabel}</span>
            </div>
            <div className="now-stats">
              {stats.map((s) => (
                <div className="now-stat" key={s.key}>
                  <span className="now-stat__label">
                    <span className="now-stat__dot" style={{ background: TONE_COLOR[s.tone] }} />
                    {s.label}
                  </span>
                  <span className="now-stat__n">{s.n}</span>
                </div>
              ))}
            </div>
            <div className="now-foot">
              <span className="ds-meta">Published · last 7 days</span>
              <Sparkline data={published7d} />
            </div>
          </div>
          <FramingFingerprintStub />
        </aside>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add the Today classes to `globals.css`** (append; resolve to ADR 0013 tokens, no new hex). Add:
```css
/* ── BRIEF·Today ─────────────────────────────────────────────────────────── */
.today-grid { display: grid; grid-template-columns: 1fr 320px; gap: 28px; }
@media (max-width: 880px) { .today-grid { grid-template-columns: 1fr; } }
.lead-card { display: flex; gap: 0; border: 1px solid var(--color-rule); background: var(--color-paper-card); margin-bottom: 12px; }
.lead-card__sev { width: 4px; flex: 0 0 4px; }
.lead-card__sev--high { background: var(--color-brand); }
.lead-card__sev--med { background: var(--amber-600); }
.lead-card__sev--low { background: var(--color-rule); }
.lead-card__body { padding: 14px 16px; flex: 1; }
.lead-card__top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-family: var(--font-ui); font-size: 12px; color: var(--color-fg-tertiary); }
.lead-card__time { font-family: var(--font-mono); }
.tag { padding: 2px 8px; border: 1px solid var(--color-rule); font-family: var(--font-ui); font-size: 11px; letter-spacing: 0.02em; }
.tag--pot { color: var(--color-brand); border-color: var(--color-brand); }
.lead-card__hl { font-family: var(--font-display); font-size: 17px; font-weight: 600; margin: 0 0 4px; }
.lead-card__why { font-family: var(--font-ui); font-size: 13px; color: var(--color-fg-secondary); margin: 0 0 10px; }
.lead-card__actions { display: flex; align-items: center; gap: 12px; }
.lead-card__src { font-family: var(--font-ui); font-size: 12px; color: var(--color-fg-tertiary); }
.act-btn--primary { font-family: var(--font-ui); font-size: 13px; font-weight: 600; padding: 6px 12px; background: var(--color-frame); color: var(--color-paper); }
.side-panel { border: 1px solid var(--color-rule); background: var(--color-paper-card); padding: 16px; margin-bottom: 16px; }
.side-panel__head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
.now-stats { display: flex; flex-direction: column; gap: 10px; }
.now-stat { display: flex; justify-content: space-between; align-items: center; font-family: var(--font-ui); font-size: 13px; }
.now-stat__label { display: flex; align-items: center; gap: 8px; color: var(--color-fg-secondary); }
.now-stat__dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
.now-stat__n { font-family: var(--font-mono); font-weight: 600; }
.now-foot { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--color-rule); }
.mini-frame { border: 1px solid var(--color-rule); background: var(--color-paper-card); padding: 16px; }
.mini-frame__title { font-family: var(--font-display); font-size: 15px; font-weight: 600; margin: 0 0 2px; }
.mini-frame__sub { font-family: var(--font-ui); font-size: 12px; color: var(--color-fg-tertiary); margin: 0; }
```
**Note:** if a token (`--color-paper-card`, `--amber-600`, `--ioj-green-600`, `--color-frame`) isn't defined, check `globals.css` for the actual ADR 0013 name and use that — do NOT introduce raw hex.

- [ ] **Step 3: Type-check.** `cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check` → clean.

- [ ] **Step 4: Commit.**
```bash
cd /Users/subhashrai/projects/platform
git add apps/web/components/brief/TodayHome.tsx apps/web/app/globals.css
git commit -m "feat(brief): TodayHome component + Today editorial CSS"
```

---

## Task 5: Wire `/brief/page.tsx`

**Files:** Modify `apps/web/app/[locale]/brief/page.tsx`.

- [ ] **Step 1: Render TodayHome above the existing digest.** Add imports and, inside the component (after `tenantId` is resolved), fetch the Today data and render `TodayHome`, then keep the existing composed-digest render below under a divider + heading. Add near the other imports:
```tsx
import TodayHome from "@/components/brief/TodayHome";
import { openLeadsRanked, newsroomNowCounts, publishedPerDay } from "@/lib/db";
import { leadToCard, newsroomNow } from "@/lib/brief-today";
```
After `tenantId` is known (and `me = await getAccount()`), add:
```tsx
  const [leads, counts, published7d] = await Promise.all([
    openLeadsRanked(tenantId, 8),
    newsroomNowCounts(tenantId),
    publishedPerDay(tenantId, 7),
  ]);
  const cards = leads.map((l) =>
    leadToCard(l, l.trend_reason || l.user_need ? { trend_reason: l.trend_reason, user_need: l.user_need } : null, l.sources),
  );
  const stats = newsroomNow(counts);
  const city = (await tenantCity(tenantId)) || null;
  const firstName = (me?.display_name ?? me?.email ?? "there").split("@")[0].split(" ")[0];
  const dateLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date());
```
Add `tenantCity`, `openLeadsRanked`, `newsroomNowCounts`, `publishedPerDay` to the `@/lib/db` import. `tenantCity` is the city helper: if it already exists in `db.ts` (added by the Calendar slice), reuse it; if this branch is off `main` and it's absent, add this minimal helper to `db.ts` first:
```ts
/** Newsroom city from tenant config (vendor-neutral; "" when unset). */
export async function tenantCity(tenantId: string): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query<{ city: string | null }>(
    "select config->>'city' as city from tenants where id = $1",
    [tenantId],
  );
  return rows[0]?.city ?? "";
}
```
Then in the page: `const city = (await tenantCity(tenantId)) || null;` and render at the very top of the returned JSX:
```tsx
  return (
    <>
      <TodayHome
        firstName={firstName}
        dateLabel={dateLabel}
        city={city}
        cards={cards}
        stats={stats}
        windowLabel="last 24h"
        published7d={published7d}
      />
      <div className="max-w-5xl mx-auto px-6 md:px-10">
        <hr style={{ borderColor: "var(--color-rule)", margin: "8px 0 24px" }} />
        <h2 className="ds-h2" id="todays-brief">Today&rsquo;s composed brief</h2>
      </div>
      {/* ↓↓↓ the existing composed-digest JSX stays exactly as-is below ↓↓↓ */}
```
Close the fragment `</>` at the end of the existing returned markup. **Do not delete any existing digest code** — it renders below the divider.

- [ ] **Step 2: Type-check + build.**
```bash
cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build
```
Expected: clean type-check; `next build` completes.

- [ ] **Step 3: Commit.**
```bash
cd /Users/subhashrai/projects/platform
git add "apps/web/app/[locale]/brief/page.tsx" apps/web/lib/db.ts
git commit -m "feat(brief): render Today home on /brief, digest kept below"
```

---

## Task 6: Verification

**Files:** none.

- [ ] **Step 1: Gates.**
```bash
cd /Users/subhashrai/projects/platform
pnpm --filter @onlinejourno/web test
pnpm --filter @onlinejourno/web type-check
pnpm --filter @onlinejourno/web build
```
Expected: tests pass; type-check clean; build completes.

- [ ] **Step 2: Vendor-neutral grep (must be empty in source).**
```bash
grep -rniE "thehindu|eveningdispatch|news[_-]intel" apps/web/components/brief apps/web/lib/brief-today.ts "apps/web/app/[locale]/brief/page.tsx" || echo "CLEAN"
```
Expected: CLEAN (city/name come from config/user; the mockup's demo outlet must NOT be hardcoded).

- [ ] **Step 3: Headless render check on the seeded data.** With the dev server running (`OJ_TENANT_SLUG` unset → `self`), fetch `/en/brief` HTML via the authed session and confirm: the `Good morning,` lead renders, ≥1 `.lead-card` with a severity bar + beat tag + action label, the `.now-stat` rows show real counts, the sparkline `<svg>` is present, the framing stub shows "Lights up once framing analysis is live", and the "Today's composed brief" heading + the original digest are still below.

- [ ] **Step 4: Success-criteria check against the spec.** Confirm each spec "Testing & success criteria" bullet. Note any gap as a follow-up.

---

## Notes for the executor
- DRY/YAGNI: all lead/stat logic in `brief-today.ts`; `db.ts` is SQL-only; `TodayHome` composes.
- The "✎ Compose brief" / "Open analysis" / "Review & re-optimise" actions render as labels this slice (routing them to the composer/analyse/audit surfaces is a follow-up once those surfaces land). "Dismiss" is omitted until dismissal has a backing state — honest-data, no dead buttons.
- The framing fingerprint is intentionally a stub; do not wire it to framing data on this branch (that's Phase B / PR #109).
- If `tenantCity` already exists in `db.ts`, reuse it; do not define a second copy.
