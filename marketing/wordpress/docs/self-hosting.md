# Self-hosting

OnlineJourno is built to be run by the newsroom that uses it — no vendor lock-in,
your sources, your data. This is the core of the project, not an afterthought.

## What's open

- **Open source (MIT):** the [free tools](/docs/tools/) — Web Bloat Checker and
  Crawl-Budget Analyser. Fork and run freely.
- **Fair-source (FSL):** Newsroom, Daybook, Galley, Frontmatter — source-available;
  run them for your own newsroom.

Everything lives at [github.com/onlinejourno](https://github.com/onlinejourno).

## The shape of an install

1. **Clone** the tool's repo.
2. **Configure** your own sources, signals, and connectors — nothing personal to
   the project is baked in; you provide your own credentials via environment.
3. **Run** with the documented command (each repo's README has the exact steps).
4. **First-run onboarding** walks you through the per-tenant configuration.

## Bring your own everything

No founder keys, accounts, or infrastructure are defaults anywhere. You
self-provision API keys and data sources through environment variables and the
connector configuration. A self-hosted newsroom does not expose its own
performance data by default.

## Extending it

The connector seam is the sanctioned place to add a new source or tool. The
module contract keeps your extensions upgrade-safe. See each repo's
`docs/` and `AGENTS.md` for the contract.

## Help

No support desk — but the docs aim to be enough, and the community picks up the
rest. Open an issue on [GitHub](https://github.com/onlinejourno).
