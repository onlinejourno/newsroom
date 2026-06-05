# Contributing to OnlineJourno Xtnd

> **Single-maintainer disclaimer:** OnlineJourno Xtnd is maintained by a single person. Response time targets and release cadence reflect that. Pull requests and issues are reviewed but not on a same-day basis. If you need guaranteed response, please contact `support@onlinejourno.com` about a commercial support agreement.

Welcome. This is the contributor guide for `onlinejourno/xtnd`. The repository ships under Apache License 2.0 (per `LICENSE.md` and platform ADR 0024). Contributions are voluntary (per platform ADR 0025).

> This is a **skeleton** drafted at Wk 0 of Xtnd. The final version ships at Wk 100 alongside the public flip (per ADR 0010). Until then, expect refinements.

## What to read first

- `README.md` — what Xtnd is.
- `RELATION-TO-PLATFORM.md` — how Xtnd relates to OnlineJourno Platform; the downstream rule.
- `CONTEXT.md` — domain language, role map, principles.
- `ROADMAP.md` — what's in scope this year and next.
- `docs/adr/` — architectural decisions. Read at least ADR 0001, 0003, 0008, 0009 before opening a PR.

## What to contribute

**Most contributions are good-first-issues.** Each issue is tightly scoped, has a Module Contract scaffold, and has explicit acceptance criteria. See ADR 0009 for the contract.

Good places to start:

- **`first-timer-friendly`** issues — single-file changes, 2-4 hours, scaffold provides 80% of code. At least 8 open at any time.
- **`experienced-contributor`** issues — multi-file changes within a single module, 8-16 hours, complete Module Contract.
- **`advanced`** issues — cross-module changes or new modules, 24-60 hours.

Categories (from `docs/good-first-issues/INDEX.md`):

- CMS read adapters (Ghost, Strapi, Drupal, Wix, Hugo, Jekyll, Eleventy, Sanity, Contentful, Storyblok, Payload, Directus, REST/GraphQL templates).
- Distribution-fit surface scorers (Subscription kicker, Direct-fit, Social-momentum, AI-answer-card, RSS, AMP, OG image, hreflang, Newsletter-fit).
- Commission router targets (Slack, Discord, MS Teams, email, Linear, Jira, Asana, Trello, Monday, Basecamp, ClickUp, Notion, generic webhook).
- Social schedulers (X, LinkedIn, Mastodon, Bluesky, FB, IG, Threads, WhatsApp Channels, Telegram, Pinterest, Reddit, generic OAuth).
- Post-publish data source adapters (GSC, Discover, Bing Webmaster, Plausible, GA4, Matomo, Umami, Fathom, Cloudflare Web Analytics).
- Narrative-coherence advisory rules (entity-overlap, temporal-proximity, embargo, sub-judice, defamation-risk, factual-contradiction templates).
- Fair-chance audit visualisation variants (byline-gender, placement-CTR variance, surface-coverage heatmap, time-of-day patterns, beat-velocity comparator).
- Multi-modal coherence (Whisper transcript fact-extractor, image alt-text validator, video-thumbnail consistency).
- Localisation (UI translations per locale).
- Eval set contributions (per-tenant goldset templates for each distribution-fit surface).
- Documentation enhancements (per-module README, recipe books, integration tutorials).

## What not to contribute

Per locked ADRs:

- **Autopilot / decision-making features.** ADR 0035: every capability is decision-support. Reject autopilot placement, scheduling, commissioning, publishing.
- **CMS write adapters (head mode).** ADR 0036: read-only Y1-3. Y4+ only on customer-pull trigger.
- **Standalone Xtnd tenancy.** Xtnd lives on platform tenancy through Y3.
- **Module name with `m-` prefix.** Xtnd modules use `x-`. Reserved namespace; ADR 0005.
- **New top-level dependencies.** Per platform `CLAUDE.md` and ADR queue. A new dependency needs a separate ADR PR.
- **Edits to platform code.** Xtnd is downstream. Platform changes go upstream as separate PRs on `onlinejourno/platform`.

## How to develop locally

```bash
# Clone Xtnd repo
git clone https://github.com/onlinejourno/xtnd.git
cd xtnd

# Clone platform repo as sibling (workspace link target)
cd ..
git clone https://github.com/onlinejourno/platform.git
cd xtnd

# Install dependencies
pnpm install

# Bootstrap demo tenant locally (against local Postgres)
pnpm run demo:seed

# Run dev server (Next.js + workers via concurrently)
pnpm dev

# Run tests
pnpm test

# Run module evals
pnpm eval
```

The Xtnd `pnpm-workspace.yaml` links to `../platform/packages/spine` and platform modules for live local development. See `RELATION-TO-PLATFORM.md` for the workspace-link pattern.

## Module Contract scaffold

A starter template for new modules lives at `docs/templates/module-scaffold/`. Copy it to `packages/modules/x-<your-module>/` and replace TODO placeholders.

Required files in any module:

- `module.config.ts` — Zod schema for module config.
- `module.lifecycle.ts` — `onEnable`, `onDisable`, `onConfigChange` hooks.
- `storage/` — migrations for any owned tables (per platform ADR 0006).
- `agents/` — agent registrations (if module uses agents).
- `ui/` — React component slot mounts (if module has UI).
- `jobs/` — scheduled jobs (if module has cron jobs).
- `eval/goldset/demo.csv` — eval fixture (at least 20 examples).
- `tests/` — unit tests for pure functions.
- `README.md` — module documentation (template at `docs/templates/MODULE-README.md`).

## PR review process

- **Acknowledgement within 7 days** ("Received. Reviewing this weekend.").
- **First substantive review by the next Friday review window** (per platform ADR 0026, 4-5 PM IST).
- **Subsequent rounds on the same Friday cadence.**
- **No same-day promises.** No DM / Slack / Twitter response expectations.
- **PRs idle 30 days** are commented for status; **idle 60 days** are closed (reopen friction-free).

## Acceptance criteria (every PR)

- [ ] Module Contract complete.
- [ ] Inputs validated by Zod.
- [ ] Outputs match shape in `docs/INTEGRATION-SPEC.md`.
- [ ] RLS-aware: `tenant_id` in every query.
- [ ] Cost-budget aware: agent calls go through `agent_traces`.
- [ ] Unit tests pass (`pnpm test`).
- [ ] Eval harness passes (`pnpm eval`).
- [ ] No new top-level dependencies.
- [ ] No edits outside the module directory or its consuming UI slot.
- [ ] Module `README.md` follows the template.
- [ ] Demo tenant seed data extended where relevant.
- [ ] Decision-support compliant (ADR 0035).

Full criteria template per good-first-issue is in ADR 0009.

## Recognition

Voluntary contributors are recognised:

- `CONTRIBUTORS.md` updated on merge.
- Contributor handle in module README "Curated by …" field.
- Annual community-contributors post on `onlinejourno.in`.
- Substantial contributions credited in release notes.

## Security disclosure

See `SECURITY.md`. Vulnerabilities are disclosed privately via the maintainer's GPG-signed email, never on public issues.

## Code of conduct

See `CODE_OF_CONDUCT.md`. Contributor Covenant 2.1 (or equivalent).

## Licensing

Apache License 2.0. By contributing, you agree to license your contribution under the same. See `LICENSE.md` and `NOTICE`.

## What if my contribution doesn't fit a good-first-issue?

Open a discussion (or issue with `needs-triage` label). Briefly explain what you want to build, why, and how it fits the roadmap. Founder responds in the next Friday review window.

If the work is outside scope (e.g., autopilot feature, head-mode adapter, m-* module), the response will say so with reference to the locked ADR. This is fast feedback; please don't take it personally — locked ADRs save everyone time downstream.

## When the project pauses or changes pace

The founder runs Xtnd as an indie open-source project alongside platform Y1 maintenance. Project pauses (annual recharge week, urgent platform incidents, founder personal life) are signalled in the README and pinned issues.

The project may die. The founder may step back. Apache 2.0 means the code can be forked under permissive terms; the trademark and brand remain with the founder.

## Thanks

Every voluntary contribution makes the platform better for working journalists. The project exists because journalism deserves better tools; you contribute to journalism by contributing here.
