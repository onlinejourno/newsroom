# Design spec — OnlineJourno Design System: foundation (tokens + fonts)

**Status:** Drafted 2026-06-21 from the founder-supplied **OnlineJourno Design System** bundle
(`~/Downloads/OnlineJourno Design System.zip`). **Slice 1** of adopting OJDS as the platform's
design philosophy. Re-skins the whole app via the token + font layer; component-library adoption,
per-surface polish, and the WordPress theme are later slices. Supersedes/extends ADR 0013.

## Why

The founder shipped a complete brand+product design system — rebuilt against the live app — and
directed: *use this as the design philosophy for the whole platform.* It's the editorial-broadsheet
direction Phase A already set, now codified: warm newsprint, **ink-primary**, the **prism spectrum**
(amber→vermilion→magenta) as accent, vermilion kickers, **Karnata F Kittel** display, Source Serif
body, IBM Plex sans/mono. Because every surface reads the design tokens, repointing the tokens +
swapping the fonts re-skins the entire app in one move — the highest-leverage first step.

## Decisions

1. **Foundation first.** This slice changes only `globals.css` tokens + `layout.tsx` fonts +
   vendored assets. No per-surface markup churn (those are later slices).
2. **Keep the app's existing token *names*** (`--color-*`, `--font-*`); **repoint their *values***
   to the OJDS palette. The app's CSS keeps working; only the look changes.
3. **Green is functional-only** (founder confirmed): `--color-brand` → **ink**; vermilion/prism =
   accent; **green stays only for positive/go status** (commission, "ready to file") + inline links
   (OJDS keeps links green).
4. **Preserve multilingual fonts.** Latin display/body/ui/mono → Kittel / Source Serif 4 / IBM Plex
   Sans / IBM Plex Mono. **Non-Latin scripts keep their Noto per-script fonts** (Kittel/Source Serif
   don't cover Devanagari/Arabic/Tamil/…). `next/font/google` self-hosts at build (no runtime CDN).
5. **Vendor the OJDS assets** into the repo (OFL fonts are redistributable): Kittel `.otf`, the prism
   brand mark + `ioj-logo.svg`, and the OJDS token CSS as the source of values.

## Token mapping (OJDS → app's `globals.css` aliases)

| App alias (keep name) | New value (OJDS) |
|---|---|
| `--color-paper` (page) | `#efe9dd` (paper-warm cream) |
| `--color-paper-card` | `#ffffff` |
| `--color-frame` / ink band | `#0b0a07` (ink-band) |
| `--color-fg-primary` / ink | `#181610` (warm near-black) |
| `--color-fg-secondary/tertiary` | stone-600 `#514a3c` / stone-400 `#9d9482` |
| `--color-rule` / border | stone-300 `#c5bda9` (subtle: stone-200 `#ddd6c5`) |
| `--color-brand` (primary) | **`#181610` ink** (was green) |
| `--color-urgent` / kicker accent | **vermilion-600 `#c0392b`** |
| `--color-amber-600` (warning) | gold-600 `#9a6a14` |
| `--color-ioj-green-600` (positive status + links) | green-600 `#2e7d46` |
| **NEW** `--color-accent` + `--brand-gradient` | vermilion + `linear-gradient(135deg,#f39a1b,#d6312a,#8e2c8c)` (prism) |

Also import the full OJDS palette (stone-50…950, prism stops, functional hues) as raw vars so
later slices can use them directly. Spacing/radius/elevation: adopt OJDS values (near-square radii
1–5px, warm subtle shadows) onto the existing `--space-*`/`--radius-*`/`--shadow-*` names.

## Fonts (`layout.tsx`)

- **Kittel** (display, single weight) → `next/font/local` from the vendored `.otf`. **No bold** —
  hierarchy via size + colour.
- **Source Serif 4** (body), **IBM Plex Sans** (ui), **IBM Plex Mono** (data) → `next/font/google`
  (self-hosted at build). Replace Playfair / Noto-Serif-Latin / Source Sans / Courier.
- **Keep** all `Noto_Serif_*` per-script fonts + the `scriptFont[locale]` logic. `fontVars`:
  Latin → Kittel (display) / Source Serif (body); non-Latin → the script font (as today).
- Token families: `--font-display`=Kittel, `--font-body`=Source Serif, `--font-ui`=IBM Plex Sans,
  `--font-mono`=IBM Plex Mono (Latin); per-locale display/body overridden by `fontVars` for scripts.

## Components & files

| File | Change |
|---|---|
| `apps/web/app/fonts/KarnataFKittel.otf` (+ `OFL.txt`) | **NEW** — vendored display font (OFL) |
| `apps/web/public/brand/onlinejourno-mark.png`, `ioj-logo.svg` | **NEW** — vendored prism mark/logo |
| `apps/web/app/globals.css` | repoint `@theme` token values to OJDS palette + add prism/stone vars; green→functional |
| `apps/web/app/[locale]/layout.tsx` | swap Latin fonts (Kittel/Source Serif/IBM Plex) ; keep Noto per-script; update `fontVars` |
| `docs/adr/0063-onlinejourno-design-system.md` | **NEW** — adopt OJDS, supersede/extend 0013, record OFL provenance |
| `docs/IP-PROVENANCE.md` | add Kittel (OFL), Source Serif/IBM Plex (OFL), OJDS bundle |

## Testing & success criteria

- `type-check` + `build` green; fonts resolve (no missing-font build error).
- **Live verify:** `/en/login` + a surface render in **warm cream + ink + Kittel headlines +
  vermilion kickers** (not the old Playfair/green look). Numbers/clocks in IBM Plex Mono.
- **Multilingual not broken:** `/hi`, `/ar`, `/ta` still render their scripts (Noto preserved).
- No green-as-brand (primary = ink); green only on positive/status; links green.
- All surfaces still build (no token-name removed that a surface relied on).

## Out of scope (later slices)

- The OJDS **component library** (Button/Card/Tag/Tabs/Banner) adoption + per-surface color
  refinement (e.g. mapping each green-brand use to ink/vermilion/green correctly).
- The **WordPress theme** for onlinejourno.com.
- Marketing UI kit, slides.
- Wordmark canonical choice (Kittel-`OnlineJourno.` vs the heavier live serif) — confirm before
  the component slice touches the masthead wordmark.

## References

- OJDS bundle: `~/Downloads/OnlineJourno Design System.zip` (unpacked at `/tmp/ojds`): `readme.md`,
  `tokens/{colors,typography,spacing,elevation,fonts}.css`, `assets/`, `ui_kits/`, `wordpress-theme/`.
- Kittel: SIL OFL 1.1 (github.com/sanchaya/karnata-f-kittel-font). Source Serif 4 + IBM Plex: OFL.
- Current: `apps/web/app/globals.css` (ADR 0013 tokens), `layout.tsx` (multilingual fonts).
- Memory: [[onlinejourno-design-northstar]] (design crucial for uptake — now has a real system).
