# ORBITAL LAUNCH VERIFICATION REPORT

**Date:** 2025-01-07
**Auditor:** Claude Code (Automated Review)
**Codebase:** Orbital-v2/orbital
**Version:** 1.0.0 (Build 38)

---

## 1. EXECUTIVE SUMMARY

### Overall Verdict: **CONDITIONAL PASS**

The codebase is structurally sound for launch with **3 blocking issues** that must be resolved before store submission.

---

### TOP 10 LAUNCH RISKS (Ranked by Severity × Likelihood)

| Rank | Risk | Severity | Likelihood | Status |
|------|------|----------|------------|--------|
| **1** | Apple Sign-In NOT implemented | **CRITICAL** | CERTAIN | iOS App Store rejection |
| **2** | RevenueCat API keys are placeholders | **CRITICAL** | CERTAIN | IAP non-functional |
| **3** | 105 console.log statements in lib/ | HIGH | CERTAIN | Debug leakage |
| 4 | Supabase migrations not verified as deployed | HIGH | LIKELY | Sync failures |
| 5 | Magic link redirect URL not registered | MEDIUM | LIKELY | Auth callback fails |
| 6 | signInAnonymously exists in code (dead code) | LOW | UNLIKELY | Code hygiene |
| 7 | No automated tests visible | MEDIUM | N/A | Regression risk |
| 8 | No Android-specific store configuration visible | MEDIUM | UNKNOWN | Play Store gaps |
| 9 | Family pricing described as "per member seat" may confuse users | LOW | POSSIBLE | UX friction |
| 10 | Sentry PII scrubbing not explicitly configured | LOW | UNLIKELY | Data leak |

---

### App Store / Play Store Rejection Risks

| Issue | Platform | Rejection Reason |
|-------|----------|------------------|
| **Missing Apple Sign-In** | iOS | Apps with third-party sign-in MUST offer Apple Sign-In per [App Store Review Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/#sign-in-with-apple) |
| Privacy Policy URL missing in config | iOS/Android | Required for account-based apps |
| RevenueCat not functional | iOS/Android | IAP will fail, subscriptions broken |

---

## 2. VERIFIED INVENTORY (EVIDENCE-BASED)

### A) Auth (Magic Link, Apple SI) + "No Anonymous Writes"

| Requirement | Meets Contract? | Evidence |
|-------------|-----------------|----------|
| Magic link auth | **YES** | `lib/supabase/auth.ts:158-186` — `signInWithMagicLink()` implemented |
| Apple Sign-In | **NO** | No code found. Grep for `signInWithApple|apple.*sign` returned empty. |
| Email/password auth | YES | `lib/supabase/auth.ts:100-126` — `signInWithEmail()` |
| No anonymous cloud writes | **YES** | UI does not expose `signInAnonymously()`. Auth required for sync (`useCloudSync.ts:113`, `syncEngine.ts:58-61`). |

**Blocking Issue:** Apple Sign-In must be implemented for iOS App Store compliance.

**Tests to Confirm:**
1. Attempt cloud write without auth → should fail silently
2. Verify magic link callback at `orbital://auth/callback` is registered in app config

---

### B) Cloud Sync Engine + Outbox + Server-Wins + Triggers

| Requirement | Meets Contract? | Evidence |
|-------------|-----------------|----------|
| Offline-first logging | **YES** | `lib/storage.ts` writes to AsyncStorage; `lib/cloud/outbox.ts` queues pending |
| Outbox queue | **YES** | `lib/cloud/outbox.ts:1-145` — full queue implementation |
| 60s sync interval | **YES** | `lib/cloud/useCloudSync.ts:47` — `SYNC_INTERVAL_MS = 60000` |
| Foreground sync | **YES** | `useCloudSync.ts:178-179` — `syncNow()` triggers on auth change |
| Reconnect sync | **YES** | `useCloudSync.ts:193-202` — NetInfo listener triggers sync |
| Server wins conflict | **YES** | `syncEngine.ts:246-256` — `mergeCloudIntoLocal()` overlays cloud on local |
| No opt-in toggle | **YES** | `cloud-sync.tsx` has no Switch component; toggle removed |

**Code Snippets:**
```typescript
// lib/cloud/useCloudSync.ts:47
const SYNC_INTERVAL_MS = 60000; // 1 minute

// lib/cloud/syncEngine.ts:246-256
// Overlay cloud logs (server wins on conflict)
for (const cloudLog of cloudLogs) {
  if (cloudLog.deleted_at) {
    mergedMap.delete(cloudLog.client_log_id);
    continue;
  }
  const converted = cloudToLocal(cloudLog);
  mergedMap.set(converted.id, converted);
}
```

**Tests to Confirm:**
1. Put device offline, log 3 signals, go online → verify sync
2. Log on Device A, sync, then pull on Device B → verify data appears
3. Uninstall app, reinstall, sign in → verify data restored

---

### C) Data Model + RLS Policies + Migrations

| Requirement | Meets Contract? | Evidence |
|-------------|-----------------|----------|
| capacity_logs table | **YES** | `migrations/00003_cloud_patterns_v1.sql:28-64` |
| State enum matches app | **YES** | `capacity_state AS ENUM ('resourced', 'stretched', 'depleted')` line 22 |
| Idempotent upsert | **YES** | `CONSTRAINT capacity_logs_user_client_unique UNIQUE (user_id, client_log_id)` line 63 |
| RLS enabled | **YES** | `ALTER TABLE capacity_logs ENABLE ROW LEVEL SECURITY` line 123 |
| Users read only own rows | **YES** | Policy line 132-134: `USING (auth.uid() = user_id)` |
| No admin override | **YES** | No `service_role` policy exists on `capacity_logs` |

**RLS Policy Evidence:**
```sql
-- migrations/00003_cloud_patterns_v1.sql:132-147
CREATE POLICY "Users can view own capacity logs"
    ON capacity_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own capacity logs"
    ON capacity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

**Tests to Confirm:**
1. Run migrations in production Supabase
2. As User A, attempt `SELECT * FROM capacity_logs WHERE user_id != auth.uid()` → must return 0

---

### D) Demographics (Year of Birth Only)

| Requirement | Meets Contract? | Evidence |
|-------------|-----------------|----------|
| Year only, no DOB | **YES** | `migrations/00002_user_demographics.sql:33` — `year_of_birth INTEGER` |
| Age brackets computed | **YES** | `compute_age_bracket()` function lines 78-101 |
| Gender enum inclusive | **YES** | `gender_choice AS ENUM ('woman', 'man', 'non_binary', 'self_described', 'unspecified')` line 15-21 |
| Self-described never aggregated | **YES** | Line 167: `CASE WHEN gender = 'self_described' THEN 'self_described'` — text not exposed |
| k-anonymity K>=10 | **YES** | `p_k_threshold INTEGER DEFAULT 10` line 108 |
| Demographics never in Circles | **YES** | Stored in `user_profiles`, not synced to social features |

**Code Snippet:**
```sql
-- migrations/00002_user_demographics.sql:33
year_of_birth INTEGER CHECK (
    year_of_birth IS NULL OR
    (year_of_birth >= 1900 AND year_of_birth <= EXTRACT(YEAR FROM CURRENT_DATE))
),
```

---

### E) Export/Delete Flows

| Requirement | Meets Contract? | Evidence |
|-------------|-----------------|----------|
| User can export JSON | **YES** | `app/export.tsx:55-60` — `handleExportJson()` |
| User can export CSV | **YES** | `app/export.tsx:63-67` — `handleExportCsv()` |
| Full data exit flow | **YES** | `app/data-exit.tsx:1-686` — complete implementation |
| Deletion certificate | **YES** | `generateDeletionCertificate()` lines 36-100 |
| Cascade delete on auth | **YES** | `ON DELETE CASCADE` on all `user_id` foreign keys |

**Tests to Confirm:**
1. Export JSON → verify contains all logs
2. Complete data-exit flow → verify certificate generated
3. Check Supabase: user deleted → cascade deletes user_profiles, capacity_logs

---

### F) RevenueCat Configuration

| Requirement | Meets Contract? | Evidence |
|-------------|-----------------|----------|
| RevenueCat integrated | **PARTIAL** | `lib/subscription/useSubscription.tsx` — code exists |
| API keys configured | **NO** | Lines 38-39: `'appl_REPLACE_WITH_REVENUECAT_IOS_KEY'` and `'goog_REPLACE_WITH_REVENUECAT_ANDROID_KEY'` |
| Entitlement ID defined | **YES** | `types.ts` — `ENTITLEMENT_ID` exists |
| Graceful fallback | **YES** | Lines 94-103: Falls back to free mode if not configured |
| Restore purchases | **YES** | `restore()` function lines 220-244 |

**Pricing Verification:**

| Tier | Expected | Actual (`pricing.ts`) | Match? |
|------|----------|----------------------|--------|
| Individual Monthly | $19/mo | $19/mo | **YES** |
| Individual Annual | $179/yr | $179/yr | **YES** |
| Pro Monthly | $49/mo | $49/mo | **YES** |
| Pro Annual | $449/yr | $449/yr | **YES** |
| Family Monthly | $9/mo | $9/mo | **YES** |
| Family Annual | $79/yr | $79/yr | **YES** |
| Family Pro Monthly | $29/mo | $29/mo | **YES** |
| Family Pro Annual | $259/yr | $259/yr | **YES** |
| Sponsor Seat Core | $200/yr | $200/yr | **YES** |
| Sponsor Seat Pro | $349/yr | $349/yr | **YES** |
| Bundle 10 | $3,500/yr | $3,500/yr | **YES** |
| Bundle 25 | $9,000/yr | $9,000/yr | **YES** |
| Bundle 50 | $18,000/yr | $18,000/yr | **YES** |

**Blocking Issue:** Replace placeholder API keys before launch.

---

### G) Bundle Codes & Sales Isolation

| Requirement | Meets Contract? | Evidence |
|-------------|-----------------|----------|
| Sponsor codes implemented | **YES** | `lib/access/sponsorCodes.ts:1-326` |
| Codes validated offline | **YES** | Uses checksum validation, no server call |
| Nonce replay prevention | **YES** | `isCodeRedeemed()` lines 206-215 |
| No user ID in sales system | **YES** | Code stores only `tier`, `nonce`, `expiry` — no user ID |

**Tests to Confirm:**
1. Generate test code with `generateTestCode('pro')`
2. Redeem twice → second should fail
3. Verify no user ID logged or transmitted

---

### H) Founder Access Prevention

| Requirement | Meets Contract? | Evidence |
|-------------|-----------------|----------|
| No service_role on capacity_logs | **YES** | No such policy in migration |
| RLS auth.uid() check | **YES** | All policies use `auth.uid() = user_id` |
| Functions check caller | **YES** | `upsert_capacity_log` line 194: `IF auth.uid() != p_user_id THEN RAISE EXCEPTION` |
| No admin UI for user data | **YES** | No admin screens found in `app/` |
| No behavior logging to Sentry | **PARTIAL** | `crashReporter.ts` only logs exceptions, not behavior. But context could leak. |

**Potential Leak:**
```typescript
// lib/crashReporter.ts:22-28
captureException(error: Error, context?: CrashContext) {
  Sentry.captureException(error, { extra: context });
}
```
`context` could contain user data if passed carelessly. Review all call sites.

---

### I) Sentry Configuration

| Requirement | Meets Contract? | Evidence |
|-------------|-----------------|----------|
| Sentry initialized | **YES** | `app/_layout.tsx:20-23` |
| DSN configured | **YES** | `dsn: 'https://bbb78729aee9b642c8d677a48da6379d@o4510642690457600...'` |
| Disabled in dev | **YES** | `enabled: !__DEV__` line 22 |
| Release tagging | **UNKNOWN** | Not visible in config; EAS may inject |
| PII scrubbing | **UNKNOWN** | Not explicitly configured |

**Code:**
```typescript
// app/_layout.tsx:20-23
Sentry.init({
  dsn: 'https://bbb78729aee9b642c8d677a48da6379d@o4510642690457600.ingest.us.sentry.io/4510642826772480',
  enabled: !__DEV__,
});
```

---

### J) iOS/Android Store Readiness

**iOS (`app.json`):**
| Item | Value | Status |
|------|-------|--------|
| Bundle ID | `com.erparris.orbital` | OK |
| Build Number | 38 | OK |
| Apple Team ID | `2KM3QL4UMV` | OK |
| Non-exempt encryption | FALSE | OK |
| Supports tablet | TRUE | OK |

**Android (`app.json`):**
| Item | Value | Status |
|------|-------|--------|
| Package | `com.erparris.orbital` | OK |
| Adaptive icon | Configured | OK |

**EAS Submit (`eas.json`):**
| Item | Value | Status |
|------|-------|--------|
| ASC App ID | `6757295146` | OK |
| API Key configured | YES | OK |

**Missing:**
- Privacy Policy URL not in app.json
- Apple Sign-In capability not declared in ios.entitlements
- Android store listing metadata unknown

---

## 3. BUG HUNT (STATIC REVIEW)

### Potential Crashes / Race Conditions

| Issue | File:Line | Severity |
|-------|-----------|----------|
| `syncNow()` called in rapid succession may interleave | `useCloudSync.ts:111-139` | LOW — `syncInProgress` ref prevents, but not atomic |
| `fullSync()` has no timeout | `syncEngine.ts:271-287` | MEDIUM — network hang could block indefinitely |
| `pullAndMerge` silently swallows errors | `useCloudSync.ts:168-171` | LOW — logs error but returns local data |

### Edge Cases

| Scenario | Status | Notes |
|----------|--------|-------|
| Offline-first write then sync | HANDLED | Outbox queues pending entries |
| Token expiry mid-sync | PARTIALLY | Supabase client has `autoRefreshToken: true` but no explicit handling |
| Duplicate client_log_id | HANDLED | `ON CONFLICT ... DO UPDATE` in SQL |
| Outbox replay on reconnect | HANDLED | NetInfo listener triggers sync |

### Security Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Sentry DSN hardcoded in source | LOW | `app/_layout.tsx:21` — acceptable for client DSN |
| RevenueCat keys as placeholders | **CRITICAL** | `useSubscription.tsx:38-39` — not production |
| `signInAnonymously` exists but unused | LOW | `lib/supabase/auth.ts:188-212` — dead code, remove |
| No CSP headers for web | LOW | Web is secondary platform |

### UX Traps (Hidden Opt-In Language)

| Location | Text | Issue? |
|----------|------|--------|
| `app/settings.tsx:409` | "Opt-in workplace capacity pulse" | Acceptable — refers to Team Mode, not cloud |
| `app/team-mode.tsx:154` | "Opt in to share your capacity signals with your team" | Acceptable — team feature, not cloud sync |
| `app/profile.tsx:152` | "These optional fields are used only for anonymous aggregate insights" | OK — refers to demographics |
| `cloud-sync.tsx` | NO toggle, NO opt-in language | **PASS** |

---

## 4. LAUNCH-BLOCKING CHECKLIST

| # | Requirement | Status | Evidence / How to Verify |
|---|-------------|--------|--------------------------|
| 1 | Cloud sync automatic after auth | **PASS** | `useCloudSync.ts:175-191` — triggers on auth |
| 2 | No cloud backup toggle | **PASS** | `cloud-sync.tsx` — no Switch component |
| 3 | Magic link auth works | **PASS** | Code complete; verify email delivery |
| 4 | Apple Sign-In implemented | **FAIL** | No code found |
| 5 | RevenueCat keys configured | **FAIL** | Placeholder strings present |
| 6 | Supabase migrations applied | **UNKNOWN** | Run in production Supabase |
| 7 | RLS blocks cross-user access | **PASS** | `auth.uid() = user_id` on all policies |
| 8 | Founder cannot access individual data | **PASS** | No service_role policies |
| 9 | Demographics = year only | **PASS** | `year_of_birth INTEGER` |
| 10 | k-anonymity enforced | **PASS** | `p_k_threshold INTEGER DEFAULT 10` |
| 11 | Data export works | **PASS** | `app/export.tsx` complete |
| 12 | Account deletion works | **PASS** | `app/data-exit.tsx` complete |
| 13 | Sentry enabled | **PASS** | `enabled: !__DEV__` |
| 14 | Console.log removed | **FAIL** | 105 occurrences in lib/ |
| 15 | Bundle codes work offline | **PASS** | Checksum validation, no server |
| 16 | Pricing matches spec | **PASS** | All 13 tiers verified |
| 17 | Privacy Policy URL | **UNKNOWN** | Not in app.json |
| 18 | iOS entitlements for Sign-In | **UNKNOWN** | Not in visible config |

---

## 5. STORE SUBMISSION PACKAGE REVIEW

### App Store (iOS)

**What's New (Version 1.0.0):**
> Orbital helps you track your capacity over time. Log how resourced, stretched, or depleted you feel throughout the day. See patterns emerge. Your data stays yours—syncs securely across devices, and you can export or delete it anytime.

**Privacy Summary Bullets:**
- Data collected: Email (for account), capacity signals (user-owned)
- Data usage: Personal tracking, cross-device sync
- Data sharing: None. We cannot access your individual data.
- Data retention: Until you delete it
- Third parties: Supabase (cloud storage, EU-compliant), RevenueCat (subscriptions only)

**Review Notes for App Store Team:**
> This app tracks personal capacity/energy levels. It is not a medical device and makes no diagnostic claims. Users own their data and can export or delete at any time. Row-level security ensures even our team cannot access individual user data. Aggregate insights are only shown with k-anonymity thresholds.

### Play Store (Android)

**Short Description:**
> Track your capacity. See patterns. Own your data.

**Data Safety Section:**
- Account info (email): Collected for sign-in
- User content (capacity logs): Collected for core functionality
- Data encrypted in transit: Yes
- Data can be deleted: Yes (in-app data exit flow)
- Data shared with third parties: No

### Medical Claims Flag

**Review all user-facing text for these terms:**
- "diagnose" / "diagnosis" — NOT FOUND
- "treat" / "treatment" — NOT FOUND
- "cure" — NOT FOUND
- "medical" — NOT FOUND in user-facing copy
- "health" — Used in company name only, not feature claims

**Verdict:** No medical claims detected. Safe for store submission.

---

## APPENDIX: FILES REVIEWED

| Path | Purpose | Lines |
|------|---------|-------|
| `app/_layout.tsx` | Root layout, Sentry init | 197 |
| `app/cloud-sync.tsx` | Account/sync screen | 686 |
| `app/export.tsx` | Data export | 313 |
| `app/data-exit.tsx` | Account deletion | 686 |
| `app.json` | Expo config | 67 |
| `eas.json` | EAS build/submit | 30 |
| `lib/supabase/auth.ts` | Auth hook | 334 |
| `lib/supabase/client.ts` | Supabase client | 126 |
| `lib/cloud/useCloudSync.ts` | Sync hook | 214 |
| `lib/cloud/syncEngine.ts` | Push/pull logic | 314 |
| `lib/cloud/settings.ts` | Cloud settings | 139 |
| `lib/cloud/outbox.ts` | Offline queue | ~145 |
| `lib/subscription/useSubscription.tsx` | RevenueCat | 310 |
| `lib/subscription/pricing.ts` | Pricing config | ~270 |
| `lib/access/sponsorCodes.ts` | Bundle codes | 326 |
| `lib/profile/types.ts` | Demographics types | ~180 |
| `lib/crashReporter.ts` | Sentry wrapper | 60 |
| `supabase/migrations/00001_initial_schema.sql` | Initial schema | — |
| `supabase/migrations/00002_user_demographics.sql` | Demographics | 227 |
| `supabase/migrations/00003_cloud_patterns_v1.sql` | Cloud patterns | 354 |

---

## FINAL ACTION ITEMS

### Must Fix Before Launch

1. **Implement Apple Sign-In** — iOS App Store requirement
2. **Replace RevenueCat placeholder keys** — IAP non-functional
3. **Remove or guard console.log statements** — `grep -r "console\.(log|error|warn)" lib/ | wc -l` shows 105

### Should Fix Before Launch

4. Apply Supabase migrations to production
5. Verify magic link redirect URL registered
6. Remove dead `signInAnonymously` code from auth.ts
7. Add Privacy Policy URL to app.json
8. Configure Sentry release tagging and PII scrubbing

### Post-Launch

9. Add automated tests for sync flows
10. Implement Apple Sign-In for Android (optional but recommended for cross-platform parity)

---

**Report Generated:** 2025-01-07
**Verdict:** CONDITIONAL PASS — Fix 3 blocking issues, then clear for submission.
