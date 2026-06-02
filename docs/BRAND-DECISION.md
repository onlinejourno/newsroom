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
| `app.onlinejourno.com` | Product (journalist UX + admin) | **Reserved**; will point at Fly.io BOM when product deploys (Wk 8+). Add CNAME at Bluehost Zone Editor. |
| `api.onlinejourno.com` | API endpoints | Same Fly.io app as `app.` — same CNAME target. |
| `docs.onlinejourno.com` | Customer docs | Y1+. Point at docs portal when shipped. |
| `status.onlinejourno.com` | Status page | Y1+. Statuspage / Better Uptime. |
| `onlinejourno.net` | Park / redirect to `.com` | No active use. |
| `onlinejourno.info` | Park / redirect to `.com` | No active use. |
| `onlinejourno.xyz` | Park / redirect to `.com` | No active use. Internal dev later if needed. |
| `onlinejourno.store` | Module marketplace / source-bundle store | **Park.** Real plan only after MVP proves. |

## Hosting decisions (locked Wed Jun 3)

| Surface | Where | Why |
|---------|-------|-----|
| Marketing (`onlinejourno.com` root + `www`) | **WordPress on Bluehost.in** | Already paid; WP-tuned shared hosting; non-technical edits possible; SEO-friendly. |
| Product (`app.onlinejourno.com`) | **Fly.io PAYG, Mumbai (BOM) region** | Native Node 20 + Python; Postgres + pgvector co-located; India edge; `flyctl deploy`; pay only for used capacity. |
| Database | **Self-managed Postgres in Fly machine Y1**, upgrade to managed Postgres add-on when first paying customer arrives | Self-managed ~$2/mo idle; managed = $15/mo min. Defer until revenue justifies. |
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

- Spine and apps: proprietary, all rights reserved, single-owner copyright (`LICENSE.md`).
- Modules under `packages/modules/`: case-by-case. Default proprietary; selected modules may be open-sourced (MIT) in Year 2 once stable, as community positioning.
- Refuse GPL deps in spine; allow in isolated modules only if the module's license matches.

## Investor readiness (light-touch Y1)

- `docs/IP-PROVENANCE.md` updated with every external dependency and reused asset.
- `docs/CAP-TABLE.md` shows 100% Subhash Rai, with a note on intended assignment to NewCo on incorporation.
- Simple books from Day 1 (spreadsheet acceptable).
- Per-newsroom API cost separable from Day 1 (tagged Anthropic API usage or one key per tenant).

## What this decision is not

- This decision does not lock product feature set, pricing, or org structure beyond the founder-only baseline.
- It does not commit to fundraising — it only avoids accumulating IP/legal debt that would slow a future raise.
