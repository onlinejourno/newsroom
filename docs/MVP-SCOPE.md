# MVP Scope (Stub)

To be locked Thu Jun 4.

## Working hypothesis

- **One beat:** markets and regulatory (RBI, SEBI, NSE, BSE, MCA, IBBI, CCI).
- **One design partner:** TBD by Fri Jun 5.
- **One output:** the 06:30 IST daily editorial brief for the markets/regulatory desk.
- **Two agents:** `ingest-score` (pipeline-ish, one Sonnet call per item) + `brief-compose` (true agent, multi-step).
- **Three modules enabled at MVP:** `m-source-intel`, `m-framing-pej` (optional, off by default), `m-discover-seo` (optional, off by default).
- **One newsroom in the database:** design partner #1.

## Success criteria (Wk 8 Friday)

1. Design partner's markets/regulatory desk has used the brief for 14 consecutive working days.
2. Editor reports the brief reflects how they would have shortlisted (qualitative).
3. Reject rate stabilises below 30% by Wk 8 (i.e., 70%+ of shortlisted items are kept).
4. Daily Anthropic cost per newsroom < $5.
5. Reasoning trace viewer is functional and editor uses it at least once a week.

## What's explicitly out of MVP

- Drafting / writing assistance.
- Archive search and ingest.
- Thread tracking as an agent (capture data only, no live thread UI).
- SEO / Discover modules (code present, but disabled).
- Personalisation per reader.
- Mobile app.
- Multi-language UI.
- Billing.

## To be filled Thu Jun 4

- Source list (20–30 sources, with RSS / scrape strategy per source).
- Newsroom DNA capture form (initial onboarding questionnaire that produces editorial DNA prompt).
- Brief format spec (length, sections, tone, delivery channel).
- Rookie vs senior mode toggles for MVP.
- Concrete eval set sources (some from news-intel `goldset.csv`, some new).
