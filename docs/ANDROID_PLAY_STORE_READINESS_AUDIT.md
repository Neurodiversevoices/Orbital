# Android Play Store Readiness Audit

**Date:** 2026-02-20
**Status:** FAIL — 11 blockers, 4 warnings
**Context:** iOS build v1.0.0 (build 44) currently in Apple Review. This audit covers Android config preparation only — no builds triggered, no iOS settings modified.

---

## Audit Summary

| Area | Verdict | Blockers |
|------|---------|----------|
| EAS Build Config (Android) | **FAIL** | No Android build profile |
| Play Console Submission Config | **FAIL** | No `eas.json` submit block for Android |
| Google Play Service Account | **FAIL** | Not configured |
| RevenueCat Android API Key | **FAIL** | Placeholder value only |
| Google Play Billing Products | **FAIL** | Not created in Play Console |
| Android Versioning | **FAIL** | No versionCode management |
| Android Permissions | **WARN** | Uses Expo defaults — needs review |
| Data Safety Declaration | **FAIL** | Not prepared |
| Store Listing Metadata | **FAIL** | Not prepared |
| Package Name Consistency | **WARN** | Discrepancy in docs |
| Signing Key (Upload Key) | **FAIL** | Not generated |
| Payments Kill-Switch | **WARN** | Currently `false` — correct for pre-launch |
| Apple Search Ads Attribution | **FAIL** | Entire pipeline missing (see prior audit) |

---

## 1. EAS Build Configuration — FAIL

### Current State

**File:** `eas.json`

All three build profiles (`production`, `review`, `founder-demo`) contain **only iOS-specific settings**:

```json
"production": {
  "distribution": "store",
  "ios": {
    "credentialsSource": "remote",
    "autoIncrement": "buildNumber",
    "resourceClass": "m-medium"
  }
}
```

No `"android": {}` block exists in any profile.

### What's Missing

```json
"production": {
  "distribution": "store",
  "ios": { ... },
  "android": {
    "credentialsSource": "remote",
    "buildType": "app-bundle",
    "autoIncrement": "versionCode"
  }
}
```

### Fix (Ready to Apply After Apple Review)

Add Android blocks to `production` and `review` profiles in `eas.json`:

```json
"android": {
  "credentialsSource": "remote",
  "buildType": "app-bundle",
  "autoIncrement": "versionCode"
}
```

---

## 2. Play Console Submission Config — FAIL

### Current State

**File:** `eas.json` → `submit.production`

Only iOS submission is configured:

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "6757295146",
      "ascApiKeyId": "X6A8MMACDZ",
      ...
    }
  }
}
```

No `"android": {}` submit block.

### What's Needed

```json
"submit": {
  "production": {
    "ios": { ... },
    "android": {
      "serviceAccountKeyPath": "./keys/google-play-service-account.json",
      "track": "internal",
      "releaseStatus": "draft"
    }
  }
}
```

### Prerequisite

A Google Play Developer Console service account key JSON file must be generated and placed at `./keys/google-play-service-account.json`. See Section 4 below.

---

## 3. RevenueCat Android API Key — FAIL

### Current State

**File:** `.env.example:11`
```
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_REPLACE_WITH_YOUR_ANDROID_KEY
```

**File:** `lib/subscription/useSubscription.tsx:49`
```typescript
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';
```

**Code path (line 138-140):** Platform switch correctly reads the Android key — no code change needed.

### What's Needed

1. In **RevenueCat Dashboard** → Project → Apps → Add new app → Google Play
2. Enter package name: `com.erparris.orbital`
3. Copy the generated `goog_xxxxx` API key
4. Set in `.env.local`:
   ```
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_<actual_key>
   ```
5. Set the same value in **EAS Secrets** for CI builds:
   ```bash
   eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value goog_<actual_key>
   ```

---

## 4. Google Play Service Account — FAIL

### Current State

No service account JSON exists. The `keys/` directory is gitignored (`.gitignore` line 54: `keys/*.p8`), but there is no Google Play key file present.

### Setup Steps (Dashboard Only — No Code Changes)

1. **Google Cloud Console** → Create service account for Play Console
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Create service account with name: `orbital-play-submit`
   - Grant no Cloud IAM roles (Play Console manages access)
   - Create JSON key → download to `./keys/google-play-service-account.json`

2. **Google Play Console** → Settings → API access
   - Link the Google Cloud project
   - Grant the service account "Release manager" or equivalent permission
   - Accept invitation

3. **Update `.gitignore`** to explicitly exclude:
   ```
   keys/*.json
   ```
   (Currently only `*.p8` is ignored under `keys/`)

---

## 5. Google Play Billing Products — FAIL

### Current State

**File:** `lib/subscription/pricing.ts:41-82`

21 product IDs are defined in code. These must be created as matching products in Google Play Console.

### Products That Must Exist in Play Console

#### Subscriptions (Auto-renewing)

| RevenueCat Product ID | Type | Price |
|----------------------|------|-------|
| `orbital_pro_monthly` | Monthly | $29 |
| `orbital_pro_annual` | Annual | $290 |
| `orbital_family_monthly` | Monthly | $79 |
| `orbital_family_annual` | Annual | $790 |
| `orbital_family_extra_seat_monthly` | Monthly | $9 |
| `orbital_family_extra_seat_annual` | Annual | $90 |
| `orbital_circle_monthly` | Monthly | $79 |
| `orbital_circle_annual` | Annual | $790 |
| `orbital_bundle_10_annual` | Annual | $2,700 |
| `orbital_bundle_15_annual` | Annual | $4,000 |
| `orbital_bundle_20_annual` | Annual | $5,200 |
| `orbital_admin_addon_monthly` | Monthly | $29 |
| `orbital_admin_addon_annual` | Annual | $290 |

#### In-App Products (One-time / Consumable)

| RevenueCat Product ID | Price |
|----------------------|-------|
| `orbital_cci_free` | $199 |
| `orbital_cci_pro` | $149 |
| `orbital_cci_circle_all` | $399 |
| `orbital_cci_bundle_all` | $999 |

#### Legacy IDs (if migrations are needed)

| RevenueCat Product ID | Notes |
|----------------------|-------|
| `orbital_individual_monthly` | Maps to `orbital_pro_monthly` |
| `orbital_individual_annual` | Maps to `orbital_pro_annual` |

### RevenueCat Dashboard Configuration

After Play Console products are created:
1. RevenueCat → Project → Google Play Store app → Products
2. Import products from Play Console
3. Create Offerings matching iOS offerings
4. Map entitlements:

| Entitlement | Products |
|-------------|----------|
| `pro_access` | `orbital_pro_monthly`, `orbital_pro_annual` |
| `family_access` | `orbital_family_monthly`, `orbital_family_annual` |
| `circle_access` | `orbital_circle_monthly`, `orbital_circle_annual` |
| `bundle_10_access` | `orbital_bundle_10_annual` |
| `bundle_15_access` | `orbital_bundle_15_annual` |
| `bundle_20_access` | `orbital_bundle_20_annual` |
| `admin_addon` | `orbital_admin_addon_monthly`, `orbital_admin_addon_annual` |
| `cci_purchased` | `orbital_cci_free`, `orbital_cci_pro`, `orbital_cci_circle_all`, `orbital_cci_bundle_all` |

---

## 6. Android Versioning — FAIL

### Current State

**File:** `app.json:28-34`

```json
"android": {
  "package": "com.erparris.orbital",
  "adaptiveIcon": { ... }
}
```

No `versionCode` is set. iOS has `buildNumber: "44"`.

### What's Needed

Android requires an integer `versionCode` that increments with every Play Store upload. Two options:

**Option A (Recommended):** Let EAS auto-increment
```json
// In eas.json, inside android block:
"autoIncrement": "versionCode"
```

**Option B:** Set explicitly in `app.json`
```json
"android": {
  "package": "com.erparris.orbital",
  "versionCode": 1,
  "adaptiveIcon": { ... }
}
```

EAS auto-increment (Option A) is preferred — matches the iOS approach already in use.

---

## 7. Android Permissions — WARNING

### Current State

No explicit Android permissions are declared in `app.json`. Expo defaults apply.

### Expo Default Permissions Include

- `INTERNET` (always included)
- `SYSTEM_ALERT_WINDOW` (dev only)
- Various Expo module permissions auto-added

### Review Required

For a health/capacity tracking app:
- Confirm `ACCESS_FINE_LOCATION` is **NOT** included (Orbital doesn't use location — governance rule P-013)
- Confirm no camera/microphone permissions leak in from dependencies
- The `expo-local-authentication` plugin may request `USE_BIOMETRIC` — this is acceptable

### Recommended Check (After First Android Build)

```bash
# After building, inspect the merged AndroidManifest.xml
eas build:inspect --platform android --profile production --output /tmp/android-inspect
# Review: /tmp/android-inspect/android/app/src/main/AndroidManifest.xml
```

---

## 8. Data Safety Declaration — FAIL

### Current State

No Google Play Data Safety form has been filled out.

### Required Declaration (Based on Codebase Audit)

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Email address | Yes | No | Account authentication (Supabase) |
| Purchase history | Yes | No | Subscription management (RevenueCat) |
| App interactions | Yes | No | Capacity signal logging (user-owned) |
| Crash logs | Yes | No | Sentry error monitoring |
| Device identifiers | No | No | Not collected (governance P-013) |
| Location | No | No | Not collected (governance P-013) |

**Encryption in transit:** Yes (HTTPS to Supabase, RevenueCat, Sentry)
**Data deletion mechanism:** Required — must document account deletion flow

---

## 9. Store Listing Metadata — FAIL

### Not Yet Prepared

| Item | Status |
|------|--------|
| App title | "Orbital" — ready |
| Short description (80 chars) | Not written |
| Full description (4000 chars) | Not written |
| Screenshots (phone) | Not generated |
| Screenshots (7" tablet) | Not generated |
| Screenshots (10" tablet) | Not generated |
| Feature graphic (1024x500) | Not created |
| App icon (512x512) | Exists as `assets/icon.png` — verify dimensions |
| Privacy policy URL | Required — must be live |
| Category | Health & Fitness |
| Content rating questionnaire | Not completed |
| Target audience | 18+ (health tracking, no child-directed content) |

---

## 10. Package Name Consistency — WARNING

### Discrepancy Found

| Source | Package Name |
|--------|-------------|
| `app.json:29` | `com.erparris.orbital` |
| `docs/LAUNCH_VERIFICATION.md:206` | `com.orbital.app` |
| `docs/ORBITAL_LAUNCH_VERIFICATION_REPORT_v2.md:302` | `com.erparris.orbital` |

**Resolution:** `app.json` is the source of truth. The correct Android package is **`com.erparris.orbital`**. The reference in `docs/LAUNCH_VERIFICATION.md:206` is stale and should be corrected.

---

## 11. Signing Key — FAIL

### Current State

No Android upload key or keystore has been generated.

### EAS-Managed Signing (Recommended)

When running the first Android build via EAS, it will:
1. Auto-generate an upload keystore
2. Store it securely in EAS credentials
3. Handle signing automatically

No manual keystore management needed if using `"credentialsSource": "remote"`.

For Play App Signing:
- Google manages the app signing key
- EAS manages the upload key
- This is the default and recommended setup

---

## 12. Payments Kill-Switch — WARNING (Acceptable)

### Current State

**File:** `.env.example:19`
```
EXPO_PUBLIC_PAYMENTS_ENABLED=false
```

**File:** `lib/payments/config.ts:22`
```typescript
export const PAYMENTS_ENABLED = process.env.EXPO_PUBLIC_PAYMENTS_ENABLED === 'true';
```

This is **correct for pre-launch**. Payments should remain disabled until:
1. RevenueCat Android key is configured
2. Play Console products are created
3. Initial internal testing is complete

---

## 13. Apple Search Ads Attribution — FAIL (Cross-Platform Note)

Full details in the prior audit. Summary of what's missing across the entire attribution pipeline:

| Component | Status |
|-----------|--------|
| AdServices framework | Not linked |
| ATT prompt | Not implemented |
| `enableAdServicesAttributionTokenCollection()` | Not called |
| SKAdNetwork plist config | Not present |
| Apple S2S Notifications to RevenueCat | Not configured |
| Conversion value mapping | Does not exist |

This is an iOS-specific concern but is noted here because revenue attribution affects cross-platform ROAS reporting in RevenueCat.

---

## Pre-Launch Checklist (Android)

### Must Complete Before First Android Build

- [ ] Add Android block to `eas.json` build profiles (production, review)
- [ ] Add Android submit block to `eas.json`
- [ ] Generate Google Play service account key JSON
- [ ] Create app in Google Play Console with package `com.erparris.orbital`
- [ ] Configure RevenueCat Google Play app + get Android API key
- [ ] Set `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` in `.env.local` and EAS secrets
- [ ] Create all subscription products in Play Console
- [ ] Create all in-app products (CCI) in Play Console
- [ ] Import products into RevenueCat and map to offerings/entitlements
- [ ] Set up Google Play Real-time Developer Notifications → RevenueCat

### Must Complete Before Play Store Submission

- [ ] Fill out Data Safety declaration
- [ ] Complete content rating questionnaire
- [ ] Write store listing (short + full description)
- [ ] Generate Android screenshots (phone + tablet)
- [ ] Create feature graphic (1024x500)
- [ ] Set up privacy policy URL
- [ ] Fix package name in `docs/LAUNCH_VERIFICATION.md` (`com.orbital.app` → `com.erparris.orbital`)
- [ ] Review merged AndroidManifest.xml permissions after first build
- [ ] Set `EXPO_PUBLIC_PAYMENTS_ENABLED=true` when ready to go live
- [ ] Run internal testing track with test purchases

---

## Configuration Files Referenced

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| `app.json` | Expo config | `:28-34` Android block |
| `eas.json` | EAS build/submit | Entire file — no Android config |
| `.env.example` | Env template | `:11` Android key placeholder |
| `lib/subscription/useSubscription.tsx` | RevenueCat init | `:49,138-154` Android key + configure |
| `lib/subscription/pricing.ts` | Product IDs | `:41-82` All product identifiers |
| `lib/subscription/types.ts` | Entitlements | `:22-26` Entitlement constants |
| `lib/payments/config.ts` | Kill-switch | `:22` Payments enabled flag |
| `docs/LAUNCH_VERIFICATION.md` | Launch docs | `:206` Stale package name |
| `docs/ORBITAL_LAUNCH_VERIFICATION_REPORT_v2.md` | Launch report | `:298-311` Android section |
| `orbital-os/03_ops/deploy_manual.md` | Deploy guide | `:65-69` Android deploy commands |
