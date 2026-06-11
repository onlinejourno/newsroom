# Adoption Playbook — running OnlineJourno in your newsroom

*Platform-shaped from the News Publisher AI-Era Strategy Framework (ADR
0054-E). Any newsroom, any country, any size: this is the path from
`git clone` to a working editorial-intelligence loop.*

## Before you start: three questions (answer in writing)

1. **What is your competitive advantage?** Trust, speed, depth, or a niche
   audience — it decides what you optimise. A subscription masthead runs
   Quality & Authority (watch the Differentiation Ratio); an ad-funded one
   watches reach (Potential, Trends).
2. **What sources does your newsroom actually depend on, day to day?** You
   cannot automate what you have not mapped.
3. **What is breaking right now?** Source monitoring → start at Phase 1.
   Post-publish reach → start at Phase 2.

## Phase 0 — Stand it up (a day)

```bash
git clone <your-fork> && cd platform
cp .env.local.example .env       # DATABASE_URL, one LLM provider key
psql "$DATABASE_URL" -f infra/migrations/<each in order>
uv sync && pnpm install
pnpm --dir apps/web dev          # the web app
```

Set your newsroom's shape in config — none of this is hardcoded:
- **Beats** (`ENRICH_BEATS`, prompts.py) — your section taxonomy.
- **Locales** (`tenants.primary_locale`, `apps/web/lib/locale.ts`) — UI and
  output language (summaries come back in your language, ADR 0051).
- **Surfaces** (admin → Surfaces, ADR 0043) — which distribution surfaces
  matter to you, including the AI surfaces.
- **Journalists** (directory) — names, beats, regions: this drives routing.
- **Daily LLM cap** (`tenants.daily_cap_usd`) — your spend guard.

## Phase 1 — Source intelligence (weeks 1–2)

Map your sources the framework's way, then register them:

- **Tier 1** (RSS/feeds, low effort): your central bank, government press
  bureau, regulators. → admin → Sources, `kind=rss`, enabled.
- **Tier 2** (scraping/API): ministry databases, state portals. → register
  with `kind=scrape|api`, **disabled** until the adapter lands — the map is
  visible, nothing is pretended (ADR 0050).
- **Tier 3** (specialist): exchanges, courts, federations.
- Mark wire/MSM feeds you use only for testing as `family=msm_test`.

Run the loop once by hand, then let cron own it:

```bash
uv run onlinejourno-ingest collect --tenant <slug>
uv run onlinejourno-agents enrich --tenant <slug>     # Analyse + Classify
uv run onlinejourno-agents frame  --tenant <slug>     # PEJ framing
uv run onlinejourno-agents trends --tenant <slug>
uv run onlinejourno-agents alert  --tenant <slug> --dry-run
crontab -e   # */30 * * * * <repo>/infra/cron/pipeline.sh
```

Check `/coverage` (the Gap Matrix): every beat should reach 🟡 within days
and 🟢 as primary sources come online. Alerts: subscribe the ntfy app to a
private topic, set `NTFY_TOPIC` in `.env`.

**Measure:** reporter-hours redeployed from feed-watching — not articles
produced.

## Phase 2 — The published story's fair chance (weeks 3–4)

Connect the CMS read-only (ADR 0036): WordPress, Ghost, Drupal adapters
exist (`cms-pull`); your own articles become `stories`.

```bash
uv run onlinejourno-agents cms-pull --tenant <slug> --provider wordpress --url <site>
uv run onlinejourno-agents score-stories --tenant <slug>     # surface audit
uv run onlinejourno-agents enrich --tenant <slug> --stories  # classify own work
uv run onlinejourno-agents frame  --tenant <slug> --stories
```

Now `/scores` shows every story's per-surface audit plus the
**Differentiation Ratio** — how much of your output is conversion/renewal
content vs the commodity layer AI summarises for free. `/gems` finds the
buried pieces aligned with moving topics. `/probity` audits what your pages
do to readers (run the web-bloat-checker service alongside).

**Measure:** fixes applied per week; the Ratio trending up.

## Phase 3 — Make it yours (ongoing)

- **Archive** (m-archive, ADR 0042): plug a digitised archive when you have
  one; the platform never requires it.
- **AI-crawler policy** (ADR 0054-C): decide allow / block / license per
  assistant — a conscious, monitored choice the AI-surface audit checks.
- **Theory knobs**: the User-Needs set (extend past the four), PEJ goldset
  re-evaluation on your own coding, framing balance targets.
- Contribute adapters back (Apache-2.0, ADR 0024) — every newsroom's Tier-2
  scraper helps the next one.

## Operating rules (non-negotiable, ADRs 0029/0035/0054)

- The platform is **draft-assistive, never draft-generative**. No AI text
  publishes as journalism.
- Humans own every editorial decision; the platform recommends and explains.
- Disclose AI assistance where it touches reader-facing work.
- The daily cap is sacred; the loop degrades gracefully, never overspends.

## What "working" looks like (the validation gate)

A reporter on a beat opens her feed in the morning and finds a primary-record
signal she would otherwise have missed, with the potential score telling her
it is worth her day — and after she publishes, the audit tells her the one
fix the story needs for the surface it was built for. If that loop is true
for one real journalist, the platform is working; scale follows.
