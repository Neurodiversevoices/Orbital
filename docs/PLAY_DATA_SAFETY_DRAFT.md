# Google Play Data Safety Declaration — Draft

**Date:** 2026-02-20
**App:** Orbital (`com.erparris.orbital`)

---

## Instructions

Paste these answers into Google Play Console → **Policy → App content → Data safety**.

Each section below maps to the Play Console questionnaire flow.

---

## Overview Questions

### Does your app collect or share any of the required user data types?

**Yes**

### Is all of the user data collected by your app encrypted in transit?

**Yes** — All network traffic uses HTTPS (Supabase, RevenueCat, Sentry).

### Do you provide a way for users to request that their data is deleted?

**Yes** — Account deletion cascades to all user data via Supabase `ON DELETE CASCADE` on `auth.users(id)`.

*Feature reference: Account deletion is available in app settings. Row-level security ensures only user-owned data is affected.*

---

## Data Types Collected

### Personal Info

| Data Type | Collected | Shared | Purpose | Required | Processed Ephemerally |
|-----------|-----------|--------|---------|----------|-----------------------|
| **Email address** | Yes | No | Account management, Authentication | Yes | No |
| Name | No | — | — | — | — |
| Phone number | No | — | — | — | — |
| Address | No | — | — | — | — |
| Other personal info | No | — | — | — | — |

**Justification:** Email is collected for Supabase authentication (magic link sign-in, Apple Sign-In). It is stored in Supabase `auth.users` and never shared with third parties.

### Financial Info

| Data Type | Collected | Shared | Purpose | Required | Processed Ephemerally |
|-----------|-----------|--------|---------|----------|-----------------------|
| **Purchase history** | Yes | No | App functionality | Yes | No |
| Other financial info | No | — | — | — | — |

**Justification:** Purchase history is managed by RevenueCat to determine subscription status and entitlement access. No payment card details or financial account info is collected by the app.

### Health and Fitness

| Data Type | Collected | Shared | Purpose | Required | Processed Ephemerally |
|-----------|-----------|--------|---------|----------|-----------------------|
| **Health info** | Yes | No | App functionality | Yes | No |
| Fitness info | No | — | — | — | — |

**Justification:** Orbital collects user-entered capacity signals (energy level, sensory load, demand load, social load) as self-reported integer values. These are **not** medical data, diagnosis data, or data from health devices. The user manually enters all values. Data is stored locally on-device and synced to the user's own cloud account (Supabase). It is never shared with other users (except in explicitly consented Circle/Bundle contexts where the user opts in).

*Important: Orbital does not connect to health devices, does not read HealthKit/Google Fit, and does not make clinical claims.*

### App Activity

| Data Type | Collected | Shared | Purpose | Required | Processed Ephemerally |
|-----------|-----------|--------|---------|----------|-----------------------|
| **App interactions** | Yes | No | Analytics | No | No |

**Justification:** Crash reports and session tracking are collected via Sentry for error monitoring. No behavioral analytics, screen recording, or usage profiling is performed. Sentry receives only error/fatal events (warnings and info are filtered out in `beforeSend`).

### App Info and Performance

| Data Type | Collected | Shared | Purpose | Required | Processed Ephemerally |
|-----------|-----------|--------|---------|----------|-----------------------|
| **Crash logs** | Yes | No | Analytics | No | No |
| **Diagnostics** | Yes | No | Analytics | No | No |

**Justification:** Sentry collects crash stacktraces and performance traces (5% sample rate). This data is used for bug detection and performance monitoring.

### Device or Other Identifiers

| Data Type | Collected | Shared | Purpose | Required | Processed Ephemerally |
|-----------|-----------|--------|---------|----------|-----------------------|
| Device or other IDs | No | No | — | — | — |

**Justification:** Orbital does not collect IDFA, Android Advertising ID, device serial numbers, or hardware fingerprints. Per governance rule P-013: "NEVER track location, device usage, or biometric data."

---

## Data Types NOT Collected

These are explicitly **not collected** by Orbital:

| Category | Data Types | Status |
|----------|-----------|--------|
| Location | Approximate location, Precise location | **Not collected** |
| Messages | Emails, SMS, Other messages | **Not collected** |
| Photos and Videos | Photos, Videos | **Not collected** |
| Audio | Voice/sound recordings, Music files | **Not collected** |
| Files and Docs | Files and docs | **Not collected** |
| Calendar | Calendar events | **Not collected** |
| Contacts | Contacts | **Not collected** |
| Web browsing | Web browsing history | **Not collected** |
| Device IDs | Advertising ID | **Not collected** |

---

## Data Sharing

### Is any user data shared with third parties?

**No.**

Orbital does not share user data with third parties for advertising, marketing, analytics (beyond crash reporting), or any other purpose.

- RevenueCat processes purchase data as a **data processor** (not a third party) for subscription management
- Supabase processes user data as a **data processor** for cloud sync
- Sentry processes crash data as a **data processor** for error monitoring

None of these services receive data for their own purposes.

---

## Data Handling Practices

### Data encrypted in transit?

**Yes** — HTTPS for all network requests.

### Data encrypted at rest?

**Partially** — Supabase encrypts at rest. Local device storage uses platform-default encryption (AsyncStorage).

### Can users request data deletion?

**Yes** — Account deletion is available in app settings. Supabase `ON DELETE CASCADE` removes all associated data.

### Independent security review?

**No** (not yet). RLS policies are verified via automated tests.

---

## Governance References

| Orbital Rule | Data Safety Implication |
|-------------|------------------------|
| P-003: Never license user data for advertising | No data shared with ad networks |
| P-013: Never track location, device usage, or biometric data | No location, no device IDs, no biometrics collected |
| Offline-first architecture | Data exists locally by default; cloud sync is for the user's own cross-device access |
| RLS enforcement | Users can only read/write their own rows |

---

## Assumptions

1. **RevenueCat, Supabase, and Sentry are classified as data processors**, not third parties, per standard SaaS data processing agreements.
2. **Capacity signals (energy level, loads) are classified as "Health info"** under Play's data safety taxonomy because they relate to personal wellness self-tracking, even though they are not medical/clinical data.
3. **The ATT/AdServices attribution token** (iOS-only) is not relevant to the Android Data Safety declaration.
