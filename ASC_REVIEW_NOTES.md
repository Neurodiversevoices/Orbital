# Orbital — App Store Connect Review Notes (Build 105)

## Demo account
- Email: review@orbital.health
- Password: Review2026!

## How to test in-app purchases
1. Sign in with the demo account above
2. Tap any locked feature OR tap Settings → Subscription
3. The paywall presents subscription options via RevenueCat (offering ofrng013d7b7f46)
4. Use a Sandbox tester account on the test device to complete purchase

## Sign in with Apple
- Tap "Sign in with Apple" on the auth screen
- Complete the standard Apple authentication flow
- The app uses a SHA256 nonce-bound identity token for Supabase auth

## Account deletion
- Settings → Account → Delete Account
- Confirmation modal requires explicit approval
- On confirm: Supabase delete-user edge function deletes all user data + auth row, user is signed out
- Re-attempting login with deleted credentials returns "user not found"

## Onboarding
- New users flow: sign up → email verify → avatar orb selection (Step 3 of 3) → home screen
- The orb is a non-photo, non-face abstract visual representing capacity state — not a clinical score
- User can change their orb tuning anytime in Settings

## Privacy
- Privacy policy: https://orbitalhealth.app/privacy
- Terms of service: https://orbitalhealth.app/terms

## Health/medical positioning
- This app is a wellness tracker for capacity awareness in neurodivergent adults
- It is NOT a medical device, NOT diagnostic, NOT a substitute for professional evaluation
- All copy avoids medical claim language
- Provider-compatible (clinicians may view user-shared data) but the app itself is consumer-grade wellness

## Notes for the reviewer
- App requires sign-in to use (no anonymous mode)
- The orb at the center of the app is a UI element representing capacity state — it is not a score in any clinical sense
- HealthKit permissions are optional, requested only after auth
