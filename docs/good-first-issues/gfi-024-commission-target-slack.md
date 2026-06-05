# GFI 024 — Slack commission router target

> Template drafted Wk 0 of Xtnd; published as live GitHub Issue at Wk 100 public flip.

## What

Add a `slack-webhook` target to the `m-commission-router` module. When a commission is created in `cap_commissions`, the router posts a formatted message to a configured Slack incoming-webhook URL with: target team, story brief link, source links, due-at, requester, brief excerpt, and accept/decline buttons (Slack interactive components).

The v0.1 capability-tier release ships `m-commission-router` with a single target type stub. This GFI implements the first concrete target — Slack — establishing the pattern for the remaining 12 target adapters.

## Why

Slack is the dominant inter-team communication channel in mid-sized newsrooms. A commission router that ships Slack as its first target lets newsrooms try cross-team commissioning (data viz, video, audio, photo, social, explainer) immediately without waiting for a dedicated UI. The Slack integration covers the common case; bespoke commission UIs ship in Y3 per `ROADMAP.md`.

## Module / location

`packages/modules/m-commission-router/targets/slack.ts`

Plus accept/decline endpoint at `apps/web/app/api/xtnd/commission/slack-interaction/route.ts`.

## Module Contract scaffold

`m-commission-router` module Module Contract is shipped in v0.1 capability-tier release. This issue adds a single target file under `targets/` and a single API route to handle Slack interactivity callbacks.

Target interface:

```ts
export interface CommissionTarget {
  kind: 'slack-webhook' | 'discord-webhook' | 'msteams-webhook' | 'email' | 'linear' | 'jira' | ...;
  send(commission: Commission, channel: ChannelConfig): Promise<{ status: 'sent' | 'failed'; details: Record<string, unknown> }>;
  receive(payload: unknown): Promise<{ commissionId: string; decision: 'accepted' | 'declined'; reason?: string }>;
}
```

## Inputs / outputs

**Inputs:**

- A `cap_commissions` row with `target_team`, `brief_text`, `source_links`, `due_at`, `requested_by`.
- Channel config: `{ kind: 'slack-webhook', webhook_url: '<encrypted-secret-ref>', team_channel_map: { data_viz: '#data-viz', video: '#video-desk' } }`.

**Outputs:**

- Slack message posted to the configured channel.
- `cap_commissions.status` may update from `pending` to `accepted` or `declined` via Slack interaction callback.
- `cap_commissions.decided_at`, `decided_by` populated on decision callback.

## Acceptance criteria

- [ ] Slack target file at `packages/modules/m-commission-router/targets/slack.ts` implements `CommissionTarget` interface.
- [ ] Posts a Slack Block Kit message with:
  - Header: target team + story title.
  - Body: brief excerpt (first 280 chars), source links (up to 3), due-at, requester display name.
  - Action buttons: `Accept` (primary), `Decline`.
- [ ] Slack interaction callback API at `apps/web/app/api/xtnd/commission/slack-interaction/route.ts`:
  - Validates Slack signing secret (per Slack docs).
  - Routes the interaction payload to the target's `receive()`.
  - Updates `cap_commissions.status` + `decided_at` + `decided_by` (resolve Slack user id → platform `users.id` via a `xtnd_slack_user_mapping` lookup table or a fallback notification).
  - Responds to Slack within 3 seconds (Slack interactivity requirement).
- [ ] Encrypted secret reference for webhook URL + signing secret (per tenant); resolved via platform's secret reference resolver.
- [ ] RLS-aware: webhook URL + signing secret scoped to tenant; never logged in plain.
- [ ] Cost-budget aware: no LLM calls; minimal cost surface.
- [ ] Unit tests cover: send happy-path; accept callback; decline callback; signing-secret invalid; commission already decided.
- [ ] Eval fixture: `eval/goldset/slack-target.csv` has 10 commission examples with expected Slack payloads.
- [ ] No new top-level dependencies. Use `fetch` for outbound HTTP.
- [ ] README documents: Slack incoming-webhook setup steps; signing-secret configuration; mapping team → channel; troubleshooting (signing-secret mismatch most common).
- [ ] Demo tenant seed data extended: 3 of the 8 demo commissions targeted at Slack channels, with seed Slack payload examples included for documentation.
- [ ] Decision-support compliant: commission router never auto-decides on behalf of target team; team accepts or declines.

## Estimated effort

10-14 hours for an experienced contributor. Includes: Slack Block Kit message formatter + signing-secret verifier + interactivity callback handler + Slack-user-to-platform-user mapping + tests + eval fixture + README.

## Skill level

`experienced-contributor`

## Review SLA

Reviewed in the next Friday review window (per platform ADR 0026).

## Out of scope

- Slack Socket Mode (alternative to webhook + interactivity). Use the standard webhook + signing-secret pattern.
- Slack OAuth app distribution (publishing the integration to Slack's directory). Y3+ marketing concern.
- Slack threading or follow-up messages after acceptance. v1 sends one message, captures one decision.
- Multi-channel broadcast (posting the same commission to multiple Slack channels). Not in scope; team-channel-map is 1:1.

## References

- ADR 0035 (decision-support not autopilot)
- Xtnd `docs/INTEGRATION-SPEC.md` `cap_commissions` schema
- Xtnd `docs/good-first-issues/INDEX.md` Category 3
- Platform ADR 0005 (multi-tenant row-level)
- Slack incoming-webhooks: https://api.slack.com/messaging/webhooks
- Slack interactivity: https://api.slack.com/interactivity
- Slack Block Kit: https://api.slack.com/block-kit
