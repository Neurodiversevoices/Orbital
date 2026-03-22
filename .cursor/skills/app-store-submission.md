# App Store Submission Checklist
Run before EVERY eas build. No exceptions.
Read this file before any submission task.

## Pre-Build Checks (run in order)
1. npx tsc --noEmit 
   → app/ errors only, ignore supabase/functions
2. grep -r "diagnosis\|treatment\|therapy\|medical device\|HIPAA\|CPT\|FDA" app/ components/
   → zero matches required
3. grep -rn "console\.log" app/ components/ | grep -v "__DEV__"
   → zero matches required  
4. ls ios/PrivacyInfo.xcprivacy && ls ios/Orbital/PrivacyInfo.xcprivacy
   → both must exist, not deleted
5. cat app.json | grep buildNumber
   → must be incremented from last submission
6. cat app.json | grep usesAppleSignIn
   → must be true
7. cat app.json | grep plugins | head -5
   → withAppIcon.js must be first entry

## Auth Checks
- lib/supabase/auth.ts nonce flow:
  rawNonce = Crypto.randomUUID()
  hashedNonce = SHA256(rawNonce)
  Apple gets: nonce: hashedNonce
  Supabase gets: nonce: rawNonce (NOT hashed)
- ERR_REQUEST_CANCELED → silent return only
- ERR_REQUEST_FAILED → Alert.alert required
- All other errors → Alert.alert required
- identityToken null → Alert.alert required

## IAP Checks
- useSubscription.tsx restorePurchases catch → Alert
- No offerings → Alert
- No package → Alert  
- Purchase state not hardcoded → verify

## Privacy Checks
- ios/PrivacyInfo.xcprivacy and ios/Orbital/PrivacyInfo.xcprivacy both exist
- Account deletion accessible from Settings
- No forbidden regulatory terms in user-visible strings

## Git Checks
- On dev branch: git branch --show-current
- Clean tree: git status
- PrivacyInfo.xcprivacy tracked: git ls-files ios/
- No phantom branches: git remote prune origin

## Build & Submit
eas build --platform ios --profile production
Download IPA → upload via Transporter
Paste review notes from APP_STORE_METADATA.md
Include: review@orbital.health / Review2026!

## Post-Submit
- Screenshot rejection notice immediately
- Paste full rejection text to Claude
- Do not guess — research first
