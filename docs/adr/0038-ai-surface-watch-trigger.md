# ADR 0038 — AI surface (MCP, AI answer cards) watch-trigger

**Status:** Accepted (2026-06-03 in `onlinejourno/xtnd`; merged into `onlinejourno/platform` 2026-06-05 per ADR 0030).

## Context

A class of distribution surfaces is emerging in 2025-26 that Xtnd's roadmap places in Y3+:

- **MCP feeds** — Anthropic's Model Context Protocol for surfacing publisher content to AI agents.
- **AI answer cards** — Google AI Overviews, ChatGPT search citations, Perplexity answer panels, Claude search.
- **Agentic feeds** — LLM-readable structured feeds (Schema.org, JSON-LD, NewsArticle, ClaimReview, FactCheck).
- **`ai.txt` and crawler licensing** — opt-in/out signals for AI training and inference crawlers.

The roadmap places work on these surfaces in Year 3 of Xtnd (`ROADMAP.md` Y3 module set 2 + Y4 head mode). The rationale is bandwidth — founder cannot ship Y2 module set 1 and Y3 module set 2 simultaneously; Y3 reasonably trails Y2 by 6-12 months.

The risk: by Year 3 (calendar 2028-29), incumbents may already own these surfaces. Google's AI Overviews could harden into a placement system Xtnd cannot influence. Anthropic's MCP feeds could standardise without Xtnd-equivalent tooling reaching the Indian newsroom segment. The window for Xtnd to deliver a distinctive surface intelligence on these channels may close.

A passive "wait until Y3" stance accepts the risk silently. A safer pattern is an explicit watch-trigger: declare conditions under which Y3 AI-surface work accelerates into Y2 H2.

## Decision

Adopt a quarterly watch-trigger review for AI-surface work. The trigger fires when **any one** of the following conditions is true at the end of a quarter:

### Trigger A — Major Indian outlet MCP / AI-feed adoption

≥3 major Indian outlets (defined as: Times of India, Hindustan Times, The Hindu, Indian Express, NDTV, India Today, ThePrint, The Wire, Scroll, News18, Mint, Business Standard, Economic Times, Moneycontrol, or any outlet with ≥10M unique monthly readers) ship a public-facing MCP feed, structured AI-answer-card pipeline, or `ai.txt` policy that meaningfully constrains AI-crawler access.

The presence of three outlets adopting a surface is the signal that the surface is becoming a competitive necessity in the Indian newsroom market.

### Trigger B — Google / Anthropic / OpenAI ships native AI-feed indexing

Google, Anthropic, or OpenAI ships a publisher-facing AI-feed ingestion product (such as: Anthropic native MCP-feed indexing in Claude search, Google AI-Overviews dedicated publisher feed, OpenAI native publisher feed for ChatGPT search). The release must include published documentation, a feed-format specification, and a path for publisher adoption.

This signal is independent of Indian adoption; the surface becomes a global standard that Xtnd customers will be asked about.

### Trigger C — Design partner explicit request

A design partner of OnlineJourno Platform or Xtnd asks explicitly for an MCP feed, AI-answer-card optimisation, or AI-crawler licensing tooling, with willingness to fund the work via paid services revenue.

Design-partner pull is the strongest pull; one explicit request with paid commitment trumps the other two triggers' threshold counts.

### Trigger D — Trust-and-safety regression on existing surfaces

If AI-generated misattributions, mis-citations, or fabrication of OnlineJourno or design-partner content surfaces in AI-answer cards or AI-feed ingestion at a rate that materially harms editorial trust (≥5 documented incidents per quarter), trigger fires regardless of customer pull. Refusing to engage with AI surfaces does not stop the surfaces from misusing content; building licensing + provenance tooling becomes defensive necessity.

## Action when any trigger fires

1. Document the trigger in `ROADMAP.md` quarterly-review entry with date and evidence.
2. Accelerate AI-surface work into Y2 H2 (no later than Wk 90 of platform timeline).
3. Specifically pull forward:
   - `ai.txt` policy module (cheap; ships first).
   - Cloudflare AI gate + Common Crawl opt-out (cheap; ships near-first).
   - Structured-data export module for `Article` / `NewsArticle` / `ClaimReview` JSON-LD (medium effort).
   - MCP feed export module if Trigger A or B fires (larger effort).
   - C2PA content credentials (defer to Y3 unless Trigger D fires).
4. File ADRs for the specific AI-surface modules at the time of pull-forward.
5. Adjust Y3 roadmap to absorb the schedule pressure (deferring one of Y3 module set 2 capabilities into Y3 H2 or Y4).

## When no trigger fires

If no trigger fires during a quarterly review, Y3 schedule for AI-surface work is reaffirmed. Document the review outcome in `ROADMAP.md` as evidence the watch was not skipped.

## Quarterly review checklist

Added to `ROADMAP.md` quarterly review process:

- [ ] Major Indian outlet AI-feed scan (Trigger A check).
- [ ] Google / Anthropic / OpenAI release scan (Trigger B check).
- [ ] Design partner explicit-request check (Trigger C).
- [ ] Trust-and-safety incident log review (Trigger D).
- [ ] If any fired: document evidence, file ADR, adjust roadmap.
- [ ] If none fired: confirm Y3 schedule.

## Consequences

- **Y2 schedule has reserved capacity for AI-surface acceleration.** Y2 plan must include a "pulled-forward AI-surface" contingency line — not a fixed deliverable, but capacity reserved (≈40-60 founder hours in Y2 H2).
- **AI-surface readiness is not a binary Y3 launch.** Cheap items (`ai.txt`, robots policy, structured data) can ship in Y2 even without trigger fire, as part of normal Xtnd hygiene.
- **Quarterly discipline required.** Founder must run the checklist; without discipline, this ADR is paperwork.
- **Founder can decline trigger response with documented reason.** If a trigger fires but founder bandwidth is genuinely unavailable (e.g., platform Y1 stalled), the response can be deferred to next quarter with a documented "deferred-once" reason. Two consecutive deferrals require an ADR amendment or co-founder hire.
- **No promise to customers about Y2 AI-surface delivery.** Customers are told Y3; Y2 acceleration is contingency, not promise.

## Anti-patterns refused

- "Wait and see" without quarterly checklist. The watch is the action.
- Pulling AI-surface work forward speculatively without a trigger. Capacity protected for Y2 module set 1.
- Building AI-feed tooling that violates ADR 0035 (no autopilot publishing to AI surfaces without per-piece editor consent).
- Building AI-crawler licensing tooling that violates platform ADR 0025 (no upload of customer editorial DNA to training crawlers).

## Revisit

This ADR is revisited if:

- The window has clearly closed (Y3 arrives without trigger fire and Xtnd's customers report no AI-surface concerns).
- The window has clearly opened earlier than expected (multiple triggers fire in Y2 H1; Y2 H2 schedule needs material rework).
- A new AI surface emerges not contemplated by the four triggers (e.g., specific to Indian-language AI assistants); add a fifth trigger via ADR amendment.

## References

- Xtnd `ROADMAP.md` Y3-Y4 AI-surface work
- Xtnd `docs/PREMORTEM.md` failure mode #15
- Platform `docs/PREMORTEM-RECONCILIATION.md` (premortem pattern reuse)
- ADR 0003 (decision-support not autopilot) — applies to AI-surface publishing
- Platform ADR 0025 (voluntary contribution, customer confidentiality)
