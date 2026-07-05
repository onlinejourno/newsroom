# Contributing

Thanks for your interest. This is a **source-available** product under the
Functional Source License (FSL-1.1-ALv2) — you can read every line, run it in
your own newsroom, and modify it for your own use. Contributions are welcome
within the scope below.

## Licence context (read first)

- The code is **FSL-1.1-ALv2**: use, copy, modify, and self-host for any
  Permitted Purpose, including **professional-services engagements**.
- **Competing Use is restricted** for two years per release — you may not offer
  this as a commercial product or service that substitutes for it.
- Each release **converts to Apache-2.0** on its second anniversary.
- See `LICENSE.md` / `LICENSE` and `COMMERCIAL_LICENSE.md` for the full terms.

By contributing, you agree your contribution is licensed under the repository's
FSL-1.1-ALv2 (and its Apache-2.0 future licence), and that you have the right to
submit it.

## What we welcome

- **Bug reports** with a reproduction.
- **Fixes** for confirmed bugs.
- **Self-host / deployment** improvements and documentation.
- **Small, focused enhancements** that advance the editorial purpose.

## What to discuss first (open an issue before a PR)

- New top-level dependencies — these require a short rationale (and, for the
  platform, an ADR). The stack is deliberately locked.
- New frameworks, languages, or infrastructure.
- Anything that changes the scoring/decision logic — this is decision-*support*,
  never autopilot; changes must preserve that.

## Ground rules

- **Advisory, not autopilot.** The software surfaces signal and suggests; the
  journalist decides. Contributions must not add automation that publishes or
  decides on a human's behalf.
- **Tenant isolation.** Any database access must remain scoped to its tenant.
- **Tests.** Add or update tests for behaviour changes; the suite must pass.
- **One concern per PR**, with a clear description of what and why.

## Conduct & security

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
For security issues, follow [SECURITY.md](SECURITY.md) — do not open a public
issue.

## Maintainer cadence

This is an independently maintained project. Issue triage and PR review happen
in scheduled windows, not continuously — expect a first response within about a
week. "Out of scope" and "won't do, because X" are valid, respectful outcomes.
