#!/usr/bin/env bash
# One pipeline pass for the Fly scheduled worker (onlinejourno-worker).
#
# Env comes from Fly secrets: DATABASE_URL, ANTHROPIC_API_KEY, LLM_PROVIDER,
# ANTHROPIC_DEFAULT_MODEL, and optionally NTFY_TOPIC / OJ_TENANT.
# LLM spend is bounded by the tenant's cost_budgets.daily_cap_usd ($ guard);
# collect / trends / affinity-log are free.
#
# No `set -e`: one failing source or step must not abort the rest of the run
# (mirrors infra/cron/pipeline.sh). Each step's exit is logged.
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
step onlinejourno-agents  onlinejourno-agents  frame         --tenant "$TENANT" --since-hours 48 --limit 12
step onlinejourno-agents  onlinejourno-agents  claim-extract --tenant "$TENANT" --since-hours 48 --limit 12
step onlinejourno-agents  onlinejourno-agents  calendar-fuse --tenant "$TENANT"
step onlinejourno-agents  onlinejourno-agents  affinity-log  --tenant "$TENANT"
step onlinejourno-agents  onlinejourno-agents  trends        --tenant "$TENANT" --window-hours 24
if [ -n "${NTFY_TOPIC:-}" ]; then
  step onlinejourno-agents onlinejourno-agents alert --tenant "$TENANT" --threshold 80
fi
echo "── done $(date -u '+%Y-%m-%dT%H:%M:%SZ') ──"
