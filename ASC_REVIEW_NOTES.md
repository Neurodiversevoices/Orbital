# Orbital — App Store Connect Review Notes (Build 111)

## Demo account
- Email: review@orbital.health
- Password: Review2026!

## Sign in
1. Tap "Sign in with email" or "Sign in with Apple" on the welcome screen.
2. Use the demo email/password above for email sign-in.
3. Sign in with Apple uses your Apple ID; either flow lands on the same dashboard.

## How to test in-app purchases
Build 111 ships with a 7-day free trial paywall after onboarding.
1. Sign in with the demo account.
2. Complete onboarding (orb selection).
3. The paywall appears. Tap "Start 7-day free trial" on either Annual or Monthly.
4. Use a Sandbox tester to complete the StoreKit purchase. The trial activates and the app unlocks.
5. The Restore button on the paywall verifies restore flow.

## Account deletion
Settings → Profile → Delete Account.
1. Type DELETE to confirm.
2. Tap "Permanently delete account."
3. Supabase user is removed. Apple identity tokens are revoked via Apple's REST API.
4. App signs you out and returns to the welcome screen.
5. Re-login attempts return "user not found."

Apple-managed subscriptions are not cancelled by account deletion (per Apple's guidance). The deletion screen instructs users to cancel via Settings → Apple ID → Subscriptions.

## Positioning
Orbital is a wellness app for capacity awareness in neurodivergent adults. It is NOT a medical device, NOT diagnostic, NOT therapeutic. It is provider-compatible — meaning users may share their data with clinicians — but Orbital itself is consumer-grade wellness.

## Privacy and terms
- https://orbitalhealth.app/privacy
- https://orbitalhealth.app/terms

## Contact
- Developer: Eric Parris, Orbital Health Intelligence, Inc.
