# AGENTS.md

This file applies to any AI agent working in this repository (Claude Code, Codex, other tools).

Read `CLAUDE.md` first for the full project ruleset. The summary below is the minimum any agent must observe.

## Identity

This is **onlinejourno/platform** — a multi-tenant editorial intelligence platform owned by Subhash Rai. Stage: Wk 0.

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
