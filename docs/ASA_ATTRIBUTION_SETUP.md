# Apple Search Ads Attribution Setup

**Date:** 2026-02-20
**Status:** Code implemented. Requires next native iOS build to take effect.

---

## What's Implemented in Code

### 1. ATT Prompt (App Tracking Transparency)

**File:** `lib/attribution/appleSearchAds.ts`

- Dynamic import of `expo-tracking-transparency`
- `requestTrackingPermissionsAsync()` called once at app initialization
- Graceful fallback if module not installed (returns `'unavailable'`)
- Result logged to Sentry breadcrumb for verification

### 2. AdServices Token Collection via RevenueCat

**File:** `lib/attribution/appleSearchAds.ts`

After RevenueCat `Purchases.configure()` completes:
- `Purchases.enableAdServicesAttributionTokenCollection()` — collects Apple's privacy-safe attribution token (iOS 14.3+)
- `Purchases.collectDeviceIdentifiers()` — enables cross-platform subscriber matching

These work **regardless of ATT status**. Apple's deterministic attribution via AdServices does not require IDFA.

### 3. SKAdNetwork Configuration

**File:** `app.json` → `ios.infoPlist`

```json
"SKAdNetworkItems": [
  { "SKAdNetworkIdentifier": "cstr6suwn9.skadnetwork" }
]
```

RevenueCat's SKAdNetwork ID is registered so Apple can attribute installs even when users opt out of ATT.

### 4. NSUserTrackingUsageDescription

**File:** `app.json` → `ios.infoPlist`

```json
"NSUserTrackingUsageDescription": "This identifier will be used to measure advertising effectiveness."
```

Required by Apple for the ATT prompt to appear.

### 5. Purchase Event Instrumentation

**File:** `lib/subscription/useSubscription.tsx`

After every successful purchase (mobile or web), `trackPurchaseAttribution()` fires with:

| Field | Value |
|-------|-------|
| `type` | `'cci_purchase'` or `'pro_subscription'` |
| `productId` | The RevenueCat product ID |
| `isProUser` | `true` (just purchased) |

These events are logged as Sentry breadcrumbs under the `attribution` category.

### 6. Integration Point

**File:** `lib/subscription/useSubscription.tsx:156`

`initAttribution()` is called immediately after `PurchasesMobile.configure()`, ensuring:
1. ATT prompt fires first (one-time, OS caches result)
2. AdServices token collection enables second
3. All subsequent purchases are automatically attributed by RevenueCat

---

## What Requires a New Build

| Item | Why |
|------|-----|
| `NSUserTrackingUsageDescription` in Info.plist | Expo config plugin bakes this into the native build |
| `SKAdNetworkItems` in Info.plist | Same — requires native binary rebuild |
| `expo-tracking-transparency` module | Must be installed and linked in the native project |
| `enableAdServicesAttributionTokenCollection()` | Already in code, but the AdServices framework must be linked in the native binary |

**Until the next build:** The attribution code is present but `initAttribution()` will gracefully no-op (the dynamic imports will fail and be caught).

---

## What Requires Dashboard Configuration (No Build Needed)

### RevenueCat Dashboard

1. **Project Settings** → Apple App Store → Apple Search Ads
   - Toggle ON: "Apple Search Ads Attribution"

2. **App Store Connect** → Your App → App Information → App Store Server Notifications
   - URL: `https://api.revenuecat.com/v1/subscribers/apple`
   - Version: V2 (required for RevenueCat)
   - This enables RevenueCat to receive real-time purchase/renewal notifications

3. **RevenueCat** → Project → Apple App Store Configuration
   - Upload the App Store Connect API key (same `AuthKey_X6A8MMACDZ.p8` in `./keys/`)
   - Set the shared secret from App Store Connect → App → App Information → Shared Secret

### Apple Search Ads Dashboard

No configuration needed — once RevenueCat receives the attribution token and purchase data, it reports attributed revenue back to Apple Search Ads automatically.

---

## Dependency: expo-tracking-transparency

Before the next native build, install the package:

```bash
npx expo install expo-tracking-transparency
```

Then add to `app.json` plugins:

```json
"plugins": [
  "expo-tracking-transparency",
  ...
]
```

**Note:** The code uses a dynamic import with try/catch, so the app works fine without this dependency installed. It will simply skip the ATT prompt.

---

## End-to-End Verification After Release

### Step 1: Confirm ATT Prompt

1. Install the new build on a physical iOS device
2. On first launch, the ATT system prompt should appear
3. Check Sentry breadcrumbs for: `attribution > ATT prompt result: granted|denied`

### Step 2: Confirm AdServices Token

1. In RevenueCat dashboard → Customer → select a test user
2. Check "Attribution" tab → should show "Apple Search Ads" with attribution data
3. If no data: verify the App Store S2S notification URL is configured

### Step 3: Confirm Purchase Attribution

1. Make a test purchase (sandbox)
2. Check Sentry breadcrumbs for: `attribution > Purchase attributed: pro_subscription`
3. In RevenueCat → Customer → verify the purchase shows under "Transactions"
4. In RevenueCat → Charts → Revenue → filter by "Attribution Source: Apple Search Ads"

### Step 4: Confirm in Apple Search Ads

1. Apple Search Ads dashboard → Campaign → view Attribution reports
2. After 24-48 hours, "Installs" and "Revenue" columns should populate
3. Cross-reference with RevenueCat revenue for the same period

---

## Privacy & Governance Compliance

| Rule | Status |
|------|--------|
| P-003: Never license user data for advertising | COMPLIANT — attribution measures our own ad spend, no data licensing |
| P-013: Never track location, device usage, or biometric data | COMPLIANT — AdServices token is campaign-level, not device-level. IDFA only collected if user explicitly grants ATT. |
| ATT prompt required by Apple | IMPLEMENTED — shown once, user can deny |
| Works without IDFA | YES — Apple's deterministic attribution via AdServices is privacy-safe |

---

## File References

| File | What it does |
|------|-------------|
| `lib/attribution/index.ts` | Module entry point |
| `lib/attribution/appleSearchAds.ts` | ATT prompt, AdServices collection, purchase tracking |
| `lib/subscription/useSubscription.tsx:40` | Import of attribution module |
| `lib/subscription/useSubscription.tsx:156` | `initAttribution()` call after configure |
| `lib/subscription/useSubscription.tsx:323-327` | Mobile purchase attribution event |
| `lib/subscription/useSubscription.tsx:277-281` | Web purchase attribution event |
| `app.json:25-28` | `NSUserTrackingUsageDescription` + `SKAdNetworkItems` |
