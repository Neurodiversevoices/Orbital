#!/usr/bin/env bash
# Master submission automation (Orbital).
# Usage: from repo root: ./scripts/submit.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then set -a; source .env; set +a; fi

echo "=== setup-iap.js (ASC sync from lib/subscription/pricing.ts) ==="
node scripts/setup-iap.js

echo "=== setup-revenuecat.js (requires REVENUECAT_SECRET_API_KEY) ==="
node scripts/setup-revenuecat.js || {
  echo "WARN: RevenueCat sync failed — set REVENUECAT_SECRET_API_KEY (sk_...) in .env"
}

echo "=== STAGE 1 — Semantic audit (submission-protocol.md) ==="
BLOCK=0
if grep -rn "medical device\|diagnosis\|diagnose\|treatment\|clinical-grade" app/ components/ locales/ 2>/dev/null | head -1 | grep -q .; then
  echo "BLOCKING: forbidden clinical terms"; BLOCK=1
fi
if grep -rn "console\.log" app/ components/ 2>/dev/null | grep -v "__DEV__" | head -1 | grep -q .; then
  echo "BLOCKING: console.log without __DEV__"; BLOCK=1
fi
if grep -n "handleMockPurchase\|executePurchase" app/upgrade.tsx 2>/dev/null | head -1 | grep -q .; then
  echo "HIGH: mock purchase symbols in upgrade.tsx — verify iOS path"
fi
if ! sips -g hasAlpha assets/icon.png | grep -q "hasAlpha: no"; then
  echo "HIGH: icon has alpha — strip before store build"
fi
TSERR="$(npx tsc --noEmit 2>&1 | grep -v supabase/functions || true)"
if echo "$TSERR" | grep -q "error TS"; then
  echo "TypeScript issues (excluding supabase/functions):"; echo "$TSERR"; BLOCK=1
fi

echo "=== STAGE 2 — URL smoke (terms / privacy) ==="
curl -sS -o /dev/null -w "terms %{http_code}\n" https://orbitalhealth.app/terms
curl -sS -o /dev/null -w "privacy %{http_code}\n" https://orbitalhealth.app/privacy
echo "NOTE: Full ASC MCP sync (IAP audit, metadata) is not run in this shell script."

echo "=== STAGE 3 — Placeholder ==="
echo "Screenshots / simulator capture: run separately per submission-protocol.md"

echo "=== STAGE 4 — Paywall grep (restore / legal) ==="
if ! grep -q "paywall-restore-sticky\|Restore" app/upgrade.tsx; then
  echo "HIGH: confirm Restore Purchases in paywall"; BLOCK=1
fi
if ! grep -qi "privacy\|terms" app/upgrade.tsx; then
  echo "HIGH: confirm Privacy/Terms links in paywall"; BLOCK=1
fi

if [[ "$BLOCK" -ne 0 ]]; then
  echo "NOT READY — fix BLOCKING items above"
  exit 1
fi

echo "=== EAS build + auto-submit ==="
eas build --platform ios --profile production --non-interactive --auto-submit

echo "DONE"
