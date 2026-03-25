# STOP — Run preflight first
Before building, run ALL checks in:
.cursor/skills/app-store-submission.md

No exceptions. Every rejection so far was
caught by this checklist too late.

# Release Runbook

## Prerequisites
- .env.local with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- ASC API key at keys/AuthKey_HD4HWHHYDK.p8
- Transporter app installed as backup

## One-Command Flow
git push origin dev && eas build --platform ios --profile production --auto-submit

## Manual Flow
1. Run preflight: all 7 checks green
2. Source env: source .env.local
3. Upsert review account: node scripts/upsert-review-account.js
4. Verify Apple auth: Supabase Dashboard → Auth → Providers → Apple
5. Push: git push origin dev
6. Build: eas build --platform ios --profile production --auto-submit
7. If auto-submit fails: curl -L -o ~/Desktop/orbital.ipa "<artifact URL>" then use Transporter
8. App Store Connect → Distribution → Submit for Review
9. Demo credentials: review@orbital.health / Review2026!

## Edge Functions

Deployed directly to Supabase project 
`tenfwzjccqfecctxdbpi`. Not in repo.

To verify: `supabase functions list --project-ref tenfwzjccqfecctxdbpi`

## Key Info
- EAS login: erparris
- SSH remote: git@github.com:Neurodiversevoices/Orbital.git
- ASC Key ID: HD4HWHHYDK
- ASC Issuer ID: a6c8bd6a-8f60-4aed-a0a6-d129cb2aaf7a

## App Store Connect — expired subscription (sandbox) for review

Use this when reviewers need an account whose **subscription has already expired** (e.g. paywall / restore flows).

1. **Create a Sandbox Apple ID** (if you do not have one): [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access** → **Sandbox** → **Testers** → add tester with a **dedicated email** (not your personal Apple ID).
2. On a **development or TestFlight** build, sign in with that sandbox account under **Settings → Developer → Sandbox Account** (iOS) or when prompted during a purchase.
3. **Start a subscription** in the app using the sandbox account (complete the sandbox purchase flow once).
4. **Let it expire**: In the **Sandbox** environment, paid subscriptions use **accelerated renewal**. After the maximum number of auto-renewals (Apple caps this for sandbox), the subscription **lapses** and the account is in an **expired** state. Alternatively, cancel the subscription in sandbox-managed settings and wait until the **current period end** passes (still accelerated vs. production).
5. **Verify** on device: Pro features should be off, paywall or restore behavior matches production expectations.

**Apple reference:** [Testing in-app purchases with sandbox](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox) (renewal and expiration behavior).

### Placeholder — App Review Information (update before sending review notes)

In **App Store Connect** → your app → **App Information** → **App Review Information**, set **Sign-in required** if applicable, and add:

| Field | Placeholder (replace before submit) |
|--------|--------------------------------------|
| **User name** | `[REPLACE: sandbox Apple ID email]` |
| **Password** | `[REPLACE: sandbox password]` |
| **Notes** | `Sandbox subscriber — subscription expired per RELEASE.md § expired subscription demo. Replace placeholders with real sandbox tester credentials before submission.` |

**Flag:** Replace the bracketed placeholders with the **actual** sandbox tester email/password **before** submitting the review reply or a new build for review, so reviewers are not blocked.
