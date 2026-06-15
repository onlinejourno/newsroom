# Design-consistency Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a canonical, token-driven primitive layer (`ScoreBadge`, `PageHeader`), a `/ui-kit` preview, and a usage guide — additive only, built on the existing tokens + `.ds-*` utilities.

**Architecture:** New files in `apps/web/components/ui/` + one new route. `ScoreBadge` encapsulates the score→band→token-color logic (band thresholds match `app/[locale]/scores/page.tsx`); `PageHeader` composes `.ds-label`/`.ds-h1`/`.ds-deck`. Nothing existing is modified, so there's zero collision with the concurrent IA work.

**Tech Stack:** Next 15 (app router, React 19, TS), Tailwind v4 (`@theme` tokens in `globals.css`), `class-variance-authority` + `clsx` + `tailwind-merge` (via `@/lib/utils`'s `cn`).

**Spec:** `docs/superpowers/specs/2026-06-15-design-consistency-foundation-design.md`

**Note on verification:** `apps/web` has **no unit-test framework** (only `lint`/`type-check`/`build`). So each component task's gate is `npx tsc --noEmit`; the final task runs `npm run build` and a visual check of `/ui-kit`. This is not TDD-with-tests — it's the honest gate this stack provides.

---

## File Structure

- **Create** `apps/web/components/ui/score-badge.tsx` — `scoreBand` + `ScoreBadge`.
- **Create** `apps/web/components/ui/page-header.tsx` — `PageHeader`.
- **Create** `apps/web/app/[locale]/ui-kit/page.tsx` — preview route.
- **Create** `apps/web/components/ui/README.md` — usage guide.

`cn` already exists at `apps/web/lib/utils.ts` (imported by `components/ui/button.tsx`). All commands run from `apps/web`.

---

## Task 1: `ScoreBadge`

**Files:**
- Create: `apps/web/components/ui/score-badge.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/components/ui/score-badge.tsx`:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Quality-score band (0-100, higher = better). Thresholds match the existing
 * scores UI (app/[locale]/scores/page.tsx). For urgency/heat labels (e.g. the
 * Potential page, where higher = more urgent) use a dedicated component — this
 * badge is for quality/composite scores only.
 */
export function scoreBand(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

// Band → design tokens (brand / amber / urgent). Replaces the off-system hex
// the pages hardcode today (#16a34a / #2563eb / #b45309).
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-semibold rounded-none border align-middle",
  {
    variants: {
      band: {
        HIGH: "bg-[color:var(--color-brand-bg)] text-[color:var(--color-brand-dark)] border-[color:var(--color-brand)]",
        MEDIUM:
          "bg-[color:var(--color-amber-100)] text-[color:var(--color-amber-600)] border-[color:var(--color-amber-600)]",
        LOW: "bg-[color:var(--color-urgent-bg)] text-[color:var(--color-urgent)] border-[color:var(--color-urgent)]",
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface ScoreBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Pick<VariantProps<typeof badgeVariants>, "size"> {
  score: number;
  /** Override the band word; omit to show the band (HIGH/MEDIUM/LOW). */
  label?: string;
  /** Hide the word entirely (number-only chip, e.g. the D·N·S sub-scores). */
  showLabel?: boolean;
}

export function ScoreBadge({
  score,
  label,
  showLabel = true,
  size,
  className,
  ...props
}: ScoreBadgeProps) {
  const band = scoreBand(score);
  const word = label ?? band;
  return (
    <span
      className={cn(badgeVariants({ band, size }), className)}
      style={{ fontFamily: "var(--font-ui)" }}
      {...props}
    >
      <span style={{ fontFamily: "var(--font-display)" }}>{Math.round(score)}</span>
      {showLabel ? (
        <span className="uppercase tracking-wide opacity-80">{word}</span>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/ui/score-badge.tsx
git commit -m "feat(web): ScoreBadge — token-driven quality-score chip"
```

---

## Task 2: `PageHeader`

**Files:**
- Create: `apps/web/components/ui/page-header.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/components/ui/page-header.tsx`:

```tsx
import * as React from "react";

export interface PageHeaderProps {
  /** Uppercase eyebrow (e.g. "OnlineJourno · Story Scores"). */
  eyebrow?: string;
  title: string;
  /** Optional standfirst / deck. */
  deck?: string;
}

/** The canonical page header: `.ds-label` eyebrow + `.ds-h1` title + `.ds-deck`. */
export function PageHeader({ eyebrow, title, deck }: PageHeaderProps) {
  return (
    <header className="mb-6">
      {eyebrow ? <p className="ds-label mb-2">{eyebrow}</p> : null}
      <h1 className="ds-h1">{title}</h1>
      {deck ? <p className="ds-deck mt-3 max-w-2xl">{deck}</p> : null}
    </header>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/ui/page-header.tsx
git commit -m "feat(web): PageHeader — .ds-label/.ds-h1/.ds-deck composition"
```

---

## Task 3: `/ui-kit` preview route

**Files:**
- Create: `apps/web/app/[locale]/ui-kit/page.tsx`

- [ ] **Step 1: Write the preview page**

Create `apps/web/app/[locale]/ui-kit/page.tsx`:

```tsx
import { PageHeader } from "@/components/ui/page-header";
import { ScoreBadge } from "@/components/ui/score-badge";

export const dynamic = "force-static";

export default async function UiKitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  return (
    <main className="ds-page-narrow">
      <PageHeader
        eyebrow="OnlineJourno · UI Kit"
        title="Design primitives"
        deck="Canonical tokens, .ds-* utilities, and the shared React primitives. Build on these — never hardcode hex."
      />

      <section className="mb-10">
        <div className="ds-bar">
          <span className="ds-bar-swatch" />
          <h2 className="ds-h2">ScoreBadge</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ScoreBadge score={90} />
          <ScoreBadge score={74} />
          <ScoreBadge score={42} />
          <ScoreBadge score={57} size="sm" />
          <ScoreBadge score={75} size="sm" showLabel={false} />
        </div>
      </section>

      <section>
        <div className="ds-bar">
          <span className="ds-bar-swatch" />
          <h2 className="ds-h2">.ds-* reference</h2>
        </div>
        <div className="ds-frame flex flex-wrap items-center gap-3 p-4">
          <span className="ds-chip">filter chip</span>
          <span className="ds-chip ds-chip-on">active</span>
          <span className="ds-stat">1,120</span>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/[locale]/ui-kit/page.tsx"
git commit -m "feat(web): /ui-kit preview route for the primitive kit"
```

---

## Task 4: Usage guide

**Files:**
- Create: `apps/web/components/ui/README.md`

- [ ] **Step 1: Write the guide**

Create `apps/web/components/ui/README.md`:

```markdown
# Web UI kit

The platform's visual vocabulary. Two rules:

1. **Never hardcode hex.** Use the `--color-*` tokens from `app/globals.css`
   (`@theme`, ADR 0013): `--color-brand`, `--color-urgent`, `--color-amber-600`,
   `--color-ink-*`, `--color-paper`, `--color-rule`, …
2. **Don't hand-roll structure.** Use the `.ds-*` utilities or the primitives
   below — don't reinvent headings, chips, panels, or stats.

## `.ds-*` utilities (in `app/globals.css`)

| Class | Use |
|-------|-----|
| `.ds-page` / `.ds-page-narrow` | page content wrapper |
| `.ds-h1` / `.ds-h2` / `.ds-mast` | display headings (Playfair) |
| `.ds-label` | uppercase red eyebrow |
| `.ds-deck` | standfirst / body lede |
| `.ds-meta` | small uppercase column label |
| `.ds-frame` / `.ds-panel` | card / inner panel (square, framed) |
| `.ds-bar` + `.ds-bar-swatch` | section header bar |
| `.ds-chip` / `.ds-chip-on` | filter chip (square; fills on active) |
| `.ds-tab` / `.ds-tab-on` | tab strip |
| `.ds-stat` | big broadsheet stat number |

## React primitives (`components/ui/`)

- **`<PageHeader eyebrow title deck />`** — the standard page header
  (`.ds-label` + `.ds-h1` + `.ds-deck`).
- **`<ScoreBadge score label? showLabel? size? />`** — quality/composite score
  chip (0-100, higher = better). Bands: ≥75 HIGH (brand), ≥50 MEDIUM (amber),
  else LOW (urgent). For **urgency/heat** labels (higher = more urgent, e.g. the
  Potential page) use a dedicated component, not this one.
- **`<Button variant size />`** — see `button.tsx`.

Preview everything live at `/<locale>/ui-kit`.

## Known follow-ups (adoption — not yet done)

- Tokenize `components/SignalChips.tsx` (it hardcodes `#2563eb` etc.).
- Migrate per-page score chips (`scores`, `potential`, `story-analyser`) to
  `ScoreBadge` once the IA realignment settles.
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/ui/README.md
git commit -m "docs(web): UI-kit usage guide — tokens, .ds-*, primitives"
```

---

## Task 5: Build + visual verification (manual)

**Files:** none (verification only)

- [ ] **Step 1: Type-check + build the whole app**

Run: `cd apps/web && npx tsc --noEmit && npm run build`
Expected: type-clean; `next build` succeeds with the new route + components compiled.

- [ ] **Step 2: Visual check of `/ui-kit`**

Start the dev server and load `/<locale>/ui-kit` (e.g. `/en/ui-kit`). Confirm:
- `ScoreBadge` 90 → green (HIGH), 74 → amber (MEDIUM), 42 → red (LOW); the
  `sm` and number-only variants render.
- `PageHeader` shows the red eyebrow + Playfair H1 + deck.
- The `.ds-*` reference row renders (chip, active chip, stat).
Screenshot for the record. Records spec success criteria 1–3.

---

## Self-Review

- **Spec coverage:** `ScoreBadge` (Task 1), `PageHeader` (Task 2), `/ui-kit` preview (Task 3), usage guide (Task 4), build + visual verify (Task 5). All deliverables covered; all four files are net-new (additive, no collision).
- **Placeholder scan:** none — complete code in every code step. No `Chip`/`Card`/`Table` (excluded by design — use `.ds-*`).
- **Type consistency:** `scoreBand(score) -> "HIGH"|"MEDIUM"|"LOW"` and `ScoreBadge({score, label?, showLabel?, size?})` defined in Task 1 and used in Task 3's preview with matching props (`size="sm"`, `showLabel={false}`). `PageHeader({eyebrow, title, deck})` defined in Task 2, used in Task 3 with those props. Token names (`--color-brand-bg`, `--color-brand-dark`, `--color-brand`, `--color-amber-100`, `--color-amber-600`, `--color-urgent-bg`, `--color-urgent`) all exist in `globals.css`'s `@theme`. `.ds-*` classes used in Task 3 (`ds-page-narrow`, `ds-bar`, `ds-bar-swatch`, `ds-h2`, `ds-frame`, `ds-chip`, `ds-chip-on`, `ds-stat`) all exist.
