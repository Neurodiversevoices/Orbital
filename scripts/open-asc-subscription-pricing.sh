#!/usr/bin/env bash
# Opens App Store Connect subscription pricing for Orbital (manual pricing completion).
# asc-mcp cannot set subscription base prices; use this after automation.

set -euo pipefail

APP_ID="${APP_ID:-6757295146}"

echo "Orbital — App Store Connect subscription pricing"
echo "================================================"
echo ""
echo "Primary URL (subscriptions):"
echo "https://appstoreconnect.apple.com/apps/${APP_ID}/distribution/subscriptions"
echo ""
echo "Alternate (app overview → Subscriptions):"
echo "https://appstoreconnect.apple.com/apps/${APP_ID}/appstore/subscriptions"
echo ""

if command -v open >/dev/null 2>&1; then
  open "https://appstoreconnect.apple.com/apps/${APP_ID}/distribution/subscriptions" || true
fi

cat << 'CHECKLIST'

Manual checklist (complete in App Store Connect)
-------------------------------------------------
[ ] Subscription group "Orbital Pro" — order / levels correct
[ ] For each subscription (Pro Monthly, Pro Annual, Individual Monthly, Individual Annual):
    [ ] USA base price set ($29.99/mo, $290/yr as intended)
    [ ] Equal pricing / other territories as desired
    [ ] Review screenshot (1024×1024 PNG) showing paywall / feature unlocked
    [ ] Localizations complete (English U.S.)
    [ ] State moves past MISSING_METADATA / DEVELOPER_ACTION_NEEDED
[ ] Non-consumable IAP (CCI Free / CCI Pro): resolve DEVELOPER_ACTION_NEEDED if shown
[ ] App version 1.0: screenshots for required iPhone display types (e.g. 6.7")
[ ] App Privacy, export compliance, and review notes updated

CHECKLIST
