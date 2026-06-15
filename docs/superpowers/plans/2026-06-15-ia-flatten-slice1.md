# IA Flatten — Slice 1 (nav + Calendar spine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Flatten the platform navigation from the four-job rooms (ADR 0058) to the original discover-dashboard's spirit — a flat intelligence suite with the **Calendar as the spine/home** — driven by one shared nav registry so the masthead, the homepage front-door, and breadcrumbs never disagree.

**Architecture:** Extract a single `lib/nav.ts` registry (the flat IA + a secondary "Workflow" group + Admin). Masthead, homepage front-door, and Breadcrumbs all consume it. Existing route *paths* are kept (no link breakage); only labels/grouping/order change, plus minimal stub pages for the four new tabs so nothing 404s. A new ADR records the flatten and supersedes 0058.

**Tech Stack:** Next.js 15 App Router + TS. Verify with `pnpm --filter @onlinejourno/web type-check` + the running app (the `/en/*` routes are auth-gated — flag any visual check).

**Spec:** `docs/superpowers/specs/2026-06-15-ia-realignment-design.md`. This is **Slice 1 of 5** (roadmap in that spec / the session). Slices 2-5 (6-need rollout, Story Analyser, new-tab content, workflow+polish) follow.

---

## File Structure
- Create: `apps/web/lib/nav.ts` — the single nav registry (PRIMARY intelligence suite + WORKFLOW secondary + ADMIN).
- Modify: `apps/web/components/Masthead.tsx` — consume `nav.ts`.
- Modify: `apps/web/app/[locale]/page.tsx` — front-door consumes `nav.ts`.
- Modify: `apps/web/components/Breadcrumbs.tsx` — consume `nav.ts` for labels.
- Create: stub pages `apps/web/app/[locale]/{story-analyser,topic-domains,local-pulse,eip-signals}/page.tsx`.
- Create: `docs/adr/0060-ia-flatten-calendar-spine.md` (supersedes 0058).

---

### Task 1: Nav registry + ADR 0060

**Files:** Create `apps/web/lib/nav.ts`; Create `docs/adr/0060-ia-flatten-calendar-spine.md`.

- [ ] **Step 1: Write the registry** `apps/web/lib/nav.ts`

```typescript
// The flat information architecture (ADR 0060, supersedes the four-job rooms of
// ADR 0058). Mirrors the original discover-dashboard: the Calendar is the spine,
// the intelligence tabs hang off it. ONE source so masthead, front-door and
// breadcrumbs never disagree. Route paths are unchanged from earlier slices;
// only grouping/labels/order change here.
export type NavItem = { path: string; label: string; blurb: string };

// Primary nav — the Calendar spine + the original's 7 intelligence tabs + the raw inflow.
export const PRIMARY: NavItem[] = [
  { path: "calendar", label: "Calendar", blurb: "Promises ahead — the planning spine" },
  { path: "trends", label: "Trending Topics", blurb: "Moving topics, right now" },
  { path: "potential", label: "Story Scores", blurb: "Published stories ranked to optimise for the trends" },
  { path: "story-analyser", label: "Story Analyser", blurb: "Audit one story — SEO + E-E-A-T, every signal" },
  { path: "topic-domains", label: "Topic → Domains", blurb: "Which domains own a topic" },
  { path: "local-pulse", label: "Local Pulse", blurb: "What's trending by state & city" },
  { path: "gems", label: "Hidden Gems", blurb: "Already-published, buried — worth re-optimising" },
  { path: "eip-signals", label: "EIP Signals", blurb: "Subscription & editorial-intelligence signals" },
  { path: "signals", label: "Signals", blurb: "The raw public record flowing in" },
];

// Secondary "Workflow" group — the production/check/newsroom pages stay reachable,
// just no longer top-level rooms.
export const WORKFLOW: NavItem[] = [
  { path: "newslist", label: "Newslist", blurb: "Every story in flight" },
  { path: "scores", label: "Surface Scores", blurb: "Channel-distribution audit" },
  { path: "probity", label: "Probity", blurb: "Page-honesty audit" },
  { path: "standards", label: "Compliance", blurb: "GDPR / DPDPA" },
  { path: "journalists", label: "Journalists", blurb: "People & coverage gaps" },
  { path: "brief", label: "Morning brief", blurb: "The day's brief" },
];

export const ADMIN: NavItem[] = [
  { path: "admin/users", label: "Accounts & approvals", blurb: "" },
  { path: "admin/sources", label: "Sources", blurb: "" },
  { path: "admin/connectors", label: "Connectors", blurb: "" },
  { path: "admin/surfaces", label: "Surfaces", blurb: "" },
  { path: "architecture", label: "Architecture", blurb: "" },
];

// Flat lookup: path → label, for breadcrumbs.
export const LABEL_BY_PATH: Record<string, string> = Object.fromEntries(
  [...PRIMARY, ...WORKFLOW, ...ADMIN].map((i) => [i.path, i.label]),
);
```

- [ ] **Step 2: Write ADR 0060** `docs/adr/0060-ia-flatten-calendar-spine.md` — record: the platform flattens from the four-job rooms (ADR 0058) to the original discover-dashboard's flat intelligence suite with the Calendar as spine/home; lists PRIMARY/WORKFLOW/ADMIN; **Status: supersedes ADR 0058**; rationale = founder north-star "stick to the original's spirit" + remove the confused Plan submenu. Add a one-line "Superseded by 0060" note at the top of `docs/adr/0058-*.md`.

- [ ] **Step 3: Type-check** `pnpm --filter @onlinejourno/web type-check` → no errors (registry is unused yet — that's fine).

- [ ] **Step 4: Commit**
```bash
git add apps/web/lib/nav.ts docs/adr/0060-ia-flatten-calendar-spine.md docs/adr/0058-*.md
git commit -m "ia: flat nav registry + ADR 0060 (Calendar spine, supersedes 0058)"
```

---

### Task 2: Masthead consumes the registry

**Files:** Modify `apps/web/components/Masthead.tsx`.

- [ ] **Step 1: Replace the inline `ROOMS`/`Room`/`Item` block (lines 8-59) with an import + a flat render.** Import `{ PRIMARY, WORKFLOW, ADMIN } from "@/lib/nav"`. Render PRIMARY as flat top-level links (Calendar first, bold/active when current), then a single **"Workflow ▾"** dropdown over WORKFLOW, then the **"Admin ▾"** dropdown (admin-tier only) over ADMIN, then the user/sign-out block. Keep the existing `<header>`, brand link, `href()`, `signOut()`, and signed-out branch exactly. The PRIMARY items render as direct `<a>` links (not dropdowns); WORKFLOW + ADMIN stay as `<details>` dropdowns.

- [ ] **Step 2: Type-check** → no errors.

- [ ] **Step 3: Commit**
```bash
git add apps/web/components/Masthead.tsx
git commit -m "ia: masthead → flat intelligence suite + Workflow/Admin dropdowns"
```

---

### Task 3: Homepage front-door consumes the registry

**Files:** Modify `apps/web/app/[locale]/page.tsx`.

- [ ] **Step 1: Replace the front-door `ROOMS` array (lines ~57-107) so the door mirrors the masthead.** Import `{ PRIMARY, WORKFLOW } from "@/lib/nav"`. Render a "Start here" lead card for **Calendar** (the spine), then a grid of the remaining PRIMARY items (label + blurb, linking to `/${locale}/${path}`), then a compact WORKFLOW row. Remove the four-job `room`/`title`/`desc` framing. Keep the rest of the page (the hero, the "Grounded in journalism scholarship" block with the six User Needs, etc.) unchanged.

- [ ] **Step 2: Type-check** → no errors.

- [ ] **Step 3: Commit**
```bash
git add "apps/web/app/[locale]/page.tsx"
git commit -m "ia: homepage front-door mirrors the flat nav (Calendar-led)"
```

---

### Task 4: Breadcrumbs use the registry labels

**Files:** Modify `apps/web/components/Breadcrumbs.tsx`.

- [ ] **Step 1: Read the file; replace its room/label lookup with `LABEL_BY_PATH` from `@/lib/nav`.** For a path segment, show `LABEL_BY_PATH[segment] ?? <title-cased segment>`. Drop any "room" ancestry (there are no rooms now) — breadcrumb = `Home / <label>`.

- [ ] **Step 2: Type-check** → no errors.

- [ ] **Step 3: Commit**
```bash
git add apps/web/components/Breadcrumbs.tsx
git commit -m "ia: breadcrumbs use the flat nav registry (no rooms)"
```

---

### Task 5: Stub pages for the four new tabs (no 404s)

**Files:** Create `apps/web/app/[locale]/story-analyser/page.tsx`, `topic-domains/page.tsx`, `local-pulse/page.tsx`, `eip-signals/page.tsx`.

- [ ] **Step 1: Create each as a minimal server component** following the house page pattern (look at an existing simple page e.g. `app/[locale]/gems/page.tsx` for the `params: Promise<{locale}>`, masthead/breadcrumb wrapper, `ds-*` classes). Each stub renders the tab title + its `blurb` from `nav.ts` + a one-line "Coming in a later slice — what this tab will do" note (so a non-digital journalist understands the intent). Example for Story Analyser:

```tsx
// apps/web/app/[locale]/story-analyser/page.tsx
export const dynamic = "force-dynamic";

export default async function StoryAnalyserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <p className="ds-label">OnlineJourno · Plan</p>
      <h1 className="ds-h1 mb-2">Story Analyser</h1>
      <p className="text-sm" style={{ color: "var(--color-fg-secondary)" }}>
        Audit one story end to end — the full SEO + E-E-A-T breakdown (channel scores,
        SQEG, periodic table, recirculation, Core Web Vitals). Wiring up next; the
        scoring engine is built.
      </p>
    </main>
  );
}
```
Mirror for `topic-domains` ("Which domains own a topic — GDELT performance."), `local-pulse` ("What's trending by state & city."), `eip-signals` ("Subscription & editorial-intelligence signals.").

- [ ] **Step 2: Type-check** → no errors.

- [ ] **Step 3: Commit**
```bash
git add "apps/web/app/[locale]/story-analyser/page.tsx" "apps/web/app/[locale]/topic-domains/page.tsx" "apps/web/app/[locale]/local-pulse/page.tsx" "apps/web/app/[locale]/eip-signals/page.tsx"
git commit -m "ia: stub pages for Story Analyser / Topic→Domains / Local Pulse / EIP Signals"
```

---

### Task 6: Reframe the existing tab headers

**Files:** Modify `apps/web/app/[locale]/trends/page.tsx`, `potential/page.tsx`, `gems/page.tsx` (header/intro copy only).

- [ ] **Step 1: Update each page's H1 + intro to match the reframed names/intent** (read each, change only the title + lead paragraph):
  - `trends` → H1 "Trending Topics", intro about moving topics now.
  - `potential` → H1 "Story Scores", intro: *published* stories ranked by Discover potential for the digital desk to **optimise to catch the trends** (not "take up first").
  - `gems` → H1 "Hidden Gems", intro: already-**published** but buried stories worth re-optimising (not new inflow).
  Keep each page's data/logic untouched — copy only.

- [ ] **Step 2: Type-check** → no errors.

- [ ] **Step 3: Verify (running app, if you can authenticate)** load `/en` → flat Calendar-led front door; masthead shows the flat suite; each renamed tab + the 4 stubs load (no 404). `/en/*` is auth-gated — if you can't sign in, confirm via `type-check` + that the routes exist, and flag the visual check for the controller.

- [ ] **Step 4: Commit**
```bash
git add "apps/web/app/[locale]/trends/page.tsx" "apps/web/app/[locale]/potential/page.tsx" "apps/web/app/[locale]/gems/page.tsx"
git commit -m "ia: reframe Trends→Trending Topics, Potential→Story Scores, Hidden Gems (buried published)"
```

---

## Self-review checklist (done while writing)
- **Spec coverage (Slice 1 scope):** flat nav + Calendar spine ✓ (T1-T3); rename/reframe Trends/Potential/Hidden Gems ✓ (T6); drop four-job rooms ✓ (T2-T3); ADR 0060 supersedes 0058 ✓ (T1); shared registry so door/nav/breadcrumbs agree ✓ (T1-T4); new tabs don't 404 ✓ (T5). Out of slice (later): 6-need functional rollout (Slice 2), Story Analyser content (Slice 3), Topic→Domains/Local Pulse/EIP content (Slice 4), Commission→journalist + PEJ prominence + Calendar right-column + The Hindu data (Slice 5).
- **Placeholders:** none — registry + stub code given; component rewires specify exact imports + render shape; ADR content enumerated.
- **Type consistency:** `NavItem {path,label,blurb}` + `PRIMARY/WORKFLOW/ADMIN/LABEL_BY_PATH` used consistently across T1-T4; route paths match existing pages (calendar/trends/potential/gems/signals/newslist/scores/probity/standards/journalists/brief/admin*) + the 4 new stubs (story-analyser/topic-domains/local-pulse/eip-signals).
- **Assumption:** route *paths* unchanged (only labels/order/grouping) → no inbound-link breakage; page H1 reframes are copy-only.
