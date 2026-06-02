# ADR 0013 — Design system tokens

**Status:** Accepted (2026-06-02).

## Context

Visual design and design tokens are inherited from the OnlineJournalism.in design system (`docs/design-references/colors_and_type.css`). The system was developed for the Predictive Editorial Calendar prototype and is well-suited to editorial product UX: broadsheet aesthetic, journalist-coded, dense without being heavy. Same tokens carry forward to the OnlineJourno platform — OJ.in (publication) and OnlineJourno (platform) are sibling products under one brand family.

## Decision

Adopt the OJ.in design system verbatim as the OnlineJourno platform's visual identity. Tokens locked below. CSS reference preserved at `docs/design-references/colors_and_type.css`. Implementation in `apps/web/app/globals.css` uses Tailwind v4 `@theme` block referencing these tokens.

## Colour tokens

### Brand greens

| Token | Value | Use |
|-------|-------|-----|
| `--ioj-green-900` | `#143d26` | darkest brand |
| `--ioj-green-800` | `#1f5c38` | hover, link-hover |
| `--ioj-green-600` | `#2D7A4F` | **primary brand accent** |
| `--ioj-green-400` | `#48a870` | success accents |
| `--ioj-green-100` | `#e6f5ec` | brand-tint background |

### Semantic reds

| Token | Value | Use |
|-------|-------|-----|
| `--red-700` | `#b01e1e` | strongest urgency |
| `--red-600` | `#D32B2B` | **urgency / past-due / section bars** |
| `--red-500` | `#e84040` | urgency emphasis |
| `--red-100` | `#fdeaea` | urgency tint background |

### Amber

| Token | Value | Use |
|-------|-------|-----|
| `--amber-600` | `#b35d00` | mid lead-time |
| `--amber-100` | `#f7ecd9` | mid-lead-time background |

### Neutrals + paper

| Token | Value | Use |
|-------|-------|-----|
| `--gray-950` | `#0d0d0d` | extreme ink |
| `--gray-900` | `#1A1A1A` | **primary text / ink** |
| `--gray-800` | `#333333` | strong ink alt |
| `--gray-700` | `#4d4d4d` | dimmed text |
| `--gray-600` | `#666666` | **secondary text, bylines** |
| `--gray-500` | `#888888` | placeholder |
| `--gray-400` | `#aaaaaa` | disabled |
| `--gray-300` | `#cccccc` | strong borders |
| `--gray-200` | `#E0E0E0` | **borders** |
| `--gray-100` | `#F0F0EE` | soft tinted surface |
| `--gray-50` | `#F5F5F2` | softest surface |
| `--paper` | `#f0ece4` | **warm off-white page background** |
| `--white` | `#FFFFFF` | card / surface white |
| `--color-rule` | `#d4cfc6` | **warm rule line** |
| `--color-rule-soft` | `#e6e0d4` | softer rule line |

### Semantic role mapping

| Role | Token |
|------|-------|
| `--color-brand` | `var(--ioj-green-600)` |
| `--color-brand-dark` | `var(--ioj-green-800)` |
| `--color-brand-bg` | `var(--ioj-green-100)` |
| `--color-urgent` | `var(--red-600)` |
| `--color-urgent-bg` | `var(--red-100)` |
| `--color-fg-1` | `var(--gray-900)` |
| `--color-fg-2` | `var(--gray-600)` |
| `--color-fg-3` | `var(--gray-400)` |
| `--color-fg-inv` | `var(--white)` |
| `--color-bg-page` | `var(--paper)` |
| `--color-bg-card` | `var(--white)` |
| `--color-bg-nav` | `var(--white)` |
| `--color-bg-dark` | `var(--gray-900)` |
| `--color-border` | `var(--gray-200)` |
| `--color-link` | `var(--ioj-green-800)` |
| `--color-link-hover` | `var(--ioj-green-900)` |
| `--color-section-bar` | `var(--ioj-green-600)` |
| `--color-tag-bg` | `var(--gray-900)` |
| `--color-tag-text` | `var(--white)` |

## Typography

### Families

| Token | Stack | Use |
|-------|-------|-----|
| `--font-display` | `'Playfair Display', 'Georgia', 'Times New Roman', serif` | Mastheads, headlines |
| `--font-body` | `'Noto Serif', 'Georgia', serif` | Body copy, deck |
| `--font-ui` | `'Source Sans 3', 'Helvetica Neue', Arial, sans-serif` | UI chrome, navigation, labels |
| `--font-mono` | `'Courier New', Courier, monospace` | Code, data |

### Scale (base 16px, major-third)

| Token | Value |
|-------|-------|
| `--text-xs` | 11px |
| `--text-sm` | 13px |
| `--text-base` | 16px |
| `--text-md` | 18px |
| `--text-lg` | 20px |
| `--text-xl` | 24px |
| `--text-2xl` | 30px |
| `--text-3xl` | 38px |
| `--text-4xl` | 48px |
| `--text-5xl` | 60px |

### Line heights

| Token | Value | Use |
|-------|-------|-----|
| `--leading-tight` | 1.2 | Headlines |
| `--leading-snug` | 1.35 | Subheads |
| `--leading-normal` | 1.55 | Standfirst |
| `--leading-loose` | 1.75 | Body copy |

### Letter spacing

| Token | Value |
|-------|-------|
| `--tracking-tight` | -0.02em |
| `--tracking-normal` | 0 |
| `--tracking-wide` | 0.05em |
| `--tracking-widest` | 0.12em |

### Weights

| Token | Value |
|-------|-------|
| `--weight-light` | 300 |
| `--weight-regular` | 400 |
| `--weight-semibold` | 600 |
| `--weight-bold` | 700 |
| `--weight-extrabold` | 800 |

### Semantic roles

| Role | Font | Size | Weight | Notes |
|------|------|------|--------|-------|
| Masthead | display | 4xl | 700 | top-of-page brand band |
| H1 | display | 3xl | 700 | tracking-tight |
| H2 | display | 2xl | 700 | |
| H3 | display | xl | 600 | |
| Card headline | display | lg | 700 | snug leading |
| Body | body | md | 400 | loose leading |
| Deck (standfirst) | body | lg | 400 | normal leading |
| Byline / meta | ui | sm | 600 | wide tracking |
| Section label | ui | xs | 700 | widest tracking, uppercase |
| Navigation | ui | base | 600 | |
| Caption | ui | sm | 400 | secondary colour |
| UI / Button | ui | base | 600 | |

## Spacing (8px base scale)

| Token | px |
|-------|----|
| `--space-1` | 4 |
| `--space-2` | 8 |
| `--space-3` | 12 |
| `--space-4` | 16 |
| `--space-5` | 20 |
| `--space-6` | 24 |
| `--space-8` | 32 |
| `--space-10` | 40 |
| `--space-12` | 48 |
| `--space-16` | 64 |
| `--space-20` | 80 |
| `--space-24` | 96 |

## Layout widths

| Token | Value | Use |
|-------|-------|-----|
| `--content-width-article` | 680px | Reading column |
| `--content-width-section` | 1200px | Section pages |
| `--content-width-full` | 1440px | Full-bleed admin / dashboard |
| `--gutter-desktop` | 24px | |
| `--gutter-mobile` | 16px | |

## Border radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-none` | 0 | Editorial rules and bars |
| `--radius-sm` | 2px | Subtle softening |
| `--radius-md` | 4px | Buttons, cards |
| `--radius-pill` | 100px | Tag pills, filter chips |

Heavy iOS-style rounding is rejected. Newspaper aesthetic favours flat edges and minimal rounding.

## Shadows

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Subtle elevation |
| `--shadow-md` | `0 2px 8px rgba(0,0,0,0.10)` | Card lift |
| `--shadow-lg` | `0 4px 20px rgba(0,0,0,0.12)` | Drawer / modal |

Sparing use. Rule lines and surface contrast do most of the work, not shadow stacks.

## Implementation rules

1. **No bare hex** in any TS / TSX / CSS file except `globals.css` token definitions and shadcn theme config.
2. **No bare px** in any component except where a token would distort the design. Use Tailwind utility classes mapped to tokens.
3. **No inline `style={{}}`** in production components. The prototype's inline styles are reference-only.
4. **Logical CSS properties** (`ms-` / `me-` / `ps-` / `pe-` over `ml-` / `mr-`) for RTL readiness (per ADR 0022 multilingual prep).
5. **Component primitives from shadcn** — `Button`, `Card`, `Dialog`, `Sheet`, etc. — themed with these tokens.
6. **Section labels** use `ds-label` semantic — `font-ui`, xs, 700, widest tracking, uppercase, urgency-red colour.

## Consequences

- Visual identity inherited from OJ.in. Customers familiar with OnlineJournalism.in immediately recognise the family.
- Type stack (Playfair Display + Noto Serif + Source Sans 3) is Google Fonts — free, multilingual (Noto family covers most scripts incl. Indic + Cyrillic + CJK + Arabic).
- Tokens are stable and porting-ready; the prototype's React + Babel CDN approach is reference only — production builds Tailwind + shadcn against these same values.
- Wordmark variant for "OnlineJourno" (vs "OnlineJournalism.in") to be designed Wk 8+. Mark itself (triangular gradient) and palette stay shared.

## References

- Source CSS: `docs/design-references/colors_and_type.css`
- Prototype: `docs/design-references/predictive-editorial-calendar/`
- Live assets: `apps/web/public/brand/`
