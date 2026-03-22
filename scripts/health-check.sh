#!/bin/bash
set -e
PASS=0
FAIL=0

check() {
  if eval "$2"; then
    echo "✅ $1"
    PASS=$((PASS + 1))
  else
    echo "❌ $1"
    FAIL=$((FAIL + 1))
  fi
}

echo "🔍 Orbital Health Check"
echo "======================="

check "Privacy URL reachable" \
  "curl -sf https://orbitalhealth.app/privacy \
  > /dev/null"

check "App URL reachable" \
  "curl -sf https://orbitalhealth.app > /dev/null"

check "PrivacyInfo.xcprivacy exists" \
  "test -f ios/Orbital/PrivacyInfo.xcprivacy"

check "No forbidden terms" \
  "! grep -r \
  'diagnosis\\|treatment\\|therapy\\|medical device' \
  app/ components/ > /dev/null 2>&1"

check "ASC API key exists" \
  "test -n \"${ASC_PRIVATE_KEY_PATH}\" && test -f \"${ASC_PRIVATE_KEY_PATH}\""

check "Metadata files exist" \
  "test -f fastlane/metadata/en-US/description.txt"

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [ "$FAIL" -gt 0 ]; then
  echo "❌ Health check FAILED"
  exit 1
fi

echo "✅ All health checks passed"
