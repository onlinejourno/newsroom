# Demo Tenant Spec — Fictional Newsroom

**Status:** Drafted Wk 0 of Xtnd; expanded at Wk 90 (public-flip prep, per ADR 0010).

## Purpose

The Xtnd v0.1 public demo at `xtnd.onlinejourno.com` shows the full backbone scope through a single fictional tenant. The demo is read-only for visitors; the role switcher (`?as=desk` URL parameter) changes the lens but not the data.

The fictional tenant is what visitors see when they arrive at the demo. Its data is hand-curated to demonstrate every role surface, every wired module, every backbone capability that Xtnd v0.1 ships.

## Hard rules

1. **No real publisher names.** Never "The Hindu," "Business Standard," "TOI," "Hindustan Times," "Indian Express," or any other real Indian or international outlet.
2. **No real journalist names.** Even with friend / colleague consent, real names trigger ambiguity about whether the demo is endorsed by them. Fictional only.
3. **No real source URLs in signals.** The fictional newsroom monitors fictional regulators ("DSE — Demoland Securities Exchange," "DAFR — Demo Authority for Financial Regulation"). URLs resolve to a stub page on `demo.onlinejourno.xyz` clearly marked "demo only."
4. **No personal data of any kind.** All journalist accounts use `*@demo.onlinejourno.xyz` email addresses pointing to a single dev catch-all mailbox.
5. **No live API calls from the demo.** Demo runs against frozen seed data; no real Anthropic spend; no real CMS adapter calls; no real social or analytics integration. (Background: live data on a public demo = unbounded cost + privacy risks.)
6. **Demo data is checked into the Xtnd repo** at `infra/seed/demo/`. Visible, auditable, reproducible.

## Fictional newsroom — "Demo Daily"

Identity:

- **Name:** Demo Daily
- **Tenant slug:** `demo-daily`
- **Tier:** `tier_2` (30-100 journalists, matches platform Y1 target)
- **Region:** `IN` (multilingual-ready per platform ADRs 0018-0020)
- **Primary locale:** `en-IN`
- **Supported locales:** `en-IN, hi-IN`
- **Founded (fictional):** 2018, "Demoland." Tagline (fictional): "Where every story gets seen."
- **Operating model:** Digital-first, English + Hindi. 45 journalists. 8 desks. Subscription + advertising mix.

Visual identity: uses the same OnlineJourno design tokens (per platform ADR 0013) so the demo doesn't introduce a second visual system.

## Beats

| Slug | Name | Locale | Reporters |
|------|------|--------|-----------|
| `markets` | Markets & Regulatory | en-IN | priya-shah, arjun-mehta (fictional) |
| `policy` | Policy & Governance | en-IN | tara-gupta (fictional) |
| `tech` | Technology | en-IN | varun-kumar (fictional), priya-shah (cross-beat) |

3 beats. Sufficient to demonstrate beat-assignment + cross-beat. Not so many that the demo becomes overwhelming.

## Reporters (fictional)

| User slug | Display name | Role | Beat focus |
|-----------|--------------|------|------------|
| `priya-shah` | Priya Shah | `journalist` | markets, tech (cross-beat) |
| `arjun-mehta` | Arjun Mehta | `journalist` | markets |
| `tara-gupta` | Tara Gupta | `journalist` | policy |
| `varun-kumar` | Varun Kumar | `journalist` | tech |
| `nila-iyer` | Nila Iyer | `editor` | markets, policy (beat editor) |
| `ravi-singh` | Ravi Singh | `digital_desk` | newsroom-wide |
| `meera-das` | Meera Das | `section_editor` | tech section |
| `kabir-khan` | Kabir Khan | `social_team` | newsroom-wide |
| `anjali-rao` | Anjali Rao | `video_team` | newsroom-wide |
| `gopal-pillai` | Gopal Pillai | `dataviz_team` | newsroom-wide |
| `lakshmi-nair` | Lakshmi Nair | `newsroom_hierarchy` | publisher |
| `admin-demo` | Demo Admin | `admin` | system administration |

12 users. Demonstrates the full role surface. All emails `<slug>@demo.onlinejourno.xyz`.

Names are deliberately diverse across Indian regional naming conventions; gender balance roughly even. No real-person resemblance intended.

## Sources

Fictional regulators + ministries, plus a few fictional newswire feeds. Each source has a stub URL on `demo.onlinejourno.xyz/source/<slug>` that explains it's a demo source.

| Slug | Name | Kind | Beat tags | Locale |
|------|------|------|-----------|--------|
| `dafr-press` | Demo Authority for Financial Regulation — Press | rss | markets, regulatory | en |
| `dse-corp` | Demoland Securities Exchange — Corporate Announcements | rss | markets | en |
| `dse-circ` | Demoland Securities Exchange — Circulars | rss | markets, regulatory | en |
| `dwc-press` | Demoland Wealth Commission — Press | rss | markets, regulatory | en |
| `dcc-orders` | Demoland Competition Commission — Orders | rss | markets, regulatory | en |
| `dpib-finance` | Demo PIB — Ministry of Finance | rss | policy | en |
| `dpib-commerce` | Demo PIB — Ministry of Commerce | rss | policy | en |
| `dgov-cbdt` | Demo Government — CBDT | rss | policy | en |
| `dgov-meity` | Demo Government — MeITY | rss | policy, tech | en |
| `dtech-newswire` | Demoland Tech Wire | rss | tech | en |
| ... (20 sources total) | | | | |

Full source list in `infra/seed/demo/sources.yaml`.

## Signals

50 signals across the 3 beats, distributed:

- Markets: 24 signals across 7 days. Mix of corporate announcements, regulatory circulars, exchange filings.
- Policy: 14 signals across 7 days. Mix of ministry press releases, government notifications.
- Tech: 12 signals across 7 days. Mix of newswire pieces, tech-policy notifications.

Each signal has:

- Fictional headline.
- Fictional body text (1-3 paragraphs).
- Source slug + fictional published date in last 7 days.
- Realistic entities extracted (fictional company names: "Pixel Industries," "Saffron Capital Markets," "Brahmaputra Energy").
- 6 signals marked `off_record = true` for off-record-flag demo (per platform ADR 0029).

## Threads (story families)

5 threads, each with a canonical narrative populated:

1. **`pixel-acquisition-saga`** — Pixel Industries' planned acquisition of a regional competitor; 6 linked signals; canonical narrative documents the deal timeline, key questions (regulatory approval, anti-trust concerns), reliability assessments per source.
2. **`crypto-circular-2026`** — DAFR's draft circular on crypto-asset disclosure; 4 linked signals; canonical narrative documents the proposed rule, industry response, key questions.
3. **`saffron-promoter-pledge`** — Saffron Capital Markets' promoter pledge ratio under scrutiny; 7 linked signals; canonical narrative documents the company's response, regulator's view, key questions about disclosure timing.
4. **`meity-data-localisation`** — MeITY's data-localisation policy update; 5 linked signals; canonical narrative documents the policy text, industry feedback, key questions about implementation.
5. **`brahmaputra-energy-ipo`** — Brahmaputra Energy's IPO journey; 5 linked signals; canonical narrative documents the IPO timeline, key questions about disclosures.

Each thread's canonical narrative demonstrates the `m-narrative-spine` exemplar module:

- `core_facts[]`: 3-5 immutable facts approved by the beat editor.
- `key_questions[]`: 2-4 evolving questions.
- `narrative_arc[]`: 3-5 timeline entries.
- `related_stories[]`: links to other threads if cross-cutting.
- `reliability_notes[]`: 1-3 source-level reliability observations.

Full thread data in `infra/seed/demo/threads.yaml`.

## Briefs

10 briefs across 5 working days (2 beats × 5 days, with `tara-gupta` and `varun-kumar` getting alternating policy/tech briefs).

Each brief:

- Composed from shortlist (per platform two-agent architecture).
- Has structured `content` JSONB with sections.
- Has `ai_disclosure` JSONB populated (per platform ADR 0029).
- Has `delivery_status = 'delivered'`.
- 3 briefs are marked `human_edited = true` with `human_editor_id` set to `nila-iyer`.

## Distribution-fit scores

30 distribution-fit scores across the 10 briefs × 3 surfaces (Discover, Search, Subscription):

- Each score has `model_version`, `signals` JSONB with reasons.
- Demonstrates the `m-distribution-fit` exemplar module.
- Mix of scores: some strong-fit (>0.8), some weak-fit (<0.4), some mid (0.4-0.7).

## Commissions

8 commissions across the 5 days:

- 3 to `dataviz_team` (chart on pledge-ratio history; explainer on data localisation; visualisation of crypto-asset class types).
- 2 to `video_team` (talking-head with policy reporter; explainer video on IPO process).
- 2 to `social_team` (X thread on regulatory crackdown; LinkedIn post on tech-policy).
- 1 to `audio_team` (podcast episode on markets weekly).
- Mix of `status`: `pending`, `accepted`, `delivered`, one `declined` (to show declined-state UI).

## Post-publish diagnoses

15 post-publish diagnoses (one per published story):

- Mix of surfaces analysed (Discover, Search, Direct, Social, Subscription).
- Each diagnosis JSONB demonstrates the surface verdict + why + suggested fix.
- 5 show "strong performance"; 5 show "mixed"; 5 show "underperformed" with specific reasons (e.g., "Discover impressions 0 — image aspect ratio wrong").

## Fair-chance audit

1 fair-chance audit for the demo week:

- `audit_level: week`.
- Findings JSONB shows systemic patterns at desk-shift / week aggregation; no individual editor attribution (per ADR 0034 default).
- Sample findings: "Women-bylined stories under-placed on homepage by 12% relative to predicted CTR"; "Tech beat under-represented on Discover."

## Off-record signal log

6 entries in `signal_off_record_log` (per platform ADR 0029):

- 4 `marked` actions, 2 `unmarked` actions.
- Demonstrates the audit trail UI.

## Governance log (`narrative_decisions`)

10+ entries in `narrative_decisions` (per `m-narrative-spine` exemplar):

- Mix of `action`: `edit_canonical`, `approve_divergence`, `dismiss_continuity`, `link_signal`.
- Demonstrates auditable governance trail.

## Demo data security review (Wk 90, per ADR 0010)

Before public flip, reviewer (founder + 1 trusted reader) checks:

- [ ] No real publisher name anywhere in seed YAML or seed migrations.
- [ ] No real journalist name anywhere in seed YAML or seed migrations.
- [ ] No real source URL pointing outside `demo.onlinejourno.xyz`.
- [ ] No real person's photo in `apps/web/public/brand/demo/`.
- [ ] No real organisation's logo or copyrighted asset.
- [ ] Fictional name collisions with real people checked (Google search each fictional name; if a real person of that name exists in the relevant industry, change).
- [ ] Demo URLs return clearly-marked demo stub pages, not 404s or errant content.
- [ ] Cost simulation: demo run with frozen seed shows zero live API calls (no Anthropic spend).
- [ ] Demo tenant's `tenants.config` has no real customer config leaking from design-partner tenant.

## Implementation

Seed data lives at `infra/seed/demo/`:

```
infra/seed/demo/
├── tenant.yaml                  # Demo Daily definition
├── users.yaml                   # 12 fictional users
├── beats.yaml                   # 3 beats
├── sources.yaml                 # 20 fictional sources
├── signals.yaml                 # 50 signals
├── threads.yaml                 # 5 threads + canonical narratives
├── briefs.yaml                  # 10 briefs + AI disclosure
├── distribution_fit_scores.yaml # 30 scores
├── commissions.yaml             # 8 commissions
├── post_publish_diagnoses.yaml  # 15 diagnoses
├── fair_chance_audit.yaml       # 1 weekly audit
├── narrative_decisions.yaml     # 10+ decisions
├── signal_off_record_log.yaml   # 6 entries
└── seed.py                      # Python script that loads YAML into Postgres
```

A `pnpm run demo:seed` command runs `seed.py` against the configured Postgres (local dev or demo Fly.io instance).

## Refresh cadence

Demo data is refreshed at every Xtnd release (quarterly per platform ADR 0026). The "current week" of signals slides forward; canonical narratives evolve to show realistic narrative-arc progression.

Refresh happens during release prep, not weekly. (Frequent refresh = ongoing labour; quarterly aligns with founder cadence.)

## What this spec is not

- Not real customer data.
- Not real source data.
- Not a recipe for a customer to copy. The demo tenant is for demo only; real customers configure their own.
- Not a complete eval set. Eval goldsets live separately under `packages/modules/x-*/eval/goldset/demo.csv`.
