#!/usr/bin/env bash
# SessionStart hook — adapted from ECC's "session-start" automation, trimmed to
# what a single Create React App sandbox actually needs:
#   1. make sure deps are installed so `npm test` / lint work in a fresh container
#   2. print a short orientation so a new session knows where it is
#
# Fast by design: only installs when node_modules is missing (ephemeral web
# containers clone fresh, so this is the common path); otherwise it's a no-op.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

if [ ! -d node_modules ]; then
  echo "[session-start] node_modules absent — installing deps (npm ci)…" >&2
  npm ci --no-audit --no-fund >&2 || npm install --no-audit --no-fund >&2
fi

echo "[session-start] @korex-tech/client-tests — CRA React test client."
echo "[session-start] verify a change:  npm test -- --watchAll=false   |   lint: npx eslint src"
echo "[session-start] handoffs live in docs/*-HANDOFF.md (work must survive ephemeral sessions)."
