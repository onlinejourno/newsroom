# ADR 0065 — Two fully-FOSS community canaries (MIT)

**Status:** Accepted (2026-06-26). **Amends ADR 0064** (FSL scope).

## Context

OnlineJourno's products are fair-source (FSL-1.1-ALv2, ADR 0064) — the right moat for a fundable venture. But FSL does not invite *contributors*: the competing-use bar and two-year-delayed-open clock are exactly what make FOSS people hesitate. The founder wants three things FSL can't give: (1) **test the thesis** — is there interest in journalist-led newsroom technology? (2) **draw FOSS developers into newsroom tech** from a journalist's point of view, rather than the usual news-org-engineer path; (3) **reach** — a community + credibility surface that feeds the wider marketing effort. FOSS people contribute to FOSS, so a genuinely-open canary is the only vehicle that works for this.

## Decision

Relicense **two peripheral tools to MIT** (fully open source) as deliberate community canaries:

- **`news-crawl-budget-analyzer`** — the *thesis test*. The purest expression of "newsroom tech from a journalist's POV" (a journalist explaining how crawlers and AI assistants misread editorial structure). On-message; narrower audience.
- **`web-bloat-checker`** — the *reach play*. Privacy + anti-surveillance has a large ready FOSS audience and an obvious contribution surface (the tracker database). Broader reach; less newsroom-specific.

Each gets: a `CONTRIBUTING.md`, "good first issue" guidance, and a README "why a journalist built this" note — the framing *is* the outreach.

### Scope — what stays fair-source / proprietary

The **moat stays FSL-1.1-ALv2**: the orchestrator (the "JATO engine"), the scoring/merit methodology (`onlinejourno-scoring` + vendored copies), `story-optimiser` (Galley), `masthead-audit`, and `platform`. `onlinejourno-pulse` stays **proprietary**. This ADR carves *only* the two named tools out of ADR 0064's FSL list. *(The "JATO" label is parked pending a positioning review — see the JATO ADR, story-optimiser 0002; the moat decision here is unaffected.)*

## Consequences

- **Intentional split licensing** — "open community tools (MIT)" vs "fair-source products (FSL)" vs "proprietary (Pulse)". Documented here so it reads as deliberate, not confusing.
- The relicense is **forward-only** — once a version is MIT it is a gift to the commons; this is accepted as the point, not a risk.
- **Light-touch maintenance** is committed for the two canaries (issues/PRs answered ~weekly, per ADR 0026's solo-maintainer model) so they don't read as abandoned.
- The two repos move under the personal `onlinejourno` GitHub account; making them **public** is the launch step that activates the canary.

## References

- ADR 0064 (FSL fair-source — amended scope); ADR 0028 (values); ADR 0026 (solo-maintainer cadence); ADR 0042 (one vendor-neutral product).
