#!/bin/bash
set -e

ROLLOUT=${1:-10}
echo "🚀 Staged OTA rollout: ${ROLLOUT}%"

eas update \
  --channel production \
  --message "$(git log -1 --pretty=%B)" \
  --rollout-percentage "$ROLLOUT" \
  --non-interactive

echo "✅ OTA live for ${ROLLOUT}% of users"
echo "Monitor for 1 hour then run:"
echo "./scripts/ota-staged.sh 100"
