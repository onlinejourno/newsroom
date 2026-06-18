# OnlineJourno Redesign — Phase A Implementation Plan (lifecycle nav + visual re-skin)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat 9-item masthead (ADR 0060) with the story-lifecycle nav and re-skin the shell + the flagship Analyse surface + sign-in to the editorial data-design language — the visible half of the redesign, no new data.

**Architecture:** One nav registry (`lib/nav.ts`) drives a lifecycle masthead (Plan·Calendar → Brief·Today → In·Sources → Frame·Analyse → Draft·Compose → Score·Audit) consumed by the masthead, breadcrumbs and home front-door. Routes are unchanged (no redirects). Design language extends the existing ADR 0013 broadsheet tokens with new component classes (editorial card, position tag, momentum bar, serif lead). The "where you stand" position tags + implications are stubbed/neutral in Phase A and lit by Phase B.

**Tech stack:** Next.js App Router (TypeScript) + Tailwind v4 `@theme` tokens in `apps/web/app/globals.css`. No web unit-test harness exists; per CLAUDE.md we don't add speculative test infra — **verification each task = `type-check` + `build` green + a rendered check** (local `pnpm dev` or the live deploy via the browser). The Python suites are untouched by Phase A.

**Spec:** `docs/superpowers/specs/2026-06-18-onlinejourno-redesign-design.md`. Supersedes ADR 0060's flat nav; resolves #106.

---

## File structure

- `apps/web/lib/nav.ts` — **rewrite**: the lifecycle registry (`LIFECYCLE` stages + `WORKFLOW_EXTRA` + `ADMIN` + `LABEL_BY_PATH`). The single source of nav truth.
- `apps/web/components/Masthead.tsx` — **rewrite**: render the lifecycle nav (verb·noun, active underline, role-gating, time + user, SURFACES tab).
- `apps/web/components/Breadcrumbs.tsx` — **modify**: read labels from the new `LABEL_BY_PATH`.
- `apps/web/app/[locale]/page.tsx` — **modify**: home front-door cards consume `LIFECYCLE`.
- `apps/web/app/globals.css` — **modify**: add editorial component classes (`.ds-lead`, `.ds-card`, `.ds-tag*`, `.ds-momentum`, `.ds-amber`); keep one token system.
- `apps/web/app/[locale]/trends/page.tsx` — **modify**: re-skin the FRAME·Analyse header + "Trending now" cards to the mockup ("Where coverage is heading."), existing data, neutral position tags.
- `apps/web/app/[locale]/login/page.tsx`, `register/page.tsx` — **modify**: re-skin to the onboarding language.

Routes/paths are NOT changed in any task.

---

### Task 1: Lifecycle nav registry (`lib/nav.ts`)

**Files:**
- Rewrite: `apps/web/lib/nav.ts`

- [ ] **Step 1: Read the current registry** to preserve every path.

Run: `sed -n '1,60p' apps/web/lib/nav.ts` — confirm the current `PRIMARY`/`WORKFLOW`/`ADMIN` paths so none are dropped.

- [ ] **Step 2: Rewrite `lib/nav.ts` to the lifecycle model**

```ts
// The story-lifecycle information architecture (redesign Phase A, supersedes the
// flat nav of ADR 0060). The masthead is the lifecycle: PLAN → BRIEF → IN →
// FRAME → DRAFT → SCORE. Each stage is a verb (kicker) + a noun (label) + the
// route it lands on. Route paths are unchanged from ADR 0060 — only grouping,
// labels and order change. ONE source so masthead, front-door and breadcrumbs
// never disagree.
export type Stage = {
  verb: string;       // PLAN, BRIEF, IN, FRAME, DRAFT, SCORE
  label: string;      // Calendar, Today, Sources, Analyse, Compose, Audit
  path: string;       // unchanged route
  blurb: string;
  minRole?: "reporter" | "desk" | "editor" | "admin"; // lowest role that sees it (default: all)
};

// The six lifecycle stages, in working order.
export const LIFECYCLE: Stage[] = [
  { verb: "Plan",  label: "Calendar",  path: "calendar",       blurb: "Promises ahead — the planning spine" },
  { verb: "Brief", label: "Today",     path: "brief",          blurb: "The day's brief — your inflow, scoped to you" },
  { verb: "In",    label: "Sources",   path: "signals",        blurb: "The public record flowing in" },
  { verb: "Frame", label: "Analyse",   path: "trends",         blurb: "What's moving + the framing landscape — where you stand" },
  { verb: "Draft", label: "Compose",   path: "newslist",       blurb: "Stories in flight — draft & commission", minRole: "reporter" },
  { verb: "Score", label: "Audit",     path: "potential",      blurb: "Fair-chance — distribution-fit + probity", minRole: "desk" },
];

// Secondary destinations reachable from their stage (kept off the top bar to
// avoid the old overload). Grouped by the stage they belong to.
export const WORKFLOW_EXTRA: Stage[] = [
  { verb: "Frame", label: "Topic → Domains", path: "topic-domains", blurb: "Which domains own a topic" },
  { verb: "Frame", label: "Local Pulse",     path: "local-pulse",   blurb: "Trending by state & city" },
  { verb: "Score", label: "Surface Scores",  path: "scores",        blurb: "Per-surface channel audit" },
  { verb: "Score", label: "Hidden Gems",     path: "gems",          blurb: "Buried, worth re-optimising" },
  { verb: "Score", label: "Story Analyser",  path: "story-analyser", blurb: "Audit one story" },
  { verb: "Score", label: "Probity",         path: "probity",       blurb: "Page-honesty audit" },
  { verb: "Score", label: "Compliance",      path: "standards",     blurb: "GDPR / DPDPA" },
  { verb: "Brief", label: "EIP Signals",     path: "eip-signals",   blurb: "Subscription & editorial-intelligence signals" },
  { verb: "Brief", label: "Morning brief",   path: "brief",         blurb: "The day's brief" },
  { verb: "Plan",  label: "Journalists",     path: "journalists",   blurb: "People & coverage gaps" },
];

export const ADMIN: Stage[] = [
  { verb: "Admin", label: "Accounts & approvals", path: "admin/users",      blurb: "" },
  { verb: "Admin", label: "Sources",              path: "admin/sources",    blurb: "" },
  { verb: "Admin", label: "Connectors",           path: "admin/connectors", blurb: "" },
  { verb: "Admin", label: "Surfaces",             path: "admin/surfaces",   blurb: "" },
  { verb: "Admin", label: "Architecture",         path: "architecture",     blurb: "" },
];

// Flat path → label lookup for breadcrumbs (every known surface).
export const LABEL_BY_PATH: Record<string, string> = Object.fromEntries(
  [...LIFECYCLE, ...WORKFLOW_EXTRA, ...ADMIN].map((s) => [s.path, s.label]),
);

// Role ordering for minRole gating.
const ROLE_RANK: Record<string, number> = { reporter: 0, desk: 1, editor: 2, admin: 3 };
export function stageVisible(stage: Stage, role: string | null): boolean {
  if (!stage.minRole) return true;
  return (ROLE_RANK[role ?? "reporter"] ?? 0) >= ROLE_RANK[stage.minRole];
}
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build 2>&1 | tail -5`
Expected: type-check passes; build compiles. (Masthead still imports `PRIMARY`/`WORKFLOW` until Task 2 — if build fails on those names, that's expected and fixed in Task 2; do Task 2 before committing if so. Otherwise commit now.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/nav.ts
git commit -m "feat(nav): lifecycle IA registry (Plan→Brief→In→Frame→Draft→Score) — redesign Phase A"
```

---

### Task 2: Lifecycle masthead (`Masthead.tsx`)

**Files:**
- Rewrite: `apps/web/components/Masthead.tsx`

- [ ] **Step 1: Read current Masthead** to keep the sign-out server action + props.

Run: `cat apps/web/components/Masthead.tsx`

- [ ] **Step 2: Rewrite the masthead to the lifecycle nav**

Keep the existing `signOut` server action and the `{ locale, role, userName }` props. Render each visible stage as a kicker-verb + serif-noun; underline the active stage (match on first path segment); show time + user (linking to `/account`) + a SURFACES dropdown for admin.

```tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { endSession } from "@/lib/auth";
import { LIFECYCLE, WORKFLOW_EXTRA, ADMIN, stageVisible, type Stage } from "@/lib/nav";

export default async function Masthead({
  locale = "en",
  role = null,
  userName = null,
}: {
  locale?: string;
  role?: string | null;
  userName?: string | null;
}) {
  const href = (p: string) => `/${locale}/${p}`;
  // Active stage: first path segment after the locale.
  const path = (await headers()).get("x-invoke-path") ?? "";
  const seg = path.split("/").filter(Boolean)[1] ?? "";

  async function signOut() {
    "use server";
    await endSession();
    redirect(`/${locale}/login`);
  }

  const stages = LIFECYCLE.filter((s) => stageVisible(s, role));

  return (
    <header
      className="flex items-center gap-x-6 px-6 py-3 border-b sticky top-0 z-10 flex-wrap"
      style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
    >
      <a href={role ? href("") : `/${locale}/login`} className="flex items-center gap-2 no-underline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.png" alt="" width={28} height={24} />
        <span className="text-lg font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-primary)" }}>
          OnlineJourno
        </span>
      </a>

      {role ? (
        <nav className="flex items-center gap-x-6 flex-wrap md:ml-auto">
          {stages.map((s: Stage) => {
            const active = s.path.split("/")[0] === seg;
            return (
              <a key={s.path} href={href(s.path)} title={s.blurb}
                 className="no-underline group flex flex-col leading-none pb-1"
                 style={{ borderBottom: `2px solid ${active ? "var(--color-urgent)" : "transparent"}` }}>
                <span className="ds-meta" style={{ color: "var(--color-fg-tertiary)" }}>{s.verb}</span>
                <span className="text-[15px] font-semibold"
                      style={{ fontFamily: "var(--font-display)",
                               color: active ? "var(--color-fg-primary)" : "var(--color-fg-secondary)" }}>
                  {s.label}
                </span>
              </a>
            );
          })}

          {role === "admin" && (
            <details name="masthead-rooms" className="relative">
              <summary className="ds-meta cursor-pointer list-none select-none"
                       style={{ color: "var(--color-fg-tertiary)" }}>Surfaces ▾</summary>
              <div className="absolute right-0 mt-2 flex flex-col gap-1.5 border p-3 min-w-52"
                   style={{ background: "var(--color-bg-card)", borderColor: "var(--color-frame)", zIndex: 20 }}>
                {ADMIN.map((s) => (
                  <a key={s.path} href={href(s.path)} className="no-underline hover:underline text-sm"
                     style={{ color: "var(--color-fg-secondary)" }}>{s.label}</a>
                ))}
              </div>
            </details>
          )}

          <span className="flex items-center gap-3 ml-2 text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
            {userName ? (
              <a href={href("account")} className="no-underline hover:underline">{userName}</a>
            ) : null}
            <form action={signOut}><button type="submit" className="underline">Sign out</button></form>
          </span>
        </nav>
      ) : (
        <a href={`/${locale}/login`} className="md:ml-auto text-sm font-semibold no-underline hover:underline"
           style={{ color: "var(--color-fg-secondary)" }}>Sign in</a>
      )}
    </header>
  );
}
```

> Note: if `headers().get("x-invoke-path")` is empty in this Next version, fall back to passing the active path as a prop from the layout. Confirm in Step 4's render check; if active-state is wrong, add an `activePath` prop set by `layout.tsx` from `params`.

- [ ] **Step 3: Type-check + build**

Run: `pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build 2>&1 | tail -5`
Expected: passes (no more `PRIMARY`/`WORKFLOW` references anywhere — grep to confirm: `grep -rn "PRIMARY\|WORKFLOW\b" apps/web | grep -v node_modules` returns only `WORKFLOW_EXTRA`).

- [ ] **Step 4: Render check**

Run `pnpm --filter @onlinejourno/web dev`, sign in, confirm: the six stages render verb·noun; the active stage underlines as you navigate (`/en/trends` highlights Frame·Analyse); reporter role hides Score·Audit (test by a reporter session); Surfaces ▾ shows for admin; the username links to `/account`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/Masthead.tsx
git commit -m "feat(nav): lifecycle masthead — verb·noun stages, role-gated, active underline"
```

---

### Task 3: Breadcrumbs + home front-door consume the registry

**Files:**
- Modify: `apps/web/components/Breadcrumbs.tsx`
- Modify: `apps/web/app/[locale]/page.tsx`

- [ ] **Step 1: Point Breadcrumbs at the new `LABEL_BY_PATH`**

Run: `grep -n "LABEL_BY_PATH\|from \"@/lib/nav\"" apps/web/components/Breadcrumbs.tsx` — it already imports `LABEL_BY_PATH`; the rewritten `nav.ts` keeps that export, so no change is needed unless the import names changed. If Breadcrumbs imported `PRIMARY`/`WORKFLOW`, update it to `LIFECYCLE`/`WORKFLOW_EXTRA`. Make the edit only if the grep shows a stale import.

- [ ] **Step 2: Update the home front-door to `LIFECYCLE`**

In `apps/web/app/[locale]/page.tsx`, find the front-door cards block (it currently maps `PRIMARY`). Replace the import and the map source with `LIFECYCLE` (verb + label + blurb). Show the six stage cards.

Run: `grep -n "PRIMARY\|nav\"" apps/web/app/[locale]/page.tsx` to locate; replace `PRIMARY` → `LIFECYCLE` and render `{s.verb} · {s.label}` + `{s.blurb}`.

- [ ] **Step 3: Type-check + build**

Run: `pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build 2>&1 | tail -5`
Expected: passes; `grep -rn "PRIMARY" apps/web | grep -v node_modules` returns nothing.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/Breadcrumbs.tsx "apps/web/app/[locale]/page.tsx"
git commit -m "feat(nav): breadcrumbs + home front-door consume the lifecycle registry"
```

---

### Task 4: Editorial design-language component classes (`globals.css`)

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Append the editorial component classes** (reuse existing ADR 0013 tokens; add no new hex)

Add after the existing broadsheet-kit block:

```css
/* ─────────────────────────────────────────────────────────────────
   EDITORIAL DATA-DESIGN (redesign Phase A) — FT/Economist feel layered
   on the broadsheet kit. All values resolve to ADR 0013 tokens.
───────────────────────────────────────────────────────────────── */

/* Big narrative lead (the "Where coverage is heading." headline). */
.ds-lead {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(2.4rem, 5vw, 3.4rem);
  line-height: 1.04;
  letter-spacing: -0.02em;
  color: var(--color-fg-primary);
}

/* Editorial content card (topic / story). White, hairline frame, square. */
.ds-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-rule);
  border-radius: 0;
  padding: 18px 20px;
}

/* Position tag — the "where you stand" state pills. */
.ds-tag {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  padding: 3px 7px;
  border: 1px solid currentColor;
  border-radius: 0;
  white-space: nowrap;
}
.ds-tag-behind   { color: var(--color-urgent); }          /* red — you're behind */
.ds-tag-noangle  { color: var(--color-urgent); }          /* red — no angle yet */
.ds-tag-onit     { color: var(--color-brand); }           /* green — on it */
.ds-tag-peak     { color: #fff; background: var(--color-urgent); border-color: var(--color-urgent); }

/* Momentum bar — 0–100 fill. */
.ds-momentum { height: 4px; background: var(--color-rule-soft); }
.ds-momentum > span { display: block; height: 100%; background: var(--color-brand); }

/* Honest-data amber (n<30 / low confidence). */
.ds-amber { color: var(--color-amber-600); }
```

- [ ] **Step 2: Build**

Run: `pnpm --filter @onlinejourno/web build 2>&1 | tail -5`
Expected: compiles (Tailwind v4 picks up the classes).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat(design): editorial data-design component classes (lead, card, position tag, momentum)"
```

---

### Task 5: Re-skin FRAME · Analyse (`trends/page.tsx`)

**Files:**
- Modify: `apps/web/app/[locale]/trends/page.tsx`

Goal: the mockup's header + "Trending now" cards, on the EXISTING trend data. Position tags render a neutral Phase-A state (`—` "baseline pending") since the competitive baseline is Phase B; the layout + momentum + the editorial framing land now.

- [ ] **Step 1: Replace the page header** with the editorial lead.

Find the current header (`<h1 ...>Trending Topics</h1>` + deck) and replace with:

```tsx
<header className="mb-8">
  <p className="ds-label mb-2">Analyse · What&rsquo;s moving</p>
  <h1 className="ds-lead mb-3">Where coverage is heading.</h1>
  <p className="ds-deck">
    The framing landscape plus what&rsquo;s trending — by topic and by place — measured
    against your baseline. <span className="ds-amber">Competitive positioning lights up
    once your peer set is wired (Phase B).</span>
  </p>
</header>
```

- [ ] **Step 2: Re-skin the "Trending now" rows into `.ds-card`s** using the existing `topics` data (keep the existing data fetch; only change the markup). For each topic render: name (serif), momentum %, mentions, a `.ds-momentum` bar (`width: min(100, momentum)%`), and a neutral position tag.

```tsx
<section className="mb-12">
  <div className="flex items-baseline justify-between mb-4">
    <h2 className="ds-h2">Trending now</h2>
    <span className="ds-meta">Momentum · last {windowHours}h · where you stand</span>
  </div>
  <div className="grid gap-3 md:grid-cols-2">
    {topics.map((t) => (
      <div key={t.topic} className="ds-card">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <h3 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>{t.topic}</h3>
          <span className="ds-tag" style={{ color: "var(--color-fg-tertiary)" }}>baseline pending</span>
        </div>
        <p className="text-sm mb-2" style={{ fontFamily: "var(--font-ui)" }}>
          <span className="font-bold" style={{ color: "var(--color-brand)" }}>{Math.round(t.momentum)}</span>
          <span style={{ color: "var(--color-fg-tertiary)" }}> · {t.recent} mentions</span>
        </p>
        <div className="ds-momentum"><span style={{ width: `${Math.min(100, t.momentum)}%` }} /></div>
      </div>
    ))}
  </div>
</section>
```

> Keep the existing Plotly charts (Interest Trajectory, Topic Momentum) + Editorial Overview + the rest of the page below this section unchanged. Only the header + the top "trending" block are re-skinned in Phase A.

- [ ] **Step 3: Type-check + build**

Run: `pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build 2>&1 | tail -5`
Expected: passes. (Match `t.momentum`/`t.recent`/`t.topic` to the actual `topicMomentum` row shape — confirm field names in `lib/trends.ts`; adjust if different.)

- [ ] **Step 4: Render check** — `pnpm dev`, open `/en/trends`: the serif "Where coverage is heading." lead + the re-skinned cards render; the charts still work below.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[locale]/trends/page.tsx"
git commit -m "feat(analyse): re-skin Frame·Analyse to the editorial lead + trending cards (Phase A)"
```

---

### Task 6: Re-skin sign-in / register (onboarding)

**Files:**
- Modify: `apps/web/app/[locale]/login/page.tsx`
- Modify: `apps/web/app/[locale]/register/page.tsx`

- [ ] **Step 1: Apply the editorial language to the login card** — wrap the form in `.ds-frame`, use `.ds-lead` (smaller, e.g. add `style={{fontSize:"2rem"}}`) for "Sign in", `.ds-label` kicker, keep the existing form/server actions exactly. Do NOT change auth logic.

- [ ] **Step 2: Mirror on register** — same shell + kicker + lead ("Request access"), keep the existing form + domain logic unchanged.

- [ ] **Step 3: Type-check + build**

Run: `pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build 2>&1 | tail -5`
Expected: passes.

- [ ] **Step 4: Render + auth check** — `/en/login` renders the new look; a real sign-in still works (the server action is untouched).

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/[locale]/login/page.tsx" "apps/web/app/[locale]/register/page.tsx"
git commit -m "feat(design): re-skin sign-in/register to the onboarding language"
```

---

### Task 7: Ship + verify on prod

**Files:** none (deploy + verify).

- [ ] **Step 1: Full build green**

Run: `pnpm --filter @onlinejourno/web build 2>&1 | tail -8` — expected: compiles, all `[locale]` routes present.

- [ ] **Step 2: Merge to main + deploy**

```bash
git checkout main && git merge --ff-only slice/ia-realignment && git push origin main
fly deploy -a onlinejourno-platform --remote-only
```
Expected: release_command migrate no-op; machine reaches good state.

- [ ] **Step 3: Verify on the live app** (browser, signed in): the lifecycle masthead renders + active-state tracks navigation; `/en/trends` shows the editorial lead + cards; routes all resolve (no 404); `/en/scores` etc. inherit the new masthead. Confirm `/api/ready` → 200.

- [ ] **Step 4: Close the IA issue + tag the ADR**

```bash
gh issue close 106 -R onlinejourno/platform -c "Lifecycle nav (Plan·Calendar → … → Score·Audit) replaces the flat masthead; overlapping names collapse under the stages. Shipped in redesign Phase A."
```
Then add a short ADR recording the nav-model change (supersedes ADR 0060).

---

## Self-review

**Spec coverage:**
- Lifecycle nav → Tasks 1–3 ✓
- Editorial aesthetic / tokens → Task 4 ✓
- Flagship Analyse re-skin → Task 5 ✓
- Sign-in/onboarding (page 2) → Task 6 ✓
- "Where you stand" position tags + implications → **deferred to Phase B** (Task 5 stubs them as "baseline pending" + an amber note) ✓ explicitly out of Phase A scope.
- Other lifecycle surfaces' deep re-skin → inherit the masthead + tokens now; per-surface polish is follow-on (noted in the spec; not blocking Phase A).
- Ship/verify → Task 7 ✓

**Placeholder scan:** No "TBD"/"add error handling" steps. The one intentional stub (position tags = "baseline pending") is a spec'd Phase-A boundary, not a placeholder. Two steps say "confirm field names / fall back to a prop" — these are real verification instructions, with the concrete fallback named.

**Type/name consistency:** `LIFECYCLE`, `WORKFLOW_EXTRA`, `ADMIN`, `LABEL_BY_PATH`, `Stage`, `stageVisible` used consistently across Tasks 1–3. CSS class names (`.ds-lead`, `.ds-card`, `.ds-tag*`, `.ds-momentum`, `.ds-amber`) defined in Task 4, used in Tasks 5–6.

**Risk:** active-path detection in the masthead (`x-invoke-path`) may need the layout-prop fallback — called out inline in Task 2.
