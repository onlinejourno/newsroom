#!/usr/bin/env bash
# One pipeline pass for the Fly scheduled worker (onlinejourno-worker).
#
# Env from Fly secrets: DATABASE_URL, ANTHROPIC_API_KEY, LLM_PROVIDER,
# ANTHROPIC_DEFAULT_MODEL, optionally NTFY_TOPIC / OJ_TENANT.
# LLM spend is bounded by the tenant's cost_budgets.daily_cap_usd; collect /
# trends / affinity-log are free.
#
# Runs via `uv run` (uv populates the workspace venv on first call). No `set -e`:
# one failing step must not abort the rest (mirrors infra/cron/pipeline.sh).
# NOTE: first step per machine re-syncs the venv (~1 min, pulls playwright).
# Optimisation (bake the venv so console scripts run directly) is a follow-up —
# the build's `uv sync` isn't persisting a populated /app/.venv yet.
set -u
TENANT="${OJ_TENANT:-self}"

step() {
  local pkg="$1"; shift
  echo "→ $* (--package $pkg)"
  uv run --package "$pkg" "$@" || echo "  ✗ step failed (rc=$?), continuing"
  echo
}

echo "── $(date -u '+%Y-%m-%dT%H:%M:%SZ') onlinejourno-worker pipeline · tenant=$TENANT ──"
step onlinejourno-ingest  onlinejourno-ingest  collect       --tenant "$TENANT"
step onlinejourno-agents  onlinejourno-agents  enrich        --tenant "$TENANT" --since-hours 48 --limit 80
step onlinejourno-agents  onlinejourno-agents  entity-coverage --tenant "$TENANT"
step onlinejourno-agents  onlinejourno-agents  pitch-score   --tenant "$TENANT"
step onlinejourno-agents  onlinejourno-agents  frame         --tenant "$TENANT" --since-hours 48 --limit 12
step onlinejourno-agents  onlinejourno-agents  cluster       --tenant "$TENANT" --since-hours 24
step onlinejourno-agents  onlinejourno-agents  claim-extract --tenant "$TENANT" --since-hours 48 --limit 12
step onlinejourno-agents  onlinejourno-agents  calendar-fuse --tenant "$TENANT"
step onlinejourno-agents  onlinejourno-agents  affinity-log  --tenant "$TENANT"
step onlinejourno-agents  onlinejourno-agents  trends        --tenant "$TENANT" --window-hours 24
if [ -n "${NTFY_TOPIC:-}" ]; then
  step onlinejourno-agents onlinejourno-agents alert --tenant "$TENANT" --threshold 80
fi
echo "── done $(date -u '+%Y-%m-%dT%H:%M:%SZ') ──"
