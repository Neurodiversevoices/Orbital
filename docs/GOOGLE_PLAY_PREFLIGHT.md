# Orbital — Google Play Store Submission Guide & Preflight

## OVERVIEW: DUAL-TRACK SUBMISSION

You can submit to Apple and Google simultaneously. They are independent review processes. Google Play review is typically faster (hours to days vs Apple's days to weeks). Having the Android build live gives you:
- A second revenue channel immediately
- Proof-of-traction for investor conversations
- Fallback distribution if Apple rejects again
- Access to the larger global Android user base

---

## PREREQUISITES (one-time setup)

### 1. Google Play Developer Account
- Sign up: https://play.google.com/console/signup
- Cost: $25 one-time fee (vs Apple's $99/year)
- CRITICAL: As of January 2026, health apps MUST be registered under an **Organization account**, not an Individual account. Google requires a legal entity for apps handling sensitive health data. If you registered as Individual, you need to migrate.

### 2. Google Service Account Key (for EAS Submit)
- Required for automated submission via `eas submit`
- Follow Expo's guide: https://docs.expo.dev/submit/android/
- Steps: Google Cloud Console → Create Service Account → Grant "Service Account User" role → Generate JSON key → Upload to EAS dashboard under project credentials

### 3. First Upload Must Be Manual
- Google Play API limitation: the very first APK/AAB must be uploaded manually through Play Console
- After that, `eas submit --platform android` works automatically

---

## ANDROID BUILD COMMANDS

```bash
# Build production AAB (Android App Bundle)
eas build --platform android --profile production

# Submit to Google Play (after first manual upload)
eas submit --platform android

# Or combine build + submit
eas build --platform android --profile production --auto-submit
```

---

## CRITICAL: SKIA SHADER ON ANDROID

This is your #1 technical risk. The ShaderOrb was developed and tested on iOS only. Known issues from the react-native-skia community:

**Problem:** SkSL shaders can produce different visual output on Android vs iOS, or fail silently (no crash, just wrong rendering). This is because Android devices use different GPU drivers (Adreno, Mali, PowerVR) vs Apple's unified Metal pipeline.

**Specific risks for your shader:**
- `pow()` with negative base values behaves differently on some Android GPUs
- `smoothstep()` edge cases may vary across Adreno vs Mali
- Floating point precision is lower on many Android GPUs (mediump vs highp)
- Some older Android devices default to mediump in fragment shaders

**Required testing:**
1. Build for Android: `npx expo run:android`
2. Test on at LEAST these GPU families:
   - Qualcomm Adreno (Samsung Galaxy S series, Pixel)
   - ARM Mali (Samsung Galaxy A series, many budget phones)
3. Verify: orb renders, wave animates, colors shift correctly, no black screen
4. If shader fails on Android, the fallback component (dark circle with capacity border) MUST render

**Fallback is already built** — ShaderOrb.tsx has a fallback View if `runtimeEffect` is null. This means Android won't crash even if the shader fails to compile, but you should verify the fallback actually appears rather than a blank screen.

**Minimum Android version:** API level 21 (Android 5.0) for Skia, but API level 26 (Android 8.0) recommended for video support and Graphite backend.

---

## GOOGLE PLAY AUTOMATED CHECKS

### Check 1: Build & Crash Stability
```bash
# Build release APK for local testing
npx expo run:android --variant release

# Or build via EAS
eas build --platform android --profile production

# Test on physical device or emulator:
# - Cold launch → no crash
# - All tab navigation
# - Orb gesture interaction
# - Sign in flow
# - Background/foreground cycling
```

### Check 2: Forbidden Content (same as Apple — already done)
```bash
# Same grep from Apple preflight — you already passed this
grep -rni --include="*.ts" --include="*.tsx" \
  -e "diagnos" -e "treatment" -e "therapy" -e "CPT" \
  -e "FDA" -e "HIPAA" -e "prescription" .
```

### Check 3: Data Safety Form
Google requires a **Data Safety Form** in Play Console. This is Google's equivalent of Apple's Privacy Labels.

You must declare:
| Data Type | Collected? | Shared? | Purpose |
|-----------|-----------|---------|---------|
| Email address | Yes | No | Account creation, authentication |
| Name (if collected) | No | No | — |
| Capacity logs | Yes | No | App functionality (core feature) |
| Driver selections | Yes | No | App functionality |
| Notes/text entries | Yes | No | App functionality |
| Usage analytics | Yes | No | Analytics (if GA4/Sentry used in-app) |
| Purchase history | Yes | No | App functionality (RevenueCat) |
| Crash logs | Yes | No | App stability (Sentry) |

Key declarations:
- **Data is encrypted in transit:** Yes (Supabase uses HTTPS)
- **Users can request data deletion:** Yes (account deletion wired to Settings)
- **Data is NOT sold to third parties:** Correct
- **Data is NOT shared for advertising:** Correct

### Check 4: Health Apps Declaration Form
As of August 2025, ALL health apps must complete Google's Health Apps Declaration in Play Console (Monitor & Improve > Policy > App content).

**What to declare:**
- App category: Health & Fitness (NOT Medical)
- Is this a medical device? **No**
- Does app provide medical advice? **No**
- Does app use Health Connect? **No** (not yet — future HealthKit/Health Connect integration)
- Health features: Self-tracking, capacity logging, pattern awareness

**Required disclaimer (MUST be in first paragraph of Play Store description):**
> "This app is not a medical device and does not diagnose, treat, or prevent any condition."

This is now MANDATORY per January 2026 enforcement. Missing it = instant rejection.

### Check 5: Privacy Policy
```bash
# Verify privacy policy is accessible
curl -s -o /dev/null -w "%{http_code}" https://orbitalhealth.app/privacy
# Must return 200
# Must NOT be a PDF (Google requires HTML)
# Must NOT be geo-fenced
# Must be non-editable (not a Google Doc)
```

Privacy policy must disclose:
- What data is collected
- How it's used
- How it's stored
- How users can delete their data
- Third-party services (Supabase, Sentry, RevenueCat, Stripe)

### Check 6: App Content Rating
Complete the content rating questionnaire in Play Console:
- Violence: None
- Sexual content: None
- Profanity: None
- Drugs: None
- User interaction: Yes (users create content — their logs)
- Shares location: No
- Result: Likely "Everyone" or "Low maturity"

### Check 7: Target Audience & Content
- Is this app directed at children under 13? **No**
- Target age: 18+ (professional adults)
- This matters because if you accidentally select "children" you trigger COPPA/Families Policy requirements

### Check 8: Account Deletion
Same as Apple — already wired. Google also requires this since December 2023.

### Check 9: Permissions Audit
```bash
# Check AndroidManifest.xml for declared permissions
grep -n "uses-permission" android/app/src/main/AndroidManifest.xml

# Only request what you use:
# INTERNET — yes (Supabase, API calls)
# VIBRATE — yes (haptic feedback)
# BILLING — yes (RevenueCat/IAP)
#
# Do NOT request:
# CAMERA (unless used)
# LOCATION (unless used)
# CONTACTS (unless used)
# READ_EXTERNAL_STORAGE (unless used)
# Any permission you request but don't use = potential rejection
```

### Check 10: Store Listing Metadata
```
App name: Orbital
Short description (80 chars max):
  "Track your cognitive capacity. One swipe. Three states. Know yourself."

Full description (4000 chars max):
  [First paragraph MUST contain the medical disclaimer]
  "Orbital is a capacity self-tracking tool — not a medical device. It does not
   diagnose, treat, or prevent any condition.

   Swipe the orb to log your capacity state: Resourced, Elevated, or Depleted.
   Tag your drivers — Sensory, Demand, Social — and track patterns over time.

   Built for neurodivergent professionals, executives, and clinicians who need
   a fast, private way to understand their cognitive load."

Category: Health & Fitness
Content rating: Complete questionnaire
Privacy policy URL: https://orbitalhealth.app/privacy
```

---

## GOOGLE PLAY vs APPLE: KEY DIFFERENCES

| Requirement | Apple | Google |
|-------------|-------|--------|
| Developer fee | $99/year | $25 one-time |
| Review time | 1-7 days | Hours to 3 days |
| IAP required? | Yes for in-app digital goods | Yes for in-app digital goods |
| Health declaration | No special form | Health Apps Declaration form (mandatory) |
| Account type | Any | Organization (for health apps, Jan 2026) |
| Privacy labels | App Privacy section | Data Safety Form |
| Medical disclaimer | In review notes | In FIRST PARAGRAPH of description |
| Account deletion | Required | Required |
| First upload | Via EAS/Xcode | Manual first time, then EAS |
| Build format | .ipa | .aab (Android App Bundle) |

---

## SUBMISSION CHECKLIST (RUN BEFORE EVERY ANDROID SUBMISSION)

```
[ ] Release build succeeds: eas build --platform android --profile production
[ ] App launches without crash on Android device/emulator
[ ] ShaderOrb renders correctly (or graceful fallback)
[ ] Orb gesture works on Android
[ ] Sign in flow works
[ ] All tabs navigate correctly
[ ] Account deletion works from Settings
[ ] No forbidden medical terms in user-visible screens
[ ] Data Safety Form completed in Play Console
[ ] Health Apps Declaration completed
[ ] Content rating questionnaire completed
[ ] Privacy policy URL accessible and accurate
[ ] Store description has medical disclaimer in first paragraph
[ ] Screenshots show current ShaderOrb UI
[ ] App category set to Health & Fitness
[ ] Permissions: only what's used
[ ] Organization account verified (not Individual)
```

---

## RECOMMENDED TIMELINE

**Tonight/Tomorrow:**
1. Register Google Play Developer account ($25) if not already done
2. Register as Organization (migration takes 1-3 days if currently Individual)

**This week (parallel with Apple submission):**
3. Build Android production binary: `eas build --platform android --profile production`
4. Test ShaderOrb on Android emulator + physical device if available
5. First manual upload to Play Console (internal testing track)
6. Complete Data Safety Form
7. Complete Health Apps Declaration
8. Complete content rating questionnaire
9. Fill in store listing metadata
10. Upload screenshots
11. Submit for review

**If ShaderOrb fails on Android:**
- Ship with the fallback component (dark circle + capacity border)
- Fix shader Android compatibility in a fast-follow update
- Don't let the shader block Android launch
