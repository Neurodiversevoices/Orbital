#!/bin/bash
set -e

CHANNEL=${1:-production}
echo "Publishing OTA to channel: $CHANNEL"

# Publish update
eas update \
  --channel "$CHANNEL" \
  --message "$(git log -1 --pretty=%B)" \
  --non-interactive

echo "✅ OTA published to $CHANNEL"
echo "Users will receive update on next launch"
