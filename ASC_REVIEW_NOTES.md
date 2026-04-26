# Orbital — App Store Connect Review Notes (Build 110)

## Demo account
- Email: review@orbital.health
- Password: Review2026!

## How to test in-app purchases
1. Sign in with the demo account
2. Settings → Subscription → tap any tier
3. Use a Sandbox tester to complete purchase
4. Restore button on the same screen verifies restore flow

## Sign in with Apple
- Tap "Sign in with Apple" on auth screen
- Standard Apple flow; nonce-bound identity token feeds Supabase auth

## Account deletion
- Settings → Account → Delete account
- Type DELETE to confirm
- Supabase user removed; Apple token revoked via REST; user signed out

## Privacy
- https://orbitalhealth.app/privacy
- https://orbitalhealth.app/terms

## Positioning
- Wellness app for capacity awareness in neurodivergent adults
- Not a medical device, not diagnostic, not therapeutic
- Provider-compatible (clinicians may view user-shared data) — consumer-grade wellness
