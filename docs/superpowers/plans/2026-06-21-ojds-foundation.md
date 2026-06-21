# OJDS Foundation (tokens + fonts) Implementation Plan

> **For agentic workers:** inline execution (delicate, interdependent token/font change — keep the whole map in one context). Verification is build + visual, not unit tests (pure styling).

**Goal:** Re-skin the whole platform to the OnlineJourno Design System by repointing `globals.css` token *values* to the OJDS palette + swapping Latin fonts to Kittel/Source Serif/IBM Plex, preserving the multilingual Noto per-script fonts.

**Architecture:** Keep the app's existing token *names* (`--color-*`, `--font-*`) — every surface reads them, so revaluing re-skins in one move. Green→functional-only; brand→ink; accent→vermilion. Fonts vendored (Kittel OFL) + `next/font` (self-hosted at build).

**Tech Stack:** Next 15 App Router, Tailwind v4 `@theme`, `next/font/local` + `next/font/google`.

---

## Task 1: Vendor the Kittel font + license

**Files:**
- Create: `apps/web/app/fonts/KarnataFKittel.otf` (copy from `/tmp/ojds/assets/fonts/`)
- Create: `apps/web/app/fonts/KarnataFKittel.LICENSE.txt` (OFL 1.1 notice + source)

- [ ] Copy the `.otf`; write the license notice (SIL OFL 1.1, source github.com/sanchaya/karnata-f-kittel-font).

## Task 2: `globals.css` — revalue palette + fonts + display weights

**File:** Modify `apps/web/app/globals.css`

**Token revalue (OJDS palette — names unchanged):**

| Token | New value |
|---|---|
| `--color-ioj-green-600/800/…` | keep ~as-is (OJDS green `#2e7d46`; functional positive + links) |
| `--color-red-700/600/500/100` | vermilion: `#a32a22` / `#c0392b` / `#d6312a` / `#f7e3e0` |
| `--color-amber-600/100` | gold: `#9a6a14` / `#f6efe0` |
| `--color-ink-950…50` | warm stone: `#0c0b08,#181610,#26221b,#3a352a,#514a3c,#6f6757,#9d9482,#c5bda9,#ddd6c5,#eee9dc,#f7f4ed` |
| `--color-paper` / `-card` | `#efe9dd` / `#ffffff` |
| `--color-rule` / `-soft` | `#c5bda9` / `#ddd6c5` |
| `--color-frame` | `#181610` (warm ink) |
| `--color-brand` | `var(--color-ink-900)` **(ink — was green)** |
| `--color-brand-dark` | `var(--color-ink-950)` |
| `--color-urgent` | `var(--color-red-600)` (now vermilion) |

**New vars (prism accent system):** `--color-accent: #c0392b;` `--color-amber-accent: #d97f0c;` `--color-magenta: #8e2c8c;` `--brand-gradient: linear-gradient(135deg,#f39a1b,#d6312a 48%,#8e2c8c);`

**Fonts (`@theme`):**
- `--font-display: var(--font-kittel), Georgia, "Times New Roman", serif;`
- `--font-body: var(--font-source-serif), Georgia, serif;`
- `--font-ui: var(--font-ibm-plex-sans), system-ui, -apple-system, sans-serif;`
- `--font-mono: var(--font-ibm-plex-mono), ui-monospace, Menlo, monospace;`

**Display weights → 400 (Kittel single-weight; hierarchy via size+colour):** in `.ds-mast .ds-h1 .ds-h2 .ds-lead .ds-stat`, change `font-weight: 800` → `font-weight: 400`.

**Positive stays green:** `.ds-tag-onit { color: var(--color-ioj-green-600); }` (was `--color-brand`, which is now ink).

- [ ] Apply all of the above. Keep spacing/radius/shadow tokens (already OJDS-compatible).

## Task 3: `layout.tsx` — font swap (preserve multilingual)

**File:** Modify `apps/web/app/[locale]/layout.tsx`

- [ ] Replace imports: drop `Playfair_Display, Source_Sans_3`; add `Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono` from `next/font/google`; add `import localFont from "next/font/local"`. Keep `Noto_Serif` + all `Noto_Serif_*`.
- [ ] Define:
```ts
const kittel = localFont({ src: "../fonts/KarnataFKittel.otf", weight: "400", variable: "--font-kittel", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400","600","700"], style: ["normal","italic"], variable: "--font-source-serif", display: "swap" });
const ibmSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-ibm-plex-sans", display: "swap" });
const ibmMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-ibm-plex-mono", display: "swap" });
```
- [ ] Keep `notoSerif` (Latin fallback for scripts) + `scriptFont` map unchanged.
- [ ] `fontVars`: `const display = scriptFont[locale] ?? kittel; const body = scriptFont[locale] ?? sourceSerif;` →
  `--font-display: "${display.style.fontFamily}, Georgia, serif"`, `--font-body: "${body.style.fontFamily}, ${sourceSerif.style.fontFamily}, Georgia, serif"`.
- [ ] `<html className>`: `${kittel.variable} ${sourceSerif.variable} ${ibmSans.variable} ${ibmMono.variable} ${notoSerif.variable}`.

## Task 4: ADR + provenance

**Files:** Create `docs/adr/0063-onlinejourno-design-system.md`; Modify `docs/IP-PROVENANCE.md`

- [ ] ADR 0063: adopt OJDS, extends/supersedes 0013 token semantics (ink-primary, vermilion/prism accent, green functional, Kittel/Source Serif/IBM Plex). Note follow-on slices (components, WP theme).
- [ ] IP-PROVENANCE: Kittel (OFL 1.1, vendored), Source Serif 4 + IBM Plex (OFL, via next/font self-hosted at build), OJDS bundle (founder IP).

## Task 5: Verify

- [ ] `pnpm --filter @onlinejourno/web type-check` → EXIT 0
- [ ] `pnpm --filter @onlinejourno/web build` → EXIT 0 (fonts resolve)
- [ ] Preview: `/en/login` + a surface render warm-cream + ink + Kittel + vermilion kickers + Plex-mono numbers; `/hi` + `/ar` still render their scripts (Noto preserved). Screenshot.
- [ ] Grep: no `--font-playfair` / `--font-source-sans` / `--font-noto-serif` left in `globals.css` `@theme` font stacks (notoSerif var still on `<html>` for scripts is fine).

## Out of scope (later slices)
Component library, per-surface colour refinement beyond `ds-tag-onit`, brand-mark/wordmark swap (masthead), WordPress theme, marketing kit.
