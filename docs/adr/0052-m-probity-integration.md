# ADR 0052 — m-probity: the Digital Mirror engine joins the platform's audit

**Status:** Accepted (2026-06-11).

## Context

`web-bloat-checker` ("Digital Mirror", companion to the founder's book) is the
probity module ADR 0041 restored to the centre: it scans a URL with Playwright
and scores **what the page does to the reader** — the Democratic
Infrastructure Score over five dimensions (Surveillance, Ad-Tech Depth,
Consent Integrity, Page Bloat, Performance), plus flags (RTB broadcaster,
pre-consent fires, Google double-bind, social-pixel surveillance), an
Openness score, a Paywall-Quality score, and remediation recommendations with
privacy-respecting alternatives.

The platform's Channel Audit answers "is this story built for its chance?";
probity answers "at what cost to the reader?". A fair chance and a fair page
are the same value applied to both ends.

## Decision

1. **The engine stays its own OSS service.** web-bloat-checker runs as its
   Express + Playwright server; the platform is a **client** over HTTP
   (`PROBITY_URL`, default `http://localhost:4870`). No code is forked into
   the monorepo; the integration seam is the engine's existing API
   (`POST /api/analyze` → jobId → polled JSON report → HTML report link).

2. **On-demand only.** A scan takes 15–40s and drives a real browser; it is a
   journalist-initiated audit (`/en/probity`), not a batch pass over the
   corpus. Scheduled probity trend-lines come later, with their own table.

3. **Vantage-point honesty.** The founder's own A/B reports show the same
   page scoring 97 vs 46 depending on geography/VPN and page type (ad stacks
   load conditionally). Every surfaced result names the scan time and that it
   reflects this machine's network vantage point.

4. **Placement.** Probity sits in the editorial nav beside Scores: the
   distribution-fit audit and the probity audit are the two halves of the
   fair-chance value. The full Digital Mirror HTML report stays the engine's
   artefact, linked not re-rendered.

## Consequences

- Probity is live in the product with zero engine duplication; the checker
  evolves independently (it has its own CLAUDE.md and roadmap).
- The platform degrades gracefully when the engine is offline (the page says
  how to start it) — OSS adopters without the checker lose only this view.
- Later: persist scan results (probity_scores) for trend-lines and the
  board-level "are we getting cleaner?" view; per-story probity chip on
  /scores once batch economics are acceptable.

## Anti-patterns refused

- Forking the engine into the monorepo.
- Batch-scanning the corpus by default (heavy, and the numbers move with
  vantage point).
- Treating one scan as the site's permanent truth.

## References

- ADR 0041 (probity restored as core), ADR 0028 (FOSS-first values)
- `~/projects/web-bloat-checker` (the engine; `server/index.js` API)
- The founder's TH/HT Digital Mirror reports (March 2026) — the vantage-point
  evidence.
