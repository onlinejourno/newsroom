# ADR 0027 — Layered launch sequence

**Status:** Accepted (2026-06-04).

## Context

Three feedback-and-credibility surfaces are possible for OnlineJourno: a design-partner editor pilot, a public code repository, and a static community playground. Each yields a different kind of signal and incurs a different kind of cost.

| Surface | Yields | Cost (Y1) |
|---------|--------|-----------|
| Design partner editor pilot | Editorial fit, workflow validation, willingness-to-pay, case-study material | ~₹500–1,500/mo (API + Fly) |
| Public code repository | Code review, architecture critique, contributor pipeline, OSS positioning | ~₹0 (GitHub) |
| Static playground demo | Product polish feedback, marketing surface, code-exploration aid | ~₹0–300/mo (Cloudflare Pages or tiny Fly) |

Earlier framing treated these as alternatives. They are not. Each addresses a different risk:

- The editor pilot is the only source of true editorial-fit signal. OSS community cannot substitute.
- The public repo is the only source of code-review signal at the founder's solo scale.
- The playground is the only way the community can engage with the product without a live editor account.

## Decision

All three surfaces ship in Y1, in a strict sequence that protects solo-founder capacity and editorial-credibility risk.

| Order | Surface | Earliest | Gate |
|-------|---------|----------|------|
| 1 | Design partner editor pilot (one editor) | Wk 8 | Brief MVP shipped; editor onboarded; eval set hand-labelled. |
| 2 | Two follow-on design partners | Wk 16+ | First design partner converted to paid; stable ≥4 weeks. |
| 3 | Public code repository | Wk 10–12 | Schema stable; ADRs 0001–0026 complete; README / CONTRIBUTING / CODE_OF_CONDUCT / SECURITY.md in place. |
| 4 | Static playground demo (`try.onlinejourno.com`) | Wk 12–16 | First design partner has used brief for ≥4 weeks; demo content vetted to not embarrass. |

This is sequencing under capacity, not feature roll-out for revenue.

## Rationale

1. **Editorial signal first.** Without the design partner, the platform has no evidence its shortlist matches an editor's morning triage. No volume of community critique substitutes for that.

2. **Repo gates on schema stability.** Public schema cannot be silently restructured. Wk 10–12 is the earliest moment the schema has been touched by Wk 1–8 build, validated against one real editor's signals, and can be reasonably trusted not to embarrass.

3. **Playground gates on design-partner stability.** If the playground ships before the design partner is regularly using the brief, the founder ends up curating the demo while the editor's feedback loop is still uncertain. The playground is a marketing artifact, not a substitute for product use.

4. **Two follow-on partners gate on first conversion.** Solo founder cannot manage two concurrent design partners. Concurrent pilots double support load without doubling product progress (ADR 0026 sustainability rules apply).

## Community management posture

- **Single-maintainer badge** on the public repo. Expectations explicit.
- **GitHub Issues triage cap**: 1 hr Mon + 1 hr Fri per ADR 0026. No always-on response.
- **Contribution scope** declared in `CONTRIBUTING.md`: markets/regulatory shortlist Y1, all else deferred.
- **Refuse out-of-scope PRs** with reference to `MVP-SCOPE.md`. Politely.
- **Hostile critique**: read once, respond once with technical answer, do not re-engage. Burnout vector is real (ADR 0026).
- **Quarterly major releases**, not monthly. Roadmap drives PR throughput, not the reverse.

## Cost ceiling reaffirmed

All three surfaces together must stay within the ₹2,000/month burn cap until first paying customer:

- Design partner pilot: ₹500–1,500/mo (Fly + API, capped per BRAND-DECISION).
- Public repo: ₹0 (GitHub free tier; private until public-flip).
- Playground: ₹0–300/mo (static hosting; no live API).
- Total: ≤₹1,800/mo. Within cap.

## What this ADR does not decide

- Which specific editor signs first. That is `docs/DESIGN-PARTNER-SHORTLIST.md`.
- What content the playground refreshes weekly. That is `docs/PLAYGROUND-PLAN.md`.
- The contribution scope detail. That is `docs/COMMUNITY-LAUNCH-PLAN.md` and the eventual `CONTRIBUTING.md` at repo root.
- Whether the design partner is paid Wk 12 or free past Wk 16. That is the live conversation at Wk 12, with the editor's behaviour as evidence.

## Consequences

- Sequencing protects editorial credibility (design partner is the first reference; playground arrives after the editor is engaged).
- Repo public-flip is later than indie-OSS purists would want but earlier than commercial-OSS pragmatists would want — calibrated for solo founder with ₹2,000/mo burn.
- The three-surface plan can be revisited if Wk 8 design-partner conversation fails. Fallback in `docs/DESIGN-PARTNER-SHORTLIST.md`.
