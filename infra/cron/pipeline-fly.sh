#!/usr/bin/env bash
# One pipeline pass for the Fly scheduled worker (onlinejourno-worker).
#
# Env from Fly secrets: DATABASE_URL, ANTHROPIC_API_KEY, LLM_PROVIDER,
# ANTHROPIC_DEFAULT_MODEL, optionally NTFY_TOPIC / OJ_TENANT.
# LLM spend is bounded by the tenant's cost_budgets.daily_cap_usd; collect /
# trends / affinity-log are free.
#
# The baked venv is on PATH (Dockerfile.worker), so console scripts run
# directly — no `uv run` at runtime, no per-invocation re-sync. No `set -e`:
# one failing step must not abort the rest (mirrors infra/cron/pipeline.sh).
set -u
TENANT="${OJ_TENANT:-self}"

step() {
  echo "→ $*"
  "$@" || echo "  ✗ step failed (rc=$?), continuing"
  echo
}

echo "── $(date -u '+%Y-%m-%dT%H:%M:%SZ') onlinejourno-worker pipeline · tenant=$TENANT ──"
step onlinejourno-ingest collect       --tenant "$TENANT"
step onlinejourno-agents enrich        --tenant "$TENANT" --since-hours 48 --limit 80
step onlinejourno-agents frame         --tenant "$TENANT" --since-hours 48 --limit 12
step onlinejourno-agents claim-extract --tenant "$TENANT" --since-hours 48 --limit 12
step onlinejourno-agents calendar-fuse --tenant "$TENANT"
step onlinejourno-agents affinity-log  --tenant "$TENANT"
step onlinejourno-agents trends        --tenant "$TENANT" --window-hours 24
if [ -n "${NTFY_TOPIC:-}" ]; then
  step onlinejourno-agents alert --tenant "$TENANT" --threshold 80
fi
echo "── done $(date -u '+%Y-%m-%dT%H:%M:%SZ') ──"
