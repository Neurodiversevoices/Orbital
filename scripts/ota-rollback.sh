#!/bin/bash
set -e
echo "Rolling back OTA on channel: production"
eas update:rollback \
  --channel production \
  --non-interactive
echo "✅ OTA rolled back"
