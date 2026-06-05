# GFI 015 — Subscription-kicker distribution-fit scorer

> Template drafted Wk 0 of Xtnd; published as live GitHub Issue at Wk 100 public flip.

## What

Add a `subscription_kicker` scorer to the `m-distribution-fit` module. The scorer evaluates whether a story's opening 200 words contain a "kicker" — a hook that promises subscription value (exclusive analysis, paywalled depth, expert authority signal) — and returns a 0-1 fit score with structured reasons.

This is one of several distribution-fit surface scorers. The v0.1 capability-tier release ships two scorers (`discover_image_checker`, `search_keyword_analyzer`); the subscription kicker scorer extends the same module via a new scorer entry in `scorers/`.

## Why

Distribution-fit cue is the highest-leverage capability Xtnd offers reporters and desks at file time. Among surfaces, **Subscription** is where editors most lack diagnostic clarity today — a story can hit Direct CTR but bomb on subscription conversion because the opening doesn't promise enough value. The subscription kicker scorer surfaces this risk pre-publish, giving the reporter time to adjust.

The scorer is also a template for any other subscription-related signal contributors might add (e.g., "paywalled-section fit" or "exclusive-source-claim density").

## Module / location

`packages/modules/m-distribution-fit/scorers/subscription_kicker.ts`

Plus eval fixture: `packages/modules/m-distribution-fit/eval/goldset/subscription_kicker.csv`

## Module Contract scaffold

The `m-distribution-fit` module Module Contract already exists (exemplar shipped with v0.1 capability-tier release). This issue adds a single scorer file inside `scorers/`; no new module scaffold.

Scorer interface:

```ts
export interface Scorer {
  surface: 'subscription' | 'discover' | 'search' | 'direct' | 'social' | 'ai_answer';
  scorerName: string;
  score(input: ScorerInput): Promise<ScorerOutput>;
}

export interface ScorerInput {
  brief: Brief;            // platform Brief, with `content` JSONB
  signals: Signal[];       // platform signals composing the brief
  config: ScorerConfig;    // per-tenant config under tenants.config.xtnd.m-distribution-fit
}

export interface ScorerOutput {
  score: number;           // 0..1
  signals: Record<string, unknown>;  // structured reasons (e.g., { has_kicker: false, opening_word_count: 187 })
  modelVersion: string;    // scorer version for replay
  agentTraceId?: string;   // if scorer used Anthropic
}
```

## Inputs / outputs

**Input:** `ScorerInput` with the brief's `content.sections[0]` opening text.

**Output:** `ScorerOutput` with:

- `score: number` (0..1).
- `signals: { has_kicker: boolean, kicker_strength: 'weak' | 'medium' | 'strong' | null, opening_word_count: number, exclusivity_claim: boolean, expert_authority_signal: boolean }`.
- `modelVersion: 'subscription_kicker.v1'`.

Persisted via `cap_distribution_fit_scores` table with `surface = 'subscription'`.

## Acceptance criteria

- [ ] Scorer file at `packages/modules/m-distribution-fit/scorers/subscription_kicker.ts`.
- [ ] Implements `Scorer` interface with `surface: 'subscription'`.
- [ ] Deterministic heuristic (no LLM call) for v1: examines opening word count, presence of question marks, declarative sentences, exclusivity claims ("exclusive", "first to report", "internal documents"), expert-authority signals ("our analysis", named reporter byline + beat seniority).
- [ ] If heuristic returns `score < 0.4`, the scorer **may** call Anthropic Sonnet to second-pass with a constrained prompt; gated by per-tenant config `m-distribution-fit.allow_llm_second_pass` (default `false`). LLM second-pass cost recorded in `agent_traces`.
- [ ] Returns structured reasons; `signals.has_kicker`, `signals.kicker_strength`, etc.
- [ ] Cost-budget aware: any LLM call routes through platform's `agent_traces`.
- [ ] RLS-aware (no direct DB writes; scorer is read-only against brief / signals).
- [ ] Unit tests cover: strong-kicker story (≥0.8); weak-kicker story (≤0.4); empty-content edge case; non-English content (gracefully falls back, returns 0.5 with a `language_skipped` signal).
- [ ] Eval fixture `eval/goldset/subscription_kicker.csv` has 20 hand-labelled examples (10 strong, 5 weak, 5 mid) across diverse beat types.
- [ ] No new top-level dependencies.
- [ ] README of `m-distribution-fit` updated with "Available scorers" table including this new scorer + version + maintainer (you).
- [ ] Demo tenant seed data: 3 of the 30 demo distribution-fit scores extend to include this scorer's output, demonstrating strong / weak / mid examples.
- [ ] Decision-support compliant: scorer outputs an advisory score with reasons; no autopilot action.

## Estimated effort

8-12 hours for an experienced contributor. Includes: heuristic logic + optional LLM gate + tests + eval fixture + README update + demo data extension.

## Skill level

`experienced-contributor`

## Review SLA

Reviewed in the next Friday review window (per platform ADR 0026). Expect ~20 min initial review; one round of iteration likely.

## Out of scope

- Multi-language support beyond graceful skip. v1 ships English-only kicker scoring; vernacular ships as separate GFI per platform ADR 0019/0020 per-language eval-gate.
- Style-guide-aware scoring (whether the opening matches the newsroom's house style). Style-aware scoring requires editorial-DNA integration; separate GFI.
- Comparison with the rest of the article. v1 looks at opening 200 words only.
- Subscription-conversion analytics integration. That's a `m-post-publish-diagnostic` concern; separate GFI.

## References

- ADR 0035 (decision-support not autopilot)
- Xtnd `docs/INTEGRATION-SPEC.md` `cap_distribution_fit_scores` schema
- Xtnd `docs/good-first-issues/INDEX.md` Category 2
- Platform ADR 0004 (Claude Agent SDK; cost ceilings)
- Platform ADR 0020 (per-language eval gate — applies to LLM-second-pass)
