# ADR 0004 — Agent runtime: Claude Agent SDK

**Status:** Accepted (2026-06-01).

## Context

Editorial reasoning (shortlist scoring, brief composition, thread resolution) is multi-step and benefits from agent-style orchestration. The team is already on Claude Code; lock-in to the Anthropic stack is a Y3 problem, velocity is a this-quarter problem.

## Decision

Use **Claude Agent SDK** (TypeScript, in `packages/spine/agents/`) as the agent runtime. Modules register agents with the runtime; the runtime owns the loop, tool calls, cost tracking, and reasoning traces.

Model routing rules:

| Path | Default model | Max model | Reason |
|------|---------------|-----------|--------|
| Cheap extraction / dedup | Haiku | Haiku | Volume |
| Shortlist scoring | Sonnet | Sonnet | Judgement, no Opus |
| Brief composition | Sonnet | Sonnet | Voice + reasoning |
| Thread resolution | Sonnet | Opus | Rare; cap per-day |

Hard rule: shortlist path is **zero Opus, max 2 tool calls** — protected structurally, not by discipline.

## Consequences

- Cannot trivially swap to a different LLM provider. Acceptable trade.
- All cost discipline implemented inside the runtime, not scattered across modules.
- Eval / replay harness builds on the SDK's structured trace output.

## Revisit

When ARR > ₹2 cr or when an Anthropic outage causes material customer impact for a second time.
