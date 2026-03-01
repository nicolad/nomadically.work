#!/usr/bin/env bash
set -euo pipefail

HOOKS_BIN="${HOOKS_BIN:-hooks}"
HOOKS_PORT="${HOOKS_PORT:-19836}"
HOOKS_LOG="${HOOKS_LOG:-info}"
PID_FILE="${HOME}/.cache/claude-hooks/server.pid"
LOG_FILE="${HOME}/.cache/claude-hooks/server.log"

mkdir -p "$(dirname "$PID_FILE")"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "hooks server already running (pid $PID)"
        exit 0
    fi
    rm -f "$PID_FILE"
fi

# Require DEEPSEEK_API_KEY
if [ -z "${DEEPSEEK_API_KEY:-}" ]; then
    echo "error: DEEPSEEK_API_KEY env var is required" >&2
    exit 1
fi

# Start as background daemon
HOOKS_LOG="$HOOKS_LOG" DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
    nohup "$HOOKS_BIN" > "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"
echo "hooks server started (pid $!, port $HOOKS_PORT, log $LOG_FILE)"

# Wait for server to be ready
for i in $(seq 1 20); do
    if curl -sf "http://127.0.0.1:${HOOKS_PORT}/health" > /dev/null 2>&1; then
        echo "hooks server ready"
        exit 0
    fi
    sleep 0.25
done

echo "warning: server may not be ready yet — check $LOG_FILE" >&2
