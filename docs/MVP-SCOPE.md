# MVP Scope

Locked Wed Jun 3, 2026.

This document defines the smallest deployable version of the OnlineJourno platform that delivers visible editorial value to a single newsroom desk. Anything outside this scope is deferred regardless of how attractive it sounds.

## Wedge: markets & regulatory desk

The MVP serves one beat at one newsroom. The beat is **markets and regulatory** — chosen because:

- Source space is RSS-dense (RBI, SEBI, NSE, BSE, MCA, IBBI, CCI, IRDAI, exchange filings, ministry press releases). High coverage, low scraping risk.
- "Did I miss a filing?" is a visceral editorial pain. Easy to demonstrate value.
- Output is concrete and quickly verifiable by an editor familiar with the beat.
- Indian-English newsroom alignment with the founder's first design-partner network.

Expansion to other beats happens after the MVP shortlist is trusted by one editor for at least 14 consecutive working days.

## Single design partner

The MVP runs for **one newsroom** in production through Y1. Selection criteria in `docs/DESIGN-PARTNER-SHORTLIST.md`.

- Free pilot for the first 8 weeks (Wk 8 → Wk 16).
- Paid conversion conversation at Wk 12 (around the time the editor has used the brief for 14 days).
- A second design partner is pursued only after the first converts to paid and remains stable for ≥4 weeks. Concurrent design partners doubles support load without doubling product progress; solo-founder capacity is the hard limit.
- Shortlist holds three candidates as insurance against rejection or champion exit — not as a multi-customer plan.

## Layered launch (community surface ships alongside, not instead of)

The MVP also ships two community-facing surfaces in sequence, governed by ADR 0027. These are supplementary to the design partner pilot — not substitutes.

| Surface | When | What it yields | Cost (Y1) |
|---------|------|----------------|-----------|
| Design partner editor pilot | Wk 8 | Editorial fit, willingness-to-pay, case study | ~₹500–1,500/mo |
| Public code repository (`github.com/onlinejourno/platform`) | Wk 10–12 | Code review, contributor pipeline, OSS positioning | ~₹0 |
| Static community playground (`try.onlinejourno.com`) | Wk 12–16 | Marketing surface, product polish feedback | ~₹0–300/mo |

The editorial signal — whether the shortlist matches a working editor's morning triage — comes only from the design partner. OSS community engagement, however valuable, does not substitute. Sequencing is locked in ADR 0027; full plans in `docs/PLAYGROUND-PLAN.md` and `docs/COMMUNITY-LAUNCH-PLAN.md`.

## Source list (target: 20–30 sources)

### Regulators (high priority)

| Source | Type | Notes |
|--------|------|-------|
| Reserve Bank of India (RBI) — press releases | RSS | https://www.rbi.org.in |
| Securities and Exchange Board of India (SEBI) — circulars & press | RSS | https://www.sebi.gov.in |
| National Stock Exchange (NSE) — corporate announcements | RSS / API | https://www.nseindia.com |
| Bombay Stock Exchange (BSE) — corporate filings | RSS / API | https://www.bseindia.com |
| Ministry of Corporate Affairs (MCA) — circulars | scrape | https://www.mca.gov.in |
| Insolvency & Bankruptcy Board (IBBI) | RSS | https://www.ibbi.gov.in |
| Competition Commission of India (CCI) — orders | RSS | https://www.cci.gov.in |
| Insurance Regulatory and Development Authority (IRDAI) | RSS | https://www.irdai.gov.in |
| Pension Fund Regulatory Authority (PFRDA) | RSS | https://www.pfrda.org.in |

### Government economic ministries (medium priority)

| Source | Type | Notes |
|--------|------|-------|
| Press Information Bureau — Ministry of Finance | RSS | https://pib.gov.in |
| Ministry of Commerce and Industry | RSS | |
| Department of Economic Affairs | scrape | |
| Department of Revenue (CBDT, CBIC) | scrape | |
| Department for Promotion of Industry and Internal Trade (DPIIT) | scrape | |

### Markets adjacent

| Source | Type | Notes |
|--------|------|-------|
| Forward Markets Commission archives + SEBI commodities | RSS | |
| Multi Commodity Exchange (MCX) | scrape | |
| Securities Appellate Tribunal (SAT) orders | scrape | |
| National Company Law Tribunal (NCLT) orders | scrape | |

### Newswire (low priority Y1, useful for cross-reference)

| Source | Type | Notes |
|--------|------|-------|
| Press Trust of India (PTI) — markets vertical | RSS | Optional licensing |
| Reuters India — business feed | RSS | Optional licensing |
| Bloomberg India | RSS | Optional licensing |

Total active sources at MVP launch: **25 sources** (the regulator + ministry rows above). Newswire rows enabled only if the design partner already subscribes.

## Two-agent architecture

The MVP runs two agents, plus a pipeline pre-filter. No more.

### Pre-filter (deterministic, not an agent)

- URL-hash dedup.
- Simhash near-dup against last 30 days of signals.
- Language detection (ADR 0018) — store language on signal.
- Cheap entity extraction (regex / lookup against catalogues for SEBI, RBI, listed-company tickers).

### Agent 1 — `ingest-score`

- One Sonnet call per surviving signal.
- Reads editorial DNA prompt (newsroom-specific) + the signal text.
- Returns: relevance score (0–1), reasons, beat tag (markets / regulatory / corp).
- Max 2 tool calls; never Opus.
- Cost target: <₹0.50 per signal.

### Agent 2 — `brief-compose`

- Runs once per beat per morning (06:30 IST).
- Reads shortlist (top-N by `ingest-score`), editorial DNA, house style guide (if uploaded), beat-specific journalist preferences.
- Composes the daily brief in the beat locale (English for MVP design partner).
- Outputs structured JSON: { sections: [{ heading, body, signals: [id…], lede_one_liner }] }.
- Sonnet, max 5 tool calls.
- Cost target: <₹5 per brief.

### Trust primitives shipped in MVP (ADR 0029)

Two cheap, identity-aligned trust primitives ship as first-class brief features:

- **AI-use disclosure on every brief.** Each `briefs` row carries a structured `ai_disclosure` JSONB recording which models composed it, which agents ran, whether a human editor reviewed before delivery, and a human-readable disclosure string. Disclosure is surfaced in the brief viewer; readers see the same disclosure when a brief is shared.
- **Off-record signal flag.** A journalist can mark a signal off-record from the brief viewer or signal-detail view. Off-record signals are excluded from shortlist composition and brief composition, visible only to the marker and the beat's editor, and never leave the tenant boundary. The flag is reversible; the action history lives in `signal_off_record_log` for accountability.

These primitives are MVP-essential because they materially shape the editorial trust ladder. They are cheap (≈4 hours of schema + brief-composer filter + UI toggle) and they precede every other product conversation about responsible journalism.

### What is NOT in the MVP

- Story-thread tracking agent.
- Editorial DNA learning loop (capture data only, no live learning).
- Archive ingest.
- Drafting assistance.
- Reader-facing personalisation.
- Mobile app.
- Multi-language brief composition (English only).
- Plugin marketplace.
- Billing.

## Modules enabled at MVP launch

| Module | Status | Notes |
|--------|--------|-------|
| `m-source-intel` | enabled | Core ingest + score + shortlist + brief |
| `m-portal-health` | enabled | Editorial alert if source silent 24h+ (ADR 0014) |
| `m-framing-pej` | disabled by default | Available; design partner may opt in mid-pilot |
| `m-discover-seo` | disabled by default | Available; opt-in only |
| `m-platform-dep` | disabled by default | Available; opt-in only |
| `m-ai-visibility` | disabled by default | Available; opt-in only |
| `m-recirculation` | disabled by default | Available; opt-in only |

## Onboarding flow (45-minute setup)

The design partner completes onboarding in under 45 minutes:

1. Newsroom name, contact, language (`primary_locale = en-IN`).
2. Beat definition — markets / regulatory + journalist assignments.
3. Source selection — 25 default sources pre-loaded; admin removes any they do not want.
4. Editorial DNA capture — 8-question interview that produces the shortlist prompt:
   - What do you cover that competitors miss?
   - What gets rejected even if it seems newsworthy?
   - Who is the typical reader of this beat?
   - What tone (analytical / breaking / interpretive)?
   - Examples of three recent published stories — paste links.
   - Examples of three stories you killed — paste reasons.
   - Style guide upload (PDF / DOCX, optional).
   - Brief schedule — default 06:30 IST.
5. Test brief generation against yesterday's signals — editor reviews and approves.

## Success criteria — Wk 8 → Wk 16

The MVP is judged successful when, at Wk 16 (about 8 weeks after design partner onboarding):

1. The editor has used the brief on at least 14 consecutive working days.
2. The editor reports the shortlist matches their morning triage at least 70% of the time (concretely: ≤30% reject rate on shortlisted items).
3. At least one published story in the design partner's newsroom credibly traces to the brief.
4. Anthropic API cost per newsroom averages under ₹150 per day at MVP volume.
5. Reasoning trace viewer is used by the editor at least once a week.
6. The design partner is willing to discuss a paid conversion (specific number to be set by Wk 12 conversation).

## Eval set Day 1

To compare future prompt changes against a fixed bar:

- 200 historical signals from the design partner's beat covering 14 days of past output.
- Editor hand-labels each as "would shortlist" / "would skip" / "edge case."
- `packages/spine/eval/goldset/<design-partner-slug>.csv` stores the labels.
- Replay harness re-runs current `ingest-score` against the goldset whenever the prompt changes. Ships in same PR as prompt change.

This eval set is the moat: it is the editor's judgement crystallised into a machine-checkable file.

## Free-or-paid pilot framing

The design partner pilots for **free** from Wk 8 to Wk 16. The conversation about paid conversion happens at Wk 12, after the editor has had the brief for four weeks.

The reason for "free pilot, paid conversation at Wk 12" rather than "paid from Day 1":

- The Indian newsroom sales cycle is slow. Asking for ₹50K+ before the value is proven destroys conversion likelihood.
- Free pilot creates obligation to use the brief seriously, which is what the founder needs (real feedback, not lip service).
- By Wk 12, the editor's behaviour with the brief is itself evidence; the conversion conversation has data.

If the design partner cannot commit to 8 weeks of daily use, walk away. Half-hearted pilots are worse than no pilot.

## Multilingual posture (Y1)

The MVP serves an English-speaking design partner on an English beat. Multilingual support is **architecturally ready** but not **shipped**:

- Schema has `tenants.primary_locale`, `users.locale`, `briefs.locale`, `beats.locale`, `sources.expected_languages`, `signals.language`.
- Embeddings use a multilingual model from Day 1 (text-embedding-3-small or similar).
- UI is English-only Y1.
- Brief composition is English-only Y1.
- First non-English brief language ships only after Per-Language Eval Gate (ADR 0020) clears. Earliest Wk 16+ for Hindi.

## Hosting + cost ceiling

- Local development through Wk 8. Zero cloud spend during build.
- Wk 8–12 (design partner pilot live): Fly.io BOM, ~₹250–700/month.
- Hard daily Anthropic spend cap per newsroom: ₹150/day until Wk 16. Raise only after paid conversion.

## Out of scope statement (verbatim)

The following are explicitly out of scope for MVP and any request to add them is declined with reference to this document:

> Story-thread agent. Editorial DNA live learning loop. Archive ingest. Generative drafting. Reader personalisation. Mobile apps. Multilingual brief composition. Plugin SDK. Plugin marketplace. Billing. Multi-beat support beyond markets/regulatory. Multi-newsroom syndication. CMS integration. Social posting. Video brief output. Voice brief output. Audit reporting beyond reasoning trace. SSO / enterprise auth. Region-locked data residency adapters (other than India default).

These are correct things to want — and they will come — but not in the MVP.
