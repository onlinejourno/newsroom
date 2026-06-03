# Community Launch Plan — public repository flip

Drafted Thu Jun 4, 2026. Targets Wk 10–12 launch (early to mid-August).

## Purpose

Flip `github.com/onlinejourno/platform` from private to public at the moment the schema has been touched by Wk 1–8 build, validated against one real editor's signals, and is reasonably trusted not to embarrass.

Apache 2.0 is already in place (LICENSE.md, NOTICE, ADR 0024). The flip is operational, not licensing.

## Pre-flip checklist

The repo only goes public when every item below is true. Each is a hard gate.

### Code

- [ ] Spine, ingest-py, scoring-py packages have at least one passing test each.
- [ ] First module (`m-source-intel`) is implemented end-to-end and shipping the design partner's brief.
- [ ] No secrets in any committed file. `.env.example` only.
- [ ] No customer data (real or sample) committed.
- [ ] No internal-only documentation that would confuse external readers.
- [ ] `apps/web` has at least one rendered route working with the design system.
- [ ] CI runs lint + tests on every push.

### Documentation

- [ ] `README.md` updated for public read: what is this, who is it for, how to run locally, where the docs live, how to contribute, how to reach the maintainer.
- [ ] `CONTRIBUTING.md` written. Declares contribution scope, expectations, process.
- [ ] `CODE_OF_CONDUCT.md` adopted (Contributor Covenant 2.1 is the default).
- [ ] `SECURITY.md` written. Declares how to report security issues privately (e.g., security@onlinejourno.com or GitHub Security Advisories).
- [ ] `LICENSE.md` (Apache 2.0) already in place from Wk 0.
- [ ] `NOTICE` already in place from Wk 0.
- [ ] `CHANGELOG.md` started. Keep-a-changelog format.
- [ ] All ADRs 0001–0027 reviewed once for clarity and any sensitive content removed.

### Repository settings (GitHub)

- [ ] Issues: enabled.
- [ ] Discussions: enabled, with categories Announcements / Show & tell / Ideas / Q&A / Polls.
- [ ] Wikis: disabled (documentation lives in `docs/`).
- [ ] Sponsorships: GitHub Sponsors button enabled when account approved.
- [ ] Branch protection on `main`: require PR, require status checks, require 1 approval for external contributors (auto-approval for founder).
- [ ] Issue templates: bug report, feature suggestion, security report (linking to SECURITY.md), question.
- [ ] PR template: scope statement, linked issue, test plan, ADR reference if architectural.
- [ ] Security advisories: enabled. Dependabot alerts on.
- [ ] CodeQL or equivalent static analysis on.
- [ ] Topic tags: `journalism`, `editorial-intelligence`, `india`, `apache-2`, `solo-maintainer`.

### Maintainer hygiene

- [ ] `MAINTAINER.md` written. Single-maintainer badge. Expectations:
  - Solo developer; not a company.
  - Issue triage Mon 09:00–10:00 IST + Fri 16:00–17:00 IST. Other windows: no.
  - Major releases quarterly.
  - This is an indie project; corporate support is not available.
  - Hostile contributions are blocked; the burnout vector is real.

## Pre-flip rehearsal

Two weeks before the flip:

1. Founder invites 2–3 trusted journalist-developer friends to read the repo as if it were public.
2. They report: what is confusing, what is missing, what would they have asked.
3. Founder addresses the top 5 items. The rest go to a backlog.

## Flip procedure

1. Final pre-flip checklist sign-off.
2. GitHub → Settings → Danger Zone → Change visibility → Public.
3. Verify clone-able by an unauthenticated user.
4. Verify branch protection still applies.
5. Verify Issues and Discussions are visible.

## First-week announcement

Wk 12 announcement sequence:

| Channel | Message angle |
|---------|---------------|
| LinkedIn (founder's network) | Apache 2.0 launch; one-line product summary; "looking for code contributors and constructive critique." |
| Mastodon (`@subhash@mastodon.social` or similar) | Same, with hashtags `#FOSS`, `#Journalism`, `#India`. |
| Indian journalism Slack groups (Newslaundry community, Newsroom Tech India) | Soft mention; ask for editor feedback. |
| Hacker News (Show HN) | Optional. Title: "Show HN: OnlineJourno — editorial intelligence for newsrooms, Apache 2.0". Lower priority due to time-cost. |
| Twitter / X | Skip Y1; founder posture is anti-Big-Tech. |
| `journalism.dev` newsletter | If accepted. |
| Personal blog at `onlinejournalism.in` | Long-form post describing the project; link to repo. |
| Substack / Bytes | Skip Y1. |

The announcement does **not** promise:

- Roadmap dates.
- Support response times.
- Feature parity with anything.
- Multi-tenant operation. (The repo is the platform code; commercial operation is at `app.onlinejourno.com` for paying customers.)

## Contribution scope (declared in CONTRIBUTING.md)

The following kinds of contribution are welcomed and likely to merge:

- Bug reports with reproduction steps.
- Documentation typo fixes.
- Source registry additions (markets / regulatory sources for India).
- Translations of UI strings (Y2+).
- New beat configurations for markets/regulatory.
- Cost-reduction patches that do not change behaviour.
- Security disclosures via SECURITY.md.

The following kinds of contribution will be declined politely:

- CMS integration (out of MVP scope, see `docs/MVP-SCOPE.md`).
- Multi-language brief composition before per-language eval gate (ADR 0020).
- New module proposals before the plugin SDK ships (Y2+, ADR 0006).
- "Rewrite in [language X]" suggestions.
- "Use [library Y]" suggestions without an ADR proposal.
- Bulk PRs adding tests / formatting changes / refactors without a tracking issue.
- Any contribution conditional on the maintainer adopting a paid service or vendor.

The following will be silently ignored:

- Drive-by PRs that add tracking, telemetry, third-party scripts, sponsored content.
- PRs adding cryptocurrency, blockchain, or NFT features. (Hard no.)
- Off-topic political content.

## Triage cadence

- **Mon 09:00–10:00 IST**: triage new Issues and PRs.
- **Fri 16:00–17:00 IST**: respond to threaded discussions, close stale items.
- **Quarterly Sat (4 times a year)**: major-release review, roadmap update.

No other triage windows. Contributors are told this in CONTRIBUTING.md. The founder may close-without-response anything that violates the contribution scope.

## Stale-PR policy

- A PR with no maintainer response in 30 days is auto-labelled `needs-triage`.
- A `needs-triage` PR not advanced in 60 days is closed with a polite comment.
- Re-opening is allowed if the contributor follows up.

## Hostile-critique handling

- Read once.
- Respond once with the technical answer or scope reference.
- Do not re-engage.
- If escalating, lock the conversation per `CODE_OF_CONDUCT.md`.
- Founder maintains an internal "wall of considered critiques" file privately — the right of reply is reserved.

## Reasonable expectations

This is an indie open-source project, maintained by one person, in the spare time between paid customer work and personal life. Visible progress will be uneven. The repo is the source of truth for what exists; the roadmap is in `docs/`.

If the project receives substantial paying customer revenue (Y2+), maintainer-hours expand and triage cadence revisits.

## When the community launch is not the right move

If by Wk 10 any of the following is true, defer the public flip:

- Design partner has not begun the free pilot.
- Schema has changed in a backwards-incompatible way in the last 14 days.
- A serious unaddressed security concern exists.
- Founder is in a personal-life situation that cannot absorb new community attention.

In any of these cases, push to Wk 14, 16, or even Q1 2027. The repo's value compounds; the public flip does not have a deadline beyond founder discretion.
