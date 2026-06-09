# ADR 0047 — The fair-chance audit: the logic of digital, made legible to the whole chain

**Status:** Accepted (2026-06-09).

## Context

The strategic "fair-chance audit" + framing-balance views are the point where editorial transformation actually happens — **not** by edict, but when the newsroom *understands the logic of digital* and can "talk digital." The founder's articulation:

> A story gets a fair chance when the reporter is alerted about it and understands: it's buried deep in an IA blackhole and should be categorised better; it should be published while it's trending; so the reporter, the bureau chief, the digital desk, and the surface outside the newsroom are in sync — the conversation based on informed understanding. If it won't fly off the shelf, does it at least have a chance in AIO? Would it have raked in pageviews? Are readers spending time on it, reading it fully? How many trackers fired on the page, sending user data into the ad-network labyrinth? What social platform helps this story most? Would video or audio help? Would a byline help? Would more sources make a difference? These make or break a story — and must be clear and visible from the platform, to the whole chain, from reporter to editor.

## Decision

The **fair-chance audit** is a per-story, **chain-shared** view that unifies every distribution lever in plain, shared language. It is about **the IA, the product, the topic, and the trend** — not an SEO score. It carries these levers per story:

| Lever | Reads from | The question it answers |
|-------|-----------|------------------------|
| **IA placement** | story.section + the IA map | Is it in an IA blackhole? Should it be categorised better / surfaced higher? |
| **Trend timing** | trend / calendar_event | Is now the moment? Publish while it's trending. |
| **Surface fit** | distribution_fit (per surface, incl **AIO**) | Built for Discover/Search/News? If it won't get pageviews, **does it have a chance in AIO** (the consolation)? |
| **Engagement / attention** | analytics connector | Did it rake in pageviews? Are readers **reading it fully** (time-on-page, completion)? |
| **Probity cost** | probity_audit (web-bloat) | How many **trackers** fired? How much user data went **into the ad-network labyrinth**? (made visible to *editorial*, not hidden in ad-ops) |
| **Framing balance** | framing_coding (PEJ) | Is the topic over/under-framed across coverage? |
| **Make-or-break moves** | derived recommendations | What **social platform** helps most? Would **video / audio** help? Would a **byline** help? Would **more named sources** make a difference? |

**Two non-negotiables:**

1. **Chain-shared.** The same audit is visible to **reporter → bureau chief → digital desk → editor** (the inversion, ADR 0042). No information asymmetry — everyone sees the same truth, so the conversation is informed and they stay in sync with each other *and* with the surfaces outside the newsroom.
2. **It teaches "the logic of digital."** Every lever is shown *with its meaning and its fix*, in plain language — because editorial transformation comes from understanding (surfaces available, how to treat each surface), not from a dashboard of opaque scores.

## Consequences

- The audit is a **read-model over the canonical data** — it composes `story` + `distribution_fit` (surfaces incl AIO) + `analytics`/engagement + `probity_audit` + `framing_coding` + `trend`/`calendar_event` + IA placement. So the L0 data model must carry all of these on/around **`story`** (own content), which is exactly the signal-vs-story split (ADR 0046).
- The **make-or-break moves** (social fit, video/audio, byline, sources) are first-class **recommendations** the audit emits — not just scores. Each is an actionable lever with a yes/no/why.
- **Probity becomes editorial.** Tracker count + ad-network data leakage (web-bloat-checker) is surfaced to the *newsroom chain*, not buried in ad-ops — the privacy cost of a page is part of its fair-chance story.
- **AIO is a first-class consolation surface** — a story that won't win pageviews may still earn citation visibility in AI answers; the audit says so.
- Built bottom-up: the levers come online as their score modules land (distribution_fit ✓, then engagement, probity, framing, trend); the audit view (L4) composes them once `story` exists (L0).

## Anti-patterns refused

- A fair-chance "score" without the *why* and the *fix* (no teaching = no transformation).
- An audit only the digital desk sees (breaks the chain / the inversion).
- Hiding the tracker / ad-network cost from editorial.
- Treating pageviews as the only outcome (ignoring AIO, engagement-depth, loyalty).

## References

- ADR 0046 (canonical model — signal vs story; the audit reads `story`)
- ADR 0043 (surfaces incl AIO/generative)
- ADR 0044 (connectors — analytics, search; the engagement + surface data)
- `docs/architecture/editorial-ia-and-sources.md` (IA placement)
- `docs/PRODUCT.md` (the inversion; reporter→editor chain)
- web-bloat-checker (probity), discover-dashboard (distribution_fit), news-intel (framing/PEJ)
