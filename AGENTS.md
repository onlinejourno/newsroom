# AGENTS.md

This file applies to any AI agent working in this repository (Claude Code, Codex, other tools).

Read `CLAUDE.md` first for the full project ruleset. The summary below is the minimum any agent must observe.

## Product — canonical (binding)

**`docs/PRODUCT.md` is the binding product definition. All work aligns to it.** `MVP-SCOPE.md` is suspended; there is no platform-vs-Xtnd tier — **one product, OnlineJourno.**

**OnlineJourno** is editorial intelligence **by a journalist, for journalists** — one vendor-neutral platform that finds the story for the reporter at the base of the newsroom, hands it to her with her newsroom's archive depth behind it, and gives every story she files a fair chance, pre-publish and after. It is a companion to the newsroom's existing CMS; it never replaces it.

Non-negotiables (full set in PRODUCT.md):
- **By a journalist, for journalists. Vendor-neutral** — never branded to a tenant or masthead.
- **Invert the pyramid** — give the reporter at the base what only the top can see. Reporter-first; no information asymmetry.
- **Companion to the CMS, never a replacement. Decision-support, not autopilot.**
- **English-first, localizable** per newsroom. **Pluggable archive** — connect a digitised one, else look it up online.
- **Privacy + probity** — first-party only, AI-use disclosure, handle sensitive stories with care.
- **Give every story a fair chance.**

## Identity

This is **onlinejourno/platform** — the OnlineJourno product (multi-tenant), owned by Subhash Rai. It consolidates the founder's prior engines — front (`editorial-intelligence-demo`: collect → analyse → score → alert + archive + reporter PWA) and back (`discover-dashboard`: distribution-fit, GSC, gems, subscription, probity) — onto this spine, per `docs/PRODUCT.md`.

## Hard rules

1. Minimum code that solves the problem. No speculative abstractions.
2. Touch only what you must. Don't refactor unrelated code.
3. Don't commit or push to git unless explicitly asked.
4. Don't add a new language, framework, queue, or top-level dependency without an ADR in `docs/adr/`.
5. Per-newsroom customization is YAML-driven or row-level, never branches in source.
6. Every agent decision logs reasoning + cost. No silent reasoning.

## Domain context

See `CONTEXT.md`.

## Issue tracker

Local markdown files in `.scratch/<feature-slug>/`. No external tracker Y1.

## Triage labels (when issues are created)

`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.

## ADR index

`docs/adr/` — read before making an architectural change.
