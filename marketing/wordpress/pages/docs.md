# Docs &amp; self-hosting

OnlineJourno is open source. Run it on your own infrastructure — your data stays with you.

## Quick start (Docker)

1. Get the code: `git clone https://github.com/onlinejourno/platform`
2. `cp .env.example .env`, then set a session secret: `AUTH_SECRET=$(openssl rand -hex 32)`.
3. `docker compose up --build` → the app at http://localhost:3000.
4. Create your newsroom + first admin with one command (see `SELF-HOST.md` in the repo).

Postgres (with the `pgvector` extension) and database migrations are handled by Compose. An optional
worker runs the enrichment pipeline.

## Bring your own LLM

The enrichment worker is provider-neutral: point it at Anthropic, any OpenAI-compatible endpoint
(OpenRouter → Gemini/Mistral/Llama…), or a self-hosted Ollama/vLLM for a no-Big-Tech deployment.

## Configure your newsroom

Sources, signals, and tools are configured per newsroom in the admin section — nothing is hardcoded
to any outlet. Your masthead, your sources, your beats.

## More

- Full guide: `SELF-HOST.md` in the repository.
- Source code &amp; issues: https://github.com/onlinejourno
- Licence: site content under CC BY 4.0; code under the repository `LICENSE`.
