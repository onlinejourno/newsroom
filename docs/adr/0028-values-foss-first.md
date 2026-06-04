# ADR 0028 — Values: FOSS-first, no tracking, self-hostable preference

**Status:** Accepted (2026-06-04).

## Context

Multiple architectural decisions throughout Wk 0 and Wk 1 prep have implicitly selected commercial SaaS over FOSS alternatives — Bluehost for WordPress hosting, Fly.io for the product runtime, Anthropic API for agents, Better Stack and similar for proposed uptime monitoring, GitHub for repository hosting.

Each was selected on pragmatic grounds. Cumulatively, they drift away from the founder's stated identity: an indie open-source maintainer building for a journalism community sceptical of Big Tech, vendor capture, opaque tracking, and commercial-SaaS lock-in.

At the same time, the platform must remain attractive to the broadest possible set of newsrooms, including those already invested in Google Analytics 4, GTM, Adobe Analytics, Segment, Mixpanel, and similar tools. Forcing the founder's values on customers would shrink the market unnecessarily.

This ADR locks the values that govern OnlineJourno's own technology decisions while preserving newsroom freedom to integrate with whatever stack they already operate.

## Scope: two layers, two policies

The policy below operates on **two distinct layers** that are governed by different rules. This separation is binding.

### Layer 1 — OnlineJourno-controlled surfaces (strict)

Everything OnlineJourno (the project, the founder, the codebase) directly owns and operates:

- The platform source code at `github.com/onlinejourno/platform`
- The marketing site at `onlinejourno.com`
- The product UX chrome at `app.onlinejourno.com` (the journalist UX, editor UX, admin UI shipped by the platform)
- The community playground at `try.onlinejourno.com`
- All OnlineJourno-side ops: uptime monitoring, error tracking, billing, donations, communications
- The founder's identity and decision-making

These layer-1 surfaces follow the **strict FOSS-first policy** below. No GA4, no Pixel, no commercial surveillance SaaS, ever. Pragmatic tier-4 (commercial SaaS) adoptions for infrastructure (Fly.io, Anthropic, GitHub) are permitted only with documented exit plans.

### Layer 2 — Tenant-controlled surfaces (neutral, configurable)

What newsrooms (tenants) configure and operate on top of the platform:

- Their reader-facing analytics on their own published content
- Their CMS, social, ad, and revenue tooling
- Their internal newsroom integrations (Slack, email, Notion, Airtable, etc.)
- Their own choices about whether to use GA4, Adobe Analytics, Mixpanel, etc.

The platform must remain **neutral and configurable** at layer 2. Newsrooms must be able to plug in whatever they already operate, including Google Analytics 4, Google Tag Manager, Segment, Mixpanel, Adobe Analytics, or any other tool the editorial leadership has chosen — even if those tools would not be acceptable on Layer 1.

The platform's job is to expose configurable hooks (per-tenant analytics provider, per-tenant CMS adapter, per-tenant notification destination), not to dictate which tools the newsroom uses.

#### Layer 2 design rules

1. **Configurable per-tenant**, never hard-coded in source.
2. **Opt-in defaults**. The platform ships with values-aligned alternatives selected by default (Plausible self-hosted, ntfy, Postgres) but does not block the tenant from switching.
3. **Adapter contracts on every integration** (per ADR 0007). Adding a new analytics or notification provider is a module, not a fork.
4. **No platform-imposed scripts**. The platform never injects a third-party script tag the tenant did not explicitly enable through configuration.
5. **Honest documentation**. The platform documents the privacy implications of each integration; the tenant decides.

This ADR codifies the values that govern Layer 1 only.

## Decision

**Default to FOSS, self-hostable, no-tracking tools.** Commercial SaaS is acceptable only when no FOSS option exists at viable cost / quality / latency for the founder's solo bootstrap stage. Every commercial SaaS adoption carries an exit plan and an annual review.

### Hierarchy of preference (apply in order)

1. **Self-hosted FOSS** — strongest fit for the project's values; chosen when ops burden is acceptable for a solo founder.
2. **Managed FOSS** — FOSS code on a managed platform (e.g. Codeberg, Forgejo, Mastodon-hosted, Plausible Cloud). Acceptable when self-hosting is impractical and the underlying code remains forkable.
3. **No-tracking, no-AdTech commercial SaaS** — privacy-respecting commercial vendors with a clear data-handling stance and exportable data (e.g. Fastmail, Plausible Cloud).
4. **Commercial SaaS** — last resort. Only when no viable FOSS or no-tracking commercial alternative exists for the solo founder's stage. Always with a written exit plan.
5. **Big Tech surveillance SaaS** — refused outright (Google Analytics, Facebook Pixel, X advertising, Google News Initiative funding, Meta Journalism Project funding, etc.).

### Implementation rules (Layer 1 only)

1. **Every new Layer 1 dependency** declares which tier it sits in. Tier 4 requires an ADR. Tier 5 is never adopted.
2. **Adapter contracts on every tier-3 and tier-4 vendor** (per ADR 0007) so swapping is days, not months when an FOSS alternative emerges.
3. **No third-party trackers** in any OnlineJourno-controlled Layer 1 surface (`onlinejourno.com`, `app.onlinejourno.com` product chrome, `try.onlinejourno.com`, admin UI of the platform shipped by OnlineJourno) — no Google Analytics, no Facebook Pixel, no Hotjar, no Intercom, no Segment, nothing that fingerprints visitors.
4. **No commercial-vendor analytics on OnlineJourno's own marketing or admin UX.** Layer 1 first-party analytics only. The platform ships with Plausible self-hosted or GoatCounter as the values-aligned default for tenants who want one; tenants who prefer a commercial analytics vendor configure it at Layer 2.
5. **Donation channels prefer OpenCollective and LiberaPay** over GitHub Sponsors (which is owned by Microsoft and goes through Stripe / commercial rails). GitHub Sponsors may be enabled as a convenience for users who already have a GitHub account, but is not the primary channel.
6. **No Big-Tech-funded grants Y1** for OnlineJourno's own funding. Google News Initiative, Meta Journalism Project, ICFJ-via-Facebook are refused. Independent journalism grants (Reuters Institute, IJNet, Indian journalism trusts not funded by Big Tech) remain considered. (Tenants are free to receive funding from anywhere; this rule is about the OnlineJourno project's funding sources only.)
7. **AI provider lock-in is acknowledged but bounded**. Anthropic API is currently tier-4 (commercial SaaS) for shortlist and brief composition. Adapter contract (ADR 0007) keeps the seam thin. Y3+ revisit: local model option (Ollama, vLLM) for tenants who want zero external-AI dependency.
8. **Tenant integrations remain neutral.** The platform's admin UI must expose a configurable analytics provider, configurable notification destination, configurable CMS adapter, and configurable identity provider per tenant. Default to values-aligned options; never block the tenant from selecting a commercial alternative.

## Current-state audit (Wk 1)

| Surface | Vendor | Tier | Justification | Exit plan |
|---------|--------|------|---------------|-----------|
| Code hosting | GitHub (`onlinejourno/platform`) | 4 | Ecosystem reach, contributor familiarity, free for public repos | **Codeberg mirror** maintained from Wk 12 (public-repo flip) onwards. Migration possible in days if GitHub policy changes (e.g. Copilot training opt-out removed). |
| Marketing site | WordPress on Bluehost | 1+4 hybrid | WordPress = self-hosted FOSS (tier 1). Bluehost = commercial managed hosting (tier 4). Justified by existing payment and non-technical edits. | Can migrate WP to any LAMP host or self-host on Fly machine in a day. |
| Product runtime | Fly.io | 4 | Best PAYG cost + India edge for solo bootstrap. No FOSS PaaS with comparable DX exists at this stage. | Docker images are portable. Replatform to Hetzner / OVH / self-hosted Kubernetes possible. Y2+ revisit. |
| Database | Postgres self-managed in Fly machine Y1 | 1 | Postgres is FOSS. Hosted on Fly tier-4 substrate but data lives in standard Postgres dump format. | Always exportable. Postgres binary backup. |
| Agent runtime | Anthropic Claude API | 4 | Only frontier-class editorial reasoning at acceptable Indian language quality and cost. No FOSS LLM matches at current stage. | Adapter at `packages/spine/llm/anthropic.ts` per ADR 0007. Local model (Ollama with Llama 3.x, Qwen, Mistral) explored Y3+ when vernacular quality crosses threshold per ADR 0020. |
| DNS | Bluehost (since GoDaddy nameservers redirected) | 4 | Already paid, working | Move to any DNS host (Cloudflare DNS, DNSControl + Hetzner DNS) at any time; nameserver change at registrar. |
| Domain registration | GoDaddy | 4 (downgraded) | Existing | **Migrate to Porkbun or Namecheap or OpenSRS at next renewal.** GoDaddy's commercial / political record sits poorly with the project's values. Calendar reminder set for ~Mar 2027. |
| Uptime monitoring | GitHub Actions cron + ntfy (self-hostable) | 2 | ntfy.sh is FOSS, optionally self-hostable. GitHub Actions schedule is the cron substrate. No third-party SaaS uptime vendor in the loop. | Shift to self-hosted ntfy + cron-on-VPS if GitHub Actions becomes unsuitable. |
| Donations | OpenCollective + LiberaPay (preferred); GitHub Sponsors (convenience, not primary) | 2 | Both OpenCollective and LiberaPay are values-aligned; GitHub Sponsors is a Microsoft-rail tier-4 convenience layer. | Always-on multiple channels = no single vendor exit pressure. |
| Reader-facing analytics | None Y1; Plausible self-hosted Y2 candidate | 1 | First principle: no third-party tracking. Tenant-facing UX collects only what's necessary for the brief, with consent gates. | n/a |
| Status page | None Y1; ntfy + static HTML when needed Y2+ | 1 | No SaaS status-page vendor; minimal HTML status page can be served from the same Fly app or Cloudflare R2. | n/a |

### Cloudflare Pages playground (previously suggested) — reversed

The PLAYGROUND-PLAN's recommendation of Cloudflare Pages for `try.onlinejourno.com` is replaced by **a tiny Fly machine serving the static export** or **a static host on the Bluehost account** (since WordPress is already there). Both keep the playground under existing tier-4 vendors rather than adding Cloudflare as a new commercial dependency. Decision recorded as an amendment to `docs/PLAYGROUND-PLAN.md` next time it is touched.

## Review cadence

This audit is repeated annually (every June) by the founder. Any tier-4 entry whose FOSS or no-tracking alternative has matured during the year is migrated. The review is committed as a dated note in `docs/values-audit/<year>.md`.

## What this ADR refuses (on Layer 1 only)

- Google Analytics, Google Tag Manager, Facebook Pixel, Segment, Mixpanel, Amplitude, Hotjar, Intercom embedded on `onlinejourno.com`, `app.onlinejourno.com` product chrome, `try.onlinejourno.com`, or any other OnlineJourno-operated surface — refused outright.
- X (Twitter) advertising for OnlineJourno's own marketing or X-funded distribution of OnlineJourno content — refused.
- Google News Initiative, Meta Journalism Project, Apple News Initiative funding **for the OnlineJourno project itself** — refused Y1 (revisit only if funding mechanism cleanly separated from the parent platform's interests).
- "Best Stack", "Pingdom", "Datadog Synthetic", "New Relic Synthetic" or similar commercial uptime SaaS for OnlineJourno's own monitoring — refused unless ntfy + cron pattern becomes operationally unworkable, with explicit ADR.
- Embedded vendor scripts (Stripe embedded, Intercom widget, marketing pixels) in OnlineJourno-controlled product UX — refused.

### What this ADR explicitly allows

- A tenant newsroom configuring GA4, GTM, Adobe Analytics, Segment, Mixpanel, or any other vendor at Layer 2 for *their own* reader-facing surfaces — **allowed**, by configuration, with platform-provided adapter.
- A tenant newsroom integrating with Microsoft Teams, Slack, Office 365, or any other commercial collaboration tool for *their internal* notifications — **allowed**, by configuration.
- A tenant newsroom receiving funding from Google News Initiative, Meta Journalism Project, or any commercial sponsor — **allowed**; the platform does not police tenant funding choices.
- A tenant newsroom hosting on a Cloudflare-backed CDN or behind any commercial firewall for their own content — **allowed**.

The platform's neutrality at Layer 2 is what makes it usable by mainstream newsrooms while still letting the OnlineJourno project itself stay FOSS-first.

## Consequences

- Existing decisions stand where the vendor passes the audit (Fly.io, Anthropic, GitHub).
- Better Stack and similar commercial uptime monitors are out. Pattern A (GitHub Actions cron + ntfy) is the chosen uptime stack.
- Donations channels reorient toward OpenCollective and LiberaPay as primary; GitHub Sponsors stays as a secondary convenience layer.
- Cloudflare Pages is replaced for the playground; static export hosts on Fly or Bluehost.
- Domain registration migrates away from GoDaddy at next renewal.
- All future "should I use X?" decisions reference this ADR before selection.

## References

- ADR 0007 — Adapter contracts on every external dependency (the technical mechanism that makes tier shifts possible).
- ADR 0024 — Apache 2.0 license model.
- ADR 0025 — No mandatory contribution.
- ADR 0026 — Sustainability rules (the maintainer-energy mechanism that makes self-host viable).
- ADR 0027 — Layered launch sequence.
