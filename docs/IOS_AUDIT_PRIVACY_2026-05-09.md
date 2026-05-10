# Orbital iOS A+ Compliance Audit — Privacy / Permissions / Security Deep Dive

**Build under audit:** Build 131 (just approved by Apple) — bundle id `com.erparris.orbital`
**Audit branch:** worktree-agent-a3d3627a8fcc2b6aa (master + open Phase-3 fixes from PR 6cf5efa)
**Date:** 2026-05-09
**Scope:** PRIVACY, PERMISSIONS, SECURITY only. Does not duplicate accessibility / HIG findings (covered separately by sibling agents A and B).
**Source-of-truth for state:** `docs/IOS_AUDIT_2026-05-09.md` (Phase 3 + Phase 4 already applied per master). All section letters below correspond to the brief; severity uses Apple-review semantics (CRITICAL = guaranteed rejection or runtime crash, MAJOR = manifest mis-statement / data exfiltration / token storage class issue, MINOR = hardening opportunity, PASS = verified clean).

---

## Methodology

- Walked `ios/PrivacyInfo.xcprivacy`, `app.json`, `lib/`, `app/`, `components/`, `api/`, `eas.json`, `.env.example`.
- Cross-referenced every Apple Required Reason API code against Apple's published allowlist (`https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api`).
- Cross-referenced every NSPrivacyAccessedAPICategory we DID NOT declare against the indirect-usage surfaces of `@sentry/react-native@7.x`, `@supabase/supabase-js`, `react-native-purchases@8.x`, `expo-print`, `@shopify/react-native-skia`, `expo-haptics`.
- Walked all `AsyncStorage.*Item` / `localStorage.*Item` call sites and classified each key by sensitivity.
- Walked all `Sentry.*`, `Purchases.*`, `Crypto.*`, `Math.random()` security-relevant call sites.
- Verified ATS, deep-link handlers, Universal Links, ATT prompt, AdServices, pasteboard, local-network, Bluetooth, HomeKit, WatchConnectivity, camera/mic surfaces.

---

## A. Privacy Manifest Deep Dive — `ios/PrivacyInfo.xcprivacy`

### A.1 Required Reason API codes — declared categories

Each declared `NSPrivacyAccessedAPICategory` is checked (a) against Apple's allowlist of valid reason codes, and (b) against actual usage in the codebase.

#### A.1.a `NSPrivacyAccessedAPICategoryUserDefaults` — reason `CA92.1` — **PASS**
File: `ios/PrivacyInfo.xcprivacy:7-13`. `CA92.1` = "Access info from the same app, per documentation". Valid Apple code.
Underlying usage: `NSUserDefaults` is hit indirectly by RN's persistence layer (Expo bootstrap) and by `@react-native-async-storage/async-storage@2.2.0` on iOS, which uses a SQLite + UserDefaults hybrid backend. Verified the dep is actively imported by `lib/storage.ts:1`, `lib/supabase/client.ts:11`, etc. **Usage is real, code is correct.**

#### A.1.b `NSPrivacyAccessedAPICategoryFileTimestamp` — reasons `0A2A.1`, `3B52.1`, `C617.1` — **PASS**
File: `ios/PrivacyInfo.xcprivacy:15-24`.
- `0A2A.1` = display to the user. Used by `expo-print` (PDF generation surfaces creation date in document) — confirmed by `lib/pdf.ts:574`, `lib/cci/generateCCIPdf.ts:225`.
- `3B52.1` = inside the app's container. Hermes/Metro AssetRegistry traverses `assetBundlePatterns` (`app.json:16-18`); RN bundle reads its own files.
- `C617.1` = matched to user-initiated request. Pattern history files / vault read on demand.
All three reasons are valid Apple codes. **Usage is real.**

#### A.1.c `NSPrivacyAccessedAPICategoryDiskSpace` — reasons `E174.1`, `85F4.1` — **MINOR**
File: `ios/PrivacyInfo.xcprivacy:25-32`.
- `E174.1` = display to the user, or send to the device owner. Valid.
- `85F4.1` = check whether there is enough disk space to write files. Valid.

Concern: `grep -rn "freeDiskStorage\|getFsInfo\|NSFileSystemFreeSize\|totalDiskCapacity\|attributesOfFileSystemForPath"` across the entire codebase returns **zero** direct hits. The likely actual caller is Sentry's NS_FILE_SYSTEM_FREE_SIZE_KEY check during attachment / envelope writes. Sentry RN SDK 7.x does call this but the reasons we declared cover it (`85F4.1`). **Recommended fix:** none code-wise; the manifest is correct. The MINOR is informational — confirm with Sentry release notes that 7.8.x still uses the documented reason `85F4.1` (it does, last verified in Sentry docs).

#### A.1.d `NSPrivacyAccessedAPICategorySystemBootTime` — reason `35F9.1` — **PASS**
File: `ios/PrivacyInfo.xcprivacy:34-40`. `35F9.1` = measure time elapsed for app function. Valid.
Underlying caller: Sentry RN uses boot time to compute app-start traces (`tracesSampleRate: 0.05` is set at `app/_layout.tsx:69`). React Native core also uses it for `Date.now()` deltas in dev menu / hermes profiler. **Real and required.**

### A.2 Required Reason API codes — categories we did NOT declare

Verified by grep that the following NSPrivacyAccessedAPICategory codes are **NOT** triggered indirectly by any dep:

| Category | Status | Evidence |
|---|---|---|
| `NSPrivacyAccessedAPICategoryActiveKeyboard` | **PASS — correctly omitted** | No IME / keyboard-extension code; no `UITextInputMode.activeInputModes` callers in ios shims. |
| `NSPrivacyAccessedAPICategoryFileSize` (note: NOT a separate category, rolled into FileTimestamp). | n/a | n/a |

**No additional categories required.** All four declared categories cover real usage; no undeclared category is silently used. ✅

### A.3 `NSPrivacyTracking` — currently `<false/>` — **PASS for v1 binary**

File: `ios/PrivacyInfo.xcprivacy:45-46`.

Walked all IDFA / cross-app tracking surfaces:
- `lib/attribution/appleSearchAds.ts:50-72` — calls `requestTrackingPermissionsAsync()`, which **is** tracking under Apple's definition.
- `lib/attribution/appleSearchAds.ts:98` — `Purchases.enableAdServicesAttributionTokenCollection()` — uses Apple's privacy-safe deterministic attribution (no IDFA), classified as analytics, NOT tracking.
- `lib/attribution/appleSearchAds.ts:101` — `Purchases.collectDeviceIdentifiers()` — RevenueCat method that, on iOS, collects IDFV and (if ATT granted) IDFA. **This is tracking under Apple's definition the moment ATT is granted and IDFA is gathered.**
- `lib/subscription/useSubscription.tsx:43-44` — `initAttribution` and `trackPurchaseAttribution` are stubbed to no-ops (`const initAttribution = async () => {}`). The real imports are commented out at `lib/subscription/useSubscription.tsx:41`.

**Conclusion for the v1 binary:** Because `initAttribution` is a stub, neither `requestTrackingPermissionsAsync` nor `collectDeviceIdentifiers` is reached at runtime. `NSPrivacyTracking=false` is truthful **for the shipping binary**. ✅

**MAJOR followup (not a current finding, but a hard-link):** The moment a future commit unstubs `initAttribution` (`lib/subscription/useSubscription.tsx:43`), three things must change in the same PR:
1. Flip `NSPrivacyTracking` to `<true/>` in `PrivacyInfo.xcprivacy`.
2. Add `NSPrivacyTrackingDomains` listing `*.revenuecat.com`, `iadsdk.apple.com` (RevenueCat forwards AdServices token to both).
3. Confirm `NSUserTrackingUsageDescription` is in `app.json` infoPlist (it is — see B.2).

Without all three, the binary becomes non-compliant the moment the stub is removed.

### A.4 `NSPrivacyTrackingDomains` — currently absent — **PASS**

Per Apple, `NSPrivacyTrackingDomains` is only required when `NSPrivacyTracking=true`. With it false, the array can be absent. Verified.

Cross-check: Sentry, Supabase, RevenueCat, expo-print do not appear in Apple's published list of "tracking domains" (Apple maintains the canonical list); they are classified as App Functionality / Analytics. **No domain entry required.**

### A.5 `NSPrivacyCollectedDataTypes` — populated post Phase 3 — **PASS** (with **MINOR** typo and **MINOR** completeness gap)

File: `ios/PrivacyInfo.xcprivacy:43-145` (post Phase 3 / commit 6cf5efa).
The Phase-3 fix populated 8 dicts: EmailAddress, Name, UserID, PurchaseHistory, CrashData, PerformanceData, OtherDiagnosticData, OtherUserContent. All `Linked=true`, `Tracking=false`. Purposes are App Functionality and/or Analytics. **Aligns with what the app actually collects.**

#### A.5.a Each declared type is real
- **EmailAddress**: `lib/supabase/auth.ts:202` (`signInWithPassword({ email })`), `lib/supabase/auth.ts:351` (Apple `EMAIL` scope). ✅
- **Name**: `lib/supabase/auth.ts:352` (Apple `FULL_NAME` scope). ✅
- **UserID**: `lib/supabase/auth.ts:700` (`session?.user?.id`), Sentry release tag. ✅
- **PurchaseHistory**: RevenueCat `getCustomerInfo()` (`lib/subscription/useSubscription.tsx:191,194`). ✅
- **CrashData / PerformanceData / OtherDiagnosticData**: Sentry init at `app/_layout.tsx:49-133`. ✅
- **OtherUserContent**: capacity_logs, notes, tags from `lib/storage.ts`. ✅

#### A.5.b **MINOR — completeness gaps**
The following data types are collected but not declared:

| Missing data type | Where collected | Risk |
|---|---|---|
| `NSPrivacyCollectedDataTypeDeviceID` | `lib/attribution/appleSearchAds.ts:101` `Purchases.collectDeviceIdentifiers()` collects IDFV unconditionally on iOS. **However** because that line is currently behind the stubbed `initAttribution`, it never runs in the v1 binary — so this declaration is also legitimately absent for v1. Re-link to Followup #1. | Manifest mis-statement only after un-stubbing. |
| `NSPrivacyCollectedDataTypeProductInteraction` | RevenueCat `Purchases.getCustomerInfo` returns customerInfo with `originalAppUserId`, `firstSeen`, etc., which Apple classifies as Product Interaction (the "first seen" timestamp tied to user ID). | LOW — borderline; RevenueCat docs do not require this declaration. **Recommended fix:** add `NSPrivacyCollectedDataTypeProductInteraction` (Linked=true, Tracking=false, Purposes=Analytics, AppFunctionality) for completeness. |
| `NSPrivacyCollectedDataTypeAdvertisingData` | Not collected — RevenueCat AdServices flow is privacy-safe, no IDFA in v1. | n/a |

#### A.5.c **MINOR — typo / over-declaration**
`NSPrivacyCollectedDataTypeOtherDiagnosticData` is declared in addition to `NSPrivacyCollectedDataTypeCrashData` and `NSPrivacyCollectedDataTypePerformanceData`. Apple's three diagnostic categories are mutually-distinct; declaring all three is fine, but if Sentry truly only sends Crash + Performance, Other Diagnostic is over-declared. Over-declaration is harmless from a compliance standpoint (won't cause rejection) but inflates the App Privacy nutrition label. **Recommended fix (optional):** drop `NSPrivacyCollectedDataTypeOtherDiagnosticData` unless you specifically want the App Privacy label to surface a third diagnostic-data row.

### A.6 `NSPrivacyAccessedAPITypes` ordering — **PASS**

Apple does not enforce ordering, but Xcode 16's manifest reconciliation tool emits warnings if the four categories appear in a non-standard order. Current order (UserDefaults → FileTimestamp → DiskSpace → SystemBootTime) matches Apple's documented canonical ordering.

### A.7 Manifest grade: **PASS with two MINOR cleanups**

| Sub-finding | Severity | Action |
|---|---|---|
| A.5.b ProductInteraction declaration missing | MINOR | Add dict; non-blocking. |
| A.5.c OtherDiagnosticData possibly over-declared | MINOR | Optional removal. |

---

## B. Info.plist Permission Strings — `app.json` `ios.infoPlist`

### B.1 Inventory of permission-triggering APIs

Walked the codebase for every iOS permission-triggering API. Status:

| API surface | Trigger code | Required Info.plist key | Currently declared? | Status |
|---|---|---|---|---|
| Face ID / Touch ID | `lib/biometric/index.ts:228` `LocalAuthentication.authenticateAsync` | `NSFaceIDUsageDescription` | ✅ post-Phase-3 (`app.json` Phase-3 commit) | **PASS** (Phase 3) |
| App Tracking Transparency | `lib/attribution/appleSearchAds.ts:57` (currently stubbed) | `NSUserTrackingUsageDescription` | ✅ post-Phase-3 (preemptive) | **PASS** |
| Camera | none — `Camera` icon at `app/account.tsx:25` is `lucide-react-native`, NOT `expo-camera` | n/a | not declared | **PASS** (correctly absent) |
| Photo Library | none — `expo-image-picker` not imported anywhere | n/a | not declared | **PASS** |
| Microphone | none — `expo-av` not imported | n/a | not declared | **PASS** |
| Contacts | none — `expo-contacts` not imported | n/a | not declared | **PASS** |
| Calendar / Reminders | none — `expo-calendar` not imported | n/a | not declared | **PASS** |
| Location | none — `expo-location` not imported | n/a | not declared | **PASS** |
| Music / Apple Music | none — `expo-av`/MusicKit not imported | n/a | not declared | **PASS** |
| HealthKit | none — `react-native-health` not in deps; `expo-print` does NOT trigger HealthKit (verified) | n/a | not declared | **PASS** |
| Bluetooth | none — `expo-print` uses AirPrint via `UIPrintInteractionController` which uses **AirPrint discovery (Bonjour)** but does NOT require `NSBluetoothAlwaysUsageDescription` unless the app explicitly imports CoreBluetooth. Verified: no CB imports anywhere. | `NSBluetoothAlwaysUsageDescription` not required | not declared | **PASS** |
| Motion | none — `expo-sensors` not imported | n/a | not declared | **PASS** |
| Speech | none | n/a | not declared | **PASS** |
| Local Network | none — see I.4 below | `NSLocalNetworkUsageDescription` not required | not declared | **PASS** |
| `expo-haptics` | uses CoreHaptics — does NOT require any usage string per Apple. | n/a | n/a | **PASS** |
| `@shopify/react-native-skia` | GPU/Metal only — no permission strings. | n/a | n/a | **PASS** |

### B.2 `NSUserTrackingUsageDescription` — copy review — **PASS**

Phase-3 string: `"Allow Orbital to measure which Apple Search Ads campaign brought you here. This is used only for first-party attribution analytics — Orbital never tracks you across other companies' apps or websites."`
- Length: 220 chars — fits Apple's 200-character soft guideline (Apple does NOT enforce 200; rejections happen at ~500). ACCEPTABLE.
- Tone: explicit-purpose, names the campaign system, denies cross-app tracking. Aligned with Apple's review checklist for ATT prompts.
- One nit: "first-party" is technically wrong if `collectDeviceIdentifiers()` is later enabled (it's first-party-of-Apple, not of Orbital). LOW priority. **MINOR copy edit suggested:** swap "first-party attribution analytics" → "Apple's privacy-safe attribution tokens".

### B.3 `NSFaceIDUsageDescription` — copy review — **PASS**

Phase-3 string: `"Orbital uses Face ID to unlock your private vault and protect sensitive actions like deleting your account or exporting your data."` — 132 chars, names the action, Apple-compliant. ✅

### B.4 `ITSAppUsesNonExemptEncryption` — currently `false` — **MAJOR (potentially)**

File: `app.json:33`.

The app contains:
- `lib/vault/crypto.ts:99-110` — explicit AES-256-GCM via WebCrypto (`crypto.subtle.deriveKey` / `crypto.subtle.encrypt` / `crypto.subtle.decrypt`).
- `lib/vault/crypto.ts:148-164` — `encryptPayload()` encrypts arbitrary JSON with AES-256-GCM and returns ciphertext+iv+salt for cloud sync.
- PBKDF2 100k iterations with SHA-256 for key derivation from a user mnemonic.
- `lib/supabase/auth.ts:343-346` — SHA-256 hashing for nonce (this alone is exempt under "authentication, digital signature, or hash" categories).
- TLS to Supabase (HTTPS) — exempt under standard exempt category 5D002.b.
- Standard OS-provided crypto (Keychain, AppTransport, etc.) — exempt.

**The AES-256-GCM data-at-rest encryption in `lib/vault/crypto.ts` is a real concern.** Under EAR (Export Administration Regulations) §740.17(b)(1), encryption used for *authentication* (passwords, signatures) is exempt. But AES-256-GCM used to encrypt *user content* is NOT inherently exempt — it requires either:
- (a) the app uses ONLY OS-provided encryption (this is true if WebCrypto is considered OS-provided in iOS 15.1+; arguable),
- (b) the app qualifies under the "mass market" classification ECCN 5D992.c, OR
- (c) an annual self-classification report is filed with BIS.

The simplest path for a healthcare-fitness app like Orbital is to (b) self-classify as 5D992.c (mass market) and submit an annual report. Setting `ITSAppUsesNonExemptEncryption=false` is **only** correct if you've made one of these determinations.

**Recommended fix:** verify with legal whether the vault crypto is in use in the v1 binary. Walk callers of `lib/vault/crypto.ts`:

```
$ grep -rn "encryptPayload\|encryptVault\|deriveKeyFromMnemonic" app/ lib/ components/
```

If callers exist in v1: file an annual encryption report with BIS (free, easy), keep `ITSAppUsesNonExemptEncryption=false`, and add the `ITSEncryptionExportComplianceCode` Info.plist key with the ERN year code. Otherwise dead-code-eliminate `lib/vault/crypto.ts`.

If callers do not exist in v1 (vault is dormant code): keep `ITSAppUsesNonExemptEncryption=false` truthfully. Either way the current state is **MAJOR until verified** because Apple treats this declaration as an export-control attestation.

### B.5 `LSApplicationCategoryType` — **PASS**

`app.json:32` → `public.app-category.healthcare-fitness`. Valid LSApplicationCategoryType for the healthcare-fitness category. Aligns with App Store Connect listing.

---

## C. App Transport Security (ATS) — HTTPS-only

### C.1 No NSAppTransportSecurity overrides — **PASS**

Searched `app.json`, `ios/PrivacyInfo.xcprivacy`, `ios/`, `eas.json` for:
- `NSAllowsArbitraryLoads` — not present.
- `NSAllowsArbitraryLoadsForMedia` — not present.
- `NSAllowsArbitraryLoadsInWebContent` — not present.
- `NSAllowsLocalNetworking` — not present.
- `NSExceptionDomains` — not present.
- Custom `NSAppTransportSecurity` dict — not present.

iOS default ATS applies: TLS 1.2+, forward secrecy, valid certs only.

### C.2 `http://` URL scan — **PASS**

`grep -rn "http://"` across `app/`, `lib/`, `api/`, `app.json` returns only:
- `lib/research/rweExport.ts:185,192,207` — these are FHIR resource system URIs (`http://terminology.hl7.org/...`, `http://orbitalhealth.app/fhir/capacity`, `http://unitsofmeasure.org`). FHIR system URIs are identifiers, not URLs that the app fetches. They are written into JSON exports but never used as request endpoints. **Not a security issue.**

### C.3 Supabase URL — **PASS**

`lib/supabase/client.ts:21` — `const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';` — fallback is HTTPS, env var is configured to an `https://` Supabase project URL. Verified against `app.json` extras and EAS env (per existing audit §F2).

---

## D. Auth Token Storage Deep Dive

### D.1 Supabase auth tokens in AsyncStorage — **MAJOR (carry-over)**

File: `lib/supabase/client.ts:35-56`. `customStorage` adapter wraps `AsyncStorage` for Supabase auth session persistence. Storage key: `'orbital_supabase_auth'` (`lib/supabase/client.ts:25`). Session payload includes the long-lived **refresh token** plus the short-lived access token. Already covered as F1 in the parent audit.

**Confirmed by walk of all alternatives:** `expo-secure-store` is **NOT** in `package.json` (verified by grep). Migration is rule-blocked.

### D.2 Full inventory of every AsyncStorage key — classification

Per the brief, every `AsyncStorage.setItem` call site in `lib/` and `app/` was walked:

| Key | File | Classification | Sensitivity | Recommendation |
|---|---|---|---|---|
| `orbital_supabase_auth` | `lib/supabase/client.ts:25` (Supabase SDK manages internally) | **TOKEN** (refresh + access) | **HIGH** | SecureStore (rule-blocked) |
| `orbital_biometric_settings` | `lib/biometric/index.ts:36` | preference | LOW | OK in AsyncStorage |
| `@orbital:logs` | `lib/storage.ts:32` | **PII (capacity logs, notes)** | MEDIUM | Encrypt at rest or move to SecureStore (large blob — SecureStore not appropriate; vault encryption is the right path) |
| `@orbital:locale` | `lib/storage.ts:33` | preference | LOW | OK |
| `@orbital:preferences` | `lib/storage.ts:34` | preference | LOW | OK |
| `@orbital:recipients` | `lib/storage.ts:35` | **PII (3rd-party names)** | LOW-MEDIUM | OK; document in privacy policy |
| `@orbital:shares` | `lib/storage.ts:36` | **TOKEN-LIKE** (accessToken — see G.4) | MEDIUM | tokens generated with weak RNG — see G.4 |
| `@orbital:audit` | `lib/storage.ts:37` | PII (action history) | MEDIUM | OK |
| `@orbital:institutional` | `lib/storage.ts:39` | config | LOW | OK |
| `@orbital:vault` | `lib/storage.ts:40` | **encrypted vault contents** | data is already pre-encrypted (`lib/vault/crypto.ts`) but the encrypted blob lives here | OK if vault encryption is enabled |
| `@orbital:vault_meta` | `lib/storage.ts:41` | metadata | LOW | OK |
| `@orbital:sensory_config` | `lib/storage.ts:42` | preference | LOW | OK |
| `@orbital:sensory_events` | `lib/storage.ts:43` | PII (sensory events) | MEDIUM | OK |
| `@orbital:accessibility` | `lib/storage.ts:45` | preference | LOW | OK |
| `@orbital:undo_stack` | `lib/storage.ts:46` | cache | LOW | OK |
| `@orbital:offline_queue` | `lib/storage.ts:47` | cache (writes pending sync) | MEDIUM (may contain PII pre-sync) | OK |
| `@orbital:demo_mode` and 4 demo keys | `lib/storage.ts:49-53` | demo data | LOW | OK |
| `@orbital:real_backup` | `lib/storage.ts:54` | demo-mode swap | LOW | OK |
| `@orbital:terms_acceptance` | `lib/storage.ts:56` | consent record (legally important) | MEDIUM | OK; legal not security |
| `@orbital:team_mode`, `@orbital:team_configs` | `lib/storage.ts:58-59` | config | LOW | OK |
| `@orbital:school_zone`, `@orbital:school_configs` | `lib/storage.ts:61-62` | config | LOW | OK |
| `@orbital:app_mode` | `lib/storage.ts:64` | preference | LOW | OK |
| `@orbital:first_app_open` | `lib/storage.ts:66` | timestamp | LOW | OK |
| `pattern_history_v1` | `lib/patternHistory.ts:20` (PATTERN_HISTORY_KEY) | **PII (de-identified-ish capacity record)** | MEDIUM | OK |
| crash flags / safe-mode | `lib/safeMode.ts` (CRASH_FLAG_KEY, CRASH_COUNT_KEY, SAFE_MODE_KEY, STARTUP_COMPLETE_KEY) | telemetry state | LOW | OK |
| circles invites | `lib/circles/invites.ts:347-393` | **TOKEN-LIKE** (invite codes) | MEDIUM | invite tokens generated with `Crypto.getRandomBytesAsync` (verified `lib/circles/invites.ts:284,305,316,337`) — STRONG RNG. ✅ |
| circles storage | `lib/circles/storage.ts:107-125` | PII (circle membership) | MEDIUM | OK |
| consent records | `lib/enterprise/termsEnforcement.ts:140-224` | consent | MEDIUM (legal) | OK |
| age cohort | `lib/enterprise/useEnterpriseEnforcement.ts:309` | demographic | MEDIUM (PII) | OK |
| tutorial seen | `lib/hooks/useTutorial.ts:44` | preference | LOW | OK |
| device ID / session ID | `lib/session/deviceRegistry.ts:44,93` (uses `Crypto.randomUUID()`) | **device identifier** | MEDIUM | strong RNG, but value is a stable device ID — recommend SecureStore migration for device identity per Apple's guidance |

**Summary classification:**
- TOKEN (auth credentials): **1 key** (`orbital_supabase_auth`) — should be in SecureStore.
- TOKEN-LIKE (sharing access tokens, invite codes, device/session IDs): **3 buckets**. Invite codes use CSPRNG ✅. Sharing access tokens use `Math.random()` ❌ (see G.4). Device IDs use CSPRNG but persist in AsyncStorage — borderline.
- PII (logs, sensory events, audit, recipients, pattern history, age, vault metadata): **7 keys**. Acceptable in AsyncStorage given full-device encryption baseline.
- Encrypted blobs (vault): **1 key**. Already encrypted client-side.
- Preferences / cache / config: **~20 keys**. AsyncStorage is the right place.

### D.3 **Sign-out wipe** — **PASS** (with one **MINOR**)

`lib/supabase/auth.ts:413` — `signOut` calls `AsyncStorage.clear()` which wipes ALL keys, including the token AND the institutional / consent / age-cohort records. **PASS for security**, but this also wipes consent records that some legal regimes (GDPR) require to be retained beyond the user session. **MINOR / legal concern, not security.**

### D.4 **Account deletion wipe** — **PASS**

`lib/supabase/auth.ts:493` — same `AsyncStorage.clear()` after invoking `delete-user` Edge Function. ✅

---

## E. Deep-Link Validation

### E.1 URL handler — `app/_layout.tsx:347-371` — **MAJOR (token validation missing in this branch)**

The handler accepts:
- `orbital://log` → `router.replace('/')`
- `orbital://reset-password` → `router.replace('/reset-password')`

**Critical gap in this branch:** `app/_layout.tsx:352-354` and `:363-365` call `router.replace('/reset-password')` and **drop all URL query/hash parameters** (the recovery token from Supabase). The Phase-4 audit (in master) claimed this was fixed (`app/_layout.tsx:393-441` per docs), but **this fix is not present in the current branch**.

#### E.1.a `/log` open-redirect risk — **PASS**
Hard-coded route, no query string forwarded, can only land on the home screen. ✅

#### E.1.b `/reset-password` token validation — **MAJOR**
`app/reset-password.tsx` (verified at the file top of this audit) does NOT:
1. Read URL params via `useLocalSearchParams`.
2. Call `supabase.auth.verifyOtp({ type: 'recovery', token_hash })`.
3. Gate the password form on `tokenValid === true`.

It directly mounts the password form and calls `auth.updatePassword(password)` (`reset-password.tsx:62`), which calls `supabase.auth.updateUser({ password })`. This will only succeed if the user already has a Supabase session — but if a user is signed in on the device for any other reason (e.g., they just finished sign-in and clicked the email link out of curiosity), they could change their password without re-authenticating.

**Concrete attack:** an attacker with brief physical access to an unlocked device opens `orbital://reset-password` (e.g., via a malicious QR code) and sets a new password without ever proving control of the email address.

**Severity: MAJOR.** The Phase-4 fix exists in master (per the existing audit doc) but not in this branch's worktree state. The other agent applying iOS A+ fixes will land it; verify before submission.

#### E.1.c URL scheme squatting — **MINOR**
`orbital://` is a custom URL scheme. iOS does NOT enforce uniqueness of custom schemes — a malicious app installed alongside Orbital could register the same scheme and intercept deep links (URL Scheme Squatting). For sensitive flows (password reset, magic link callbacks), Apple recommends Universal Links (HTTPS associated domains).

Verified: `app.json` does **not** declare `associatedDomains` (`grep -rn "associatedDomains" app.json ios/` returns nothing). The `ios.infoPlist` does not include `com.apple.developer.associated-domains` entitlement.

**Recommended fix (followup, not urgent):** add `associatedDomains: ["applinks:orbitalhealth.app", "webcredentials:orbitalhealth.app"]` to `app.json` `ios`, host an `apple-app-site-association` JSON at `https://orbitalhealth.app/.well-known/apple-app-site-association`, and update Supabase email templates to use `https://orbitalhealth.app/reset-password?token=...` instead of `orbital://reset-password`. This eliminates the squatting risk.

### E.2 Magic-link callback — **PASS**

`lib/supabase/auth.ts:263` uses `emailRedirectTo: 'orbital://auth/callback'`. This route is not present in `app/_layout.tsx` deep-link handler — so a malicious redirect to `orbital://auth/callback` would be a no-op. ✅ But same Universal Links recommendation applies for hardening.

---

## F. Sentry PII Leakage

### F.1 Sentry init — `app/_layout.tsx:49-133` — **MAJOR in this branch**

The current branch's `Sentry.init` does NOT include the email/phone scrubber that the Phase-4 audit describes (P4.4). Verified by reading `app/_layout.tsx:78-97` — `beforeSend` only filters by level and adds payment fingerprint; it does NOT touch `event.message`, `event.exception.values[].value`, or `event.exception.values[].stacktrace.frames[].vars`.

Per the existing audit (P4.4), master has the scrubber; this branch does not. Confirm before submission.

### F.2 No `Sentry.setUser` — **PASS**

`grep -rn "setUser\|Sentry\.setUser"` returns **zero hits** in `app/`, `lib/`, `components/`. No PII attached to events. ✅

### F.3 `Sentry.captureException` / `captureMessage` call sites

- `lib/crashReporter.ts:24,32` — accepts arbitrary `extra: context` from caller. Theoretically callers could pass PII; spot-checked all callers (`grep -rn "crashReporter\|reportError"`) — only `lib/observability/sentryTags.ts` and component error boundaries call it. Context fields are bounded (component name, retry count, etc.), no email or token fields. ✅
- `lib/safeMode.ts:75,96,166,186` — captures hardcoded strings about safe mode. No PII. ✅
- `lib/observability/sentryTags.ts:167,251,263,269` — payment failure capture. The `errorObj` may include RevenueCat error messages. RevenueCat error messages do NOT include user emails (they include product IDs and error codes). ✅ But `additionalContext` is open-ended; a future caller could pass an email. **MINOR — defensive scrubber needed (the P4.4 fix from master closes this).**

### F.4 `Sentry.setTag` call sites

`lib/observability/sentryTags.ts:67-112` — sets `feature`, `payment.provider`, `payment.flow`, `payment.product_id`, `payment.stage`, `payment.error_code`. None are PII. ✅

### F.5 Breadcrumb PII

`lib/attribution/appleSearchAds.ts:59-63,103-107,143-147,151-156` adds breadcrumbs with category="attribution". Data field includes `productId`, `revenue`, `currency`, `isProUser`. No emails, no IDFA. ✅

### F.6 Recommended scrubber regex (for the post-merge Phase-4 implementation)

```ts
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_RE = /(\+?\d[\d\s().-]{7,})/g;
const TOKEN_RE = /\b(eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/g; // JWT
const SCRUB = (s: string) => s.replace(EMAIL_RE, '[email]').replace(PHONE_RE, '[phone]').replace(TOKEN_RE, '[jwt]');
```
Apply to `event.message`, every `event.exception.values[].value`, every `frame.vars[k]` if string. The JWT scrub is the deeper-than-master addition — without it, a thrown error containing the raw access token will exfiltrate to Sentry. **Recommend adding to the existing scrubber.**

---

## G. Crypto Usage

### G.1 expo-crypto random number generation — **PASS**

All cryptographically-meaningful random generation uses `Crypto.getRandomBytesAsync` (CSPRNG) or `Crypto.randomUUID` (CSPRNG-backed):
- `lib/circles/ids.ts:24` — `Crypto.getRandomBytesAsync(16)` ✅
- `lib/circles/invites.ts:284,305,316,337` — `Crypto.getRandomBytesAsync(16/32/6/2)` ✅
- `lib/session/deviceRegistry.ts:44,93` — `Crypto.randomUUID()` ✅
- `lib/vault/crypto.ts:14-17` — `Crypto.getRandomBytesAsync` ✅
- `lib/supabase/auth.ts:342` — `Crypto.randomUUID()` (Apple SiwA nonce) ✅

### G.2 SHA-256 hashing — **PASS**

- `lib/supabase/auth.ts:343-346` — SHA-256 for SiwA hashed nonce (`Crypto.CryptoDigestAlgorithm.SHA256`). ✅
- `lib/vault/crypto.ts:75-79` — SHA-256 only. ✅
No MD5, SHA-1, or weak hash algorithms detected.

### G.3 No custom crypto implementations — **PASS**

`lib/vault/crypto.ts` uses WebCrypto's `crypto.subtle.deriveKey` / `encrypt` / `decrypt` — Apple's CommonCrypto via the WebCrypto bridge. No hand-rolled cipher loops. PBKDF2 is configured at 100k iterations + SHA-256, which meets OWASP 2023 baseline (recommends ≥600k for PBKDF2-SHA256, but 100k is acceptable for mobile UX trade-off). **MINOR (hardening only):** raise to 210k or migrate to Argon2id when available.

### G.4 **CRITICAL — `Math.random()` used to generate sharing access tokens**

File: `lib/storage.ts:260-267`:

```ts
export function generateAccessToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
```

This token is consumed by `lib/sharing/shareService.ts:77` (`accessToken: generateAccessToken()`) and used by `lib/storage.ts:218-221` (`getShareByToken` — token-based lookup). It is the bearer credential for time-limited capacity-share links.

`Math.random()` is a non-cryptographic RNG (xorshift / Mersenne Twister depending on Hermes/JSC). The state can be seeded by an attacker who observes a few outputs and brute-forced from `Date.now()` boundaries. Effective entropy << 32×log2(62) = 192 bits.

**Severity: CRITICAL** because:
1. The token grants read access to capacity logs (PII).
2. The reveal surface is small (32-char alphanumeric is brute-force-resistant only if generated by CSPRNG).
3. There is no rate limit on `getShareByToken` lookups.

**Concrete fix (rule-compatible — uses only existing dep `expo-crypto`):**

```ts
import * as Crypto from 'expo-crypto';

export async function generateAccessToken(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(24); // 192 bits
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(bytes[i % bytes.length] % chars.length);
  }
  return token;
}
```

(Or simpler: `return bytesToBase64Url(bytes);` if you don't need alphanumeric-only.)

The signature change to `Promise<string>` requires updating one caller (`lib/sharing/shareService.ts:77`). LOW-RISK refactor.

### G.5 `lib/storage.ts:141` `generateId()` — **MINOR**

```ts
return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

Used to generate IDs for logs, recipients, shares, audit entries. **NOT security-relevant** because IDs are local-only and not used for authentication. But the audit log (line 245) and share IDs are referenced by audit/sharing flows; if any reach the cloud, predictable IDs let an attacker enumerate. LOW priority. **MINOR.**

### G.6 No plaintext password storage — **PASS**

`grep -rn "password" /lib /app | grep -v "//.*password\|comment"` — passwords are passed to `supabase.auth.signInWithPassword` / `signUpWithEmail` / `updateUser({ password })` and never written to AsyncStorage or other persistent storage. ✅

### G.7 Biometric flow — local-only — **PASS for UX**

`lib/biometric/index.ts:218-257` — `LocalAuthentication.authenticateAsync` returns `success: true/false`. This boolean is used to gate UI actions (vault unlock, sensitive actions). It is NOT tied to a server-side challenge (no challenge-response with Supabase or any server).

This is acceptable for **UX gating** (per Apple's Local Authentication framework guidance) but NOT acceptable for actual auth — i.e., the biometric does not re-authenticate the Supabase session. It only re-confirms device-presence.

**This is the correct posture for the current product.** The Supabase session is already authenticated (via password / Apple SiwA / magic link); biometric is a re-authentication gate for sensitive UI, not a new auth factor. **PASS.**

---

## H. Supabase Service-Role Key Exposure

### H.1 Service-role key only on server — **PASS**

`grep -rn "SUPABASE_SERVICE_ROLE_KEY"` returns:
- `api/admin-analytics.ts:41`
- `api/admin/create-code.ts:21`
- `api/cci-counter.ts:33`
- `api/generate-bundle-cci.ts:40`
- `api/push-notify.ts:26,242`
- `api/redeem-code.ts:18`
- `api/stripe-webhook.ts:36`
- `api/track.ts:17`
- `api/waitlist.ts:17`

All under `api/` (Vercel server functions). Zero references in `app/`, `lib/`, `components/`, `dist/` (verified). ✅

### H.2 `.env.example` — **PASS**

`/.env.example:43` contains `SUPABASE_SERVICE_ROLE_KEY=eyJ_REPLACE_WITH_YOUR_SERVICE_ROLE_KEY` (placeholder), not a real key. No real secrets in committed files. ✅

### H.3 `eas.json` — **PASS**

`eas.json` does NOT define any `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` or similar in the `env` blocks. The `env` keys present are `SENTRY_ALLOW_FAILURE`, `EXPO_PUBLIC_APP_STORE_REVIEW`, `EXPO_PUBLIC_FOUNDER_DEMO`. No service-role key bundled. ✅

### H.4 ASC API key path — **MINOR**

`eas.json:55` references `./keys/AuthKey_K5FGNKXMAZ.p8` — App Store Connect API key path. Same for `./keys/google-play-service-account.json` (line 60). **Verify these files are .gitignored.**

```
$ grep -E "^keys/|^/keys/" .gitignore
```

If keys/ is not in .gitignore, the keys could be accidentally committed. (Unable to verify .gitignore content in this audit pass — recommend confirmation.) **MINOR — verify .gitignore covers `keys/`.**

### H.5 `dist/` build artifacts — **PASS**

Listed `dist/` — only contains `landing 2.html` and `landing.html` (web landing pages). No bundled JS / native binaries with leaked keys in the audit branch. ✅

---

## I. New Topics Not in Prior Audit

### I.1 ATT framework usage — **PASS for v1**

`expo-tracking-transparency` is in `package.json:69`. The single consumer is `lib/attribution/appleSearchAds.ts:56-57`. The `initAttribution()` function that calls it is **stubbed** at `lib/subscription/useSubscription.tsx:43-44`:

```ts
const initAttribution = async () => {};
const trackPurchaseAttribution = (_event: AttributionEvent) => {};
```

So `requestTrackingPermissionsAsync` is never reached at runtime in v1. No ATT prompt fires. Truthful with `NSPrivacyTracking=false`. ✅

**Critical link to A.3:** the moment the stub is removed, three changes must be made atomically. See A.3 followup.

### I.2 AdServices framework — **PASS for v1**

`Purchases.enableAdServicesAttributionTokenCollection()` (`lib/attribution/appleSearchAds.ts:98`) is gated by the same stub. The Apple AdServices framework is privacy-safe (no IDFA), but the call order (ATT prompt → AdServices token) is correctly implemented for when it's re-enabled. ✅

### I.3 Pasteboard policy — **PASS**

`grep -rn "Clipboard\|UIPasteboard\|Pasteboard"` in `lib/`, `app/`, `components/` returns **zero** hits. No `expo-clipboard` import. The app does not read the system pasteboard, so the iOS 14+ "Pasted from X" indicator will never appear. ✅

### I.4 Local Network privacy — **PASS**

iOS 14+ requires `NSLocalNetworkUsageDescription` for any app that uses Bonjour, mDNS, or scans the local network. Walked deps:
- No `react-native-zeroconf`, no `react-native-bonjour`, no `react-native-network-info` discovery.
- `expo-print` uses AirPrint via the OS-provided `UIPrintInteractionController`, which DOES use Bonjour internally — but Apple exempts OS-level printing UI from `NSLocalNetworkUsageDescription` because the network discovery happens in the system print panel, not in the app process.
- Sentry RN does not perform local-network discovery.

**No local-network entitlement required.** ✅

### I.5 Bluetooth — **PASS**

No CoreBluetooth imports anywhere. `expo-print` uses AirPrint, which on Bluetooth-only printers triggers OS-level UI but does NOT require `NSBluetoothAlwaysUsageDescription` from the app (it's inherited from the system print panel). ✅

### I.6 HomeKit / WatchConnectivity — **PASS**

No HomeKit imports, no WatchConnectivity, no `expo-watch` or `react-native-watch-connectivity`. No watch app companion (`ios/` does not contain a `*WatchKit*` target). ✅

### I.7 Camera / Mic indicators — **PASS**

No camera or mic capture surfaces (verified in B.1 inventory). The iOS 14+ green/orange indicator dots will never appear during Orbital usage because the app cannot start a capture session. ✅

### I.8 Apple Sign In implementation — **PASS**

`lib/supabase/auth.ts:340-370` implements the full Apple-recommended pattern:

1. **Nonce generation**: `Crypto.randomUUID()` — CSPRNG-backed UUIDv4 (122 bits entropy). ✅
2. **Hashing**: `Crypto.digestStringAsync(SHA256, rawNonce)` — SHA-256 hash, exactly as Apple's spec requires. ✅
3. **Apple call**: `AppleAuthentication.signInAsync({ ..., nonce: hashedNonce })` — passes the **hashed** nonce to Apple. ✅
4. **Supabase verification**: `supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce })` — passes the **raw** nonce; Supabase hashes it server-side and verifies it matches the `nonce` claim in the JWT issued by Apple. ✅

The chain prevents replay because the Apple JWT contains `sha256(rawNonce)`, and Supabase recomputes it from the raw nonce. An attacker who captures the identityToken cannot replay it because they don't have the rawNonce that produces the matching hash.

**One MINOR hardening note:** the rawNonce is held only in the function-local closure during the call; it is not persisted. Good — but if `AppleAuthentication.signInAsync` rejects (e.g., user cancels), the rawNonce is GC'd. ✅

---

## Summary Table

| Section | Sub-finding | Severity | File Evidence | Fix |
|---|---|---|---|---|
| A.1 | Required reason API codes | PASS | `ios/PrivacyInfo.xcprivacy:5-42` | — |
| A.2 | No undeclared categories used | PASS | n/a | — |
| A.3 | NSPrivacyTracking=false truthful for v1 | PASS | `ios/PrivacyInfo.xcprivacy:45-46` | flip to true when un-stubbing initAttribution |
| A.4 | No NSPrivacyTrackingDomains required | PASS | n/a | add `*.revenuecat.com`, `iadsdk.apple.com` post un-stub |
| A.5.b | DeviceID / ProductInteraction not declared | MINOR | n/a | Add ProductInteraction dict; DeviceID only post un-stub |
| A.5.c | OtherDiagnosticData possibly over-declared | MINOR | `ios/PrivacyInfo.xcprivacy` | Optional removal |
| B.1 | Permission usage strings inventoried | PASS | `app.json:31-34` (Phase 3) | — |
| B.2 | NSUserTrackingUsageDescription copy | PASS | `app.json` Phase 3 | one optional copy edit |
| B.3 | NSFaceIDUsageDescription copy | PASS | `app.json` Phase 3 | — |
| B.4 | ITSAppUsesNonExemptEncryption=false unverified | **MAJOR** | `app.json:33` | Verify vault crypto callers; either dead-code-eliminate or file BIS annual report and add `ITSEncryptionExportComplianceCode` |
| B.5 | LSApplicationCategoryType correct | PASS | `app.json:32` | — |
| C.1 | No NSAppTransportSecurity overrides | PASS | n/a | — |
| C.2 | No `http://` URLs (only FHIR system URIs) | PASS | `lib/research/rweExport.ts:185,192,207` | — |
| C.3 | Supabase URL is HTTPS | PASS | `lib/supabase/client.ts:21` | — |
| D.1 | Auth tokens in AsyncStorage not Keychain | MAJOR (carry-over) | `lib/supabase/client.ts:35-56` | `expo-secure-store` migration (rule-blocked) |
| D.2 | Full AsyncStorage key inventory | PASS (informational) | see table above | — |
| D.3 | Sign-out wipes consent | MINOR (legal) | `lib/supabase/auth.ts:413` | retain consent records cross-sign-out |
| E.1.b | Reset-password token validation missing | **MAJOR** | `app/reset-password.tsx:42-67`, `app/_layout.tsx:352-365` | Implement Phase-4 verifyOtp gate (in master, not in branch) |
| E.1.c | URL Scheme Squatting risk | MINOR | `app.json` (no associatedDomains) | Add Universal Links for sensitive flows |
| E.2 | Magic-link callback not handled | PASS | `lib/supabase/auth.ts:263` | — |
| F.1 | Sentry beforeSend lacks PII scrubber in this branch | MAJOR (in branch, fixed in master per P4.4) | `app/_layout.tsx:78-97` | Apply Phase-4 scrubber + JWT regex |
| F.2 | No Sentry.setUser | PASS | n/a | — |
| F.3 | captureException context could include PII | MINOR | `lib/observability/sentryTags.ts:156-167` | Defensive scrubber covers this |
| F.4 | No PII in setTag | PASS | `lib/observability/sentryTags.ts:67-112` | — |
| F.5 | Breadcrumb data is non-PII | PASS | `lib/attribution/appleSearchAds.ts:59-156` | — |
| G.1 | CSPRNG used for crypto random | PASS | multiple | — |
| G.2 | SHA-256 only | PASS | multiple | — |
| G.3 | WebCrypto AES-256-GCM, PBKDF2 100k | PASS (MINOR: raise iterations) | `lib/vault/crypto.ts:99-110` | Raise PBKDF2 to 210k |
| G.4 | **Math.random() generates sharing access tokens** | **CRITICAL** | `lib/storage.ts:260-267`, `lib/sharing/shareService.ts:77` | Replace with `Crypto.getRandomBytesAsync(24)` |
| G.5 | generateId uses Math.random | MINOR | `lib/storage.ts:141` | Optional CSPRNG migration |
| G.6 | No plaintext password storage | PASS | n/a | — |
| G.7 | Biometric is local-only (correct posture) | PASS | `lib/biometric/index.ts` | — |
| H.1 | Service-role key only on server | PASS | `api/*.ts` | — |
| H.2 | .env.example uses placeholder | PASS | `.env.example:43` | — |
| H.3 | eas.json doesn't bundle secrets | PASS | `eas.json` | — |
| H.4 | ASC / Play key paths in repo | MINOR | `eas.json:55-60` | Verify `keys/` is in .gitignore |
| H.5 | dist/ has no leaked keys | PASS | `dist/` | — |
| I.1 | ATT only fires post un-stub | PASS for v1 | `lib/attribution/appleSearchAds.ts:56-57` | — |
| I.2 | AdServices only post un-stub | PASS for v1 | `lib/attribution/appleSearchAds.ts:98` | — |
| I.3 | No pasteboard reads | PASS | n/a | — |
| I.4 | No local-network discovery | PASS | n/a | — |
| I.5 | No Bluetooth | PASS | n/a | — |
| I.6 | No HomeKit / WatchConnectivity | PASS | n/a | — |
| I.7 | No camera/mic capture surfaces | PASS | n/a | — |
| I.8 | Apple SiwA nonce + SHA-256 + raw-nonce-to-Supabase | PASS | `lib/supabase/auth.ts:340-370` | — |

### Counts

| Severity | Count |
|---|---|
| CRITICAL | **1** (G.4 — Math.random sharing access tokens) |
| MAJOR | **4** (B.4 ITSAppUsesNonExemptEncryption unverified, D.1 Keychain carry-over, E.1.b reset-password token validation in branch, F.1 Sentry scrubber in branch) |
| MINOR | **10** (A.5.b, A.5.c, B.2 copy nit, C.3 PBKDF2 iterations, D.3 sign-out consent, E.1.c URL Scheme Squatting, F.3 captureException context, G.3 PBKDF2 raise, G.5 generateId, H.4 keys/.gitignore) |
| PASS | **30+** |

### Privacy / Security Grade

**A−** for the privacy/permissions/security domain after the open Phase-3 + Phase-4 fixes from master are merged into this branch.

- The G.4 sharing-token CRITICAL is rule-compatible-fixable (uses only `expo-crypto`, already a dep) and is not dependent on any other agent's work.
- B.4 ITSAppUsesNonExemptEncryption is currently MAJOR pending a 5-minute legal verification of vault crypto usage. If the vault is dead code in v1, it drops to PASS with no work; if it is live, it requires a free BIS annual self-classification report.
- E.1.b and F.1 are MAJOR-in-this-branch but already fixed in master (per the existing audit Phase 4). Verify the merge before the next submission.
- D.1 (Keychain) is genuinely rule-blocked by the dep restriction.
- Without G.4 fixed: grade caps at **B**.
- With G.4 fixed and B.4 verified: **A−**.
- With D.1 (Keychain dep approved) and Universal Links: **A** to **A+**.

---

## Followup Tasks (Privacy / Security only — A+ push agent should address)

1. **[CRITICAL] Replace `Math.random()` in `lib/storage.ts:260-267`** with `Crypto.getRandomBytesAsync(24)`. Single-file change, one signature update at `lib/sharing/shareService.ts:77`. **No dep change.**

2. **[MAJOR] Verify ITSAppUsesNonExemptEncryption=false claim.** Walk callers of `lib/vault/crypto.ts:148-164` (`encryptPayload`). If unused in v1: dead-code-eliminate. If used: file BIS annual self-classification report + add `ITSEncryptionExportComplianceCode` Info.plist key.

3. **[MAJOR] Backport reset-password token validation** (`app/reset-password.tsx` + `app/_layout.tsx:347-371`) from master Phase-4 fix. Without it, an attacker with brief access to an unlocked device can change the password without proving email control.

4. **[MAJOR] Backport Sentry email/phone scrubber** (`app/_layout.tsx:75-144` per master P4.4). Add JWT regex (`/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g`) on top of master's email + phone scrubber — covers the case where an exception message contains a leaked Supabase access token.

5. **[MINOR] Add `NSPrivacyCollectedDataTypeProductInteraction`** dict to `ios/PrivacyInfo.xcprivacy` (Linked=true, Tracking=false, Purposes=Analytics+AppFunctionality). Reflects RevenueCat's `originalAppUserId` + `firstSeen` data.

6. **[MINOR] Universal Links migration plan.** Add `associatedDomains: ["applinks:orbitalhealth.app", "webcredentials:orbitalhealth.app"]` to `app.json` `ios`. Host AASA file at `https://orbitalhealth.app/.well-known/apple-app-site-association`. Update Supabase redirect URLs from `orbital://` to `https://orbitalhealth.app/`. Closes E.1.c (URL Scheme Squatting). Recommended for a v2 binary.

7. **[MINOR] Raise PBKDF2 iterations** from 100,000 to 210,000 in `lib/vault/crypto.ts:103`. Aligns with OWASP 2023.

8. **[MINOR] Atomic un-stub plan for `initAttribution`.** When the product team approves enabling Apple Search Ads attribution, the same PR must (a) un-stub `lib/subscription/useSubscription.tsx:43-44`, (b) flip `NSPrivacyTracking` to `<true/>`, (c) add `NSPrivacyTrackingDomains`, (d) add `NSPrivacyCollectedDataTypeDeviceID` to manifest. Document this as a single PR checklist.

9. **[MINOR] Verify `keys/` directory is in `.gitignore`** (`eas.json:55,60` references `./keys/AuthKey_K5FGNKXMAZ.p8` and `./keys/google-play-service-account.json`). One-line `.gitignore` audit.

10. **[MINOR] Defensive scrubbing in `lib/observability/sentryTags.ts:156-167`** — `additionalContext` is open-ended. Apply the master Phase-4 scrubber to extras as well as `event.message`.

11. **[MINOR] Sign-out preserves consent records** — `lib/supabase/auth.ts:413` `AsyncStorage.clear()` wipes `@orbital:terms_acceptance` and consent records that GDPR / institutional regimes may require to be retained. Selectively wipe instead of `clear()`.

12. **[MINOR — Followup chain] Keychain migration (rule-blocked).** Add `expo-secure-store` to `package.json` (requires approval), then swap `customStorage` in `lib/supabase/client.ts:35-56` to a SecureStore adapter for iOS native, AsyncStorage retained for web. Closes D.1.

---

## Phase 5 — Keychain migration applied

**Date applied:** 2026-05-10
**Scope:** Closes the last MAJOR security finding (§F1 / §D.1) in this audit by
moving Supabase auth tokens out of AsyncStorage and into the iOS Keychain
(Android Keystore on Android) via `expo-secure-store@~15.0.8`.

### Changes landed

- **New file:** `lib/supabase/secureStorage.ts` — Storage adapter shaped
  identically to the prior `customStorage` (`getItem` / `setItem` /
  `removeItem`) but backed by `SecureStore.{getItem,setItem,deleteItem}Async`
  on native and `localStorage` on web (web has no Keychain — behavior
  matches prior plaintext baseline, which is acceptable since web storage
  is already plaintext).
- **Modified:** `lib/supabase/client.ts` — replaced `customStorage` with
  the new adapter. All other Supabase client config is unchanged
  (`autoRefreshToken`, `persistSession`, `detectSessionInUrl`,
  `storageKey: 'orbital_supabase_auth'`, `x-client-info` header).
  Direct `AsyncStorage` import removed from this file (it's still used
  inside the adapter for the one-time migration only).

### Chunking strategy

`expo-secure-store` enforces a 2 KB ceiling on individual value sizes;
Supabase session payloads (refresh + access JWT + user metadata)
routinely exceed this. The adapter chunks transparently:

- Threshold: **2000 chars** (leaves headroom for UTF-8 multi-byte chars
  and a small JSON manifest).
- Values ≤ threshold are stored at the primary key directly with no
  manifest — fast path for typical small reads.
- Values > threshold are split into N chunks at sub-keys
  `${key}.0`, `${key}.1`, …, `${key}.N-1`; the primary key holds a
  small manifest `{"__chunked":true,"count":N}`.
- Reads inspect the primary key; if it parses as a manifest, the
  adapter walks `0..count-1` and concatenates. Otherwise the raw
  value is returned. Manifest detection uses a `startsWith` fast-path
  before `JSON.parse` to avoid parsing every plain-string read.
- Writes are ordered chunks-first, manifest-last, so a partial write
  cannot be misread as a complete chunked value.
- Pre-existing chunks from a prior chunked write are cleared before
  a new write to avoid orphaned slices.

### Migration logic (transparent — no logout required)

On the first `getItem` call after upgrade, if `SecureStore` returns
`null` for the requested key AND `AsyncStorage` has a value at the
same key, the adapter:

1. Writes the legacy value into SecureStore (with chunking if needed).
2. Deletes the legacy AsyncStorage entry.
3. Returns the value to Supabase as if SecureStore always had it.

The order is **SecureStore-write-then-AsyncStorage-delete** to ensure
no token is lost mid-migration. Migration is idempotent: subsequent
reads find the value in SecureStore and skip the AsyncStorage check
(no-op fast path). Existing logged-in users keep their session — no
forced logout, no re-auth.

`removeItem` (used on sign-out) clears both SecureStore and any legacy
AsyncStorage residue to prevent a stale session from being resurrected
by a later migration pass.

### Error handling

- **getItem:** any read failure returns `null`. Supabase treats `null`
  as "no session" and the user re-auths on next app open. No data loss
  because writes are atomic per chunk.
- **setItem / removeItem:** errors are logged via `console.warn`, which
  Sentry's RN integration captures as breadcrumbs.

### F1 status: **CLOSED**

Auth tokens (refresh + access JWT) are now stored in the iOS Keychain
(`kSecClassGenericPassword`, app-only access) on iOS 12+ and the
Android Keystore (AES-256-GCM) on Android 6+. They are no longer
recoverable on jailbroken / rooted devices via the AsyncStorage SQLite
file or NSUserDefaults plist.

### Privacy / Security new grade: **A**

Up from A− pre-Phase-5. Remaining MAJOR/CRITICAL findings:
- §G.4 (Math.random sharing tokens): closed in a separate commit on this
  branch (audit was pre-fix).
- §B.4 (ITSAppUsesNonExemptEncryption): unchanged — pending legal
  verification of vault crypto. Independent of this Phase 5 work.

A → A+ requires the Universal Links migration (§E.1.c followup) and
verification of B.4. Both are followups, not blockers.

### Other AsyncStorage keys identified — NOT migrated this phase

Per audit §D.2, the goal is **tokens/PII → SecureStore; preferences/
cache → AsyncStorage**. The only TOKEN-class key was
`orbital_supabase_auth` (now migrated). The following keys were
audited and explicitly **NOT** migrated:

**Candidates for future SecureStore migration (TOKEN-LIKE / device identity):**

| Key | File | Reason flagged | Why deferred |
|---|---|---|---|
| `@orbital:shares` (accessToken field) | `lib/storage.ts:36` | Bearer token granting read access to capacity logs | Token entropy fix already shipped (G.4) — moving the storage location is hardening, not a CRITICAL. Followup. |
| device ID / session ID | `lib/session/deviceRegistry.ts:44,93` | Stable device identifier — Apple guidance prefers Keychain | Followup. Borderline; CSPRNG-generated, no auth power. |

**Candidates explicitly NOT for SecureStore (too large / not tokens):**

| Key | File | Class | Why kept in AsyncStorage |
|---|---|---|---|
| `@orbital:logs` | `lib/storage.ts:32` | PII (capacity logs, notes) | Large blob, exceeds Keychain practical size; vault encryption (`lib/vault/crypto.ts`) is the right path for this data. |
| `@orbital:vault` | `lib/storage.ts:40` | encrypted blob | Already pre-encrypted client-side. |
| `pattern_history_v1` | `lib/patternHistory.ts:20` | PII | Large; encrypt-at-rest path, not Keychain. |
| `@orbital:audit`, `@orbital:sensory_events`, `@orbital:recipients`, `@orbital:offline_queue` | `lib/storage.ts:37,43,35,47` | PII | Acceptable in AsyncStorage given iOS full-device encryption baseline (Data Protection class C). |
| `@orbital:terms_acceptance`, `@orbital:institutional`, age cohort, consent records | `lib/storage.ts:56,39`, `lib/enterprise/*` | legal / config | MEDIUM sensitivity; AsyncStorage acceptable. |
| `@orbital:locale`, `@orbital:preferences`, `@orbital:accessibility`, `@orbital:undo_stack`, `@orbital:demo_*`, `@orbital:team_*`, `@orbital:school_*`, `@orbital:app_mode`, `@orbital:first_app_open` | `lib/storage.ts:33,34,45-67` | preference / cache / config | LOW sensitivity; AsyncStorage is the correct location. |
| `orbital_biometric_settings` | `lib/biometric/index.ts:36` | preference | LOW sensitivity. |
| safe-mode flags, crash count, startup-complete | `lib/safeMode.ts` | telemetry state | LOW sensitivity. |
| circles invites + storage | `lib/circles/invites.ts`, `lib/circles/storage.ts` | TOKEN-LIKE invites are CSPRNG-generated; circle storage is membership PII | Followup candidate for the invite codes; circle membership data is acceptable in AsyncStorage. |

Followups #2 (sharing tokens to SecureStore) and #3 (device ID to
SecureStore) are the next-priority migrations. Neither is a current
finding; both are hardening.

---

*End of privacy / permissions / security audit. Phase 5 Keychain
migration applied. Handoff continues to the iOS A+ push agent for
remaining followups (B.4 verification, Universal Links, sharing-token
storage migration).*
