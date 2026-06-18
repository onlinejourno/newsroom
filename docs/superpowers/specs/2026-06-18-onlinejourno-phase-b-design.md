# Design spec — OnlineJourno Phase B: "where you stand" competitive-framing intelligence

**Status:** Drafted 2026-06-18. Implements **Phase B** of the redesign
(`docs/superpowers/specs/2026-06-18-onlinejourno-redesign-design.md` §2, §58–64).
Phase A shipped the FRAME·Analyse (`/trends`) card shell with neutral
**"baseline pending"** placeholders + the `.ds-tag-behind/-noangle/-onit/-peak`
CSS. This spec replaces those placeholders with **real position tags** + **editorial
implications**, each measured against a **per-tenant peer baseline**. Honours the
durable principles: vendor-neutral, honest-data, locale/competitor-relative, ground-up.

## Why

The differentiator (redesign spec §2): FRAME·Analyse should not be a generic trend
list but **the outlet's own position relative to peers + what to do about it** — a
position tag (`BEHIND` / `NO ANGLE` / `ON IT` / `PEAK`) and an editorial implication
("Peer-led. No angle from you yet." / "Surging — you have a brief ready."), measured
against the framing landscape of ~30 tracked outlets. Ground-up: educate the reporter
with the *why* + the next step, not just a number.

## Data gate (resolved 2026-06-18)

STEP-1 feasibility check before committing the build. Result: **partially wire-able →
proceed.**

**Present:**
- `m-framing-pej` coder exists + is eval-gated (`packages/agents-py/.../framing.py`,
  `frame_eval.py`; 170-article goldset). Writes `signals.enrichment['framing']` =
  `{frame, frame_group, topic, confidence, rationale, coder_version}`, and can target
  `stories` too (own baseline).
- The C:E building block exists: `FRAME_GROUPS` (`framing.py:32`) maps the 14 PEJ
  frames → `combative` / `explanatory` / `straight` / `policy` / `other`.
- Per-topic momentum exists (`lib/trends.ts` `topicMomentum`, shipped #107).
- Per-outlet attribution exists: signals carry `raw_payload.domain` (GDELT collector,
  `gdelt.py:126`); the inflow is GDELT-broad → already multi-outlet.
- The 30-outlet peer registry + a coded corpus exist on disk in the founder's prior
  **news-intel** SQLite (`~/projects/news-intel/data/news_intel.db`): `entities`
  (30 rows, `tier ∈ {india, global_benchmark, peer}`, `url`→domain) +
  `coded_articles` (159 rows, `frame`/`frame_group`/`topic`/`confidence`) — the same
  shape the platform coder emits.

**Missing (the gaps Phase B fills):**
1. No peer set modelled — no `peers` key in `tenants.config`, no migration.
2. No peer baseline corpus in the platform — the news-intel competitive layer was
   *designed* to fold in (ADR 0046 §5) but never migrated.
3. Framing coverage is thin (worker codes ~12 signals/run for `self`) → low-n per
   outlet until coverage widens.

## Decisions (this brainstorm)

1. **Peer baseline sourcing — Path C (hybrid).** Real tenants: peer set from their own
   `tenants.config.peers`, peer corpus from their **own GDELT-broad inflow** grouped by
   domain (vendor-neutral, no import). Demo tenant: peers + a coded corpus **seeded from
   news-intel** for a rich demo. Same query path serves both.
2. **Tag driver — coverage ladder, framing-enriched.** The tag is a coverage-position
   ladder; the PEJ C:E gap powers the *implication* nuance + confidence, not the tag itself.
3. **Implication copy — templated, fact-slotted.** Deterministic, free, honest, no LLM
   cost, no new worker dependency.
4. **Scope — cards only.** Light the "Trending now" cards. The deck stays copy; the
   framing-landscape panel + by-place dimension are out of scope.
5. **Compute location — request-time in `lib/` (Approach A).** No migration, no worker
   step; mirrors how momentum/trends already compute. YAGNI vs a precompute table.
6. **Card set — own ∪ peer top topics.** Phase A sourced cards from own momentum only,
   so `ownRecent > 0` always → `NO ANGLE` could never fire. Broaden the set so peer-led
   topics (own coverage = 0) appear. A `lib/db.ts` query change, no new surface.

## Architecture & data flow

```
tenants.config.peers = [{domain, name, tier}]            ← the peer set (vendor-neutral)
        │
        ├── REAL tenant: peers configured by the outlet; peer corpus = the tenant's OWN
        │     GDELT-broad inflow already in `signals`, grouped by raw_payload.domain ∈ peers
        │
        └── DEMO tenant: peers + coded corpus SEEDED from news-intel
              entities(30)        → tenants.config.peers
              coded_articles(159) → signals(demo, raw_payload.domain=entity,
                                            enrichment.framing={frame,frame_group,topic,confidence})

PER TOP TOPIC (entity), request-time in lib/:
   ownRecent   = own mentions this window        (TopicTrend.recent — already have)
   peerRecent  = peer-domain mentions this window (new: entity-count over peer signals)
   peerCount   = # distinct peers covering it
   peerMedian  = median of per-peer mention counts on the topic
   momentum, trajectory = lib/trends.ts topicMomentum, computed over own∪peer
                          occurrences so peer-only topics (ownRecent=0) also score
   ownCE, peerCE = combative:explanatory ratio (tally enrichment.framing.frame_group)
   nOwn, nPeer = framing sample sizes → confidence/amber
        │
        ▼
   derivePosition(...) → tag + confidence + framingNuance      (pure)
   implicationFor(...) → templated, fact-slotted line          (pure)
        │
        ▼
   trends/page.tsx — replaces the "baseline pending" span on each card
```

**Vendor-neutral guarantee:** real tenants never touch news-intel. The peer set comes
from their own config; the corpus from their own inflow. The news-intel seed lands
**only** on the demo tenant (same pattern as the existing Hindu `infra/seeds/demo_sources.sql`).
A real tenant with no `config.peers` falls back to the neutral state (no crash, no fake).

**Honest-data:** the seed maps news-intel `frame`/`frame_group` → the platform PEJ
vocabulary (snake_case → the Title-Case `FRAME_GROUPS` keys); C:E is computed from
frame groups, never from the (empty) `benchmark_scores` table.

## Tag-derivation logic

Decided top-down per topic. Thresholds anchored to existing bands
(`lib/trends.ts` `momentumLabel` / `predictTrajectory`) — not arbitrary.

- **PEAKED trajectory set** = `predictTrajectory` ∈ {`near peak — may plateau`,
  `at peak — watch for plateau`, `fading fast — post-peak`, `cooling — interest declining`}.
- **RISING** = the complement among live topics (`still building — peak not yet reached`,
  `momentum holding steady`).
- **peerMedian** = median of per-peer mention counts on the topic in the window.

| Order | Condition | Tag | Implication (templated, fact-slotted) |
|---|---|---|---|
| 1 | `ownRecent == 0` & `peerCount ≥ 2` | **NO ANGLE** | "Peer-led ({peerCount} outlets). No angle from you yet." + framing: "Explanatory angle open." (when peers combative-heavy) |
| 2 | `ownRecent > 0` & trajectory ∈ PEAKED | **PEAK** | "Past peak — your angle's live." |
| 3 | `ownRecent > 0`, RISING, `ownRecent < peerMedian` | **BEHIND** | "Surging +{momentum}%{ since {event}}. {brief ready}" |
| 4 | `ownRecent > 0`, RISING, `ownRecent ≥ peerMedian` | **ON IT** | framing-driven: peers combative + you thin → "Explanatory window still open." else "On it — keeping pace." |

**Framing enrichment (the C:E corpus earning its keep):** the combative:explanatory
gap selects the implication *nuance*, never the tag. The "explanatory window open"
insight = peers framing a topic combatively while the tenant's explanatory coverage is
thin → a real editorial opening.

**Honest-data confidence (redesign spec §3):** `nPeer` = peer coded-article count on
the topic.
- `≥ 30` → full confidence.
- `5–29` → **amber** low-confidence tag (`.ds-amber`).
- `< 5` → coverage-only tag; **no framing nuance asserted** (never fabricate).

**Optional slots — omitted when unknown, never faked:**
- `{event}` — slotted only if a clear co-occurring driver exists (a high-signal
  co-occurring entity/headline heuristic); else the clause is dropped (no invented
  "since the HC stay"). Ships without `{event}` if the heuristic proves unreliable.
- `{brief ready}` — slotted only if a `calendar_event` / `story_lead` matches the topic
  for this tenant; else dropped. Ground-up: surfaces the actionable next step.

## Components & files

| File | Change |
|---|---|
| `apps/web/lib/framing-position.ts` | **NEW** — pure derivation: `derivePosition(inputs) → {tag, confidence, framingNuance}` + `implicationFor(position, slots) → string`. No DB; deterministic; unit-tested. No Python twin (worker doesn't need it). |
| `apps/web/lib/db.ts` | **EDIT** — `tenantPeers()` (reads `config.peers`, mirrors `tenantOutletDomain`); broaden the trending set to **own ∪ peer**; `topicPeerStandings()` → `{peerRecent, peerCount, peerMedian, ownCE, peerCE, nOwn, nPeer}` per topic. |
| `apps/web/app/[locale]/trends/page.tsx` | **EDIT** — replace the `baseline pending` span (~:221) with the tag chip (`.ds-tag-*`, already in CSS) + the implication line + amber styling when confidence is low. Card shell + momentum bar unchanged. |
| `infra/seeds/import_newsintel_peers.py` | **NEW** — demo-tenant seed: `entities` → `config.peers`; `coded_articles` → `signals.enrichment.framing` (snake_case → PEJ Title-Case map); reads the SQLite read-only; idempotent; demo-tenant-only. |
| migration | **NONE** — peers live in `config` jsonb; the corpus lives in existing `signals`. Minimum code. |

**Unit boundaries:** `framing-position.ts` is pure (inputs → tag/string) and knows
nothing of the DB or React — testable in isolation. `db.ts` owns all SQL + the
`config.peers` read. `page.tsx` only composes (own `TopicTrend` + standings → inputs →
position → chip/line) — no logic of its own.

## Testing & success criteria

Define success; loop until verified.

- **Pure module (`framing-position.ts`):** golden-case table covering every ladder
  branch + the confidence boundaries (`nPeer` = 4 / 5 / 29 / 30) + omitted-slot cases.
  Use the runtime's built-in `node:test` (no new framework). *Planning verifies a runner
  is wired; if not, add a minimal one for this module only.*
- **Queries + UI:** `type-check` + `build` + **live verify on the demo tenant** — all
  four tags render with real numbers, amber shows on low-n topics, no fabricated events.
  (No web unit harness; the handoff's build-green gate.)
- **Seed:** idempotent re-run (no duplicate rows); 30 peers + 159 coded signals present;
  frame-vocab map spot-check.
- **Vendor-neutral gate:** grep finds no hardcoded `thehindu` / `news-intel` in source;
  a real `self` tenant with no `config.peers` renders the **neutral fallback** (no
  crash, no fake tag).
- **Success criteria (done-line):** on the demo tenant `/trends`, every "baseline
  pending" is replaced; `NO ANGLE` / `BEHIND` / `ON IT` / `PEAK` all appear across the
  card set with real momentum + peer numbers; low-n topics are amber; implications carry
  real values only. Real `self` tenant degrades gracefully. `type-check` + `build` green.

## Out of scope (Phase B)

- The framing-landscape "fingerprint" panel (the deck stays copy).
- The by-place / geo local-angle dimension.
- LLM-generated implications.
- A worker-precompute table or any migration.
- Real-tenant peer auto-discovery / scaled competitive ingest (peers come from config;
  widening real-tenant peer coverage is a later, separate concern).

## Open items (resolve during planning)

- Confirm a web test runner for the `node:test` golden cases; else add a minimal one.
- Enumerate the full news-intel → PEJ frame-name map while building the seed (mechanical;
  both vocabularies are known and finite).
- Decide the `{event}` driver heuristic; ship without it if unreliable (honest-data).

## References

- Redesign spec: `docs/superpowers/specs/2026-06-18-onlinejourno-redesign-design.md`
  (§2 "where you stand", §3 honest-data, §58–64 data dependencies).
- Coder: `packages/agents-py/src/onlinejourno_agents/framing.py` (`FRAME_GROUPS`,
  `run_framing`), `frame_eval.py`; goldset `docs/reports/framing-india-2026/dataset.json`.
- Trends: `apps/web/lib/trends.ts` (`topicMomentum`, `predictTrajectory`,
  `momentumLabel`); card surface `apps/web/app/[locale]/trends/page.tsx`.
- Tenant config helper: `apps/web/lib/db.ts` `tenantOutletDomain` (the `config->>` read
  pattern to mirror for `tenantPeers`).
- Peer corpus source: `~/projects/news-intel/data/news_intel.db` (`entities`,
  `coded_articles`). Demo pattern: `infra/seeds/demo_sources.sql`.
- ADR 0046 (canonical data model; the competitive layer fold-in), ADR 0061 (charting).
- Tracker: #107 (Trends parity). Supersedes nothing; extends Phase A.
