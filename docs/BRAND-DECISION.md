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
| `onlinejourno.com` | Product marketing + web app + login | Active brand surface |
| `onlinejourno.net` | API base / alt-redirect | Park for Y1; consider `api.onlinejourno.com` instead |
| `onlinejourno.info` | Documentation site | Y1 — point at docs portal once shipped |
| `onlinejourno.xyz` | Dev, staging, experiments | Internal use |
| `onlinejourno.store` | Module marketplace / source-bundle store | **Park.** Real plan only after MVP proves. |

## Brand relationship to sister property

- `onlinejournalism.in` = Subhash Rai's existing journalism publication. Stays distinct.
- OnlineJourno (product) and OnlineJournalism.in (publication) live under the same umbrella, share the same founder, and use OnlineJournalism.in as **first design partner + case study**.
- Public messaging keeps the two clearly separated to avoid reader/customer confusion.

## Tone and visual identity (Y1 defaults)

- **Voice:** newsroom-native, terse, technical when needed, never marketing-fluff.
- **Tagline (working):** "Editorial intelligence, built by journalists."
- **Audience:** working reporters and section editors first; CTOs and product managers second; publishers third.
- **Visual:** dark mode default; serif for editorial copy, sans for product UI; sparingly used colour.

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
