#!/usr/bin/env bash
# Set GitHub Actions secrets for Neurodiversevoices/Orbital.
# Requires: brew install gh; export GITHUB_TOKEN=<fine-grained PAT with repo secrets write>
# Usage:
#   export GITHUB_TOKEN=ghp_...
#   export REVENUECAT_SECRET_API_KEY=sk_...   # optional if not in .env
#   ./scripts/set-github-actions-secrets.sh

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="Neurodiversevoices/Orbital"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh" >&2
  exit 1
fi

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "Set GITHUB_TOKEN to a GitHub PAT with secrets write for ${REPO}" >&2
  exit 1
fi

echo "$GITHUB_TOKEN" | gh auth login --with-token 2>/dev/null || true
gh auth status

EXPO_TOKEN="$(grep '^EXPO_TOKEN=' "$REPO_ROOT/.env" | cut -d'=' -f2-)"
if [[ -z "$EXPO_TOKEN" ]]; then
  echo "No EXPO_TOKEN in $REPO_ROOT/.env" >&2
  exit 1
fi

P8_PATH="$REPO_ROOT/keys/AuthKey_HD4HWHHYDK.p8"
if [[ ! -f "$P8_PATH" ]]; then
  echo "Missing $P8_PATH" >&2
  exit 1
fi

RC_KEY="${REVENUECAT_SECRET_API_KEY:-}"
if [[ -z "$RC_KEY" ]] && [[ -f "$REPO_ROOT/.env" ]]; then
  RC_KEY="$(grep '^REVENUECAT_SECRET_API_KEY=' "$REPO_ROOT/.env" 2>/dev/null | cut -d'=' -f2- || true)"
fi
if [[ -z "$RC_KEY" ]]; then
  echo "Set REVENUECAT_SECRET_API_KEY env or add to .env" >&2
  exit 1
fi

echo "Setting EXPO_TOKEN..."
printf '%s' "$EXPO_TOKEN" | gh secret set EXPO_TOKEN --repo "$REPO"

echo "Setting ASC_API_KEY_P8..."
gh secret set ASC_API_KEY_P8 --repo "$REPO" < "$P8_PATH"

echo "Setting REVENUECAT_SECRET_API_KEY..."
printf '%s' "$RC_KEY" | gh secret set REVENUECAT_SECRET_API_KEY --repo "$REPO"

echo "Done. Verify: gh secret list --repo $REPO"
