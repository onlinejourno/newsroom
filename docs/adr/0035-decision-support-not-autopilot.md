# ADR 0035 — Decision-support, not decision-making (no autopilot)

**Status:** Accepted (2026-06-03 in `onlinejourno/xtnd`; merged into `onlinejourno/platform` 2026-06-05 per ADR 0030).

## Context

Xtnd's capabilities — distribution-fit cue, placement support, social scheduling, commission router, post-publish diagnostic — all involve recommendations that a system could, in principle, apply automatically.

Examples of automation that would be technically possible but undesirable:

- Auto-place stories on homepage slots based on predicted CTR.
- Auto-schedule social posts at predicted-best times.
- Auto-commission charts from the data-viz team without editor confirmation.
- Auto-publish to AI answer cards / MCP feeds.
- Auto-rotate stories on section pages based on real-time performance.

Each of these saves the editor a click. Each erodes editorial judgement and creates an algorithmic-editorial layer that the newsroom did not consent to.

Platform `CONTEXT.md` already locks "editorial judgement remains human" and "AI assists; the final publish/kill call belongs to the editor." This ADR extends that principle to every Xtnd capability.

## Decision

**Every Xtnd capability is decision-support. None is decision-making.**

Concretely:

1. **No autopilot for placement.** Xtnd surfaces predicted CTR, fit score, social momentum, dwell-time forecast. The editor places the story. The system does not place.
2. **No autopilot for scheduling.** Xtnd surfaces channel-fit cue and recommended schedule windows. The social team confirms before any post fires.
3. **No autopilot for commissioning.** Xtnd auto-suggests cross-team commissions (chart, video, explainer, map, audio). The editor confirms before the commission posts to the target team. The target team accepts or declines; no auto-accept.
4. **No autopilot for publishing.** Xtnd's CMS adapters are read-only Y1-3 (ADR 0004). Even at Y4+ head mode, publish is a human action; the editor clicks publish.
5. **No autopilot for AI surfaces.** Xtnd does not push to MCP feeds, AI answer cards, or external indexes without explicit per-piece editor consent. Default off; opt-in per story.
6. **No autopilot for rotation.** Section-page slots are not auto-rotated based on real-time CTR. The desk decides rotation cadence.
7. **No autopilot for archive resurfacing.** Older stories are not promoted to the homepage based on resurgent search interest without editor confirmation.

### What is permitted

- **Recommendation surfaces.** "We predict slot 2 will outperform slot 8 by 1.4x CTR" is fine. Editor decides.
- **Auto-throttle of system outputs.** If the system fires too many commission suggestions and target team acceptance drops below 30%, system auto-reduces its suggestion rate. This protects the human team from the system, not the other way around.
- **Default-off automations behind explicit per-tenant opt-in.** Y4+ only, and even then no automation that would publish or distribute editorial content without per-piece editor consent.
- **Workflow automations that are not editorial.** Scheduled report emails, daily-brief delivery time, eval harness runs, CMS draft sync polling — these are not editorial decisions and can be automated.

### Surface phrasing

Every recommendation surface phrases its output as a signal, not a directive:

- ✓ "Predicted CTR 4.1% on homepage slot 2; 1.4x slot 8."
- ✓ "Discover fit weak: image aspect ratio 4:3 (Discover prefers 16:9 or 1:1)."
- ✓ "Social momentum on X rising in last 60 min."
- ✗ "Place this story on slot 2." (directive)
- ✗ "Schedule social post at 11:30 IST." (directive)
- ✗ "Commission a chart." (directive without editor confirm)

### Audit trail of human decision

Every editorial decision Xtnd surfaces a signal for is logged with:

- The system's recommendation at decision time.
- The human's decision.
- Optional: the human's note on why they decided as they did.

This audit is for the newsroom's own reflection, not for system retraining without consent. (Platform ADR 0025 customer-confidentiality applies; no cross-tenant aggregation of decision data.)

## Consequences

- **Slower workflow than full automation.** Each placement, schedule, and commission is a human action. Editors who want full automation are not Xtnd's customers. Acceptable.
- **No legal liability for system-driven editorial choices.** The human edited, placed, scheduled, commissioned, published. The system informed. Liability and accountability remain where they belong.
- **Trust-building rate matches platform's.** Platform `CONTEXT.md` trust ladder governs both products. Xtnd does not race ahead by automating.
- **Differentiation from algorithmic-content platforms.** Xtnd is not Outbrain, Taboola, or a programmatic placement system. The product positioning depends on this distinction.
- **Future temptation is real.** A design partner will eventually ask for "set it and forget it" automation. Refuse with reference to this ADR; offer richer signal surfaces instead.

## Anti-patterns refused

- "Auto-place top story" toggle in tenant config.
- "Auto-schedule social" toggle.
- "Programmatic homepage layout" feature.
- "AI-curated headline rotation" feature.
- "Auto-decide story killed vs revived" feature.
- Any feature with "auto-" prefix that touches editorial content.

## Revisit

This ADR does not have a revisit trigger. The decision-support principle is structural, not provisional. If a future Xtnd version contemplates editorial-content automation, that version is a different product and requires a new ADR explicitly superseding this one with the rationale.

## References

- Platform `docs/CONTEXT.md` core principles 1-6
- Xtnd `docs/IDENTITY.md` identity guardrails
- ADR 0036 (CMS adapter read-only)
- Discussion of failed editorial-automation patterns in legacy newsroom-tech (Outbrain content recommendation widget; Tronc / Taboola revenue-optimised layouts; cited in `docs/PREMORTEM.md` failure mode #6)
