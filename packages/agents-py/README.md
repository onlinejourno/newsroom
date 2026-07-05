# onlinejourno-agents

LLM agents for OnlineJourno. Two single-shot, cost-capped, fully-traced,
**provider-agnostic** agents:

- **`ingest-score`** (Agent 1, MVP-SCOPE) — one LLM call per candidate signal. Returns a relevance score (0–1), a one-line rationale, and a beat tag. Writes the top-N into `shortlist_items`.
- **`brief-compose`** (Agent 2, MVP-SCOPE) — one LLM call per beat per morning. Reads the shortlist, composes the daily brief as structured JSON into `briefs.content`, and populates `briefs.ai_disclosure` (ADR 0029).

## Bring your own LLM (ADR 0040)

The LLM behind both agents is configurable. Default is Anthropic/Claude; a
newsroom can point at any OpenAI-compatible endpoint — OpenAI, OpenRouter
(→ Gemini / Mistral / Llama / DeepSeek), or **self-hosted Ollama / vLLM**
(no copy leaves the building, no Big-Tech dependency).

```
LLM_PROVIDER=anthropic|openai     # default anthropic
LLM_MODEL=<model id>              # default per provider
LLM_BASE_URL=<url>               # openai provider (Ollama/vLLM/OpenRouter/…)
LLM_API_KEY=<key>                # falls back to ANTHROPIC_API_KEY / OPENAI_API_KEY
```

Examples:

```bash
# Claude (default)
LLM_PROVIDER=anthropic LLM_MODEL=claude-sonnet-4-5

# Local Ollama — fully self-hosted, no API key, untracked cost
LLM_PROVIDER=openai LLM_MODEL=llama3.1 LLM_BASE_URL=http://localhost:11434/v1

# OpenRouter → Gemini
LLM_PROVIDER=openai LLM_MODEL=google/gemini-2.0-flash \
  LLM_BASE_URL=https://openrouter.ai/api/v1 LLM_API_KEY=sk-or-...
```

## Design notes

- **Single-shot, not agentic.** Each agent makes one structured completion. No tool loop. ADR 0004's Claude Agent SDK runtime is for *multi-step* agents (e.g. thread resolution, Y2). These two are single completions behind one `complete_json` seam, so the provider is swappable (ADR 0040). Revisit if either grows a tool loop.
- **Zero tools.** `tool_calls = 0` in every trace, whatever the provider.
- **Every call is traced.** Each completion writes an `agent_traces` row (model, tokens, cost, reasoning, status) before the result is used. CLAUDE.md rule 10: no silent agent decisions.
- **Cost-capped structurally.** Before each call the runner sums today's `agent_traces.cost_usd` for the tenant and stops if it would exceed `cost_budgets.daily_cap_usd`. Self-hosted/unpriced models are untracked ($0) so a local model is never blocked by the cap.
- **Off-record respected.** Candidate selection filters `off_record = true` (ADR 0029) when the column exists. Graceful before PR #2 lands.

## Usage

```bash
# Score unscored signals for the markets/regulatory beat into the shortlist
onlinejourno-agents shortlist --tenant self --beat markets-regulatory --all

# Compose the daily brief for that beat from the shortlist
onlinejourno-agents brief --tenant self --beat markets-regulatory

# Render the latest brief as Markdown (the artifact you show a journalist)
onlinejourno-agents show-brief --tenant self --beat markets-regulatory
```

Requires `DATABASE_URL` and a configured LLM provider (see above) in `.env`
at the repo root.

## Why a separate package

- `ingest-py` = collectors (no LLM).
- `scoring-py` = deterministic editorial scorers (PEJ framing, EEAT, SQEG) — Wk 9+ modules.
- `agents-py` = the LLM decisions (this package) — MVP core.

Keeping them separate keeps each package's dependency surface and purpose clean.
