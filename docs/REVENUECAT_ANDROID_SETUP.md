# RevenueCat Android Setup

**Date:** 2026-02-20
**Package:** `com.erparris.orbital`

---

## 1. Add Android App in RevenueCat

1. Log in to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select the **Orbital** project
3. Go to **Project Settings → Apps**
4. Click **"+ New"**
5. Select **"Google Play Store"**
6. Enter:
   - **App name:** Orbital (Android)
   - **Google Play package:** `com.erparris.orbital`
7. Click **"Save"**

---

## 2. Get the Android Public SDK Key

After creating the app:

1. In the RevenueCat app settings, find the **Public SDK Key**
2. It will look like: `goog_xxxxxxxxxxxxxxx`
3. Copy this key

### Set it in the codebase:

**Local development:**

Create or update `.env.local`:
```
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxx
```

**EAS Build (CI):**

```bash
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value goog_xxxxxxxxxxxxxxx
```

**Code reference:** `lib/subscription/useSubscription.tsx:49`
```typescript
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';
```

No code changes needed — the env variable is already wired.

---

## 3. Connect the Google Play Service Account

RevenueCat needs a service account to validate purchases with Google.

1. In RevenueCat → **Project Settings → Apps → Orbital (Android)**
2. Scroll to **"Google Play Service Credentials"**
3. Upload the service account JSON key file
   - This is the same `google-play-service-account.json` from the Play Console setup
   - If you don't have it yet, see `docs/PLAY_CONSOLE_SETUP.md` Section 3
4. Click **"Save"**

### Required Service Account Permissions

The service account needs these permissions in Play Console:

| Permission | Required For |
|-----------|-------------|
| View financial data | Revenue attribution |
| Manage orders and subscriptions | Purchase validation, refund detection |
| View app information and download bulk reports | Product import |

---

## 4. Enable Real-Time Developer Notifications (RTDN)

Google Play RTDN sends purchase/renewal/cancellation events to RevenueCat in real-time.

### Step 4a: Get RevenueCat's RTDN URL

1. In RevenueCat → Orbital (Android) app settings
2. Find **"Google Real-Time Developer Notifications"**
3. Copy the provided Pub/Sub topic URL (looks like: `projects/xxx/topics/revenuecat-xxx`)

### Step 4b: Configure in Play Console

1. Go to **Play Console → Monetize → Monetization setup**
2. Under **"Real-time developer notifications"**
3. Set the **Topic name** to the RevenueCat Pub/Sub topic
4. Click **"Save"**
5. Click **"Send test notification"** to verify

### Step 4c: Verify

In RevenueCat dashboard, check that test events appear under the app's events feed.

---

## 5. Import Products into RevenueCat

### Automatic Import (Recommended)

1. Go to **RevenueCat → Products**
2. Click **"Import from Store"**
3. Select the Orbital Android app
4. RevenueCat will pull all subscription and in-app products from Play Console
5. Verify all products appear

### Manual Verification

Ensure these products are imported:

| RevenueCat Product ID | Type |
|----------------------|------|
| `orbital_pro_monthly` | Subscription |
| `orbital_pro_annual` | Subscription |
| `orbital_family_monthly` | Subscription |
| `orbital_family_annual` | Subscription |
| `orbital_family_extra_seat_monthly` | Subscription |
| `orbital_family_extra_seat_annual` | Subscription |
| `orbital_circle_monthly` | Subscription |
| `orbital_circle_annual` | Subscription |
| `orbital_bundle_10_annual` | Subscription |
| `orbital_bundle_15_annual` | Subscription |
| `orbital_bundle_20_annual` | Subscription |
| `orbital_admin_addon_monthly` | Subscription |
| `orbital_admin_addon_annual` | Subscription |
| `orbital_cci_free` | In-app product |
| `orbital_cci_pro` | In-app product |
| `orbital_cci_circle_all` | In-app product |
| `orbital_cci_bundle_all` | In-app product |

---

## 6. Map Products to Entitlements

In RevenueCat → **Project → Entitlements**:

These entitlements should already exist from the iOS setup. Add the Android products to each:

| Entitlement | Android Products |
|-------------|-----------------|
| `pro_access` | `orbital_pro_monthly`, `orbital_pro_annual` |
| `family_access` | `orbital_family_monthly`, `orbital_family_annual` |
| `family_extra_seat` | `orbital_family_extra_seat_monthly`, `orbital_family_extra_seat_annual` |
| `circle_access` | `orbital_circle_monthly`, `orbital_circle_annual` |
| `bundle_10_access` | `orbital_bundle_10_annual` |
| `bundle_15_access` | `orbital_bundle_15_annual` |
| `bundle_20_access` | `orbital_bundle_20_annual` |
| `admin_addon` | `orbital_admin_addon_monthly`, `orbital_admin_addon_annual` |
| `cci_purchased` | `orbital_cci_free`, `orbital_cci_pro`, `orbital_cci_circle_all`, `orbital_cci_bundle_all` |

---

## 7. Configure Offerings

In RevenueCat → **Project → Offerings**:

The "Default" offering should already exist from iOS. Add Android packages:

### Current Offering (Default)

| Package | iOS Product | Android Product |
|---------|-------------|-----------------|
| `$rc_monthly` | `orbital_pro_monthly` | `orbital_pro_monthly` |
| `$rc_annual` | `orbital_pro_annual` | `orbital_pro_annual` |

Add additional packages for each tier as needed. The app fetches offerings dynamically, so both platforms share the same offering structure.

---

## 8. Verification Checklist

### RevenueCat Dashboard

- [ ] Android app created with package `com.erparris.orbital`
- [ ] Public SDK key (`goog_xxx`) copied and set in env
- [ ] Service account JSON uploaded to RevenueCat
- [ ] RTDN configured in Play Console pointing to RevenueCat
- [ ] RTDN test notification received successfully
- [ ] All 17 active products imported
- [ ] Products mapped to entitlements
- [ ] Offerings configured with Android packages

### End-to-End Purchase Test

1. Install the Android build on a test device
2. Sign in with a Google account listed as a license tester
3. Attempt a Pro Monthly purchase
4. Verify in RevenueCat:
   - [ ] Transaction appears under the customer
   - [ ] `pro_access` entitlement is granted
   - [ ] Purchase shows as "Sandbox" (not production)
5. In the app:
   - [ ] `isPro` becomes `true`
   - [ ] Pro features unlock immediately

### Cross-Platform Verification

If the user has an iOS subscription:
1. Sign into the Android app with the same RevenueCat user ID
2. The subscription should carry over via RevenueCat's cross-platform entitlements
3. Verify `isPro` is `true` without a new purchase

---

## Troubleshooting

### "Billing unavailable" Error

- The app must be uploaded to Play Console (at least internal testing)
- The test device must have a signed-in Google account
- The Google account must be a license tester

### Purchase Validates but Entitlement Not Granted

- Check that the product is mapped to the correct entitlement in RevenueCat
- Check that the offering includes the Android package
- Verify the product ID in code matches exactly

### RTDN Not Working

- Verify the Pub/Sub topic name is correct in Play Console
- Check that the service account has Pub/Sub permissions
- Send another test notification and check RevenueCat events
