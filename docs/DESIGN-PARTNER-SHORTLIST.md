# Design Partner Shortlist

Drafted Wed Jun 3, 2026.

## Target

**One active design partner for Y1.** Three candidates in pipeline as insurance against rejection or champion exit. Second design partner pursued only after the first has converted to paid and remained stable for ≥4 weeks.

This is deliberate solo-founder capacity protection. Two concurrent design partners doubles the support load without doubling product progress.

## Selection criteria

A design partner must satisfy all of:

1. **Mid-size Indian publisher** with a recognisable markets / regulatory desk (8–60 reporters on the beat).
2. **Reachable through a warm introduction** — the founder's existing network, not cold outreach.
3. **Champion exists at the editor level** (Markets Editor / Business Editor / Senior Section Editor). Not the CEO. Not the CTO. Not the head of digital. The person who runs the morning meeting.
4. **Champion has a backup**: a second senior editor at the same newsroom who knows about the pilot and could continue conversation if the primary champion exits. Per EIP premortem #14.
5. **Willing to give one morning of shoulder-surfing** with the editor's desk in the first two weeks (3–4 hours observed).
6. **Willing to use the brief for 8 weeks free** with an open conversation about a paid contract at Wk 12.
7. **Not a direct competitor of OnlineJournalism.in** in coverage scope (avoids conflict of interest).
8. **Newsroom has institutional bandwidth** for a real pilot — not a publication mid-acquisition, mid-restructuring, or mid-layoff.

## Anti-criteria (decline immediately)

- Publisher demands exclusivity or first-right-of-refusal across all OnlineJourno features.
- Champion wants a custom feature built before they will pilot.
- Newsroom's IT department insists on running the platform inside their firewall in Y1.
- Champion cannot commit to 14 consecutive working days of brief usage in the first month.
- Publisher wants to sign an NDA that would restrict OnlineJourno from using its work with this customer as a future case study.

## Candidates

Founder fills these slots with three real names. Warm-network only. Markets / regulatory editor as the champion.

### Candidate 1

| Field | Value |
|-------|-------|
| Publisher | _to fill_ |
| Tier | _to fill (1 / 2 / 3 — see BRAND-DECISION)_ |
| Markets desk size | _N reporters_ |
| Primary champion (name, role) | _to fill_ |
| Backup champion (name, role) | _to fill_ |
| Founder's relationship | _e.g. former colleague, sourced through X_ |
| Current source-monitoring practice | _e.g. manual scan + WhatsApp alerts_ |
| Stated editorial pain (in their words) | _to fill_ |
| Risk flags | _e.g. publisher mid-restructure, champion close to retirement_ |
| Why this is a good fit | _2–3 sentences_ |

### Candidate 2

(same structure)

### Candidate 3

(same structure)

## Outreach message template

Personalise the bracketed sections for each candidate. Keep under 200 words. Send via email or LinkedIn, not WhatsApp.

```
Subject: A new editorial-intelligence tool I'm building — would you try
it on your desk?

Dear [name],

I'm building something I'd like your read on.

It is called OnlineJourno. The simplest description is: a daily morning
brief that scans regulator and ministry sources (RBI, SEBI, NSE, BSE,
MCA, IBBI, CCI) and shortlists the 15-25 items your markets desk should
see, before the desk starts its day.

I am looking for one design partner — a markets / regulatory editor who
will use the brief for eight weeks and tell me what works and what
doesn't. Free pilot. No commitments. At week twelve, if you find it
useful, we discuss a paid arrangement.

I'd like to spend a morning watching your desk's triage in the first two
weeks if you'd allow it. That observation, more than any architecture
decision, decides whether this product is worth your time.

If you can spare 30 minutes for a call, I would value it.

Warmly,
Subhash Rai
OnlineJourno · https://onlinejourno.com
```

## First call agenda (30 minutes)

1. (5 min) Founder explains the platform in one paragraph + one screenshot of the brief.
2. (10 min) Champion describes the desk's current morning routine.
3. (5 min) Founder asks: would the brief, as described, save you time today?
4. (5 min) Champion's three biggest concerns about adopting this.
5. (5 min) Next-step decision — proceed to shoulder-surf, decline, or defer.

If the answer is "proceed," schedule the shoulder-surf within two weeks.

## Decision matrix after first call

| Signal | Decision |
|--------|----------|
| Champion enthusiastic + clear pain + backup champion identified + can commit 14 working days | **Proceed.** Schedule shoulder-surf within 14 days. |
| Champion interested but tentative; cannot commit to 14 days | **Defer.** Stay in touch; revisit at Wk 4 if Candidate 1 falls through. |
| Champion wants the product but wants paid feature work upfront | **Decline.** This is consulting, not a design partnership. |
| Champion non-responsive after two follow-ups (one week apart) | **Decline by silence.** Move to next candidate. |
| Champion wants the product but the newsroom IT department insists on on-prem deployment Y1 | **Decline.** Out of MVP scope. Re-evaluate at Y2. |

## Pilot agreement (one page)

When proceeding to shoulder-surf, send a one-page agreement covering:

1. What OnlineJourno provides: brief from 25 sources, daily 06:30 IST delivery, reasoning trace access, weekly check-in call, 8 weeks of pilot.
2. What the design partner provides: daily honest feedback (kept or rejected, why), 14-day brief usage commitment, willingness to revisit paid conversion at Wk 12, attribution permission for case study (right-of-reply on language).
3. Data terms: editorial DNA + briefs + signals belong to the partner, never shared, never aggregated. (Per ADR 0025.)
4. Termination: either party can terminate within 24 hours notice during pilot. After Wk 12 paid contract, standard terms apply.
5. Confidentiality: founder will not disclose pilot data; partner will not redistribute the platform code or product before public release.

This agreement is plain English, not legalese. Solo founder vs. newsroom editor; not enterprise vs. enterprise.

## Outreach schedule

| When | Action |
|------|--------|
| Fri Jun 5 | Names + outreach messages drafted (founder) |
| Mon Jun 8 | First-batch outreach sent to all three candidates |
| Mon Jun 15 | Status check — who responded, who didn't |
| Wk 4 (Jun 22 onwards) | First-call cadence as candidates respond |
| Wk 6 | Shoulder-surf with confirmed Candidate 1 |
| Wk 8 | Pilot begins with Candidate 1 |

If by Wk 6 no candidate has confirmed, do NOT escalate by widening the outreach to cold leads. Pause, reassess, and ask why warm network did not bite. The answer to that question matters more than the next outreach batch.

## What happens if no design partner converts by Wk 12

The product still launches at `app.onlinejourno.com` with a public sign-up form. The founder uses OnlineJournalism.in itself as the operational design partner (the sister property is an editorial publication; the platform serves its own author). Revenue path becomes: GitHub Sponsors + book sales + opportunistic consulting until a real customer signs.

This is the fallback, not the plan. The plan is one paying design-partner-converted customer by Wk 16.
