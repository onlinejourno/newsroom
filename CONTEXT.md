# CONTEXT.md — Domain language and product intent

## What this product is

**OnlineJourno Platform** is a multi-tenant editorial intelligence system. Newsrooms install it, configure their sources and beats, and their journalists receive daily AI-curated briefs of what changed in their world, with story-thread continuity and (later) drafting and archive assistance.

The product is built **journalist-first**. The primary user is the working reporter — not the product manager, not the business head. The unit of value is the daily brief that a reporter trusts enough to act on without re-doing the work themselves.

## Target customers (Year 1)

- Mid-size Indian publishers (digital-native and digital-first daily newspapers, ~30–100 journalists).
- First wedge: **markets and regulatory beats**, because the source space is RSS-dense and the "did I miss a filing?" pain is measurable.

## Core principles (do not violate)

1. **Editorial judgement remains human.** AI assists; the final publish/kill call belongs to the editor.
2. **AI never invents a source.** Every shortlisted item shows its raw source URL, one click away.
3. **Configurable, not custom.** Every per-newsroom difference is a setting or a row, not a branch in source.
4. **Trust ladder, not feature ladder.** Roadmap rungs are "the editor stops double-checking," not "the editor sees a new chart."
5. **Reject signal beats accept signal.** Capture *why* a journalist skipped an item; that dataset is the moat.
6. **Source attribution always.** Even in composed briefs, every claim links to the raw release or page.
7. **FOSS-first for OnlineJourno; configurable for tenants (ADR 0028).** OnlineJourno's own technology decisions (Layer 1) default to FOSS, self-hostable, no-tracking. Commercial SaaS is a last resort with a written exit plan; Big-Tech surveillance vendors (Google Analytics, Facebook Pixel, etc.) are refused on Layer 1 outright; Big-Tech-funded grants are refused for the project Y1. **However, the platform stays neutral and configurable at Layer 2:** newsroom tenants are free to plug in GA4, GTM, Adobe Analytics, Segment, Microsoft Teams, or any other vendor they already operate. The platform exposes adapter hooks for every integration; tenants choose.

## Domain glossary

| Term | Meaning |
|------|---------|
| **Newsroom** | One customer tenant. Has its own config, sources, beats, journalists, editorial DNA. |
| **Module** | A plug-in capability (source intelligence, framing analysis, SEO, etc.). Newsroom opts modules on/off. |
| **Beat** | A subject area inside a newsroom (markets, policy, courts, corp). Maps sources to journalists. |
| **Source** | A monitored origin of editorial signal — RSS feed, social account, regulatory portal, exchange filing, etc. |
| **Signal** | One discrete item from a source — a press release, a filing, a tweet, an exchange notice. |
| **Shortlist** | The daily AI-ranked subset of signals worth a journalist's time. Typically 15–25 from 200–500 raw. |
| **Brief** | The per-journalist composed daily output, derived from shortlist + editorial DNA + house voice. |
| **Story thread** | A persistent narrative across days (e.g., "Adani–Hindenburg saga") that links related signals over time. |
| **Editorial DNA** | The newsroom's tuned shortlist preferences, learned over time from journalist accept/reject actions. |
| **Tier** | Customer size category — Tier 1 (digital-native, <30 j), Tier 2 (mid, 30–100), Tier 3 (national, 100+). |
| **PEJ frame** | One of the 13 frames from Project for Excellence in Journalism's *Framing the News* codebook, used to score editorial output. |
| **Deuze type** | One of mainstream / index_category / meta_comment / share_discussion from Deuze (2001) typology. |

## Editorial reference points (foundational frameworks)

- **Project for Excellence in Journalism**, *Framing the News* (1999) — frame + topic codebook.
- **Deuze**, *Online journalism: Modelling the first generation of news media on the WWW*, First Monday 6(10), 2001 — site typology and digital craft characteristics.
- **Reuters Institute**, *Digital News Report* (annual) — business and audience baseline.

These give product credibility with editorial leadership. They are not optional flourishes; they anchor the metrics layer.

## Sister property

- `onlinejournalism.in` — Subhash Rai's existing journalism publication. First case study and design partner. Generates real editorial workflow signal for the platform.

## Launch surfaces (Y1)

Three surfaces, each yielding a different kind of feedback, ship in sequence (ADR 0027):

| Surface | Audience | When | What it yields |
|---------|----------|------|----------------|
| **Design partner editor pilot** at `app.onlinejourno.com` | One markets/regulatory editor at a mid-size Indian newsroom | Wk 8 | Editorial fit, workflow validation, willingness-to-pay |
| **Public code repository** at `github.com/onlinejourno/platform` | Developers, OSS contributors, journalist-developers | Wk 10–12 | Code review, contributor pipeline, OSS credibility |
| **Static community playground** at `try.onlinejourno.com` | Journalists curious about the product, OSS community | Wk 12–16 | Marketing surface, product polish feedback, code-exploration aid |

These are not alternatives. The editor pilot is the only source of editorial signal; the public repo is the only source of code-review signal at solo-founder scale; the playground is the only way the community can engage without a live editor account.

## Out of scope (Y1)

- CMS / publishing tools (newsrooms keep their existing CMS — Ghost, WordPress, Superdesk, etc.).
- Generative drafting at scale (deferred to Wk 25+ once shortlist is trusted).
- Reader-facing personalization (Phase 4, after archive intelligence ships).
- Multilingual UI (English-only Y1; content can be any language, UI is not).
- Mobile native apps (web + email Y1).
