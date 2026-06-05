# Marketing Site Spec — `onlinejourno.com`

**Status:** Drafted Wk 0 of Xtnd. Implementation in WordPress on Bluehost is owned by founder; this document is the spec.

## Scope

`onlinejourno.com` is the umbrella marketing site for the OnlineJourno product family (Platform + Xtnd). It is the first impression for editors, CTOs, and journalist-developers evaluating the products.

Currently (Wk 0): single WordPress install on Bluehost (per platform `BRAND-DECISION.md`). One landing page. Single CTA.

After this spec lands: the site distinguishes the two products clearly while reinforcing "combined at the hip" — one founder, one stack, one ethos, two product surfaces.

## Distinction principles

1. **One umbrella, two products.** The visitor must understand within 10 seconds that OnlineJourno is a family with two surfaces (Platform + Xtnd), not a single product, and not two unrelated products.
2. **Same visual identity.** Shared brand mark, palette, type stack (per platform ADR 0013). No fork.
3. **Cross-promotion in both directions.** Platform page references Xtnd. Xtnd page references Platform. Neither product appears alone without acknowledging the sibling.
4. **Honest stage labels.** Platform shows "Pilot — Wk 8" or "Live — accepting design partners." Xtnd shows "In design — Y2 build." Don't oversell readiness.
5. **One CTA per page.** Platform CTA: "Become a design partner." Xtnd CTA Y1: "Star the repo + follow updates." Different CTAs because the products are in different stages.

## Information architecture

### Homepage (`/`)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Header: OnlineJourno logo + nav (Platform / Xtnd / Blog / Docs / GitHub) │
├────────────────────────────────────────────────────────────────────────┤
│  Hero                                                                   │
│  "OnlineJourno is editorial intelligence for newsrooms."                │
│  "Two products, one mission: give every story a fair chance."           │
│  [Explore Platform] [Explore Xtnd]                                       │
├────────────────────────────────────────────────────────────────────────┤
│  Product blocks (2-column on desktop, stacked mobile)                   │
│                                                                          │
│  ┌─────────────────────────┐   ┌─────────────────────────┐               │
│  │ OnlineJourno            │   │ OnlineJourno Xtnd       │               │
│  │ Platform                │   │ (in design)             │               │
│  │                          │   │                          │               │
│  │ AI-curated daily briefs │   │ Converged-newsroom       │               │
│  │ for working reporters.  │   │ orchestration layer.     │               │
│  │                          │   │                          │               │
│  │ Markets + regulatory    │   │ Distribution-fit cue,    │               │
│  │ beat, English, single   │   │ placement support, post- │               │
│  │ design partner Y1.      │   │ publish diagnostic,      │               │
│  │                          │   │ commission router.       │               │
│  │                          │   │                          │               │
│  │ [Learn more →]          │   │ [Read the spec →]        │               │
│  │ [Become a design        │   │ [Star the repo →]        │               │
│  │  partner]               │   │                          │               │
│  └─────────────────────────┘   └─────────────────────────┘               │
├────────────────────────────────────────────────────────────────────────┤
│  Editorial principles strip (4 columns)                                 │
│  • Editorial judgement remains human                                    │
│  • AI never invents a source                                            │
│  • Trust ladder, not feature ladder                                     │
│  • Open source, Apache 2.0                                              │
├────────────────────────────────────────────────────────────────────────┤
│  About the founder (1 paragraph + link)                                 │
│  "Built by Subhash Rai, a working journalist who also writes code."     │
├────────────────────────────────────────────────────────────────────────┤
│  Footer: products, docs, GitHub, blog, contact, sister property         │
│  (OnlineJournalism.in)                                                  │
└────────────────────────────────────────────────────────────────────────┘
```

### Platform page (`/platform/`)

```
Hero
"OnlineJourno Platform — editorial intelligence for working reporters."
Tagline: "Built by journalists, for journalists."
[Become a design partner] (primary)
[Read the docs →] (secondary)

What it does (3 features)
1. Daily AI-curated briefs per beat
2. Source-provenance on every signal
3. Editorial DNA learning loop

Status
Pilot Wk 8 (or whatever the current stage is). Markets/regulatory beat
at one design partner. ₹150/day Anthropic cost ceiling. Quarterly releases.

How it's built
Apache 2.0. TypeScript + Python. Fly.io BOM region. Single Postgres.
Single founder. No VC, no growth pressure.

Where it's going
Pairs with OnlineJourno Xtnd for converged-newsroom orchestration. [Explore Xtnd →]

CTA
[Become a design partner — limited Y1 slots]
```

### Xtnd page (`/xtnd/` or `xtnd.onlinejourno.com`)

```
Hero
"OnlineJourno Xtnd — converged-newsroom orchestration."
Tagline: "Give every story a fair chance."
[Read the spec →] (primary)
[Star the repo →] (secondary)

What it does (3 features)
1. Distribution-fit cue: predict Discover / Search / Subscription / Direct fit pre-publish
2. Placement decision support for desk and section editors
3. Post-publish diagnostic — why a story dropped, in plain English

Status
In design. Y2 build gated on platform Y1 success + sustainability preconditions.
Wk 0 spec is in the repo. ADRs locked. Roadmap public.

How it's built
Apache 2.0. Same stack as platform. Lives on platform tenancy. No fork.
Read the relation-to-platform doc.

Where it goes
Pairs with OnlineJourno Platform — Xtnd is the orchestration layer on top of
platform's brief intelligence. [Explore Platform →]

Editorial principles
- Decision-support, not decision-making (no autopilot)
- Companion to your existing CMS, never replacement (Y1-3)
- Reporter-first surface, even when the feature is for desk
- No information asymmetry between reporter and editor

CTA
[Read the ADRs] [Star the repo] [Follow updates]
```

### Blog (`/blog/`)

Existing WordPress posts continue. Add categorization:

- **Platform** — posts about platform build, design-partner case studies, editorial intelligence.
- **Xtnd** — posts about Xtnd design decisions, ADR explanations, fair-chance audit thinking.
- **Founder notes** — meta posts about indie-OSS, sustainability, editorial product design.

### Docs (`/docs/`)

Y1: redirects to GitHub repo READMEs.
Y2+: dedicated docs portal at `docs.onlinejourno.com` (per platform BRAND-DECISION).

## Navigation rules

**Top nav (5-7 items max):**

```
[OnlineJourno logo]   Platform    Xtnd    Blog    Docs    GitHub    [Sign in]
```

- "Platform" and "Xtnd" are top-level peers.
- "Sign in" links to `app.onlinejourno.com` (Y1: platform only; Y2+: same Fly.io app, Xtnd surfaces gated by role).

**Footer:**

```
OnlineJourno products
- Platform
- Xtnd

Resources
- Docs
- Blog
- GitHub: platform
- GitHub: xtnd (private through Y2)

Family
- OnlineJournalism.in (sister publication)

Legal
- Privacy
- License (Apache 2.0)
- Trademark notice
```

## Visual rules

Inherits platform ADR 0013 verbatim.

- Same logo mark across all pages.
- Same `#2D7A4F` accent, `#f0ece4` background, `#1A1A1A` ink.
- Same Playfair Display + Noto Serif + Source Sans 3 stack.
- Product distinction visible through:
  - Product-name typography (Platform sets in display; Xtnd sets in display with a small "(in design)" tag through Y2).
  - Stage badge per product (`Pilot Wk 8`, `In design — Y2 build`).
  - Per-page hero photo or illustration (different per product; both newspaper-aesthetic).

No per-product color shift, no per-product type variant, no per-product mark variant. The brand family stays visually unified.

## Implementation path (WordPress on Bluehost)

This is the spec for the founder to implement on WordPress. No code in this Xtnd repo touches the marketing site directly.

1. **Pages to create:**
   - `/platform/` (new)
   - `/xtnd/` (new)
   - Homepage rebuild (existing page → new layout per IA above)

2. **Theme adjustments:**
   - Top nav update: add "Platform" and "Xtnd" menu items.
   - Footer update: products list per spec.
   - Brand asset upload: ensure logo mark is on `apps/web/public/brand/` mirror so WordPress can reference the same SVG.

3. **Plugins (avoid creep):**
   - Use existing theme; no new SEO / form / page-builder plugin unless current is missing.
   - Forms (design-partner contact) → existing form plugin or new contact form; capture email + role + newsroom in `wp_postmeta`-style.
   - No tracking plugins (per platform BRAND-DECISION first-party analytics posture).

4. **Cross-links:**
   - Homepage `Explore Platform` button → `/platform/`.
   - Homepage `Explore Xtnd` button → `/xtnd/`.
   - Platform page footer `Pairs with Xtnd` → `/xtnd/`.
   - Xtnd page footer `Built on Platform` → `/platform/`.

5. **GitHub links:**
   - Platform: `https://github.com/onlinejourno/platform` (public when platform repo-public-flip happens, Wk 10-12 platform).
   - Xtnd: `https://github.com/onlinejourno/xtnd` (private through Y2; until then, show "Spec available on request" or hide GitHub link on Xtnd page).

6. **SEO:**
   - Each page has its own title, meta description, structured data (Article / Organization).
   - Sitemap auto-generated by WordPress; verify `/platform/` and `/xtnd/` are in it.

## Sequence of marketing-site work

| When | What |
|------|------|
| **Now (Wk 0 of Xtnd)** | This spec lands in Xtnd repo. No WordPress edits yet. |
| **Wk 8 platform (deploy week)** | Homepage rebuild, Platform page, Xtnd page (with "in design" stage). Top nav + footer updated. |
| **Wk 10-12 platform (repo public flip)** | Platform page adds "GitHub" link to public platform repo. Blog post announces. |
| **Wk 16 platform (first paid customer)** | Platform page adds customer testimonial. Xtnd page Q3-2026 roadmap update. |
| **Y2 H1 (Xtnd build starts)** | Xtnd page status update: "In build." Demo screenshots when ready. |
| **Y2 H2 (Xtnd Y2 modules launch)** | Xtnd page status: "Live — design partner pilot." Same cadence as platform Wk 8 launch. |

## Governance

This spec is owned by Xtnd repo because Xtnd needs the marketing distinction; platform owns the implementation (WordPress install + Bluehost account). PRs to update this spec land in the Xtnd repo; the founder applies the WP changes manually.

Quarterly review: at each `docs/QUARTERLY-REVIEW-YYYY-QN.md`, check that the marketing site reflects the current product stages. Stale stage badges = trust erosion.

## What this spec is not

- Not a copy-edited final marketing copy. The hero lines and CTAs are starting points; copy-edit at WP-edit time.
- Not a visual mockup. The ASCII blocks are layout intent; visual design uses platform ADR 0013 tokens.
- Not a WordPress theme spec. Existing theme adjusts; no theme replacement unless current is broken.
- Not a paid-marketing-channel plan. SEO is the channel Y1; paid ads not contemplated.
