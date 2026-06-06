# ADR 0029 — Trust primitives: AI-use disclosure + off-record signal flag

**Status:** Accepted (2026-06-04).

## Context

The platform's editorial-trust posture is codified in `CONTEXT.md` core principles 1-6 (editorial judgement remains human; AI never invents a source; trust ladder not feature ladder; source attribution always). Translating those principles into shipping primitives is what builds editor confidence in the first 14 days of pilot use.

Two specific primitives are cheap to ship, identity-aligned, and absent from the original `MVP-SCOPE.md` brief feature set:

1. **AI-use disclosure on every brief.** The brief composer invokes Sonnet and runs multi-step reasoning. Editors and (eventually) readers need to know, per brief, which models composed it, which agents ran, whether a human editor reviewed before delivery, and a human-readable disclosure string. This is the practical surface of "AI assists; the final publish/kill call belongs to the editor."

2. **Off-record signal flag.** A journalist working a beat regularly receives signals that should not become briefs — embargoed material received in confidence, sensitive sources, ethically off-record disclosures. The platform must let the journalist mark a signal off-record from the brief viewer or signal-detail view, with the marking respected by shortlist and brief composition.

Each primitive directly supports the trust ladder. Each is cheap (≈4 hours of schema + composer filter + UI toggle). Each precedes the broader "responsible digital journalism" conversation about AI-era newsroom workflows.

## Decision

Ship both primitives in MVP. They are first-class features, not deferred-Y2 work.

### AI-use disclosure on briefs

Schema additions (already in `infra/schema.sql`):

```sql
alter table briefs
  add column if not exists ai_disclosure jsonb not null default jsonb_build_object(
    'models_used', '[]'::jsonb,
    'agents_invoked', '[]'::jsonb,
    'human_edited', false,
    'human_editor_id', null,
    'human_reviewed_at', null,
    'disclosure_text', null,
    'schema_version', 1
  );
```

Runtime contract:

- `brief-compose` agent (per `MVP-SCOPE.md` two-agent architecture) writes the `models_used`, `agents_invoked`, and `disclosure_text` fields at brief composition time.
- The brief viewer in `apps/web` surfaces the disclosure as a small "How this brief was composed" footer on every brief.
- When a human editor reviews and approves a brief before delivery, the brief viewer toggles `human_edited = true`, sets `human_editor_id`, and stamps `human_reviewed_at`. The disclosure footer updates accordingly.
- The disclosure JSONB schema is versioned (`schema_version = 1`); future evolutions bump the version and the renderer falls back to legacy display.

### Off-record signal flag

Schema additions (already in `infra/schema.sql`):

```sql
alter table signals
  add column if not exists off_record boolean not null default false;

create table if not exists signal_off_record_log (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  signal_id       uuid not null references signals(id) on delete cascade,
  action          text not null check (action in ('marked','unmarked')),
  actor_user_id   uuid references users(id),
  occurred_at     timestamptz not null default now(),
  reason          text
);
```

Runtime contract:

- The brief viewer offers an "Off the record" action on each shortlisted signal. The action sets `signals.off_record = true` and writes a `signal_off_record_log` row.
- The action is **reversible**. Unmarking writes another `signal_off_record_log` row with `action = 'unmarked'`.
- The `ingest-score` agent filters `where off_record = false` when reading signals to score.
- The `brief-compose` agent filters `where off_record = false` when reading shortlist items to compose.
- The signal-detail view shows the off-record state and the log to the marker and to the beat's editor only.
- Off-record signals **never** leave the tenant boundary. Row-level security (ADR 0005) plus application middleware enforce.
- An optional `reason` string captured at the marking moment is private to the marker + editor; it is not shared in any aggregate, cross-tenant or otherwise.

### Why these two and not others

Other identity-aligned trust primitives (e.g., C2PA content credentials, `ai.txt` policy module, AI-crawler licensing controls) are equally aligned but more expensive to ship. They are deferred to later (Xtnd ADR 0006 watch-trigger for `ai.txt` acceleration; C2PA pinned to Y2+). The two primitives in this ADR cost ≈4 hours each and ship inside MVP without violating the locked MVP-SCOPE elsewhere.

### What this ADR does not change

- The MVP wedge (markets/regulatory beat) is unchanged.
- The single design partner posture is unchanged.
- The two-agent architecture is unchanged; both primitives are filters and metadata, not new agents.
- The cost ceiling per newsroom (₹150/day MVP) is unchanged; both primitives add zero Anthropic API calls beyond what the existing agents already make.
- The eval set posture is unchanged; brief-composer eval should be extended to verify the disclosure JSONB is populated correctly (4-line eval addition).

## Consequences

- **Editorial trust ladder gets two cheap rungs immediately.** Editor sees the disclosure footer from day one of pilot; journalist has the off-record control from day one.
- **`briefs.content` JSONB stays editorial.** Disclosure metadata lives in a separate column rather than nesting inside `briefs.content`, keeping the editorial-shaped canonical model clean for future Xtnd extension.
- **Off-record is structurally enforced, not policy-only.** Filter is in the agent layer (both `ingest-score` and `brief-compose`), backed by RLS at the database layer. No reliance on operator discipline.
- **Reversibility is explicit.** Off-record is a state, not a deletion. Mismarkings are recoverable; the log shows accountability.
- **Off-record data never leaks.** The `reason` string and the off-record state are tenant-scoped (ADR 0005), customer-confidential (ADR 0025), and architecturally insulated from any cross-tenant aggregation.
- **Brief composer eval needs one assertion.** Existing eval harness extends to assert `briefs.ai_disclosure -> 'models_used'` is non-empty and `'disclosure_text'` is non-null for any brief that shipped through the composer.

## Anti-patterns refused

- Burying disclosure inside `briefs.content` JSONB. Reader-visible disclosure metadata belongs in its own column.
- Treating off-record as a soft hint that downstream agents may override. Off-record is a hard filter at the agent boundary.
- Allowing off-record markings without an audit trail. The log is part of the primitive, not optional.
- Defaulting off-record visible to the whole desk. Default is marker + editor only.
- Auto-disclosing models used to readers without editor consent. Disclosure text is surfaced; the *automatic* part is the model list, agents list, edit state — not a marketing tagline. Editor controls the human-readable disclosure string per tenant.

## Revisit

Revisit when:

- A third trust primitive is proposed for MVP. Bar: cheap (≤8 hours), identity-aligned (matches `CONTEXT.md` principles), and not already covered by an Xtnd module on the Y2+ roadmap.
- The disclosure schema evolves (`schema_version = 2`). New ADR documents the migration path.
- C2PA content credentials become cheap enough to ship in MVP (estimated Y2 H1 alongside Xtnd ADR 0006 acceleration triggers).

## References

- `CONTEXT.md` core principles 1-6
- `docs/MVP-SCOPE.md` two-agent architecture, success criteria
- ADR 0004 (Claude Agent SDK)
- ADR 0005 (multi-tenant row-level)
- ADR 0025 (voluntary contribution; customer confidentiality)
- ADR 0026 (sustainability rules)
- Xtnd ADR 0001 (relation to platform) — Xtnd extends canonical model; this ADR locks the shape it extends
- Xtnd ADR 0006 (AI-surface watch-trigger) — defers heavier AI-crawler licensing primitives to Y2+
