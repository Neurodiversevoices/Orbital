# Android Play Store Readiness Audit

**Date:** 2026-02-20 (updated)
**Status:** PARTIAL PASS — 5 repo fixes applied, 5 items remain dashboard-only, 1 requires next build
**Context:** iOS build v1.0.0 (build 44) currently in Apple Review. No builds triggered. No iOS settings modified.

---

## Audit Summary (Post-Remediation)

| # | Area | Previous | Current | Notes |
|---|------|----------|---------|-------|
| 1 | EAS Build Config (Android) | FAIL | **PASS** | Android blocks added to all 3 profiles in `eas.json` |
| 2 | Play Console Submission Config | FAIL | **PASS** | `submit.production.android` scaffolded in `eas.json` |
| 3 | Google Play Service Account | FAIL | **READY** | `.gitignore` updated for `keys/*.json`; `PLAY_CONSOLE_SETUP.md` has step-by-step |
| 4 | RevenueCat Android API Key | FAIL | **READY** | Code already wired; `REVENUECAT_ANDROID_SETUP.md` has step-by-step |
| 5 | Google Play Billing Products | FAIL | **READY** | `PLAY_PRODUCTS_FULL_LIST.md` has all 21 products with exact IDs and prices |
| 6 | Android Versioning | FAIL | **PASS** | `versionCode: 1` added to `app.json`, `autoIncrement` in `eas.json` |
| 7 | Android SDK Versions | WARN | **PASS** | `minSdkVersion: 24`, `compileSdkVersion: 35`, `targetSdkVersion: 35` in `expo-build-properties` |
| 8 | Android Permissions | WARN | **WARN** | Review after first build (Expo defaults; no explicit overrides) |
| 9 | Data Safety Declaration | FAIL | **PASS** | `PLAY_DATA_SAFETY_DRAFT.md` ready to paste |
| 10 | Store Listing Metadata | FAIL | **PASS** | `PLAY_STORE_LISTING_DRAFT.md` ready to paste |
| 11 | Package Name Consistency | WARN | **PASS** | `docs/LAUNCH_VERIFICATION.md` corrected: `com.erparris.orbital` |
| 12 | Signing Key (Upload Key) | FAIL | **READY** | EAS will auto-generate on first build (`credentialsSource: "remote"`) |
| 13 | Payments Kill-Switch | WARN | **WARN** | Correct for pre-launch (`false`) |
| 14 | Apple Search Ads Attribution | FAIL | **PASS (code)** | Full pipeline implemented; requires next native iOS build to activate |

---

## What Was Fixed in Repo (No Build Required)

### Config Changes

| File | Change |
|------|--------|
| `app.json:30` | Added `"versionCode": 1` to android block |
| `app.json:25-28` | Added `NSUserTrackingUsageDescription` and `SKAdNetworkItems` to iOS infoPlist |
| `app.json:50-54` | Added Android SDK versions to `expo-build-properties` (`minSdkVersion: 24`, `compileSdkVersion: 35`, `targetSdkVersion: 35`) |
| `eas.json` | Added `android` blocks to `production`, `review`, and `founder-demo` build profiles |
| `eas.json` | Added `submit.production.android` with service account path, internal track, draft status |
| `.gitignore:55` | Added `keys/*.json` to exclude Google service account keys |
| `docs/LAUNCH_VERIFICATION.md:205-206` | Fixed `com.orbital.app` → `com.erparris.orbital` |

### Code Changes (Attribution Pipeline)

| File | Change |
|------|--------|
| `lib/attribution/index.ts` | New module entry point |
| `lib/attribution/appleSearchAds.ts` | Full implementation: ATT prompt, AdServices token collection, purchase event tracking |
| `lib/subscription/useSubscription.tsx:40` | Added import of attribution module |
| `lib/subscription/useSubscription.tsx:156` | Added `initAttribution()` call after `PurchasesMobile.configure()` |
| `lib/subscription/useSubscription.tsx:323-327` | Added `trackPurchaseAttribution()` after mobile purchase success |
| `lib/subscription/useSubscription.tsx:277-281` | Added `trackPurchaseAttribution()` after web purchase success |

### Documentation Created

| File | Purpose |
|------|---------|
| `docs/ASA_ATTRIBUTION_SETUP.md` | Apple Search Ads attribution: what's implemented, what needs a build, verification steps |
| `docs/PLAY_CONSOLE_SETUP.md` | Step-by-step Play Console app creation, service account, signing |
| `docs/PLAY_PRODUCTS_FULL_LIST.md` | All 21 product IDs with types, base plans, prices |
| `docs/REVENUECAT_ANDROID_SETUP.md` | RevenueCat Android app setup, RTDN, entitlement mapping |
| `docs/PLAY_DATA_SAFETY_DRAFT.md` | Complete Data Safety declaration, ready to paste |
| `docs/PLAY_STORE_LISTING_DRAFT.md` | Title, descriptions, screenshot guidance, compliance language |

---

## What Remains Dashboard/Manual Only

These cannot be done in code — they require human action in external dashboards:

| # | Action | Dashboard | Doc Reference |
|---|--------|-----------|---------------|
| 1 | Create app in Google Play Console | Play Console | `PLAY_CONSOLE_SETUP.md` §1 |
| 2 | Generate service account + JSON key | Google Cloud + Play Console | `PLAY_CONSOLE_SETUP.md` §3 |
| 3 | Create 17 products in Play Console | Play Console | `PLAY_PRODUCTS_FULL_LIST.md` |
| 4 | Add Android app in RevenueCat + get `goog_xxx` key | RevenueCat | `REVENUECAT_ANDROID_SETUP.md` §1-2 |
| 5 | Import products, map entitlements, configure RTDN | RevenueCat | `REVENUECAT_ANDROID_SETUP.md` §4-7 |
| 6 | Set `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` in EAS secrets | EAS | `REVENUECAT_ANDROID_SETUP.md` §2 |
| 7 | Configure Apple S2S notification URL in App Store Connect | App Store Connect | `ASA_ATTRIBUTION_SETUP.md` |
| 8 | Enable Apple Search Ads attribution in RevenueCat | RevenueCat | `ASA_ATTRIBUTION_SETUP.md` |
| 9 | Fill out Data Safety form in Play Console | Play Console | `PLAY_DATA_SAFETY_DRAFT.md` |
| 10 | Complete store listing in Play Console | Play Console | `PLAY_STORE_LISTING_DRAFT.md` |

---

## What Only Becomes Active After Next Build

| Feature | Why Build Required |
|---------|-------------------|
| ATT prompt (iOS) | `expo-tracking-transparency` must be linked in native binary |
| SKAdNetwork postbacks | `SKAdNetworkItems` in Info.plist only applied during native build |
| AdServices token collection | `AdServices` framework linked at build time |
| Android app bundle (AAB) | No Android binary exists yet — first build creates it |
| Android versionCode auto-increment | EAS increments on build; initial `versionCode: 1` is the seed |

**Important:** The attribution code (`lib/attribution/`) uses dynamic imports with try/catch. Until the next build includes the native modules, `initAttribution()` will silently no-op. The existing app continues to function exactly as it does today.

---

## Configuration Files Referenced

| File | Purpose |
|------|---------|
| `app.json` | Expo config — Android block, iOS infoPlist, plugins |
| `eas.json` | EAS build/submit — all profiles now include Android |
| `.gitignore` | Excludes keys/*.p8 and keys/*.json |
| `.env.example` | Template with placeholder Android key |
| `lib/attribution/index.ts` | Attribution module entry |
| `lib/attribution/appleSearchAds.ts` | ATT + AdServices + purchase events |
| `lib/subscription/useSubscription.tsx` | RevenueCat init + attribution hooks |
| `lib/subscription/pricing.ts` | All 21 product IDs |
| `lib/subscription/types.ts` | Entitlement constants |
| `lib/payments/config.ts` | Payments kill-switch |
| `docs/LAUNCH_VERIFICATION.md` | Package name corrected |
