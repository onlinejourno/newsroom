# "Where You Stand" — Competitive-Framing Intelligence

**Surface:** FRAME · Analyse (`/trends`) → the "Trending now" card grid.
**Status:** Phase B, shipped on `slice/phase-b-framing-intel`.
**Audience:** editorial users (Part 1–2) and maintainers (Part 3–6).

Each trending topic carries a **position tag** and an **editorial implication**:
not just "this is hot," but *where your outlet stands on it versus your peers,
and what to do next*. This is the ground-up principle — educate the reporter,
show the why — applied to competitive framing.

> Verification snapshot (seeded demo tenant, through the real code path):
>
> | topic | tag | confidence | implication |
> |---|---|---|---|
> | economics_business | **ON IT** | full | On it — keeping pace. |
> | politics | **BEHIND** | full | Peers ahead — you're light on it. |
> | defense_foreign | **PEAK** | low | Past peak — your angle's live. |
> | crime | **NO ANGLE** | amber | Peer-led (10 outlets). No angle from you yet. Explanatory angle open. |

---

## Part 1 — How to read a card

```
┌─────────────────────────────────────────────┐
│ Nifty                              [ ON IT ] │  ← topic · position tag
│ On it — keeping pace.                        │  ← editorial implication
│ 62 → Building momentum · 18 mentions Rising  │  ← momentum score · label · volume · direction
│ Building — watch closely                     │  ← prediction band
│ ████████████░░░░░░░░                          │  ← momentum bar (0–100)
└─────────────────────────────────────────────┘
```

- **Position tag** — your stance on the topic relative to peers (the four tags below).
- **Implication** — the one-line "so what / now what," with real numbers slotted in.
- **Confidence** — a tag may be flagged **· low confidence** (amber) when the peer
  sample is thin. We never assert more than the data supports (honest-data).
- The momentum number, label, mentions, direction, and bar are the existing
  "what's moving" signals — unchanged from before.

---

## Part 2 — The four position tags

| Tag | Means | Fires when | What to do |
|---|---|---|---|
| **NO ANGLE** | Peers are covering this; you have nothing published. | You have 0 own stories on the topic; peers do. | Decide fast whether to enter. If peers are framing it combatively, the explanatory angle is open. |
| **BEHIND** | You're on it but lighter than the field. | You have some coverage, but below the peer median, and the topic is still rising. | Add depth / a distinct angle before the window closes. |
| **ON IT** | You're keeping pace with peers. | Your coverage is at or above the peer median, topic still rising. | Hold the line; look for a differentiating frame (see "explanatory window"). |
| **PEAK** | The topic has crested; your angle is already live. | Topic momentum is declining/plateaued and you have coverage. | Pivot to follow-ups / the next story; don't over-invest in a fading topic. |

**The implication line** is templated and fact-slotted (deterministic, no LLM cost):

- NO ANGLE → `Peer-led (N outlets). No angle from you yet.` (+ `Explanatory angle open.`
  when peers are framing it combatively)
- BEHIND → `Peers ahead[ since {event}] — you're light on it.[ You have a brief ready.]`
- ON IT → `Explanatory window still open.` when peers are combative and your own framing
  is thin on explanation; otherwise `On it — keeping pace.`
- PEAK → `Past peak — your angle's live.`

The optional `{event}` and `{brief ready}` slots only appear when there is real backing
for them; they are never fabricated.

### The framing "explanatory window"

Backing the tags is the **PEJ combative : explanatory (C:E) ratio**. Frames roll up into
groups (`framing.py` `FRAME_GROUPS`):

- **combative** — Conflict, Horse Race, Wrongdoing Exposed, Institutional Critique
- **explanatory** — Process, Historical Outlook, Trend

When peers are framing a topic combatively (C > E) and your own explanatory coverage is
thin, the card surfaces **"Explanatory angle open" / "Explanatory window still open"** — a
concrete editorial opening, not just a number. This is the competitive-framing differentiator.

---

## Part 3 — Confidence (honest-data)

Confidence comes from `nPeer` = the number of peer articles framing-coded on that topic:

| nPeer | Confidence | Effect |
|---|---|---|
| ≥ 30 | **full** | Tag shown plainly. |
| 5–29 | **amber** | Tag shown with **· low confidence** + amber styling. |
| < 5 | **low** | Tag shown, but the framing nuance ("explanatory window") is **suppressed** — too little data to claim a framing pattern. |

A topic with **no peer signals at all** shows **"no peer data"** instead of a tag — never a
fabricated position.

---

## Part 4 — Where the numbers come from (data flow)

```
tenants.config.peers = [{domain, name, tier}]        ← your peer set (vendor-neutral, config)
        │
own coverage   = your STORIES (published work)        own = "your angle"
   ownRecent      stories where headline ILIKE topic, window
   own C:E         stories.enrichment.framing.frame_group
        │
peer coverage  = SIGNALS from peer domains             peer = the field
   peerRecent     signals where raw_payload.domain ∈ peers
                  AND enrichment.analyse.entities @> [topic]
   peerCount      distinct peer domains covering it
   peerMedian     median of per-peer mention counts
   peer C:E       signals.enrichment.framing.frame_group
   nPeer          how many of those are framing-coded
        │
momentum/trajectory = topicMomentum over the tenant's signal entities
   recent window  last `window` hours (default 24)     ?window=N to change
   prior window   the `window` hours before that
        │
        ▼
   derivePosition(...) → tag + confidence + framing nuance      (apps/web/lib/framing-position.ts)
   implicationFor(...) → the implication line
        │
        ▼
   the card chip + implication                                  (apps/web/app/[locale]/trends/page.tsx)
```

Everything is computed **at request time** — no precompute table, no migration. Peers live
in `tenants.config` jsonb; the corpus lives in the existing `signals` / `stories` tables.

---

## Part 5 — The derivation logic (for maintainers)

`derivePosition(inputs)` decides the tag top-down:

```
if ownRecent == 0            → NO ANGLE      (peers cover it, you don't)
else if trajectory is PEAKED → PEAK          (you cover it, topic has crested)
else if ownRecent < peerMedian → BEHIND      (you're lighter than the field, rising)
else                         → ON IT         (you're at/above the field, rising)
```

- **PEAKED** = `predictTrajectory` ∈ {`at peak — watch for plateau`, `fading fast —
  post-peak`, `cooling — interest declining`}. **Not** `near peak — may plateau` — that
  string is returned for any topic at its max heat (peakRatio ≈ 1), i.e. *ascending*, so it
  belongs in the coverage ladder, not PEAK. (This was a real bug caught in verification; see
  commit `009430f`.)
- `peersCombativeHeavy` = `confidence ≠ low && peerCombative > peerExplanatory && peerCombative > 0`.
- `ownThinExplanatory` = `ownExplanatory == 0 || ownExplanatory < ownCombative`.

The module is **pure** (no DB, no React) and unit-tested in
`apps/web/lib/framing-position.test.ts` — every tag branch, the confidence boundaries
(nPeer 4/5/29/30), and the implication templates. Run: `pnpm --filter @onlinejourno/web test`.

---

## Part 6 — Configuring your peer set

Peers are **per-tenant config** — never hardcoded in source (vendor-neutral). Set them in
`tenants.config.peers`:

```sql
update tenants set config = coalesce(config,'{}'::jsonb) || jsonb_build_object(
  'peers', jsonb_build_array(
    jsonb_build_object('domain','example.com','name','Example','tier','peer')
  )
) where slug = '<your-tenant>';
```

The domains **must match `raw_payload->>'domain'` values that actually appear in your signal
inflow** — otherwise peer standings are empty and every card reads "no peer data." See
`infra/seeds/self_peers.sql` for a template.

### The demo tenant

A separate `demo` tenant showcases the rich 30-outlet view, seeded from the news-intel
corpus by `infra/seeds/import_newsintel_peers.py` (re-dates signals into the window + seeds a
few own stories so all four tags fire). View it locally with:

```bash
OJ_TENANT_SLUG=demo pnpm --filter @onlinejourno/web dev
```

Real tenants never touch news-intel — they use their own configured peers + own inflow.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Every card "no peer data" | No peers configured, or configured domains absent from inflow. | Set `config.peers` to domains present in `signals.raw_payload.domain`. |
| Every covered topic is **NO ANGLE** | You have no published `stories` matching trending topics (own coverage). | Expected when your beats don't overlap the trending field; tags fill in as you publish. |
| Tags show but always **low confidence** | Few peer signals are framing-coded (`nPeer` small). | Let the framing worker (`frame` step) code more inflow over time. |
| No **explanatory window** nuance ever | Peer C:E not combative-heavy, or confidence low. | Data-driven — appears only when peers are combative and your explanation is thin. |

---

## Code map

| Concern | File |
|---|---|
| Tag + implication logic (pure) | `apps/web/lib/framing-position.ts` (+ `.test.ts`) |
| Standings queries (own / peer / peers) | `apps/web/lib/db.ts` — `ownTopicStandings`, `peerTopicStandings`, `tenantPeers` |
| Card rendering | `apps/web/app/[locale]/trends/page.tsx` |
| Momentum / trajectory | `apps/web/lib/trends.ts` (`topicMomentum`, `predictTrajectory`) |
| Framing coder (C:E groups) | `packages/agents-py/src/onlinejourno_agents/framing.py` |
| Self peer seed / demo importer | `infra/seeds/self_peers.sql`, `infra/seeds/import_newsintel_peers.py` |
| Design / plan | `docs/superpowers/specs/2026-06-18-onlinejourno-phase-b-design.md`, `docs/superpowers/plans/2026-06-18-onlinejourno-phase-b.md` |

## Known limitations / roadmap

- The `{event}` (driver) and `{brief ready}` (matching calendar event/lead) implication
  slots are wired in `implicationFor` but not yet populated by the page — honest-data: omitted
  until a reliable source is connected.
- Demo topic labels read coarse (`economics_business`) because the demo axis is PEJ topics;
  real tenants use fine entities.
- On a real tenant, tags are only as rich as framing-coding coverage + own-story overlap; both
  grow over time as the worker codes inflow and the newsroom publishes.
