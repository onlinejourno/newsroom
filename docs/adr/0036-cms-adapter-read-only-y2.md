# ADR 0036 — CMS adapter is read-only Y1-3 (companion mode)

**Status:** Accepted (2026-06-03 in `onlinejourno/xtnd`; merged into `onlinejourno/platform` 2026-06-05 per ADR 0030).

## Context

A natural pull on Xtnd is to become a head — to replace the newsroom's existing CMS with Xtnd's surface, ingesting drafts directly into Xtnd, composing across roles, publishing through Xtnd's adapters to distribution surfaces (web, AMP, Search, Discover, social, AI answer cards).

This is the "head for headless CMSs" vision. It is correct as a long-arc product direction. It is wrong as a Y1-3 build target for the following reasons:

1. **Indian newsroom CMS reality:** Major outlets run proprietary in-house CMSes (Méthode at The Hindu, Cue / Escenic at multiple, CCI Quantum at others, custom WordPress with heavy plugins at the mid-tier, occasional Ghost at digital-natives). Each replacement is a 6-12 month IT integration cycle with vendor cooperation gated by commercial interest.

2. **Founder bandwidth:** Solo founder at ~₹2,000/month burn cannot survive a 12-month customer adoption cycle. The platform's Y1 customer-acquisition cadence (paid pilot at Wk 12 of design partner relationship) only works if integration friction is hours, not months.

3. **Editorial culture friction:** Newsrooms accept companion tools (Chartbeat, Parse.ly, NewsWhip all sit alongside the CMS). Newsrooms resist CMS replacement aggressively. A head pitch would lose customers Xtnd could win as a companion.

4. **Premortem evidence:** Platform's reconciled premortem cites Sarvajna integration depth overruns (4-6 months instead of 4-6 weeks). The same risk applies to any CMS head adapter.

5. **Licensing concerns:** Automattic's posture toward WordPress forks / replacements is litigious (WP Engine dispute is recent). Apache 2.0 OnlineJourno-as-WordPress-replacement could draw scrutiny that Apache-2.0-OnlineJourno-as-WordPress-companion does not.

## Decision

**Through Y1-3, every Xtnd CMS adapter is read-only. Companion mode is the only operating mode.**

Specifically:

1. **Read access only.** Xtnd's CMS adapters call the customer CMS's REST/GraphQL/scrape interface to pull draft state, published state, taxonomy, byline, scheduling status, and post metadata. They never call write endpoints.

2. **Publish surface stays with the customer's CMS.** Reporters write in their existing CMS. Editors publish from their existing CMS. Xtnd informs alongside; it does not intervene in the publish pipeline.

3. **Draft sync, not draft replacement.** Xtnd caches the latest draft state from the CMS for distribution-fit scoring and pre-publish workflow guidance. The CMS remains the source of truth.

4. **Published URL is the diagnostic anchor.** Post-publish diagnostics read the published URL (from the CMS adapter), pull GSC + Discover + first-party analytics, and surface findings — without touching the published content.

5. **Adapter contracts per platform ADR 0007.** Each CMS adapter is wrapped in a typed contract (Zod schemas for draft, published, taxonomy, byline) so adapter swap is days, not months.

### CMS adapter rollout

| CMS | Adapter type | Earliest |
|-----|--------------|----------|
| WordPress (vanilla + Gutenberg + Yoast) | REST API read | Y2 H1 |
| Ghost | REST API read | Y3 H1 |
| Strapi | REST API read | Y3 H2 (only if customer pull justifies) |
| Méthode (DTI) | scrape + vendor API negotiation | Y4+ — customer pull required |
| Cue / Escenic | scrape + vendor API negotiation | Y4+ — customer pull required |
| CCI Quantum | scrape + vendor API negotiation | Y4+ — customer pull required |
| Custom newsroom CMS | bespoke per-customer adapter | Y3+ paid services lane |

### When head mode becomes thinkable (Y4+)

Head mode — write adapter, publishing through Xtnd to distribution surfaces — is **not in scope Y1-3**. It becomes thinkable in Y4 only if **all of** the following triggers fire:

1. ≥3 design partners explicitly request head mode, with each willing to commit Y3 services revenue against it.
2. Platform Y3 ARR ≥ ₹50 lakh (sustainability runway for the expanded scope).
3. A second contributor or co-founder is in place (solo founder cannot ship head adapter set alone).
4. Customer CMSes in the request set are within the rollout table (i.e., not asking for head mode on a proprietary CMS Xtnd has no read adapter for yet).

When triggers fire, a new ADR supersedes this one with explicit rollout plan.

### Sales discipline

Y1-3 sales conversations frame Xtnd as a **companion**, never a head. Phrasing:

- ✓ "We sit alongside your CMS and tell you whether each story has its fair shot across every surface."
- ✓ "We never touch your publish pipeline. Your editors publish from your existing CMS; we surface signals before and after."
- ✗ "We can replace your CMS." (refuse with reference to this ADR)
- ✗ "We publish for you to Discover / Search / Social." (refuse Y1-3)
- ✗ "We're a head for headless CMSes." (refuse Y1-3)

If a customer hard-blocks on head mode as the only path to purchase, that customer is not Xtnd's Y1-3 target. Document, walk away, do not pivot.

## Consequences

- **Smaller adapter surface.** WordPress + Ghost cover the mid-tier and digital-native segments. Major Indian outlets stay out of scope Y1-3; addressed Y4+ via services revenue.
- **No CMS-fork legal exposure.** Read-only API consumption is integration, not replacement; Automattic / Ghost foundations have no claim against the pattern.
- **Adoption cycle is days, not months.** Companion install = API token + endpoint configuration; head install = publishing-pipeline replacement. The first wins Y1-3 sales.
- **Customers retain ownership of their CMS.** No data lock-in into Xtnd. Customers can leave Xtnd by disabling the read adapter; their CMS keeps working.
- **Some valuable customers stay out of reach until Y4+.** Acceptable; serve them as services-revenue customers when ready.
- **Pressure on this decision will be sustained.** Document refusals; do not erode the lock.

## Anti-patterns refused

- "Just one customer's CMS will be write-adapted Y2." Refuse — sets precedent.
- "We'll publish for you and the CMS will mirror." Refuse — that is head mode.
- "Read-only with a tiny write endpoint for metadata only." Refuse — metadata writes shift the publish pipeline.
- "Auto-publish to social via the CMS's existing share buttons." That is the CMS's automation, not Xtnd's; Xtnd does not own it. Surface signal; editor uses CMS controls.

## Revisit

Only when **all four Y4+ triggers** in the rollout section fire. Until then, this ADR binds. Partial trigger fulfilment is not enough.

## References

- Platform `docs/PREMORTEM-RECONCILIATION.md` failure modes #1, #2, #6, #14
- Platform ADR 0007 (adapter contracts — to be filed at platform Wk 1+)
- Platform `docs/BRAND-DECISION.md` (sustainability rules, ₹2,000/mo burn)
- Xtnd `docs/PREMORTEM.md` failure modes #4, #9, #11, #14, #16
- Xtnd `RELATION-TO-PLATFORM.md`
- ADR 0039 (sustainability preconditions before Y2 build)
