# Release Checklist
1. Run /preflight — all 7 checks must pass
2. Source .env.local for Supabase credentials
3. Run: node scripts/upsert-review-account.js
4. Verify Apple auth in Supabase Dashboard
5. Run /submit skill
6. After build lands in TestFlight, go to App Store Connect → Distribution → Submit for Review
7. Demo credentials: review@orbital.health / Review2026!
