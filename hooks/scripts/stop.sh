#!/usr/bin/env bash
set -euo pipefail

HOOKS_PORT="${HOOKS_PORT:-19836}"
PID_FILE="${HOME}/.cache/claude-hooks/server.pid"

# Try graceful shutdown via endpoint
if curl -sf -X POST "http://127.0.0.1:${HOOKS_PORT}/shutdown" > /dev/null 2>&1; then
    echo "hooks server shutting down gracefully"
    sleep 0.5
fi

# Kill by PID if still alive
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        echo "sent SIGTERM to pid $PID"
    fi
    rm -f "$PID_FILE"
fi

echo "hooks server stopped"
