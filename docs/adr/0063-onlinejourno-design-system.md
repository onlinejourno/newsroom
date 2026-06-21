# ADR 0063 — OnlineJourno Design System

**Status:** Accepted (2026-06-21). Extends ADR 0013 (Design system tokens).

## Context

ADR 0013 established the first token set (cool-grey neutrals, green brand, Playfair/
Noto/Source Sans). Phase A then evolved the UI toward an editorial broadsheet feel. The
founder has now supplied a complete brand + product **OnlineJourno Design System (OJDS)** —
rebuilt against the live app — that codifies that direction: warm newsprint, **ink-primary**,
the **prism spectrum** (amber → vermilion → magenta) as accent, vermilion kickers, and a
purpose-built type stack (Karnata F Kittel + Source Serif 4 + IBM Plex). It also ships a
component library, UI kits, and a WordPress theme. Directive: *use this as the design
philosophy for the whole platform.*

## Decision

Adopt OJDS as the platform's design system. Roll out **foundation-first**:

1. **Tokens.** Keep the ADR 0013 token *names* (`--color-*`, `--font-*`) and repoint their
   *values* to the OJDS palette in `apps/web/app/globals.css`. Every surface reads the tokens,
   so this re-skins the whole app in one move.
   - Warm stone neutrals (paper `#efe9dd` → ink `#181610`); cards white; frame = warm ink.
   - **Green is functional-only** (positive / go / commission; inline links). `--color-brand`
     → **ink**; `--color-urgent` → **vermilion** `#c0392b`; `--color-amber-*` → gold.
   - New prism-accent vars: `--color-accent` (vermilion), `--color-magenta`, `--brand-gradient`.
2. **Fonts.** Latin display/body/UI/data → **Karnata F Kittel** (self-hosted, single-weight —
   hierarchy from size + colour, never bold) / **Source Serif 4** / **IBM Plex Sans** / **IBM
   Plex Mono**. The multilingual **per-script Noto fonts are preserved** (Kittel/Source Serif
   don't cover Devanagari/Arabic/Tamil/…); `layout.tsx` keeps the `scriptFont[locale]` logic.
   `next/font/google` self-hosts Source Serif + IBM Plex at build (no runtime CDN).

Spacing/radius/shadow tokens are unchanged — already OJDS-compatible (near-square radii, warm
subtle shadows).

## Consequences

- The platform shifts from green-brand + Playfair to **ink + vermilion/prism + Kittel** — the
  founder's stated preference (green not as brand). Display headlines render at weight 400.
- Token names stay stable → no surface markup churn in this slice.
- Self-host story improved: only Kittel is vendored; Source Serif/IBM Plex are inlined at build.

## Follow-on slices (not this ADR)

- OJDS **component library** (Button/Card/Tag/Tabs/Banner) + per-surface colour refinement.
- **Wordmark** canonical choice (Kittel `OnlineJourno.` + vermilion period vs heavier serif) +
  prism brand-mark swap (masthead).
- **WordPress theme** for onlinejourno.com; marketing UI kit.

## References

- Spec: `docs/superpowers/specs/2026-06-21-onlinejourno-design-system-foundation-design.md`
- Plan: `docs/superpowers/plans/2026-06-21-ojds-foundation.md`
- OJDS bundle (founder-supplied): tokens, components, UI kits, WordPress theme, brand assets.
- Extends ADR 0013. Provenance: `docs/IP-PROVENANCE.md` (Kittel OFL 1.1; Source Serif/IBM Plex OFL).
