# ADR 0058 — Information architecture: the story's life is the spine

**Status:** Accepted (2026-06-14).

## Context

Visual consistency (one design kit, ADR 0013 levelled up) made the platform
*look* like one product but it still *felt* disjointed. The founder named why:
the navigation was a **star, not a path** — a flat grab-bag of tools (Signals,
Trends, Scores, Gems, Gaps…), each dropping the user on an isolated page whose
only exit was back to the menu. No spine to return to, no breadcrumb, and
actions didn't live on the object they act on. Symptoms: no way back from a
signal; unclear where assignment happens; a lead that says "Assigned" but not
to/by whom (and a real bug — the assign transition never recorded the
assignee).

> "The unity of the platform will emerge from its Information Architecture."

## Decision

Organize everything around the **one thing the whole newsroom shares — a
story's life** — and make every other surface either feed it or branch off it.

1. **A spine.** The lead (on the Newslist) is home base; every story in flight
   lives there and you always return to it.

2. **Menus by job, in lifecycle order — not by tool.** Four jobs replace the
   five noun-rooms (ADR 0053):
   - **Plan** — what to cover: Signals · Potential · Trends · Calendar
   - **Produce** — make it (the spine): Newslist · Shortlist · Morning brief
   - **Check** — fair / honest / good: Scores · Probity · Compliance · Hidden gems
   - **Newsroom** — people / strategy: Journalists · Gaps
   - (Admin stays separate, admin-only.)

3. **Connective tissue — what actually removes the disjointed feeling:**
   - **Breadcrumbs on every page** (one route-driven client component in the
     layout): `Plan › Signals › this signal`. Never lost.
   - **Actions live on the object.** Commissioning/assigning happens on the
     lead, not the signal. A signal carries a "Commission →" that creates the
     lead and, once it exists, a "Became a story → Newslist" cross-link.
   - **The assign action captures the reporter** (a picker) and the
     commissioner, so a lead reads "pitched by X · assigned to Y by Z". This
     also fixed the bug where `transition→assigned` set status but no assignee.

The star becomes a path: Signal → its Lead → assigned to a reporter → filed →
its Audit — each step linked, breadcrumbed, reversible.

## Consequences

- `story_leads` gains `created_by` (migration 0017); the prior hack of storing
  the pitcher in `assignee_id` is migrated out.
- New: `assignLead` (reporter + commissioner), `assignableReporters`,
  `leadForSignal`; `Breadcrumbs` component + route map.
- Where a page lives is now answerable from its breadcrumb, and the nav teaches
  the workflow instead of listing features.

## References
ADR 0053 (the five rooms — superseded by the four jobs), 0056 (story lifecycle /
Newslist), 0013 (design tokens), 0057 (Calendar — a Plan surface).
