# ADR 0062 — Information architecture: story-lifecycle nav

**Status:** Accepted (2026-06-18). Supersedes ADR 0060.

## Context

ADR 0060 flattened the masthead to a single-level "intelligence suite" of nine
PRIMARY items with Calendar as the spine. It fixed the buried-Calendar problem
but left a different one: nine flat items is an **overloaded, context-free bar**
that reads like a generic admin tool, and the labels overlap confusingly
(Story Scores vs Surface Scores vs Hidden Gems; Signals vs EIP Signals — issue
#106). The founder's assessment, recorded against the redesign mockup: the nav
is "flat/overloaded, not context-aware," and "design is very crucial for
uptake." The reference target is editorial scrollytelling, not a SaaS dashboard.

The approved redesign mockup answers this with a **context-sensitive nav modelled
on how a journalist actually works** — the story lifecycle — rather than a flat
list of tools. This ADR records that nav-model change. (Spec:
`docs/superpowers/specs/2026-06-18-onlinejourno-redesign-design.md`.)

## Decision

The masthead becomes the **story lifecycle** — six staged `verb · noun` pairs,
left→right in the order a journalist works. Route paths are **unchanged** from
ADR 0060; only grouping, labels and order change.

1. **LIFECYCLE — the spine** (`apps/web/lib/nav.ts`, `Stage[]`):
   - **Plan · Calendar** → `calendar` — promises ahead, the planning spine
   - **Brief · Today** → `brief` — the day's brief, your inflow, scoped to you
   - **In · Sources** → `signals` — the public record flowing in
   - **Frame · Analyse** → `trends` — what's moving + the framing landscape ("where you stand")
   - **Draft · Compose** → `newslist` — stories in flight (gated `minRole: reporter`)
   - **Score · Audit** → `potential` — fair-chance: distribution-fit + probity (gated `minRole: desk`)

2. **WORKFLOW_EXTRA — secondary destinations**, grouped under the stage they
   belong to (Topic→Domains, Local Pulse under Frame; Surface Scores, Hidden
   Gems, Story Analyser, Probity, Compliance under Score; EIP Signals, Morning
   brief under Brief; Journalists under Plan). Kept off the top bar to avoid the
   old overload.

3. **ADMIN — admin-only**, unchanged paths (Accounts & approvals, Sources,
   Connectors, Surfaces, Architecture), surfaced via a `Surfaces ▾` dropdown.

4. **Role-gating.** `stageVisible(stage, role)` hides stages below a viewer's
   role (reporter < desk < editor < admin). The masthead, not just the route
   guard, reflects who you are.

5. **Active stage.** The masthead underlines the active stage. App Router server
   components don't get the pathname from `headers()` by default, so
   `middleware.ts` forwards it as the `x-invoke-path` request header.

6. **One registry, still.** `nav.ts` exports `LIFECYCLE`, `WORKFLOW_EXTRA`,
   `ADMIN`, `stageVisible`, and `LABEL_BY_PATH`. Masthead, home front-door and
   breadcrumbs all consume this single source (the ADR 0060 single-source rule
   carries over). `PRIMARY` / `WORKFLOW` are removed.

## Consequences

- Route paths are **unchanged** — no link breakage, no redirects.
- ADR 0060's flat `PRIMARY`/`WORKFLOW` model is superseded; those exports are gone.
- **#106 is resolved:** the overlapping names collapse under Score·Audit and
  In/Brief; each is now reachable in one obvious place.
- The role/beat/moment context axes the founder wants layer on from here: role
  gating ships now; beat/geo and live-moment scoping within each stage are
  follow-on.
- The "where you stand" competitive-framing intelligence on Frame·Analyse
  (position tags + implications vs a peer baseline) is **deferred to Phase B** —
  Phase A renders neutral "baseline pending" tags until the competitive-framing
  corpus is wired (gated on a per-tenant peer set; vendor-neutral).
- Shipped to prod in redesign **Phase A** (commits `c1d8df5…2b0a54e`).

## References

- ADR 0060 (flat intelligence suite — superseded), ADR 0058 (four-job rooms),
  ADR 0013 (broadsheet design tokens, extended here with the editorial classes).
- Spec: `docs/superpowers/specs/2026-06-18-onlinejourno-redesign-design.md`
- Plan: `docs/superpowers/plans/2026-06-18-onlinejourno-redesign-phase-a.md`
- Resolves #106 (IA naming overlaps).
