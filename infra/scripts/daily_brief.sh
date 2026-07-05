#!/bin/bash
# Daily brief pipeline — run by launchd at 06:30 IST (see the .plist alongside).
# Collects new signals, scores the unscored into the shortlist, then composes
# the brief from the last 36h of shortlist (so it's a *daily* brief, not the
# all-time top). Reads keys from the repo-root .env via each package's loader.
set -uo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# Repo root = two levels up from this script (infra/scripts/ -> repo).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../.." || exit 1

TENANT="${OJ_TENANT:-self}"
BEAT="${OJ_BEAT:-markets-regulatory}"
TOP="${OJ_TOP:-15}"

echo "[$(date)] daily-brief start (tenant=$TENANT beat=$BEAT)"

# Collect is best-effort — a flaky source must not abort the brief.
uv run --package onlinejourno-ingest onlinejourno-ingest collect \
  --tenant "$TENANT" --beat "$BEAT" || echo "[$(date)] collect had failures (continuing)"

uv run --package onlinejourno-agents onlinejourno-agents shortlist \
  --tenant "$TENANT" --beat "$BEAT" --top "$TOP" --since-hours 36

# Group recent signals into story threads (precise velocity). Best-effort.
uv run --package onlinejourno-agents onlinejourno-agents cluster \
  --tenant "$TENANT" --beat "$BEAT" --since-hours 24 || echo "[$(date)] cluster failed (continuing)"

uv run --package onlinejourno-agents onlinejourno-agents brief \
  --tenant "$TENANT" --beat "$BEAT" --top "$TOP" --since-hours 24

echo "[$(date)] daily-brief done"
