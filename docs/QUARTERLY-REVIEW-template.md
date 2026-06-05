# Quarterly Review — Template

**How to use:** At end of each platform quarter (Wk 13 / 26 / 39 / 52 of platform timeline, then continuing), copy this file to `docs/QUARTERLY-REVIEW-YYYY-QN.md` (e.g., `QUARTERLY-REVIEW-2026-Q3.md`), fill in evidence, commit. Outcomes inform `ROADMAP.md` updates.

Reviews are short. Target: 30-60 minutes. Evidence over narrative.

---

# Quarterly Review — YYYY-QN

**Quarter window:** YYYY-MM-DD to YYYY-MM-DD
**Reviewer:** Subhash Rai (founder; co-founder once onboarded)
**Date filed:** YYYY-MM-DD

## Platform Y1 status (one-line each)

- ARR (₹): _________
- Active design partners: _________
- Design partner reject-rate on shortlist (target ≤30%): _________%
- Daily Anthropic spend per tenant (target ≤₹150): ₹_________
- Reasoning-trace use by editor (target ≥1×/wk): _________ times last wk
- Premortem failure modes that fired this quarter (if any): _________

## ADR 0006 — AI-surface watch-trigger check

### Trigger A — Major Indian outlet MCP / AI-feed adoption

Outlets to scan: TOI, HT, The Hindu, Indian Express, NDTV, India Today, ThePrint, The Wire, Scroll, News18, Mint, Business Standard, Economic Times, Moneycontrol, plus any with ≥10M unique monthly.

| Outlet | MCP feed? | AI-card pipeline? | `ai.txt` policy? | Evidence URL |
|--------|-----------|-------------------|-------------------|---------------|
| | ☐ | ☐ | ☐ | |
| | ☐ | ☐ | ☐ | |
| | ☐ | ☐ | ☐ | |

**Trigger A fired?** ☐ Yes (≥3 outlets) / ☐ No

### Trigger B — Google / Anthropic / OpenAI ships native AI-feed indexing

- Google publisher AI-feed product released this quarter? ☐ Yes / ☐ No  Evidence: _________
- Anthropic native MCP-feed indexing released? ☐ Yes / ☐ No  Evidence: _________
- OpenAI publisher AI-feed released? ☐ Yes / ☐ No  Evidence: _________

**Trigger B fired?** ☐ Yes (≥1 product released with public spec + adoption path) / ☐ No

### Trigger C — Design partner explicit request

- Any design partner requested AI-surface tooling this quarter? ☐ Yes / ☐ No
- If yes: Partner _________, request _________, paid commitment offered? ☐ Yes / ☐ No

**Trigger C fired?** ☐ Yes (request with paid commitment) / ☐ No

### Trigger D — Trust-and-safety regression

- AI misattribution / mis-citation / fabrication incidents this quarter (count): _________
- Threshold: ≥5 documented incidents fires trigger.

**Trigger D fired?** ☐ Yes / ☐ No

### Outcome — ADR 0006 action

- ☐ No trigger fired. Y3 AI-surface schedule reaffirmed. No action needed.
- ☐ Trigger fired. Document below. Pull AI-surface work into Y2 H2 per ADR 0006 action plan.

If any trigger fired, summary of pull-forward decision:

```
Pulled into Y2 H2:
- 
- 
- 
Deferred from Y2 to absorb the schedule pressure:
- 
ADR(s) to file for new AI-surface modules:
- xtnd/docs/adr/00XX-...
```

## ADR 0007 — Sustainability preconditions check

### Precondition A — Revenue covers part-time contributor

- Current platform ARR: ₹_________
- Threshold: ≥₹20 lakh.
- Monthly recurring revenue sufficient for ~10-15 hr/wk contributor: ☐ Yes / ☐ No
- Contributor candidate identified: ☐ Yes — name + profile _________  / ☐ No

**Precondition A satisfied?** ☐ Yes / ☐ No

### Precondition B — Values-aligned co-founder

- Co-founder conversation in progress: ☐ Yes / ☐ No
- Profile fit: editorial-product senior + technical or journalism-domain: ☐ Yes / ☐ No
- Cap-table conversation started: ☐ Yes / ☐ No
- ADR ratification path agreed: ☐ Yes / ☐ No

**Precondition B satisfied?** ☐ Yes / ☐ No

### Precondition C — Schedule stretch accepted

- Founder accepts Y2 stretches to ~18 calendar months: ☐ Yes / ☐ No
- No new design partner onboarded beyond existing pilot during stretch: ☐ Confirmed / ☐ Violated
- 1 deep-work day/week protected per platform ADR 0026: ☐ Confirmed / ☐ Violated

**Precondition C in effect?** ☐ Yes — default path / ☐ Superseded by A or B

### Hard-refusal conditions check

- Platform Y1 design partner pilot stalled (no shortlist trust by Wk 16): ☐ Yes / ☐ No
- Founder in burnout state (2 consecutive deep-work days skipped non-vacation, or lost faith in product): ☐ Yes / ☐ No
- Cumulative founder hours across platform + Xtnd >60/wk for 4 consecutive weeks: ☐ Yes / ☐ No
- Unresolved platform architectural issue blocking Xtnd module work: ☐ Yes / ☐ No

**Any hard-refusal condition fired?** ☐ Yes — Xtnd Y2 build paused until resolved / ☐ No

### Outcome — ADR 0007 action

- ☐ All hard-refusal conditions clear AND (A OR B OR C) holds → Xtnd Y2 build proceeds on previously stated schedule.
- ☐ Hard-refusal condition fired → Xtnd Y2 build paused. Resume condition: _________
- ☐ Y2 already underway → continue, adjust schedule per which precondition holds.

## Premortem follow-up

Walk the `docs/PREMORTEM.md` failure-mode table. For each mode that fired this quarter, document:

- Failure mode #__: _________
- Mitigation effectiveness (1-5): _________
- Plan update: _________

## Roadmap changes triggered

List `ROADMAP.md` items moved this quarter:

- _________
- _________

## Platform-side feedback to file upstream

Any platform changes Xtnd needs (schema, agent path enum, role enum extension, slot definition):

- ☐ Filed upstream PR this quarter: link _________
- ☐ Queued for next quarter: _________
- ☐ None

## Next quarter focus (one line)

_________

---

## Filing notes

1. Commit this file to `docs/` with name `QUARTERLY-REVIEW-YYYY-QN.md`.
2. Commit message: `docs: quarterly review YYYY-QN`.
3. If any ADR action triggered, file the new ADR in the same commit or a follow-up commit referencing this review.
4. Update `ROADMAP.md` quarterly-review log section with one-line summary + link to this file.
5. If Y2 build status changes (start / pause / resume), update `ROADMAP.md` Y2 schedule projections.

## Quarterly review log (kept in ROADMAP.md)

Each quarter adds a line to `ROADMAP.md`:

```
- 2026-Q3: docs/QUARTERLY-REVIEW-2026-Q3.md — Y2 build status: not-started; preconditions: C; ADR 0006: no trigger fired.
- 2026-Q4: docs/QUARTERLY-REVIEW-2026-Q4.md — Y2 build status: not-started; preconditions: A satisfied; ADR 0006: Trigger A fired (Hindu + Indian Express + Mint ship MCP).
```
