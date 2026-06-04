# ADR 0028 — Values: FOSS-first, no tracking, self-hostable preference

**Status:** Accepted (2026-06-04).

## Context

Multiple architectural decisions throughout Wk 0 and Wk 1 prep have implicitly selected commercial SaaS over FOSS alternatives — Bluehost for WordPress hosting, Fly.io for the product runtime, Anthropic API for agents, Better Stack and similar for proposed uptime monitoring, GitHub for repository hosting.

Each was selected on pragmatic grounds. Cumulatively, they drift away from the founder's stated identity: an indie open-source maintainer building for a journalism community sceptical of Big Tech, vendor capture, opaque tracking, and commercial-SaaS lock-in.

This ADR locks the values that govern every future technology decision and re-audits the existing ones.

## Decision

**Default to FOSS, self-hostable, no-tracking tools.** Commercial SaaS is acceptable only when no FOSS option exists at viable cost / quality / latency for the founder's solo bootstrap stage. Every commercial SaaS adoption carries an exit plan and an annual review.

### Hierarchy of preference (apply in order)

1. **Self-hosted FOSS** — strongest fit for the project's values; chosen when ops burden is acceptable for a solo founder.
2. **Managed FOSS** — FOSS code on a managed platform (e.g. Codeberg, Forgejo, Mastodon-hosted, Plausible Cloud). Acceptable when self-hosting is impractical and the underlying code remains forkable.
3. **No-tracking, no-AdTech commercial SaaS** — privacy-respecting commercial vendors with a clear data-handling stance and exportable data (e.g. Fastmail, Plausible Cloud).
4. **Commercial SaaS** — last resort. Only when no viable FOSS or no-tracking commercial alternative exists for the solo founder's stage. Always with a written exit plan.
5. **Big Tech surveillance SaaS** — refused outright (Google Analytics, Facebook Pixel, X advertising, Google News Initiative funding, Meta Journalism Project funding, etc.).

### Implementation rules

1. **Every new dependency** declares which tier it sits in. Tier 4 requires an ADR. Tier 5 is never adopted.
2. **Adapter contracts on every tier-3 and tier-4 vendor** (per ADR 0007) so swapping is days, not months when an FOSS alternative emerges.
3. **No third-party trackers** in any OnlineJourno-controlled web surface — no Google Analytics, no Facebook Pixel, no Hotjar, no Intercom, no Segment, nothing that fingerprints visitors.
4. **No commercial-vendor analytics** in journalist-facing UX. First-party analytics only. Reader-facing surfaces use Plausible self-hosted or GoatCounter at most; product UX collects nothing without explicit per-tenant consent.
5. **Donation channels prefer OpenCollective and LiberaPay** over GitHub Sponsors (which is owned by Microsoft and goes through Stripe / commercial rails). GitHub Sponsors may be enabled as a convenience for users who already have a GitHub account, but is not the primary channel.
6. **No Big-Tech-funded grants Y1**. Google News Initiative, Meta Journalism Project, ICFJ-via-Facebook are refused. Independent journalism grants (Reuters Institute, IJNet, Indian journalism trusts not funded by Big Tech) remain considered.
7. **AI provider lock-in is acknowledged but bounded**. Anthropic API is currently tier-4 (commercial SaaS) for shortlist and brief composition. Adapter contract (ADR 0007) keeps the seam thin. Y3+ revisit: local model option (Ollama, vLLM) for tenants who want zero external-AI dependency.

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

## What this ADR refuses

- Google Analytics, Google Tag Manager, Facebook Pixel, Segment, Mixpanel, Amplitude, Hotjar, Intercom — refused outright.
- X (Twitter) advertising or X-funded distribution — refused.
- Google News Initiative, Meta Journalism Project, Apple News Initiative funding — refused Y1 (revisit only if funding mechanism cleanly separated from the parent platform's interests).
- "Best Stack", "Pingdom", "Datadog Synthetic", "New Relic Synthetic" or similar commercial uptime SaaS — refused unless ntfy + cron pattern becomes operationally unworkable, with explicit ADR.
- Embedded vendor scripts (Stripe embedded, Intercom widget, marketing pixels) in product UX — refused.

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
