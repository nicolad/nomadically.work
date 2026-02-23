#!/usr/bin/env bash
set -euo pipefail

echo "Setting up Pyodide dependencies for deep-planner worker..."

# Sync Python modules for Pyodide runtime
if command -v uv &>/dev/null; then
  uv run pywrangler sync
else
  echo "Warning: uv not found, skipping pywrangler sync"
fi

echo "Done."
