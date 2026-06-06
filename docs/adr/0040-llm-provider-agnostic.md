# ADR 0040 — LLM provider is configurable (bring your own model)

**Status:** Accepted (2026-06-05). Supersedes the provider-lock in ADR 0004 (the agent runtime and model-routing remain; the *single-vendor* constraint is lifted).

## Context

ADR 0004 locked the agent runtime to the Claude Agent SDK and accepted "cannot trivially swap to a different LLM provider" as a Y3 problem. In practice the two MVP agents (`ingest-score`, `brief-compose`) are **single structured completions**, not tool-loop agents, so they never needed the Agent SDK runtime — they make one call behind a `complete_json(...)` seam.

Two forces make provider-lock wrong for this product:

1. **Newsroom autonomy + trust.** A journalist-first, FOSS-first product (ADR 0028) should not force every newsroom onto one US AI vendor. Some newsrooms will refuse Big-Tech LLMs on principle, on cost, or on data-governance grounds; some want a self-hosted open model so no copy leaves their building.
2. **ADR 0028 Layer 2 is tenant-neutral and configurable.** The LLM is a Layer-2 concern. OnlineJourno picks a sensible *default* (Layer 1); the tenant plugs in their own (Layer 2).

## Decision

The LLM behind the agents is **configurable**. The `complete_json` seam in `packages/agents-py/client.py` dispatches to a provider chosen by environment (later: per-tenant `tenants.config`).

Providers shipped:

- **`anthropic`** — Claude direct. The **default** (Layer-1 default).
- **`openai`** — any OpenAI-compatible endpoint via `base_url`. One provider covers:
  - OpenAI hosted models.
  - **OpenRouter** → Gemini, Mistral, Llama, DeepSeek, Qwen, and most frontier + open models through one base URL.
  - **Self-hosted Ollama / vLLM** — fully local, no data leaves the newsroom, no Big-Tech dependency. This is the FOSS-trust path.
  - Together, Groq, Azure OpenAI, and other OpenAI-compatible gateways.

Configuration (env; see `.env.example`):

```
LLM_PROVIDER=anthropic|openai      # default anthropic
LLM_MODEL=<model id>               # default per provider
LLM_BASE_URL=<url>                 # openai provider (Ollama/vLLM/OpenRouter/…)
LLM_API_KEY=<key>                  # falls back to ANTHROPIC_API_KEY / OPENAI_API_KEY
LLM_PRICE_IN / LLM_PRICE_OUT       # price an unlisted cloud model for the cap
```

### Cost guard stays intact

`agent_traces.cost_usd` and the per-tenant daily cap (ADR 0004 cost discipline, `cost_budgets`) still apply. Cost is computed from a per-model price table or an env override. **Unknown / self-hosted models are untracked ($0)** — correct, since a local model has no API cost — and a `cost_tracked=false` flag is recorded so an operator can tell "$0 because local" from "$0 because unpriced."

### What does NOT change

- The single-Postgres store, multi-tenant model, eval harness, reasoning-trace mandate (CLAUDE.md rule 10 — every call still writes a trace, whatever the provider).
- The "zero Opus, zero tools" discipline on these single-shot agents (now expressed as "no tool loop" regardless of vendor).
- ADR 0004's runtime choice for any *future multi-step* agent (thread resolution, Y2). If/when a true tool-loop agent ships, it can still use the Claude Agent SDK, or a provider-neutral agent runtime — that's a separate decision.

## Consequences

- A newsroom can run OnlineJourno on Claude, GPT, Gemini, an open model via OpenRouter, or a fully local Ollama/vLLM box — by editing env.
- Provider portability is a typed seam, not a rewrite: adding a third provider is one function.
- Shortlist/brief quality varies by model; the eval harness (per-tenant goldset) is how a newsroom checks their chosen model clears the bar before trusting it. Model choice becomes an eval-gated decision, not a lock.
- Slightly more dependency surface (`openai` SDK alongside `anthropic`). Acceptable — two SDKs cover essentially every LLM a newsroom would pick.

## Revisit

If a true multi-step agent needs a provider-neutral *tool-calling* runtime (not just single completions), evaluate one then. Until then, the single-completion seam is enough and this ADR governs.

## References

- ADR 0004 (agent runtime + cost discipline — superseded only on the single-vendor point)
- ADR 0028 (FOSS-first; Layer 1 strict vs Layer 2 tenant-neutral)
- ADR 0026 (sustainability — fewer vendor dependencies to chase)
- `packages/agents-py/client.py`, `.env.example`
