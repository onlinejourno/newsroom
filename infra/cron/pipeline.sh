#!/bin/zsh
# OnlineJourno pipeline — collect → enrich → frame → trends → alert.
# Designed for cron (every 30 min). The daily LLM cap (tenants.daily_cap_usd)
# is the spend guard: enrich/frame stop at the cap, collect/trends are free.
#
# Install:  crontab -e  →
#   */30 * * * * /Users/subhashrai/projects/platform/infra/cron/pipeline.sh
# Logs: ~/Library/Logs/onlinejourno-pipeline.log

set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="$HOME/Library/Logs/onlinejourno-pipeline.log"
TENANT="${OJ_TENANT:-self}"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$REPO" || exit 1
# .env carries DATABASE_URL / provider keys / NTFY_TOPIC (user-managed).
[ -f .env ] && set -a && source .env && set +a

{
  echo "── $(date '+%Y-%m-%d %H:%M:%S') pipeline run ──"
  uv run --package onlinejourno-ingest onlinejourno-ingest collect --tenant "$TENANT" 2>&1 | tail -1
  uv run --package onlinejourno-agents onlinejourno-agents enrich --tenant "$TENANT" --since-hours 24 --limit 24 2>&1 | tail -1
  uv run --package onlinejourno-agents onlinejourno-agents frame --tenant "$TENANT" --since-hours 24 --limit 8 2>&1 | tail -1
  uv run --package onlinejourno-agents onlinejourno-agents trends --tenant "$TENANT" --window-hours 24 2>&1 | tail -1
  if [ -n "${NTFY_TOPIC:-}" ]; then
    uv run --package onlinejourno-agents onlinejourno-agents alert --tenant "$TENANT" --threshold 80 2>&1 | tail -1
  else
    echo "alerts: skipped (NTFY_TOPIC not set in .env)"
  fi
} >> "$LOG" 2>&1
