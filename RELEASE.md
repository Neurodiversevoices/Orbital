# Release Runbook

## Prerequisites
- .env.local with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- ASC API key at keys/AuthKey_K5FGNKXMAZ.p8
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
- ASC Key ID: K5FGNKXMAZ
- ASC Issuer ID: a6c8bd6a-8f60-4aed-a0a6-d129cb2aaf7a
