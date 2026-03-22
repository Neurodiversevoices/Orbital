# Orbital — App Store Pre-Submission Test Suite
## Claude Code runs this BEFORE every App Store submission

Save this file as `docs/APP_STORE_PREFLIGHT.md` in the repo.

---

## WHY ORBITAL GOT REJECTED BEFORE
Based on session history: medical claims (CPT codes, insurance reimbursement language), and potentially incomplete flows. Apple rejected ~25% of all submissions in 2024 (1.93M rejections). The top causes are: privacy violations, crashes, misleading metadata, and IAP issues.

---

## AUTOMATED CHECKS (Claude Code can run all of these)

### 1. CRASH & STABILITY TEST
```bash
# Build a release-mode binary
npx expo run:ios --configuration Release

# Launch in simulator and verify no crash on:
# - Cold launch
# - Login flow (Sign in with Apple + email)
# - Home screen load (ShaderOrb render)
# - Orb gesture interaction
# - Driver tag selection
# - Note input + submit
# - Tab navigation (all 3 tabs)
# - Settings screen
# - Back navigation
# - Backgrounding + foregrounding
```

Claude Code should open the app and walk through every screen. If ANY screen crashes, stop and report.

### 2. FORBIDDEN CONTENT SCAN
```bash
# Search entire codebase for words that trigger Apple medical review
grep -rni --include="*.ts" --include="*.tsx" --include="*.json" --include="*.html" \
  -e "diagnos" \
  -e "treatment" \
  -e "therapy" \
  -e "medical device" \
  -e "HIPAA" \
  -e "CPT code" \
  -e "CPT-" \
  -e "insurance" \
  -e "reimburs" \
  -e "prescription" \
  -e "clinical report" \
  -e "mental health" \
  -e "psychiatric" \
  -e "disorder" \
  -e "symptom" \
  -e "FDA" \
  -e "cure" \
  -e "heal" \
  .

# ALSO check App Store metadata files:
grep -rni -e "diagnos" -e "treatment" -e "therapy" -e "medical" \
  app.json app.config.js eas.json
```

**Allowed terms:** "capacity intelligence", "capacity tracking", "pattern detection", "clinical-grade" (quality descriptor), "capacity summary"
**Forbidden terms:** anything in the grep list above unless it's in a code comment or this doc

### 3. PRIVACY COMPLIANCE
```bash
# Check that privacy policy URL exists and is accessible
curl -s -o /dev/null -w "%{http_code}" https://orbitalhealth.app/privacy

# Check Info.plist for required privacy descriptions
grep -A1 "NSCameraUsageDescription\|NSPhotoLibraryUsageDescription\|NSLocationWhenInUseUsageDescription\|NSHealthShareUsageDescription\|NSHealthUpdateUsageDescription" ios/*/Info.plist

# Verify: ONLY permissions the app actually uses should be declared
# If a permission is declared but never used → REJECTION

# Check for tracking transparency (ATT)
grep -rn "requestTrackingPermissionsAsync\|ATTrackingManager" .

# If no tracking is done, ensure NSUserTrackingUsageDescription is NOT in Info.plist
```

### 4. IN-APP PURCHASE / PAYMENT COMPLIANCE
```bash
# Check that Stripe checkout is NOT used for digital content consumed in-app
# Apple requires IAP (StoreKit/RevenueCat) for in-app digital goods
# Stripe is ONLY allowed for physical goods or services consumed outside the app

# Verify RevenueCat is properly configured
grep -rn "RevenueCat\|Purchases\|purchasePackage\|restorePurchases" --include="*.ts" --include="*.tsx" .

# CRITICAL: Verify "Restore Purchases" button exists
# Apple WILL reject if there's no restore purchases option
grep -rn "restorePurchases\|restore.*purchase" --include="*.ts" --include="*.tsx" .
```

**Key rule:** CCI reports sold via Stripe on the WEB are fine (consumed outside the app). But if you sell ANYTHING inside the app, it must go through IAP. Verify this boundary is clean.

### 5. ACCOUNT DELETION
```bash
# Apple requires: if users can create accounts, they must be able to delete them
# Check that account deletion exists
grep -rn "deleteAccount\|delete.*account\|account.*delet" --include="*.ts" --include="*.tsx" .

# If this returns nothing → ADD ACCOUNT DELETION before submitting
# It must be accessible from Settings, not buried
```

### 6. SIGN IN WITH APPLE
```bash
# If Sign in with Apple is offered, it MUST work end-to-end
# Check the implementation
grep -rn "AppleAuthentication\|signInWithApple\|apple.*auth" --include="*.ts" --include="*.tsx" .

# Verify the Supabase Apple OAuth provider is configured
# Test: tap Sign in with Apple → complete flow → verify user is created
```

### 7. METADATA CONSISTENCY
```bash
# Check app.json / app.config.js for:
cat app.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
expo = d.get('expo', d)
print('Name:', expo.get('name'))
print('Slug:', expo.get('slug'))
print('Version:', expo.get('version'))
print('iOS Bundle ID:', expo.get('ios', {}).get('bundleIdentifier'))
print('Category:', expo.get('ios', {}).get('infoPlist', {}).get('LSApplicationCategoryType'))
print('Privacy Policy:', expo.get('ios', {}).get('privacyManifests'))
"

# Verify:
# - App name matches what's in App Store Connect
# - Bundle ID matches
# - Version number is incremented from last submission
# - Category should be "Health & Fitness" NOT "Medical"
```

### 8. SCREENSHOT ACCURACY
```
Apple reviewers compare screenshots to actual app behavior.
Verify that every screenshot submitted to App Store Connect:
- Shows actual app screens (not mockups)
- Matches current UI (not old slider-based UI)
- Shows the ShaderOrb, not the old GlassOrb
- Does not contain any medical claims
- Does not show placeholder data labeled as real
```

### 9. SDK PRIVACY MANIFESTS
```bash
# As of 2025, Apple requires privacy manifests for all SDKs
# Check if PrivacyInfo.xcprivacy exists
find ios -name "PrivacyInfo.xcprivacy"

# If missing, you need to create one declaring:
# - NSPrivacyAccessedAPITypes (what system APIs you use)
# - NSPrivacyTracking (false, unless you track)
# - NSPrivacyTrackingDomains (empty array if no tracking)
# - NSPrivacyCollectedDataTypes (what user data you collect)
```

### 10. DEMO ACCOUNT FOR REVIEWERS
```
Prepare in App Store Connect → App Review Notes:
- Demo email: reviewer@orbitalhealth.app (or whatever test account)
- Demo password: [set a test password]
- Special instructions: "Swipe the orb left/right to adjust capacity state. Select drivers (Sensory, Demand, Social) and tap checkmark to log."
- Note: "This app does not diagnose, treat, or prevent any medical condition. It is a capacity self-tracking tool categorized under Health & Fitness."
```

### 11. EAS BUILD — SENTRY XCODE SCRIPT & CACHE (blocks CI if wrong)

**Why:** A bad **Upload Debug Symbols to Sentry** run script can pass locally but **fail on EAS** with `No such file or directory` because the script pointed at a **developer machine path** (e.g. iCloud `Mobile Documents/.../node_modules/.../sentry-xcode-debug-files.sh`). EAS runs under `/Users/expo/workingdir/build/...`.

**Sentry — verify before `eas build`:**
```bash
# Must NOT contain your home directory or "Mobile Documents"
grep -n "sentry-xcode-debug-files\|Mobile Documents\|/Users/" ios/Orbital.xcodeproj/project.pbxproj || true
```

- **Required:** The **Upload Debug Symbols to Sentry** build phase should `source` `ios/.xcode.env` (and `.local` if present), then set `SENTRY_DEBUG_FILES_UPLOAD_SCRIPT` via `"$NODE_BINARY" --print "require('path').dirname(require.resolve('@sentry/react-native/package.json')) + '/scripts/sentry-xcode-debug-files.sh'"` and run `/bin/sh "$SENTRY_DEBUG_FILES_UPLOAD_SCRIPT"` only if the file exists — **same resolution idea as** the **Bundle React Native code and images** phase (which already wraps `sentry-xcode.sh` + `react-native-xcode.sh`).
- If you re-run `expo prebuild` or Sentry wizard, re-check this phase is not rewritten to an absolute path.

**EAS cache — verify `eas.json` production profile:**
```bash
# Optional: confirm what will ship (no secrets)
grep -A30 '"production"' eas.json | head -40
```

- **Avoid** custom `cache.paths` that include **`ios/Pods`** (very large; **Save cache** step can fail and mark the whole job `ERRORED` even when **Xcode archive succeeded**).
- **If** EAS fails with: *Unknown error. See logs of the **Save cache** build phase* — production profile should **omit** the custom `cache` block and set **`EAS_USE_CACHE=0`** in `build.production.env` so the build can finish and submit. (Tradeoff: slower installs; reliable pipeline.)

---

## REVIEWER SIMULATION (Manual — Do This Yourself)

Apple reviewers spend ~2 minutes on your app. Do this on a CLEAN device or fresh simulator:

1. Install from TestFlight (not dev build)
2. Open app cold — does it crash? Does it load in <3 seconds?
3. Sign in with Apple — does it work first try?
4. See the orb — is it clear what to do? (If not, add onboarding hint)
5. Swipe the orb — does it respond? Does it crash?
6. Select drivers — do they toggle?
7. Add a note — does keyboard work?
8. Submit — does it save?
9. Navigate to all tabs — any crash?
10. Go to Settings — is privacy policy linked? Is account deletion available?
11. Go to Settings → Restore Purchases — does it exist?
12. Background the app → reopen — does it resume correctly?
13. Kill the app → reopen — does it cold start without crash?
14. Check: does anything in the app say "diagnosis", "treatment", "therapy", "medical device"?

If ANY of these fail → do not submit.

---

## SUBMISSION NOTES TEMPLATE

Paste this into App Store Connect → App Review Information → Notes:

```
Orbital is a capacity self-tracking application that allows users to log their
cognitive and functional capacity state over time. Users swipe the central orb
to set their current state (Resourced, Elevated, or Depleted), select relevant
drivers (Sensory, Demand, Social), and optionally add context notes.

This app does NOT:
- Diagnose any medical or psychological condition
- Provide treatment recommendations
- Claim to be a medical device
- Replace professional clinical care

Category: Health & Fitness (self-tracking)

Demo credentials:
Email: [your test email]
Password: [your test password]

The app requires account creation to persist user data.
Account deletion is available in Settings.
```

---

## CRITICAL: APRIL 2026 SDK REQUIREMENT

Starting April 2026, ALL submissions must use iOS 26 SDK.
Verify your Xcode version supports this before submitting.
Current Expo SDK 54 should be compatible — confirm with:
```bash
xcodebuild -version
# Must be Xcode 16+ for iOS 26 SDK
```

---

## RUN ORDER

Claude Code should run checks **1–11** in sequence. If any check fails, stop and report. Do not proceed to submission with failures.

After all automated checks pass, YOU do the manual reviewer simulation (**Reviewer simulation** section below; demo account checklist is §10).

Then submit via:
```bash
eas build --platform ios --profile production
eas submit --platform ios
```
