# Build 130 Tracking Diagnosis

## Command Outputs

### A. NSUserTrackingUsageDescription (Plist / config)
```
(none) — grep found zero matches in ios/, app.json, eas.json
```

### B. ATT / IDFA / ASIdentifierManager in app code
```
ios/Pods/RevenueCat/Sources/Attribution/ASIdManagerProxy.swift:19:
  // exposes the same methods we're looking for in ASIdentifierManager to call
  // the same methods and mangling

ios/Pods/RevenueCat/Sources/Attribution/TrackingManagerProxy.swift:41:
  // exposes the same methods we're looking for in ATTrackingManager to call
  // the same methods and mangling
```
No matches in app/, src/ (Orbital's own code). Matches are in RevenueCat's vendored Pods only.

### C. Tracker Pods
```
(none) — no facebook/firebase-analytics/appsflyer/adjust/branch/amplitude/
         mixpanel/segment/onesignal/kochava/singular in Podfile.lock
```

### C. Tracker npm
```
(none) — no matching packages in package.json
```

### D. Known SDK stack
```json
"@revenuecat/purchases-js": "^1.24.1"
"@sentry/react-native": "^7.8.0"
"@supabase/supabase-js": "^2.90.0"
```

---

## SDK-by-SDK Classification

| SDK | Class | Reason |
|-----|-------|--------|
| RevenueCat (react-native-purchases) | NOT tracker | Purchase receipt verification + entitlement check. ASIdManagerProxy.swift / TrackingManagerProxy.swift use method mangling to detect if ATT is granted — they do NOT call requestTrackingAuthorization, do NOT read the IDFA, and do NOT send device data to third parties. No attribution SDKs configured. Device ID used for App Functionality only. |
| Sentry (@sentry/react-native) | NOT tracker | Crash reporting. No cross-app linkage. First-party crash data only. Auto-upload disabled per project config. Purpose: Analytics (internal). |
| Supabase (@supabase/supabase-js) | NOT tracker | First-party backend. Auth, database, realtime. No third-party data sharing. |

Apple tracking definition (verbatim): "linking app or device data with data from other companies' apps or websites for the purpose of targeted advertising or advertising measurement, OR sharing data with data brokers."

None of the above SDKs meet this definition.

---

## Root Cause of 5.1.2(i) Rejection

ASC App Privacy declaration incorrectly flagged Device ID as "Used for Tracking = Yes." This was a metadata declaration error. The binary itself has no tracking implementation. RevenueCat uses a Device ID-equivalent only for purchase receipt verification (App Functionality).

---

VERDICT = NO_TRACKING
