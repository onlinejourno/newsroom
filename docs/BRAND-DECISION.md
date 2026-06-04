# Brand Decision

Locked Mon Jun 1, 2026.

## Identity

- **Product name:** OnlineJourno
- **Legal owner:** Subhash Rai (sole proprietorship; entity TBD on first investor / first customer milestone)
- **Primary domain:** `onlinejourno.com`
- **Secondary domains:** `onlinejourno.net`, `onlinejourno.info`, `onlinejourno.xyz`, `onlinejourno.store` (all owned)
- **GitHub org:** `onlinejourno` (existing)
- **Primary repo:** `onlinejourno/platform` (private)

## Domain plan

| Domain | Purpose | Status |
|--------|---------|--------|
| `onlinejourno.com` (root) | Marketing + blog + signup CTA | **Live** Wed Jun 3 2026 — WordPress on Bluehost.in. Registered at GoDaddy; nameservers pointed to `ns1.bluehost.com` / `ns2.bluehost.com`. |
| `www.onlinejourno.com` | Alias of root | Redirect → root (configure in Bluehost). |
| `app.onlinejourno.com` | Product (journalist UX + admin) for design partner | **Reserved**; will point at Fly.io BOM when product deploys (Wk 8+). Add CNAME at Bluehost Zone Editor. |
| `api.onlinejourno.com` | API endpoints | Same Fly.io app as `app.` — same CNAME target. |
| `try.onlinejourno.com` | Static community playground demo (read-only) | **Wk 12–16 launch.** Hosted on Cloudflare Pages or Vercel free tier; weekly manual content refresh by founder. See `docs/PLAYGROUND-PLAN.md`. |
| `docs.onlinejourno.com` | Customer docs | Y1+. Point at docs portal when shipped. |
| `status.onlinejourno.com` | Status page | Y1+. Statuspage / Better Uptime. |
| `dev.onlinejourno.xyz` | Staging + pre-prod | Founder-only. Set up Wk 1–2. |
| `lab.onlinejourno.xyz` | Experiments | Founder-only. As needed. |
| `onlinejourno.xyz` (root) | Reserved for experimental surface | The `.xyz` TLD's experimental connotation makes it the right home for dev / lab. Not customer-facing. |
| `onlinejourno.net` | Redirect → `.com` | Brand protection only. No active use. |
| `onlinejourno.info` | Redirect → `.com` Y1; community wiki / how-it-works docs candidate Y2 | Brand protection Y1; possible information-site reuse Y2. |
| `onlinejourno.store` | Module marketplace / source-bundle store | **Park.** Real plan only after MVP proves. |

## Hosting decisions (locked Wed Jun 3)

| Surface | Where | Why |
|---------|-------|-----|
| Marketing (`onlinejourno.com` root + `www`) | **WordPress on Bluehost.in** | Already paid; WP-tuned shared hosting; non-technical edits possible; SEO-friendly. |
| Product (`app.onlinejourno.com`) | **Fly.io PAYG, Mumbai (BOM) region** | Native Node 20 + Python; Postgres + pgvector co-located; India edge; `flyctl deploy`; pay only for used capacity. |
| Database | **Self-managed Postgres 17 + pgvector in Fly machine Y1**, upgrade to managed Postgres add-on when first paying customer arrives | Self-managed ~$2/mo idle; managed = $15/mo min. Defer until revenue justifies. Local dev also Postgres 17 — pgvector via Homebrew has prebuilt extension for 17 and 18 only; earlier versions need source build. |
| Workers (Python collectors + scorers) | **Separate Fly machine** in same app | Co-located, private network access to Postgres. |
| Object storage | TBD — likely Cloudflare R2 (egress-free) when scrapers cache pages | Defer until needed. |

### Fly.io cost safeguards (set Day 1 of deployment)

- **Account hard spend cap**: ₹2,000/mo (~$24) until first paying customer; raise as MRR grows.
- **Auto-suspend on web machines**: `auto_stop_machines = "suspend"` in `fly.toml`. Idle = pennies; wake on request <250ms.
- **No managed Postgres** until paying customer signed. Self-managed in Fly machine on a small volume.
- **Weekly invoice check** for first month after deployment. Catch surprises early.
- **Bandwidth alert** at 80GB/mo (under 100GB free cap).
- **No prod data during Wk 1-8 MVP build**: local Postgres only on founder's machine. No cloud spend until first design partner pilot.

### Expected cost trajectory

| Stage | Monthly cloud cost |
|-------|---------------------|
| Wk 1-8 (local dev, no deploy) | ₹0 |
| Wk 8-12 (design partner pilot, deployed, low traffic) | ~₹250-700 ($3-8) |
| Wk 12-16 (1 paying customer, live daily brief) | ~₹1,300-2,500 ($15-30) |
| Wk 24 (3-4 customers) | ~₹4,000-7,500 ($50-90) |
| Y2 end (~10 customers) | ~₹10,000-20,000 ($120-250) |

Pay-as-you-go scales linearly with usage. No prepaid capacity tax.

### Why not Bluehost VPS / HostRobust / similar

Self-managed VPS = founder time on Postgres tuning, Node version managing, systemd workers, SSL renewal. Hour spent on sysadmin = hour not building product. Fly.io PAYG at ₹250-2,500/mo Y1 covers exactly that gap. Revisit if MRR > ₹5 lakh and FTE infra hire becomes affordable.

## Brand relationship to sister property

- `onlinejournalism.in` = Subhash Rai's existing journalism publication. Stays distinct.
- OnlineJourno (product) and OnlineJournalism.in (publication) live under the same umbrella, share the same founder, and use OnlineJournalism.in as **first design partner + case study**.
- Public messaging keeps the two clearly separated to avoid reader/customer confusion.

## Tone and visual identity (Y1 defaults)

- **Voice:** newsroom-native, terse, technical when needed, never marketing-fluff.
- **Tagline (working):** "Editorial intelligence, built by journalists."
- **Audience:** working reporters and section editors first; CTOs and product managers second; publishers third.

### Visual identity (locked Wed Jun 2)

OnlineJourno inherits the OnlineJournalism.in design system. Sibling products, one brand family.

- **Logo mark:** triangular geometric mark (orange / red / magenta gradient on radiating lines, forming three fans). Used on light backgrounds and at large sizes. At small sizes (favicon, masthead), uses a dark monochrome variant.
- **Primary brand colour:** `#2D7A4F` (forest green).
- **Page background:** `#f0ece4` (warm cream / "paper").
- **Ink:** `#1A1A1A`.
- **Urgency / breaking / past-due:** `#D32B2B`.
- **Mid lead-time / warning:** `#b35d00` (amber).
- **Type stack:** Playfair Display (display) + Noto Serif (body) + Source Sans 3 (UI). All Google Fonts. Noto Serif covers Indic + Cyrillic + CJK + Arabic — multilingual-ready.
- **Aesthetic:** broadsheet newspaper. Flat edges, minimal rounding, sparing shadows, rule lines and paper contrast do the lifting.

Full token set locked in `docs/adr/0013-design-tokens.md`. Reference CSS at `docs/design-references/colors_and_type.css`. Working React prototype at `docs/design-references/predictive-editorial-calendar/`. Live assets at `apps/web/public/brand/`.

### Wordmark plan

- OJ.in publication: existing "OnlineJournalism.in" wordmark (red square monogram + serif text).
- OnlineJourno platform: dedicated "OnlineJourno" wordmark to be designed Wk 8+. Mark + palette + type stack stay shared.

## Trademark plan

- File "OnlineJourno" trademark in India, Class 9 (software) + Class 42 (SaaS services). Cost ≈ ₹4,500/class.
- Defer Madrid / international filings until ARR > ₹50 lakh.

## License plan

Locked Wed Jun 3: **Apache License 2.0** for the platform code from Day 1. Sibling MIT licensing for public data layers when those reach community-ready state.

| Layer | License | Why |
|-------|---------|-----|
| `apps/web`, `packages/spine`, `packages/modules/*` | **Apache 2.0** | Permissive, journalist-trusted, contributor-friendly, neutral on commercial reuse; matches the moral / transparency dimension of editorial work. |
| `packages/spine/catalogues/*`, `packages/spine/templates/*`, source registry data | **MIT** (when published Y2+) | Public data; lowest friction for newsroom-community contributions. |
| Plugin SDK (Y2+) | **MIT** | Marketplace expansion. |
| Confidential customer data (briefs, editorial DNA, journalist preferences, rejected items) | **Customer-owned** | Never uploaded, never aggregated, never shared. Non-negotiable. |

Source repository becomes public when schema and ADRs are stable enough not to be embarrassing — earliest Wk 10–12, possibly later. Until then, the repo lives on private GitHub but is unambiguously Apache 2.0 from the first commit (see `LICENSE.md`).

Refuse GPL / AGPL / LGPL dependencies in the core. Apache 2.0 is compatible only with permissive upstream licenses (MIT, BSD, Apache, ISC). GPL dependencies, if ever needed for a niche module, live in their own module with their own licence.

## Business model

Locked Wed Jun 3: **indie open-source sustainability**, not venture growth.

- Founder: solo, bootstrap, ~₹2,000/month sustainable burn until first revenue.
- First paying customer target: Wk 12–16 (late Aug / Sept 2026).
- Year-1 ARR target: ₹15–30 lakh (1–3 paying customers + services).
- Year-3 ARR ceiling: ₹50 lakh – 1.5 cr realistic.
- Not VC-investable as scoped; venture path explicitly declined.

### Revenue lanes (priority order)

| Lane | Description | Y1 |
|------|-------------|----|
| Managed SaaS hosting | `app.onlinejourno.com` for newsrooms without ops capacity; tier-priced | Primary |
| Setup + onboarding | One-time fee per customer; configures their newsroom, beats, sources, editorial DNA | Primary |
| Custom source onboarding | Per-source flat fee for non-standard / niche sources | Secondary |
| Training + workshops | One-day or remote sessions for newsroom teams | Secondary |
| Accuracy + consistency audits | Monthly subscription; reviews shortlist + brief quality vs. editor expectations | Y2+ |
| Plugin marketplace | Y2+ — third-party plugins with revenue share | Y2+ |
| OpenCollective + LiberaPay (primary) | Voluntary support from non-customer community; FOSS-aligned channels per ADR 0028 | Y2+ |
| GitHub Sponsors (convenience layer) | Optional secondary channel for users already on GitHub; not primary because GitHub is Microsoft-owned and routes via commercial rails | Y2+ |
| Newsroom consulting | Bespoke advisory engagements | Opportunistic |

### Sustainability rules (codified in ADR 0026)

- Single-maintainer badge on the public repo; expectations explicit.
- GitHub Issues triage = 1 hour Monday + 1 hour Friday; no always-on response.
- Major releases quarterly, not monthly.
- One protected deep-work day per week for product, not OSS chores.
- Accept project may die; do not over-invest emotionally.

## Funding stance

- No VC pursuit. Vertical newsroom-tech is too small for venture economics and a wrong-shape fit for this founder's values.
- Open to grant funding once values fit verified — Google News Initiative, Meta Journalism Project, ICFJ are paused due to Big Tech wariness; revisit when comfortable separating program from funder.
- Open to angel investment only if a values-aligned editorial-tech angel surfaces; no active pitching.
- Future entity formation (OPC or Pvt Ltd in India) gated on first paying customer or first concrete investor conversation, whichever comes first.

## Investor readiness (light-touch Y1)

Even with no active pitching, basic hygiene avoids future debt.

- `docs/IP-PROVENANCE.md` updated with every external dependency and reused asset.
- `docs/CAP-TABLE.md` shows 100% Subhash Rai, with a note on intended assignment to NewCo on incorporation.
- Simple books from Day 1 (spreadsheet acceptable).
- Per-newsroom API cost separable from Day 1 (tagged Anthropic API usage or one key per tenant).

## What this decision is not

- This decision does not lock product feature set, pricing, or org structure beyond the founder-only baseline.
- It does not commit to fundraising — it only avoids accumulating IP/legal debt that would slow a future raise.
