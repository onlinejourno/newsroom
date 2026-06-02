# ADR 0026 — Indie maintainer sustainability rules

**Status:** Accepted (2026-06-03).

## Context

The most common failure mode for solo open-source projects is maintainer burnout, not market failure. Many otherwise-viable indie OSS projects abandon their users between months 8 and 24 when the maintainer's energy runs out under the cumulative weight of issue triage, PR review, release management, customer support, marketing, and the original product work.

OnlineJourno is built as an indie open-source sustainable business by a single founder who is also responsible for product, customer support, services delivery, sales, and (eventually) the related book. Without explicit rules and expectation-setting, the project's surface area expands until it consumes the founder.

This ADR codifies sustainability rules so the project survives the founder's normal life rhythms.

## Decision

The following rules apply from the moment the repository becomes publicly visible.

### Visible expectation-setting

1. **Single-maintainer disclaimer at top of README.** Verbatim or equivalent:
   > OnlineJourno is maintained by a single person. Response time targets and release cadence reflect that. Pull requests and issues are reviewed but not on a same-day basis. If you need guaranteed response, please contact `support@onlinejourno.com` about a commercial support agreement.
2. **Roadmap clarity.** A `ROADMAP.md` listing what is being worked on, what is parked, and what is rejected — with reasons for the third category.
3. **No deadlines published.** Releases are dated only when they ship.

### Triage cadence

4. **GitHub Issues triage = 2 windows per week, total 2 hours.** Monday morning (1 hour) and Friday afternoon (1 hour). Outside those windows the maintainer does not look at the issue queue. Issues outside business needs may sit for up to 7 days; that is acceptable and signalled in the README.
5. **PR review = 1 window per week, 1 hour.** Same Friday slot. Substantial PRs receive a courteous "received, reviewing this weekend" comment and are reviewed in the next deep-work session.
6. **Stalebot enabled.** Issues with no maintainer or community response for 90 days auto-close with a "feel free to reopen if still relevant" message. Reopening is friction-free.

### Release cadence

7. **Major releases: quarterly.** No "monthly minor + occasional patch" schedule. Quarterly aligns with editorial sales cycles and prevents urgency-creep.
8. **Patch releases ship as needed** for security or material bugs only. Not for feature creep.
9. **Changelog kept on every change.** `CHANGELOG.md` updated with each commit that affects user behaviour.

### Protected time

10. **One deep-work day per week is reserved for product, not OSS chores.** Wednesday. No issue triage, no email, no DMs on Wednesday. This day is for shipping features or working on the book.
11. **No work on Sundays.** Repository inactivity on Sundays is normal and expected. Contributors should not infer absence is unusual.
12. **Annual recharge week.** Take one week off issues, PRs, and customer comms per year, scheduled and announced 30 days in advance.

### Emotional protection

13. **Accept the project may die.** Do not over-invest in saving features that are not being used or that the founder no longer believes in. Deprecation is healthy.
14. **The book is not a backup plan.** It runs in parallel and is governed by separate rules outside this repository.
15. **Public criticism is acknowledged once, then left alone.** Engagement with sustained negative discourse does not produce better software.

### Triage rules of thumb

16. **"Works for me" is a valid close reason** when the reporter cannot supply a reproduction.
17. **"Out of scope" is a valid close reason** when the request is for a feature that does not advance the platform's editorial purpose.
18. **"Won't do, because X" is preferred over "low priority."** Honesty beats vague deferral.

### Commercial offering as escape valve

19. **Customers on paid support contracts get a documented response-time SLA.** This is the formal channel for users who cannot tolerate community-cadence triage.
20. **Custom feature requests from non-paying users are not committed to.** If a feature is genuinely valuable, it ships on the roadmap when the founder decides; if it is customer-specific, it is a paid services engagement.

## Consequences

- The community sees realistic expectations from Day 1 and self-selects accordingly. Users who need always-on responsiveness either pay for it or use a different product. This is the correct sort.
- The founder protects energy across a multi-year horizon. The project's survival probability past Year 2 increases materially.
- Some contributors will find the pace too slow and leave. That is acceptable; OnlineJourno is not optimised for contributor velocity at the cost of maintainer health.
- Commercial customers receive a clearer reason to pay — they get the response-time SLA the community cadence does not provide.

## Anti-patterns refused

- "Always-on" maintainer presence in Slack / Discord / Twitter.
- Same-day issue acknowledgement promises.
- Unscheduled "lightning" releases that ratchet user expectations.
- Visible apologies for cadence — the cadence is the cadence; no apology is owed.
- Over-prioritising loud users over the median customer or the project's long-term health.

## Revisit

When the project's commercial revenue can fund a second person, revise the maintainer model. Until then, these rules are binding on the founder.
