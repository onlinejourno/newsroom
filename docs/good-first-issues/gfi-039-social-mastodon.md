# GFI 039 — Mastodon social scheduler

> Template drafted Wk 0 of Xtnd; published as live GitHub Issue at Wk 100 public flip (Y3 ship dependency).

## What

Add a `mastodon` channel to the `m-social-scheduler` module. The scheduler posts a configured update to a customer's Mastodon instance (any Mastodon-compatible Fediverse server: mastodon.social, social.osm.town, journa.host, self-hosted) at the scheduled time, respecting per-instance API rate limits and post visibility settings.

The v0.1 capability-tier release does **not** ship `m-social-scheduler` (it ships Y3 per `ROADMAP.md`). This GFI template is drafted Wk 0 and published as a live issue when `m-social-scheduler` ships in Y3.

## Why

Mastodon (and Fediverse generally) is increasingly relevant for journalist-coded outlets and audiences who have left X. Many newsrooms now post to Mastodon alongside or instead of X. A first-class Mastodon scheduler positions Xtnd as Fediverse-aware from Y3, before mainstream news-tech tools catch up.

The Mastodon API is permissive and well-documented; this issue is also a template for any other Fediverse-protocol scheduler (Pleroma, Misskey, Akkoma) that contributors might add later.

## Module / location

`packages/modules/m-social-scheduler/channels/mastodon.ts`

Plus per-tenant OAuth flow handler at `apps/web/app/api/xtnd/social/mastodon/auth/route.ts`.

## Module Contract scaffold

`m-social-scheduler` module Module Contract ships in Y3 backbone. This issue adds a single channel file under `channels/`.

Channel interface:

```ts
export interface SocialChannel {
  kind: 'x' | 'linkedin' | 'mastodon' | 'bluesky' | 'facebook' | 'instagram' | ...;
  post(scheduledPost: ScheduledPost): Promise<{ status: 'sent' | 'failed'; externalId?: string; details: Record<string, unknown> }>;
  validate(scheduledPost: ScheduledPost): { valid: boolean; reasons: string[] };
  oauthFlow?(redirectUrl: string): { authUrl: string; state: string };
  oauthCallback?(code: string, state: string): Promise<{ accessToken: string; tokenMetadata: Record<string, unknown> }>;
}
```

## Inputs / outputs

**Inputs:**

- A `cap_social_schedules` row with `channel: 'mastodon'`, `body: <text>`, `media_url`, `scheduled_at`.
- Per-tenant Mastodon config in `tenants.config.xtnd.m-social-scheduler.mastodon`: `{ instance_url, access_token_secret_ref, default_visibility, content_warning_default }`.

**Outputs:**

- Mastodon post created at scheduled time.
- `cap_social_schedules.status` updated from `scheduled` to `sent` or `failed`.
- `externalId` (Mastodon post id) stored for later analytics.

## Acceptance criteria

- [ ] Mastodon channel file at `packages/modules/m-social-scheduler/channels/mastodon.ts` implements `SocialChannel`.
- [ ] `post()` calls `POST /api/v1/statuses` on the configured Mastodon instance with text, optional media id (after separate media upload step), visibility setting.
- [ ] Handles Mastodon rate limits (300 statuses per 3 hours default; exponential backoff).
- [ ] Supports content warnings (`spoiler_text`) when configured.
- [ ] Supports image media via `POST /api/v2/media` upload, then attaches via `media_ids`.
- [ ] Respects character limit (500 default; some instances configure higher; query `/api/v1/instance` for actual limit).
- [ ] OAuth flow (`oauthFlow`, `oauthCallback`) for first-time Mastodon authorization: registers application via `/api/v1/apps`, redirects user, captures token.
- [ ] Encrypted access-token storage; secret reference resolved per request, never logged.
- [ ] `validate()` checks: text length within instance limit; media URL accessible; visibility valid (`public`, `unlisted`, `private`, `direct`); content warning text not empty if `spoiler_text` set.
- [ ] RLS-aware: all queries `tenant_id`-scoped.
- [ ] Cost-budget aware: no LLM calls.
- [ ] Unit tests cover: happy-path post; rate-limit handling; media upload; OAuth flow; validation failures.
- [ ] Integration test against a configured `journa.host` test account (or any cooperating instance the contributor uses), gated by env var so CI doesn't require live API access.
- [ ] Eval fixture: `eval/goldset/mastodon-channel.csv` has 10 example scheduled posts with expected Mastodon payloads.
- [ ] No new top-level dependencies. Use `fetch`.
- [ ] README documents: Mastodon instance setup; access-token generation; per-instance character-limit notes; visibility setting defaults; content-warning best practices; troubleshooting (Fediverse instance defederation as failure mode).
- [ ] Demo tenant seed data extended: 1 of the demo scheduled posts targets Mastodon (`demo-daily.example.social`), with seed payload included.
- [ ] Decision-support compliant: scheduler posts at the time the editor specified; no autopilot scheduling.

## Estimated effort

12-18 hours for an experienced contributor. Includes: API client + media upload + OAuth flow + character-limit per-instance handling + tests + integration test + README. Higher end if contributor is unfamiliar with Mastodon's instance-variability.

## Skill level

`experienced-contributor`

## Review SLA

Reviewed in the next Friday review window (per platform ADR 0026, in effect when this issue is published in Y3).

## Out of scope

- Pleroma / Misskey / Akkoma-specific quirks. Open separate GFI for each if a customer requires.
- Cross-posting (post to Mastodon + X simultaneously from a single scheduled-post row). Handled at scheduler core; channel is single-target.
- Mastodon threading (reply chains). v1 single post; threading separate GFI.
- Federated reply tracking (capturing replies / boosts / favorites). Separate GFI under post-publish data sources (category 5).
- Bridge accounts (e.g., Bridgy Fed). Out of scope.

## References

- ADR 0035 (decision-support not autopilot)
- Xtnd `docs/INTEGRATION-SPEC.md` `cap_social_schedules` schema
- Xtnd `docs/good-first-issues/INDEX.md` Category 4
- Platform ADR 0005 (multi-tenant row-level)
- Mastodon API docs: https://docs.joinmastodon.org/methods/
- Mastodon application setup: https://docs.joinmastodon.org/client/token/
