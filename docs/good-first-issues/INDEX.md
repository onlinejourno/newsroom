# Good-First-Issue Index

This directory holds **templates** for the good-first-issues that ship at public flip (Wk 100, per ADR 0033).

Templates are drafted Wk 0 of Xtnd; refined as backbone implementation progresses; published as live GitHub Issues at public flip.

## Categories

Each category below maps to a class of feature work the OSS community absorbs after v0.1 ships.

### 1. CMS read adapters

Adapter wraps a customer's existing CMS (read-only Y1-3 per ADR 0036). Pulls draft state for distribution-fit; pulls published state for post-publish diagnostic.

Templates published Wk 100:

- `gfi-001-cms-read-adapter-ghost.md` — Ghost CMS REST adapter.
- `gfi-002-cms-read-adapter-strapi.md` — Strapi CMS REST adapter.
- `gfi-003-cms-read-adapter-drupal.md` — Drupal REST adapter.
- `gfi-004-cms-read-adapter-wix.md` — Wix (REST + scrape).
- `gfi-005-cms-read-adapter-hugo.md` — Hugo (static-site Git read).
- `gfi-006-cms-read-adapter-jekyll.md` — Jekyll (static-site Git read).
- `gfi-007-cms-read-adapter-eleventy.md` — 11ty static-site.
- `gfi-008-cms-read-adapter-sanity.md` — Sanity headless CMS.
- `gfi-009-cms-read-adapter-contentful.md` — Contentful headless.
- `gfi-010-cms-read-adapter-storyblok.md` — Storyblok headless.
- `gfi-011-cms-read-adapter-payload.md` — Payload CMS.
- `gfi-012-cms-read-adapter-directus.md` — Directus headless.
- `gfi-013-cms-read-adapter-generic-rest.md` — generic REST template for new CMSes.
- `gfi-014-cms-read-adapter-generic-graphql.md` — generic GraphQL template.

### 2. Distribution-fit surface scorers

Each scorer ships as a single function inside `m-distribution-fit` module's `scorers/` directory. Tested against `eval/goldset/<surface>.csv`.

Templates Wk 100:

- `gfi-015-distfit-subscription-kicker.md` — Subscription kicker scorer.
- `gfi-016-distfit-direct-traffic-fit.md` — Direct-traffic fit predictor.
- `gfi-017-distfit-social-momentum.md` — Social-momentum reader.
- `gfi-018-distfit-ai-answer-card.md` — AI answer-card readiness checker.
- `gfi-019-distfit-rss-validator.md` — RSS feed validator + freshness check.
- `gfi-020-distfit-amp-validator.md` — AMP validator.
- `gfi-021-distfit-og-image-scorer.md` — Open Graph image quality scorer.
- `gfi-022-distfit-hreflang-checker.md` — hreflang validator.
- `gfi-023-distfit-newsletter-fit.md` — Newsletter-fit scorer.

### 3. Commission router targets

Each target plugin adds a delivery channel for commissions (e.g., from `m-commission-router` to Slack).

Templates Wk 100:

- `gfi-024-commission-target-slack.md` — Slack incoming webhook.
- `gfi-025-commission-target-discord.md` — Discord webhook.
- `gfi-026-commission-target-msteams.md` — MS Teams webhook.
- `gfi-027-commission-target-email.md` — SMTP email delivery.
- `gfi-028-commission-target-linear.md` — Linear issue creation.
- `gfi-029-commission-target-jira.md` — Jira issue creation.
- `gfi-030-commission-target-asana.md` — Asana task creation.
- `gfi-031-commission-target-trello.md` — Trello card creation.
- `gfi-032-commission-target-monday.md` — Monday.com item creation.
- `gfi-033-commission-target-basecamp.md` — Basecamp to-do.
- `gfi-034-commission-target-clickup.md` — ClickUp task creation.
- `gfi-035-commission-target-notion.md` — Notion database row.
- `gfi-036-commission-target-generic-webhook.md` — Generic webhook template.

### 4. Social schedulers

Each scheduler plugin adds a target channel for `m-social-scheduler` (Y3 module).

Templates Wk 100:

- `gfi-037-social-x.md` — X (Twitter) scheduler via API v2.
- `gfi-038-social-linkedin.md` — LinkedIn scheduler.
- `gfi-039-social-mastodon.md` — Mastodon (any instance).
- `gfi-040-social-bluesky.md` — Bluesky AT Protocol.
- `gfi-041-social-facebook.md` — Facebook Pages scheduler.
- `gfi-042-social-instagram.md` — Instagram Business API.
- `gfi-043-social-threads.md` — Meta Threads API.
- `gfi-044-social-whatsapp-channels.md` — WhatsApp Channels.
- `gfi-045-social-telegram.md` — Telegram channel.
- `gfi-046-social-pinterest.md` — Pinterest pins.
- `gfi-047-social-reddit.md` — Reddit submission.
- `gfi-048-social-generic-oauth.md` — Generic OAuth scheduler template.

### 5. Post-publish data source adapters

Each adapter pulls per-URL performance signals into `m-post-publish-diagnostic`.

Templates Wk 100:

- `gfi-049-postpub-gsc.md` — Google Search Console adapter.
- `gfi-050-postpub-discover.md` — Google Discover Performance adapter.
- `gfi-051-postpub-bing-webmaster.md` — Bing Webmaster Tools adapter.
- `gfi-052-postpub-plausible.md` — Plausible adapter.
- `gfi-053-postpub-ga4.md` — GA4 adapter.
- `gfi-054-postpub-matomo.md` — Matomo adapter.
- `gfi-055-postpub-umami.md` — Umami adapter.
- `gfi-056-postpub-fathom.md` — Fathom adapter.
- `gfi-057-postpub-cloudflare-analytics.md` — Cloudflare Web Analytics adapter.
- `gfi-058-postpub-first-party-template.md` — First-party analytics adapter template.

### 6. Narrative-coherence advisory rules

Each rule is a deterministic or LLM-light advisory check that flags potential narrative issues. Composed via `m-narrative-spine` and `m-narrative-coherence` modules (the latter Y3).

Templates Wk 100:

- `gfi-059-coherence-entity-overlap.md` — Entity-overlap detector.
- `gfi-060-coherence-temporal-proximity.md` — Temporal-proximity scorer.
- `gfi-061-coherence-embargo-flag.md` — Embargo flag check.
- `gfi-062-coherence-sub-judice-india.md` — Sub-judice India (court reporting restrictions).
- `gfi-063-coherence-defamation-risk-heuristic.md` — Defamation-risk heuristic (advisory only).
- `gfi-064-coherence-factual-contradiction-template.md` — Factual-contradiction advisory template.

### 7. Fair-chance audit visualisations

Each visualisation is a React component mounted in the `m-fair-chance-audit` UI (Y3 module).

Templates Wk 100:

- `gfi-065-audit-byline-gender.md` — Byline-gender distribution chart.
- `gfi-066-audit-placement-ctr-variance.md` — Placement-CTR variance chart.
- `gfi-067-audit-surface-coverage-heatmap.md` — Surface-coverage heatmap.
- `gfi-068-audit-time-of-day-patterns.md` — Time-of-day pattern detector.
- `gfi-069-audit-beat-velocity-comparator.md` — Beat-velocity comparator.

### 8. Multi-modal coherence (Y3+, advanced)

These are `advanced` skill level; complex.

Templates Wk 100 (drafted; published when Y3 multi-modal workflow guide ships):

- `gfi-070-multimodal-whisper-fact-extractor.md` — Whisper transcript fact-extractor.
- `gfi-071-multimodal-image-alt-text-validator.md` — Image alt-text validator.
- `gfi-072-multimodal-video-thumbnail-consistency.md` — Video-thumbnail consistency checker.

### 9. Localisation

Each issue adds UI translation for one locale. Per platform ADR 0019/0020 multilingual readiness.

Templates Wk 100:

- `gfi-073-i18n-hi-IN.md` — Hindi (India) UI translation.
- `gfi-074-i18n-ta-IN.md` — Tamil (India) UI translation.
- `gfi-075-i18n-bn-IN.md` — Bengali (India) UI translation.
- `gfi-076-i18n-mr-IN.md` — Marathi (India) UI translation.
- `gfi-077-i18n-te-IN.md` — Telugu (India) UI translation.
- `gfi-078-i18n-kn-IN.md` — Kannada (India) UI translation.
- `gfi-079-i18n-ml-IN.md` — Malayalam (India) UI translation.
- `gfi-080-i18n-gu-IN.md` — Gujarati (India) UI translation.

### 10. Eval set contributions

Each issue ships an eval goldset for a specific module + tenant combination. Per platform ADR 0020 per-language eval gate pattern, adapted to Xtnd modules.

Templates Wk 100:

- `gfi-081-eval-distfit-discover.md` — Discover-fit eval goldset (200 examples, hand-labelled).
- `gfi-082-eval-distfit-search.md` — Search-fit eval goldset.
- `gfi-083-eval-distfit-subscription.md` — Subscription-fit eval goldset.
- `gfi-084-eval-narrative-continuity.md` — Narrative-continuity eval goldset.
- `gfi-085-eval-postpub-diagnostic.md` — Post-publish diagnostic eval goldset.

### 11. Documentation

Templates Wk 100:

- `gfi-086-docs-module-readme-enhancements.md` — Enhance module READMEs.
- `gfi-087-docs-integration-recipe-books.md` — Recipe books for specific integrations.
- `gfi-088-docs-newsroom-onboarding-tutorial.md` — Newsroom onboarding tutorial.
- `gfi-089-docs-design-partner-stories.md` — Case-study posts (once partners agree).
- `gfi-090-docs-translation-style-guide.md` — Translation style guide for localisation contributors.

## How to claim an issue

Once an issue is published as a live GitHub Issue at Wk 100 public flip:

1. Comment "I'd like to work on this" on the issue.
2. Wait for founder confirmation (next Friday window, per ADR 0026).
3. Once confirmed, you have **3 weeks** to open a draft PR. After 3 weeks idle, the claim is released.

## Drafting standards (founder maintains)

Every template in this directory follows the template in ADR 0009. The first 10 templates (`gfi-001` through `gfi-010`) are drafted in detail during Wk 0; remaining 80+ templates drafted during backbone build (Wk 60-100).

At Wk 100 public flip:

- All 90+ templates exist as files in `docs/good-first-issues/`.
- At least 30 are published as live GitHub Issues (mix of skill levels per ADR 0010).
- The rest are queued; published in batches as the community ramp progresses.

## What this index is not

- Not a roadmap. ROADMAP.md is the roadmap.
- Not a commitment that all 90+ templates ship at v0.1. Many are stubs for later batches.
- Not a contributor signup sheet. Issues are claimed on GitHub once published, not here.
- Not exhaustive. New good-first-issues are drafted as the platform expands; this list grows.
