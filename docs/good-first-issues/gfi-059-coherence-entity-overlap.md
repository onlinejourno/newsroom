# GFI 059 — Entity-overlap narrative-coherence detector

> Template drafted Wk 0 of Xtnd; published as live GitHub Issue at Wk 100 public flip; depends on `m-narrative-coherence` Y3 module.

## What

Add `entity_overlap` advisory rule to the `m-narrative-coherence` module. When a new story (signal or draft brief) shares ≥30% of named entities with an existing story thread, the rule fires an advisory popup in the brief viewer or draft view: *"Looks related to thread `<title>` — link?"* The popup is dismissible with optional reason; if accepted, the thread is linked via `thread_links`.

This rule extends the deterministic continuity check shipped in v0.1 capability-tier release (`m-narrative-spine`) by adding a more sophisticated overlap-scoring algorithm with confidence-based ranking. It's the second-pass advisory; the first-pass continuity check ships in backbone.

## Why

Story-family integrity depends on contributors and editors linking stories that belong together. Manual linking has historically been the failure mode (institutional memory walks away when reporters leave; new reporter doesn't know the March story exists). Entity-overlap detection surfaces likely-related stories at file time, when the cost of remembering is zero.

The rule is deterministic and cheap; no LLM call required. If the rule fires too noisily (too many false positives), contributors can later add a confidence threshold or an LLM-second-pass; v1 is the deterministic foundation.

## Module / location

`packages/modules/m-narrative-coherence/rules/entity_overlap.ts`

The `m-narrative-coherence` module Module Contract is part of Y3 backbone (per `ROADMAP.md` Y3 module set 2). This GFI is published when the parent module ships.

## Module Contract scaffold

Rule interface:

```ts
export interface CoherenceRule {
  ruleName: string;
  level: 'advisory' | 'hard-block';  // entity_overlap is always advisory
  evaluate(input: RuleInput): Promise<RuleOutput>;
}

export interface RuleInput {
  brief: Brief;
  draftSignal?: Signal;
  existingThreads: Thread[];     // active threads in this tenant
  config: RuleConfig;
}

export interface RuleOutput {
  fires: boolean;
  affectedThreadIds: string[];
  confidence: number;
  reason: string;
  suggestion: 'link' | 'review' | 'ignore';
  dismissibleByReporter: boolean;
}
```

## Inputs / outputs

**Inputs:**

- The new brief or draft signal (with `body_text` and extracted entities).
- All active threads in the tenant (per `threads.closed_at IS NULL`).
- Each thread's linked signals (with their extracted entities).
- Config: `{ overlap_threshold: 0.3, min_entities_per_thread: 3, max_threads_considered: 100 }` (defaults).

**Outputs:**

- `fires: boolean` — true if any thread overlap ≥ threshold.
- `affectedThreadIds: string[]` — threads above threshold, ranked by overlap descending.
- `confidence: number` (0..1) — max overlap score.
- `reason: string` — human-readable explanation ("Shared entities: Pixel Industries, SEBI, promoter pledge — likely related to thread 'pixel-acquisition-saga'").
- `suggestion: 'link'` — for top-1 thread; reporter accepts (`link_signal`) or dismisses (`dismiss_continuity`).

Result persisted in `narrative_decisions` (per `m-narrative-spine` exemplar) when reporter acts.

## Acceptance criteria

- [ ] Rule file at `packages/modules/m-narrative-coherence/rules/entity_overlap.ts` implements `CoherenceRule` interface with `level: 'advisory'`.
- [ ] Deterministic overlap algorithm:
  - Entities extracted from `signals.raw_payload.entities` (assumed populated by platform's deterministic entity extraction in pre-filter, per platform `docs/MVP-SCOPE.md`).
  - Overlap = `|new.entities ∩ thread.entities| / |new.entities|` (Jaccard against thread's union, or count-overlap; document choice).
  - Threshold default 0.3; configurable per tenant.
  - Considers only threads with ≥3 linked signals (avoid one-shot threads polluting suggestions).
- [ ] Caps consideration to top-100 most recently active threads (per `threads.opened_at` descending).
- [ ] Returns ranked `affectedThreadIds` list (top first).
- [ ] Generates reason string listing the top 5 shared entities.
- [ ] Cost-budget aware: zero LLM calls (deterministic).
- [ ] RLS-aware: every query `tenant_id`-scoped.
- [ ] Unit tests cover: high-overlap match (≥0.8); no overlap; multiple threads above threshold; below-min-entities thread excluded; non-English entity name handling; entity-name aliasing (e.g., "Pixel Industries" vs "Pixel Industries Ltd.").
- [ ] Eval fixture: `eval/goldset/entity-overlap.csv` has 30 hand-labelled examples — for each new signal + existing thread set, the expected `fires`, `affectedThreadIds`, `confidence`.
- [ ] No new top-level dependencies.
- [ ] README of `m-narrative-coherence` updated with "Available rules" table listing this rule + version + tuning parameters.
- [ ] Demo tenant seed data extended: at least 2 of the demo signals trigger entity-overlap advisory popups against demo threads.
- [ ] Decision-support compliant: rule is advisory; reporter or editor decides to link or dismiss.

## Estimated effort

8-12 hours for an experienced contributor. Includes: overlap algorithm + ranking + reason-generator + tests + eval fixture + tuning notes + demo data extension.

## Skill level

`experienced-contributor`

## Review SLA

Reviewed in the next Friday review window (per platform ADR 0026).

## Out of scope

- Embedding-based semantic-similarity scoring. Entity-overlap is intentionally lexical; embedding-based similarity is a separate GFI under Category 6 with higher compute cost.
- Entity disambiguation (e.g., "Apple" the company vs "apple" the fruit). v1 trusts the entity extraction; disambiguation lives in platform-side entity-extraction improvements.
- Cross-tenant entity matching. Threads in tenant A never compare against threads in tenant B (per platform ADR 0025).
- Automatic linking. Suggestion is always reporter-confirmed.

## References

- ADR 0035 (decision-support not autopilot)
- Xtnd `docs/INTEGRATION-SPEC.md` `narrative_decisions` table + `xtnd_*` schema
- Xtnd `docs/good-first-issues/INDEX.md` Category 6
- ADR 0031 (Open Capability-Tier Release — `m-narrative-spine` exemplar)
- Platform ADR 0006 (Module plugin architecture)
- Platform `MVP-SCOPE.md` pre-filter entity extraction
