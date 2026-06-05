# ADR 0034 — Roles and surfaces

**Status:** Accepted (2026-06-03 in `onlinejourno/xtnd`; merged into `onlinejourno/platform` 2026-06-05 per ADR 0030).

## Context

Platform Y1 serves one role-surface: the working reporter, via the daily brief. Platform `users.role` enum permits `admin`, `editor`, `journalist`, `viewer`.

Xtnd extends the platform to a converged-newsroom product. Multiple roles need their own surface against the same canonical story object:

- Reporter (Y1 platform; Y2 Xtnd extends with mobile PWA + distribution-fit cue).
- Digital desk.
- Section editor.
- Data-viz team.
- Video team.
- Audio team.
- Social team.
- Newsroom hierarchy (publisher / chief editor / managing editor).

Each role gets a different view, same underlying data. Information symmetry across roles is a design principle (no gatekeeping of distribution intelligence by digital desk).

## Decision

### Role hierarchy

Roles extend platform's `users.role` enum via PR upstream to platform when Xtnd Y2 build begins:

```sql
alter table users
  drop constraint users_role_check;
alter table users
  add constraint users_role_check check (role in (
    'admin', 'editor', 'journalist', 'viewer',
    'digital_desk', 'section_editor',
    'social_team', 'video_team', 'audio_team', 'dataviz_team', 'photo_team',
    'newsroom_hierarchy'
  ));
```

Migration filed to `onlinejourno/platform` Y2 H1; Xtnd waits.

### Surface ownership Y2

| Role | Surface | Owned by |
|------|---------|----------|
| Reporter | Brief viewer (platform Y1) + distribution-fit cue panel (Xtnd Y2) + mobile PWA (Xtnd Y2) | Platform + Xtnd |
| Digital desk | `/desk` route, queue + placement signals (Y3) + commission triggers (Y2 webhook → Y3 UI) | Xtnd |
| Section editor | `/desk/section/[slug]` route, section-page slot decision-support | Xtnd Y3 |
| Data-viz team | Commission queue (Slack webhook Y2, dedicated UI Y3) | Xtnd |
| Video team | Same | Xtnd |
| Audio team | Same | Xtnd |
| Social team | `/social` route, channel-fit cue + scheduler | Xtnd Y3 |
| Newsroom hierarchy | `/audit` route, fair-chance audit | Xtnd Y3 |

### Same canonical object across surfaces

Every role-surface reads from platform's `briefs.content` (canonical content model) and Xtnd's `xtnd_*` extension tables. There is no role-specific story representation. The difference between role views is purely a query filter + UI lens.

This rules out: separate "draft" model for desk, separate "story" model for social, separate "package" model for hierarchy. One canonical object; many lenses.

### Reporter-first test

Every Xtnd capability must pass the test:

> *Does the individual reporter benefit from this capability, directly?*

Capabilities that benefit only newsroom hierarchy or digital desk without reaching the reporter are deferred or rejected. Examples:

- Placement support: reporter benefits (sees why their story was placed where it was → learns over time). Ship.
- Fair-chance audit: reporter benefits (sees systemic patterns affecting their own bylines). Ship.
- "Editorial calendar export for management board" — reporter does not benefit. Reject or defer indefinitely.
- "Cross-newsroom benchmarking dashboard for chief editors" — reporter does not benefit (and platform ADR 0025 confidentiality contradicts). Reject.

### Information symmetry default

By default, every role-surface shows the same underlying signals; per-role visibility is opt-in to *hide* sensitive fields, never opt-in to *show*.

| Field | Reporter sees | Editor sees | Desk sees | Hierarchy sees |
|-------|---------------|-------------|-----------|----------------|
| Story content (brief) | Own + assigned | All in beat | All in shift | All in newsroom |
| Distribution-fit cue | Own | All in beat | All in shift | All in newsroom |
| Post-publish diagnostic | Own | All in beat | All in shift | All in newsroom |
| Placement decision + rationale | Own | All in beat | All in shift | All in newsroom |
| Rejection reasons (shortlist `decision_reason`) | Own (own rejections) | All in beat | **Default off** — configurable | **Default off** — configurable |
| Commission status | Own + team | All in beat | All in shift | All in newsroom |
| Fair-chance audit | Aggregated patterns only | Aggregated patterns only | Aggregated patterns only | Aggregated patterns only |

Defaults locked Y2 architecture; per-tenant overrides via `tenants.config.xtnd.role_visibility`.

### Sequencing

| Role surface | Earliest production launch |
|--------------|-----------------------------|
| Reporter (platform brief Y1) | Wk 8 of platform (already on platform roadmap) |
| Reporter (Xtnd distribution-fit + mobile PWA) | Wk 75-80 (Y2 H1) |
| Digital desk | Wk 80-90 (Y2 H2) |
| Section editor | Y3 H1 |
| Data-viz / video / audio team commission queue (Slack webhook) | Y2 H2 |
| Data-viz / video / audio team commission queue (dedicated UI) | Y3 H1-H2 |
| Social team scheduler | Y3 H2 |
| Newsroom hierarchy fair-chance audit | Y3 H2 |

Order is driven by reporter-first test + design-partner pull, not by feature attractiveness.

## Consequences

- **Roles extend cleanly.** New role surfaces are query filters + UI lenses against an existing canonical object, not new data models.
- **Information symmetry is the default.** Opt-out is per-tenant config; opt-out is the exception. This shapes onboarding conversations: newsrooms that demand mandatory opacity for reporters do not adopt Xtnd.
- **Sales motion differs by role.** Reporter adoption is voluntary, personal, viral. Desk adoption requires editor buy-in. Sequencing respects this — reporter foothold first.
- **Schema extension is gated on upstream PR.** Role enum extension blocks Y2 desk surface until platform accepts the PR. Schedule Y2 work assuming a one-quarter upstream delay.
- **Some newsrooms will reject the information-symmetry default.** Accept; document; do not pivot.

## Anti-patterns refused

- Separate "draft model" or "story model" for non-reporter roles. One canonical object.
- Role-gated information by default. Default visible; configurable hidden.
- "Manager dashboard" features that bypass reporter visibility. Refuse with reference to reporter-first test.
- Auto-assignment of stories to reporters based on system inference. Editor assigns; system informs.

## Revisit

When Xtnd Y2 production data shows actual role-visibility usage patterns. If newsrooms consistently demand hidden-by-default for some field, consider promoting to default-hidden in Y3.

## References

- Xtnd `CONTEXT.md` role map
- Xtnd `ROADMAP.md` role × capability matrix
- Platform ADR 0005 (multi-tenant row-level)
- Platform ADR 0006 (module plugin architecture)
- ADR 0035 (decision-support not autopilot)
