# Design spec — BRIEF · Today editorial surface

**Status:** Drafted 2026-06-19 from the founder's approved mockup (claude.ai *OnlineJourno
Redesign* → the `TodayScreen` source, decoded from the exported bundle). Phase C, surface 2
(after Calendar). Builds on Phase A (lifecycle nav + ADR 0013 tokens).

## Why

BRIEF·Today is the reporter's daily home — "the day's brief / reporter inflow." Today it's the
composed-digest view (`fetchLatestBrief`). The mockup reimagines it as an **action-first home**:
ranked leads to chase + a live newsroom-status panel + a framing self-check. Ground-up: it tells
the reporter *what to do next and why*, not just a digest.

## The mockup (TodayScreen, verbatim structure)

- **Header:** kicker "Today · {date} · {city}" → `<h1>` "Good morning, {first name}." → sub
  "{N} leads need a decision this morning · {M} carry strong story potential."
- **Main — "What to chase"** (heading + kicker "ranked by severity & first-mover window"): a
  list of **lead cards**, each = a severity bar + top row (time · beat tag · need tag · optional
  "● Story potential") + headline + *why* + actions (primary **✎ Compose brief**, or "Open
  analysis" / "Review & re-optimise"; a "Dismiss" ghost; "{N} sources in").
- **Aside:**
  - "**The newsroom now**" panel — a window label + tone-dotted stat rows (label · count) +
    footer "Published · last 7 days" with a **Sparkline**.
  - "**Your framing this week**" — a C:E **Fingerprint** vs baseline + legend + a note
    ("Combative up +6 pts… worth a desk conversation") + "Open framing analysis →".

## Decisions (this brainstorm)

1. **Today replaces `/brief`'s primary view**; the existing composed digest (`fetchLatestBrief`)
   stays reachable via a small "Today's brief →" link (kept, not deleted).
2. **Framing fingerprint = neutral stub** ("lights up once framing is live"). It reuses Phase B's
   framing data (frame_group on stories + C:E), which is on the unmerged PR #109; this branch is
   off `main`. The stub activates when #109 lands. Honest-data, no PR coupling.
3. **Approach = server-render the editorial Today + pure helpers** (same as Calendar). No live
   clock (the Today header is a static date, unlike Calendar's now-block).
4. **Build off `main`** (`slice/brief-today`).

## Architecture & data flow

```
/brief/page.tsx (server)
  leads ("What to chase")  ← openLeadsRanked(tenantId, N): story_leads, status in
        (idea,pitched,assigned), order by importance(urgent>high>normal>low), trend_score desc,
        left join signals (for why/need/sources)
     leadToCard(lead, signal?) → { ts, severity, beat, need, potential, headline, why, action, sources }
  nowStats ← newsroomNowCounts(tenantId) → newsroomNow(counts) → [{key,label,tone,n}]
  published7d ← publishedPerDay(tenantId, 7)        → Sparkline (real)
  fingerprint ← FramingFingerprintStub               (neutral; Phase B dep)
        │
        ▼
  <TodayHome> (server)  header + "What to chase" + aside
```

No new DB columns. Vendor-neutral: city from `tenants.config` (omit if unset), name from the
signed-in user. All data from `story_leads` + `signals` + `stories`.

## Pure helpers (`apps/web/lib/brief-today.ts`)

- **`leadToCard(lead, signal?)`** (pure):
  - `severity` ← `importance`: `urgent`/`high` → `"high"`, `normal` → `"med"`, `low` → `"low"`
  - `action` ← `status`: `idea`/`pitched` → `"compose"`, `assigned` → `"analyse"`,
    `filed`/`approved` → `"audit"`
  - `potential` ← `trend_score != null && trend_score >= 60`
  - `headline` ← `title` · `beat` ← `beat` · `why` ← `note ?? signal?.trend_reason ?? ""`
  - `need` ← `signal?.user_need ?? null` · `sources` ← passed count (≥1)
  - `ts` ← formatted `created_at` (IST, "HH:MM")
- **`newsroomNow(counts)`** (pure) → stat rows with tones:
  `signalsIn` → info · `leadsNeedingDecision` → accent (red when n>0) · `sourcesLive` → neutral
  · `publishedToday` → good. Returns `[{key,label,tone,n}]` in that order.
- Both pure (no DB/React), unit-tested.

## Components & files

| File | Change |
|---|---|
| `apps/web/lib/brief-today.ts` | **NEW** — pure `leadToCard` + `newsroomNow` + types; unit-tested |
| `apps/web/lib/db.ts` | **+** `openLeadsRanked(tenantId, limit)`, `newsroomNowCounts(tenantId)`, `publishedPerDay(tenantId, days)` |
| `apps/web/components/brief/TodayHome.tsx` | **NEW** (server) — header + "What to chase" + aside |
| `apps/web/components/brief/Sparkline.tsx` | **NEW** — pure SVG, ported from the mockup's shared blob (real published7d) |
| `apps/web/components/brief/FramingFingerprintStub.tsx` | **NEW** — neutral "lights up once framing is live" panel |
| `apps/web/app/[locale]/brief/page.tsx` | render `TodayHome`; keep "Today's brief →" link to the composed digest |
| `apps/web/app/globals.css` | **+** Today classes (`.lead-card` + `--sev-*`, `.tag--beat/need/pot`, `.now-stat`, `.today-side`) → ADR 0013 tokens (no new hex) |

**Unit boundaries:** `brief-today.ts` is pure (rows → card/stat shapes). `db.ts` owns SQL.
`TodayHome` composes; `Sparkline`/`FramingFingerprintStub` are self-contained presentational units.

## Testing & success criteria

- **Pure helpers** → `node:test` golden cases: every severity/action/potential branch, the `why`
  fallback chain, and the `newsroomNow` tone rules (esp. accent-when-n>0).
- **type-check + build**; live-verify on the 24 seeded `story_leads`: cards rank by severity then
  potential, actions route to compose/analyse/audit, now-stats + sparkline render with real
  counts, the fingerprint shows the neutral stub, the "Today's brief →" link still reaches the
  composed digest.
- Vendor-neutral grep (no hardcoded outlet); city/name from config/user.

## Out of scope (this slice)

- Real framing fingerprint (wires automatically post-#109).
- Redesigning the composed-digest view itself (kept as-is behind the link).
- "Dismiss" persistence (the button renders; wiring dismissal to a lead state is a follow-up).
- Other lifecycle surfaces (In·Sources, Draft·Compose, Score·Audit) — separate slices; mockups
  decoded to the bundle, build one at a time.

## References

- Mockup: `~/Downloads/OnlineJourno Redesign - Mockup.html` (claude.ai bundle; `TodayScreen` +
  shared `Sparkline`/`Fingerprint`). Decoded surface sources were extracted to `/tmp/ojm_*.txt`
  (ephemeral) — the structure above is the durable copy.
- `infra/migrations/0015_story_leads.sql` (lead model: importance, trend_score, status, signal_id).
- `packages/agents-py/src/onlinejourno_agents/feed_view.py` (the why/urgency reporter-educating logic).
- Phase B framing data (`signals/stories.enrichment.framing`, `framing.py` `FRAME_GROUPS`) — the
  fingerprint's eventual source. ADR 0013 (tokens), 0057/0059 (calendar/leads spine).
