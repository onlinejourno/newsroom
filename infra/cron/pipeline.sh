#!/bin/zsh
# OnlineJourno pipeline — collect → enrich → frame → claim-extract → calendar-fuse → affinity-log → trends → alert.
# Designed for cron (every 30 min). The daily LLM cap (tenants.daily_cap_usd)
# is the spend guard: enrich/frame stop at the cap, collect/trends/affinity-log are free.
#
# Install:  crontab -e  →
#   */30 * * * * /ABSOLUTE/PATH/TO/platform/infra/cron/pipeline.sh
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
  uv run --package onlinejourno-agents onlinejourno-agents entity-coverage --tenant "$TENANT" 2>&1 | tail -1
  uv run --package onlinejourno-agents onlinejourno-agents pitch-score --tenant "$TENANT" 2>&1 | tail -1
  uv run --package onlinejourno-agents onlinejourno-agents frame --tenant "$TENANT" --since-hours 24 --limit 8 2>&1 | tail -1
  uv run --package onlinejourno-agents onlinejourno-agents claim-extract --tenant "$TENANT" --since-hours 48 --limit 12 2>&1 | tail -1
  uv run --package onlinejourno-agents onlinejourno-agents calendar-fuse --tenant "$TENANT" 2>&1 | tail -1
  uv run --package onlinejourno-agents onlinejourno-agents affinity-log --tenant "$TENANT" 2>&1 | tail -1
  uv run --package onlinejourno-agents onlinejourno-agents trends --tenant "$TENANT" --window-hours 24 2>&1 | tail -1
  # Demo own-corpus freshness: promote the demo masthead's new signals into
  # stories and audit them (OJ_DEMO_HOST empty = skip).
  if [ -n "${OJ_DEMO_HOST:-}" ]; then
    uv run --package onlinejourno-agents onlinejourno-agents stories-from-signals --tenant "$TENANT" --host "$OJ_DEMO_HOST" --limit 20 2>&1 | tail -1
    uv run --package onlinejourno-agents onlinejourno-agents score-stories --tenant "$TENANT" 2>&1 | tail -1
    uv run --package onlinejourno-agents onlinejourno-agents enrich --tenant "$TENANT" --stories --limit 20 2>&1 | tail -1
    uv run --package onlinejourno-agents onlinejourno-agents frame --tenant "$TENANT" --stories --limit 20 2>&1 | tail -1
    uv run --package onlinejourno-agents onlinejourno-agents site-crawl --tenant "$TENANT" --host "$OJ_DEMO_HOST" 2>&1 | tail -1
  fi
  if [ -n "${NTFY_TOPIC:-}" ]; then
    uv run --package onlinejourno-agents onlinejourno-agents alert --tenant "$TENANT" --threshold 80 2>&1 | tail -1
  else
    echo "alerts: skipped (NTFY_TOPIC not set in .env)"
  fi
} >> "$LOG" 2>&1
