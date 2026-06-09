# ADR 0049 — User Needs Model (Know · Understand · Feel · Do) as a story classification that steers the fair-chance audit

**Status:** Accepted (2026-06-09).

## Context

The founder's reader-needs model — the four journalistic drivers:

- **I want to know something** (Know) — breaking, updates, facts.
- **I want to understand something** (Understand) — explainers, analysis, perspective, context.
- **I want to feel something** (Feel) — human, emotional, inspiring stories.
- **I want to do something** (Do) — service, utility, actionable journalism.

This is the BBC / smartocto **User Needs Model**, condensed to four. It joins the platform's existing theory-grounded classifications — **Mark Deuze's typology** (what *kind* of source/newsroom) and **PEJ framing** (what *frame/topic*) — as the third: **what reader need does this story serve.**

It also closes a gap in the fair-chance audit (ADR 0047), which until now weighed every surface equally. A breaking *Know* story and a long *Understand* explainer should **not** be scored the same way — they are built for different surfaces and different reader behaviours.

## Decision

1. **`user_need` is a first-class classification** — `know | understand | feel | do` — on `story` (and on `signal`, for discovery). Assigned by the **Classify** layer (the LLM, or heuristics), stored in `enrichment.classify.user_need`. The set is **configurable/extensible** per newsroom to the fuller user-needs taxonomy (Update me, Educate me, Give me perspective, Divert me, Inspire me, Connect me, …) — defaults to the four.

2. **`user_need` steers the fair-chance audit (ADR 0047).** Instead of scoring all surfaces equally, the audit **weights surfaces + levers by the story's need**:

   | Need | Surfaces weighted up | Levers emphasised |
   |------|----------------------|-------------------|
   | **Know** | Discover, Google News | freshness, image, schema (speed to the card) |
   | **Understand** | Search, **AIO** | depth, dwell-time/completion, named sources, internal links |
   | **Feel** | Social, Direct | emotional hook, image/video, shareability |
   | **Do** | Search, Subscription | utility, structured data, CTA / conversion |

   So a *Know* story that's weak on Discover is flagged hard; an *Understand* piece is judged on depth + AIO citation, not on being a fast Discover card. The right fair chance for *this* story's purpose.

3. **Need-mix is a strategic view.** The distribution of needs across coverage (are we all *Know*, no *Understand*?) is a fair-chance-audit / framing-balance lens for the desk + leadership.

## Consequences

- **Editorially native.** Reader-needs is how modern newsrooms (BBC, and smartocto's users) already plan + assess coverage. The platform speaks that language — by a journalist, for journalists.
- **The audit becomes need-aware** — its surface weighting + recommended levers depend on the story's need (a refinement of ADR 0047, not a replacement).
- **Configurable.** Four by default; a newsroom can adopt the fuller user-needs set without code change.
- **Cheap to assign.** `user_need` is one more field the Classify LLM call already in `enrich` returns (no extra call); heuristics (headline cues, length, section) can seed it.
- **Coverage balance** gets a second axis (need-mix) beside framing balance (PEJ).

## Anti-patterns refused

- One-size surface scoring that ignores what the story is *for*.
- Hardcoding the four needs with no path to the fuller taxonomy.
- Treating `user_need` as a vanity tag rather than a driver of the audit's weighting.

## References

- ADR 0047 (fair-chance audit — `user_need` steers its surface/lever weighting)
- ADR 0043 (configurable surfaces — what gets weighted)
- ADR 0046 (canonical model — `user_need` joins Deuze + PEJ as classifications)
- `enrich.py` / `prompts.build_enrich_prompt` (Classify returns `user_need`)
