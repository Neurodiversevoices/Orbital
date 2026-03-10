# Orbital Pre-Submission Audit Report

**Branch:** master
**Date:** 2026-03-10
**Build:** 59
**Audited by:** 5 independent domain agents

---

## CRITICAL — Blocks Submission

### C1. Account Deletion Does Not Delete the Auth User
**Domain:** Auth & Security / Apple Compliance
**Files:** `lib/supabase/auth.ts:431-459`
**Guideline:** App Store Review 5.1.1(v)

`deleteAccount()` calls `delete_user_data` RPC (soft-deletes capacity_logs, removes metrics/preferences, revokes org memberships) then signs out. **The `auth.users` row is never deleted.** The code acknowledges this at line 449:

> "Note: Actually deleting the auth user requires admin privileges or a separate edge function. For now, we just sign out."

A user who "deletes" their account can sign back in. Apple requires full account deletion.

**Fix:** Create a Supabase Edge Function that calls `supabase.auth.admin.deleteUser(userId)` with the service_role key, invoke it from `deleteAccount()`.

---

### C2. Apple Sign-In Missing Nonce (master branch)
**Domain:** Auth & Security
**File:** `lib/supabase/auth.ts:337-356`

On the master branch, `signInWithApple` calls `signInWithIdToken({ provider: 'apple', token })` **without a nonce**. No nonce is generated, hashed, or passed to either Apple or Supabase. This enables token replay attacks and causes OIDC validation failures on iOS 26.2.1 where Apple changed the issuer.

**Note:** This is fixed on the `claude/fix-apple-review-build-59-6Lzpd` branch. Merge that branch to resolve.

---

### C3. delete_user_data RPC Skips 11 of 15 Tables
**Domain:** Auth & Security
**File:** `supabase/migrations/00001_initial_schema.sql:497-522`

The `delete_user_data` function only deletes from 4 tables. Missing:
- `user_entitlements`, `purchase_history` — payment records persist
- `user_push_tokens` — push tokens remain (privacy risk)
- `circles`, `circle_members`, `circle_invites` — social data persists
- `proof_events`, `capacity_baselines` — derived data persists
- `audit_events` — arguable, but should be documented

GDPR Article 17 requires deletion of all identifiable data on request.

---

## HIGH — Likely Causes Rejection

### H1. No Privacy Policy Link on Auth Screen
**Domain:** Apple Compliance
**File:** `app/auth/index.tsx`
**Guideline:** App Store Review 5.1.1

The auth/signup screen has no link to the privacy policy or terms of service. Users can create accounts without ever seeing the privacy policy. The link exists in Settings (post-login) and on the upgrade screen, but Apple requires it to be accessible **before account creation**.

---

### H2. signOut Does Not Clear Local AsyncStorage
**Domain:** Auth & Security
**File:** `lib/supabase/auth.ts:378-383`

`signOut()` only calls `supabase.auth.signOut()`. It does not clear:
- `orbital_local_capacity_logs` (previous user's logs)
- `orbital_sync_queue`, `orbital_last_sync`
- Profile, identity, audit, outbox, tutorial flags, sensory config, etc.

If a different user signs in on the same device, the previous user's local data leaks.

---

### H3. deleteAccount Does Not Clear Local AsyncStorage
**Domain:** Auth & Security
**File:** `lib/supabase/auth.ts:431-459`

Same as H2 — `deleteAccount()` clears cloud data via RPC but leaves all local AsyncStorage intact. The separate `deleteUserData()` in `lib/supabase/sync.ts:474` clears 3 sync keys but is never called by `deleteAccount()`.

---

### H4. ClinicalOrbV10 Derived Values Frozen After Mount
**Domain:** Reanimated / Worklets
**File:** `components/orb/ClinicalOrbV10.tsx:482,492,504,516`

`frameData.value` (a `useDerivedValue`) is accessed via `.value` directly in JSX render to `.map()` over arrays. This creates Skia elements based on the initial snapshot — the `.value` access in render does not set up a reactive subscription. Nodes, pathways, and lightning bolts render once and freeze instead of animating.

---

## MEDIUM — Technical Debt (Fix After Approval)

### M1. Unguarded console.log Statements in Production Code
**Domain:** Dead Code & Routes
**Files:** Multiple

These files contain `console.log/warn/error` without `__DEV__` guards:
- `lib/circles/selfTest.ts` — 7 console calls (self-test runner)
- `lib/attribution/appleSearchAds.ts:184` — logs purchase events
- `lib/hooks/useAppTenure.ts:47` — console.error on load failure
- `lib/hooks/useDemoMode.tsx` — 12+ console.log calls for demo data generation

While not crash risks, Apple reviewers running the app may see debug output in Console.app. The `useDemoMode` calls are particularly verbose.

---

### M2. Forbidden Medical Terms in User-Visible Text
**Domain:** Apple Compliance
**Files:** Multiple legal/disclaimer screens

Terms like "diagnosis", "treatment", "medical device", "HIPAA" appear in:
- `lib/policies/policyContent.ts:36,235,241,258` — Terms of Service
- `lib/governance/legalPolicies.ts:205,422,428,437,482` — Governance policies
- `lib/cci/cciV1HTML.ts:276` — CCI report footer
- `components/qcr/QCRScreen.tsx:368` — QCR disclaimer
- `locales/en.ts:282` — Disclaimer string

All uses are **defensive** ("Orbital is NOT a medical device", "does not constitute diagnosis"). Not a blocker, but recommend adding an App Store review note explaining the defensive nature of the terminology.

---

### M3. TODO Comments Reveal Unfinished Features
**Domain:** Dead Code & Routes
**Files:**

- `lib/cci/pricing.ts:293,311` — `purchased: false, // TODO: Track Circle/Bundle CCI purchase state`
- `lib/entitlements/index.ts:166-169,280` — `// TODO: Track actual family members/circle members/verify circle membership`
- `lib/patternHistory.ts:14` — `// TODO: COMPLIANCE NOTE` about GDPR data retention

These won't be visible to reviewers at runtime but indicate features that may not work as expected during review.

---

### M4. `app/circles/_api.ts` and `_ui.tsx` Have No Default Export
**Domain:** Crash & Stability
**Files:** `app/circles/_api.ts`, `app/circles/_ui.tsx`

These files in the `app/` directory lack `export default`. Expo Router treats files starting with `_` as non-route utility files, so this is **by design** and will not crash. However, if the Expo Router version changes behavior around underscore-prefixed files, these could surface as warnings.

---

### M5. /reset-password Route Does Not Exist In-App
**Domain:** Dead Code & Routes
**File:** `lib/supabase/auth.ts:394`

`resetPasswordForEmail` redirects to `https://orbitalhealth.app/reset-password` — a **web URL**, not an in-app route. No `app/reset-password.tsx` exists. This is correct behavior (password reset happens on the web), but the web endpoint at `orbitalhealth.app/reset-password` must be deployed and functional. Verify it works.

---

### M6. Missing Explicit 'worklet' Directives in Gesture Callbacks
**Domain:** Reanimated / Worklets
**Files:** `components/GlassOrb.tsx`, `components/orb/SkiaOrb.tsx`, `components/orb/ClinicalOrb.tsx`

Gesture callbacks in these files access shared values without explicit `'worklet'` directives, relying on implicit workletization by the Reanimated Babel plugin. This works in Reanimated 4.x but is inconsistent with the explicit convention used elsewhere (`app/(tabs)/index.tsx`, `WaveOrb.tsx`, `ClinicalOrbV10.tsx`).

---

### M7. Supabase Client Eagerly Created with Placeholder Credentials
**Domain:** Auth & Security
**File:** `lib/supabase/client.ts:124`

`export const supabase = getSupabase()` executes at module import time. If env vars are unset, this creates a client pointing to `https://YOUR_PROJECT.supabase.co`. The `isSupabaseConfigured()` guard exists in auth flows, but direct imports of `supabase` could make requests to an invalid endpoint.

---

### M8. No Client-Side Rate Limiting on Auth Attempts
**Domain:** Auth & Security
**Files:** `lib/supabase/auth.ts`, `app/auth/index.tsx`

No client-side lockout, delay, or attempt counter on sign-in failures. While Supabase has server-side rate limits, a reviewer mashing the login button with wrong credentials will get rapid-fire error toasts.

---

### M9. lensRefraction Shader Exported but Never Used
**Domain:** Dead Code & Routes
**File:** `components/orb/shaders/lensRefraction.ts`

`LENS_REFRACTION_SKSL` is exported but not imported by any component. Dead code.

---

## PASS — No Issues Found

| Domain | Check | Status |
|--------|-------|--------|
| Auth | service_role key confined to server-side only | PASS |
| Auth | Token refresh (`autoRefreshToken: true`) | PASS |
| Auth | Session persistence via AsyncStorage | PASS |
| Apple | Sign in with Apple present wherever Google offered | PASS |
| Apple | Restore Purchases button on upgrade + QCR paywall | PASS |
| Apple | Account deletion accessible in Settings | PASS |
| Worklets | No `useSharedValueEffect` (banned API) usage | PASS |
| Worklets | All haptic calls from worklets use `runOnJS` | PASS |
| Worklets | ShaderOrb uniform names match SkSL declarations | PASS |
| Worklets | ShaderTherm uniform names match SkSL declarations | PASS |
| Routes | No HealthKit references (no iPad crash path) | PASS |
| Routes | No hardcoded secrets in client code | PASS |

---

## Summary by Severity

| Severity | Count | IDs |
|----------|-------|-----|
| CRITICAL | 3 | C1, C2, C3 |
| HIGH | 4 | H1, H2, H3, H4 |
| MEDIUM | 9 | M1–M9 |

### Recommended Fix Order Before Resubmission
1. **C1 + C3**: Implement full account deletion (Edge Function + expanded RPC)
2. **C2**: Merge `claude/fix-apple-review-build-59-6Lzpd` for nonce fix
3. **H1**: Add privacy policy link to auth screen
4. **H2 + H3**: Clear AsyncStorage on signOut and deleteAccount
5. **H4**: Fix ClinicalOrbV10 derived value subscription (if this orb variant ships)
