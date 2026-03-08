#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install npm dependencies (idempotent, uses cache on subsequent runs)
npm install

# Install Playwright browsers for e2e tests (best-effort, may fail in restricted networks)
npx playwright install chromium || true
