# Framing India 2026 — Codebook

The classification schema used to code the 170-story sample, and the schema the
`m-framing-pej` module implements. Percentages are the India-2026 baseline
distribution (N=170) — useful as priors and as a sanity bar for the module's
output on similar samples.

Adapted from PEJ's *Framing the News* (1999) codebook, with India-specific
additions (notably the **Institutional Critique** frame and an India-tuned
topic/trigger/message set).

## Frame (14)

| Frame | N | % | Notes |
|-------|---|---|-------|
| Straight News | 47 | 27.6 | Just-the-facts report, no interpretive lens |
| Conflict | 17 | 10.0 | Story built around opposition between sides |
| Wrongdoing Exposed | 13 | 7.6 | Misconduct surfaced |
| Horse Race | 13 | 7.6 | Who's winning/losing (esp. elections) |
| Process | 11 | 6.5 | How a system/procedure works |
| Trend | 10 | 5.9 | Pattern over time |
| Conjecture | 10 | 5.9 | Speculation about what may happen |
| Reality Check | 9 | 5.3 | Claim tested against evidence |
| Policy Explored | 9 | 5.3 | Substance of a policy examined |
| Personality Profile | 9 | 5.3 | Focus on an individual |
| Historical Outlook | 8 | 4.7 | Past-context lens |
| Reaction | 6 | 3.5 | Response to a prior event |
| Institutional Critique | 6 | 3.5 | **India-specific addition** — scrutiny of an institution |
| Consensus | 2 | 1.2 | Agreement/common ground |

## Topic (16)

| Topic | N | % |
|-------|---|---|
| Politics/Elections | 47 | 27.6 |
| Economy/Business | 28 | 16.5 |
| Foreign Affairs/Diplomacy | 26 | 15.3 |
| Media/Press Freedom | 13 | 7.6 |
| Defence/National Security | 11 | 6.5 |
| Education | 10 | 5.9 |
| Crime/Law & Order | 9 | 5.3 |
| Judiciary/Legal | 5 | 2.9 |
| Culture/Entertainment | 5 | 2.9 |
| Science/Technology | 4 | 2.4 |
| Sports | 4 | 2.4 |
| Governance/Bureaucracy | 3 | 1.8 |
| Religion/Communalism | 2 | 1.2 |
| Health/Medicine | 1 | 0.6 |
| Environment | 1 | 0.6 |
| Social Issues/Welfare | 1 | 0.6 |

## Trigger (13)

What occasioned the story.

| Trigger | N | % |
|---------|---|---|
| Govt Statement/Action | 46 | 27.1 |
| Newsroom Enterprise | 24 | 14.1 |
| Spontaneous Event | 23 | 13.5 |
| Analysis/Interpretation | 15 | 8.8 |
| Election/Poll Result | 14 | 8.2 |
| Report/Data Release | 10 | 5.9 |
| Legislative Action | 8 | 4.7 |
| Anniversary/Commemoration | 8 | 4.7 |
| Investigation | 6 | 3.5 |
| Judicial Action | 6 | 3.5 |
| Preview/Forward Look | 6 | 3.5 |
| Reaction | 2 | 1.2 |
| Non-Govt Newsmaker | 2 | 1.2 |

## Underlying Message (9)

| Message | N | % |
|---------|---|---|
| Optimism | 50 | 29.4 |
| No Message | 42 | 24.7 |
| Anti-Establishment | 22 | 12.9 |
| Sit Up/Historic | 20 | 11.8 |
| Realism | 14 | 8.2 |
| Distrustfulness | 9 | 5.3 |
| Little Guy vs System | 7 | 4.1 |
| Fatalism | 4 | 2.4 |
| Protectiveness | 2 | 1.2 |

## Source type (6)

`Staff Reporter` (148) · `Wire/Agency` (8) · `Opinion/Column` (8) · `Ground Report` (3) · `Data Journalism` (2) · `Bloomberg/Reuters Syndicated` (1)

## Placement (2)

`Lead` (130) · `Mid` (40)

## Outlet camp (2)

- **legacy_digital** (105 stories): NDTV, India Today, Hindustan Times, Indian Express, Times of India, News18, The Hindu.
- **digital_native** (65 stories): Scroll.in, The Wire, The Print, Newslaundry, FirstPost.

## Record shape (`dataset.json`)

```json
{
  "outlet": "The Wire",
  "type": "digital_native",
  "date": "2026-...",
  "headline": "...",
  "topic": "Politics/Elections",
  "trigger": "Govt Statement/Action",
  "frame": "Conflict",
  "message": "Anti-Establishment",
  "source_type": "Staff Reporter",
  "placement": "Lead"
}
```

When `m-framing-pej` is built, it predicts `frame` (and optionally `topic` /
`trigger` / `message`) from `headline` + body, and the replay harness scores
predictions against these labels.
