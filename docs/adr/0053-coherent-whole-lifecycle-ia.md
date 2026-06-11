# ADR 0053 — The coherent whole: the story lifecycle is the platform's shape

**Status:** Accepted (2026-06-11). Supersedes the flat tool-by-tool navigation.

## Context — the founder's correction

> "The tools that I have built individually and are being slapped together
> here must form a coherent and comprehensive whole."

The platform had become a masthead of eleven pages organised by **which prior
project each view was ported from** (a discover-dashboard tab here, an EIP
view there). Every capability the founder names exists in some form — inflow,
alerts, potential, gems, surface audit, probity, PEJ/Deuze/user-needs — but
nothing binds them into the thing he intended:

> "a place where all stakeholders in a newsroom, from rookies to top editors,
> have this platform as a single source of understanding **what is going on**
> and **what needs to be done**."

## Decision — five rooms on one lifecycle

The platform reorganises around the **story's journey through the newsroom**,
with a room for each stage. Every existing view moves into its room; every
named gap is a slot in a room, not a vague wish.

### ① Today — before the story exists
*What is going on. The original sources — governments, NGOs, think-tanks, PR
releases, event announcements, social media — triggering alerts to reporters.*

- The signal inflow (`/signals`), per-reporter routed feeds (`/feed/…`),
  signal provenance (`/signal/[id]`), push alerts (m-alerts).
- **Take-up guidance** (`/potential`): trending now or likely to trend today
  (`/trends`), **and** — *gaps to build* — long-term **strategic-topic value**
  (the masthead's chosen specialisms, config) and **subscriber affinity**
  (what the org's subscribers read; needs the subscription connector).
- **Role lenses:** the reporter sees her feed; the **bureau chief / resident
  editor** sees the bureau's alerts condensed (*gap: bureau view*); the
  **editor** sees a cross-bureau snapshot of potential stories
  (*gap: editor snapshot*; `/gaps` is its regional skeleton).

### ② Stories — after publish
*Whether the published story is optimised for each surface — and if not, what
needs to be done.*

- Automatic audit + scoring of own stories (`/scores`), paste-a-URL audit,
  unrealised potential in the night-desk output (`/gems` — the founder's
  "hidden gems in a legacy newsroom").
- **Each surface reads in its own way; the platform optimises for that
  surface.** Google surfaces have content scorers today; the registry (ADR
  0043) already lists **AI/LLM surfaces** (AI Overviews, assistants, LLM
  crawlers) — *gap: their scorers* (citability, extractable answers,
  llms.txt/robots posture, schema completeness as machine-readability).

### ③ Standards — seared into every stage
*Probity in every aspect of the workflow; factcheck aiding the story's
journey.*

- Probity (`/probity`, ADR 0052) — today a room; the intent is a **thread**:
  probity chips on stories and surfaces, not only a standalone scan.
- **Factcheck** — *gap, named module `m-factcheck`*: claim extraction on
  signals/stories, links to verification sources, status the desk can see.
- The conscience dashboards: need-mix (ADR 0049) and framing balance (PEJ,
  m-framing-pej) — coverage judged against the theory the product is built
  on (PEJ survey, Deuze assessment, framing, user-needs model).

### ④ Newsroom — people and strategy
- The directory (`/journalists`), regional gaps (`/gaps`), and — *gaps to
  build* — the strategic-topics config and the subscriber-affinity view.

### ⑤ Learn — the assistive layer
*Assistive for those who don't know; a workhorse for the cognoscenti.*

- *Gap, named module `m-learn`*: every score, frame, and surface in the
  product explains itself — what Discover is, why E-E-A-T matters, what a
  reader need is, what a PEJ frame means — so journalists new to digital
  learn the medium **inside the tool**, quickly, in the GenAI era. The
  explainer boxes already on /scores and /potential are its seeds.

**Admin** stays folded (one menu): sources, connectors, surfaces,
architecture.

## Principles reaffirmed

- *By a digital journalist, about journalism, for journalists* who want their
  stories to get a fair chance in the world outside (ADR 0041).
- Theory-grounded throughout: PEJ, Deuze, framing, User Needs (ADRs 0046,
  0049).
- **OSS and customisable end to end**: anyone, anywhere, downloads from
  GitHub and runs it for their newsroom — locales (ADR 0051), surfaces (0043),
  connectors (0044), beats, needs, strategic topics: all config, no forks.

## The build sequence this ADR binds

1. **The spine first** (this change): navigation + home reorganised into the
   five rooms; role entry points on the front door.
2. Bureau-chief condensed view + editor cross-bureau snapshot (Today).
3. AI-surface scorers (Stories) — the registry's AI surfaces get content
   signals.
4. m-factcheck skeleton (Standards).
5. Strategic-topics config + subscriber-affinity (Newsroom → feeds Potential).
6. m-learn: the explainer layer extracted into a first-class, localizable
   catalogue.

## Anti-patterns refused

- Navigation that mirrors the provenance of code instead of the newsroom's
  day.
- A new page per ported tool ("slapping together").
- Capabilities that only the cognoscenti can read (every number explains
  itself).
- Anything hardcoded that a newsroom elsewhere would need to fork.

## References

- The founder's statement of intent (2026-06-11, this ADR's cause).
- ADR 0041 (one product), 0042 (consolidation), 0043 (surfaces), 0046
  (canonical model), 0049 (user needs), 0050 (primary sources), 0051 (i18n),
  0052 (probity).
