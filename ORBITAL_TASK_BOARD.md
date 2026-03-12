# ORBITAL TASK BOARD
## Last updated: Feb 28, 2026
---
## 🔴 BLOCKED (waiting on Apple)
- Fix orb UX — gesture input too clumsy
- Add linear/thermometer toggle in app
- Patterns screen improvements
---
## 🟡 IN PROGRESS
- Ali local log migration (waiting for Ali to sign in to app)
---
## 🟢 READY TO DO (next session priorities)
1. Disable Supabase email confirmation temporarily → re-enable after Resend SMTP wired
2. Wire Resend into Supabase SMTP (5 min setup)
3. Load therapist outreach sequence into Apollo (second sequence, separate from coach)
4. Set up welcome email sequence in Resend (6 emails: Days 1/3/7/30/60/90)
5. Post founder story on Reddit r/ADHD and r/AuDHD
6. Schedule 5 LinkedIn posts (use Buffer or LinkedIn native)
---
## ✅ COMPLETED (Feb 28, 2026)
- Dashboard Supabase connection: added /api/dashboard-config runtime fallback so dashboard loads even when build-time meta-tag injection fails
- Verified /app route works correctly (Vercel rewrite → _app.html → Expo Router redirect to home)
- tsc --noEmit passes clean
---
## ✅ COMPLETED (Feb 26, 2026)
- Pricing crash fix (TypeError: Cannot read 'monthly') — merged PR #21
- Auth gate implemented — no anonymous usage, all users must authenticate
- Local log migration on first sign-in
- Family and Family+ standalone plans added to pricing.ts and landing.html
- CCI 30/60/90-day tiers added to pricing.ts
- All new Stripe products created with lookup keys
- Dashboard built at orbitalhealth.app/dashboard
- Build script for Supabase creds injection into dashboard.html
- /app route fixed (was showing "Unmatched Route")
- therapists.html, groups.html, coach.html pages built
- FAQ accordion added to landing.html
- Founding spot counter (67 of 100) added to hero
- Apollo coach sequence activated
- Ali 6-week curriculum document created
- Therapist outreach sequence written
- LinkedIn posts written (5 posts)
- Welcome email sequence written (6 emails)
- Therapist one-page pitch written
- Full revenue forecast built ($142K over 10 months)
- vercel.json rewrites for all new pages
---
## 📋 BACKLOG (future sessions)
- Group marketplace infrastructure (Stripe Connect, therapist payouts)
- Ali Cohort 1 group listing on /groups with real details
- Founding spot counter made dynamic (not hardcoded)
- Product Hunt launch
- Blog/SEO content (3 articles)
- Family plan seat management (migration 00011_family_plans.sql needed)
- circles.max_members mismatch fix (DB says 25, pricing.ts says 5)
- Admin dashboard analytics
- Push notification setup
- Subject Zero beta ($5/mo) formal launch
- Podcast outreach (ADHD reWired, Hacking Your ADHD, etc.)
---
## 🐛 KNOWN ISSUES
- circles.max_members = 25 in DB but Circle plan = 5 seats in pricing.ts
- No family_groups table yet — Family/Family+ plans not enforced server-side
- Pattern history is local-only (AsyncStorage) — no Supabase table exists
- Supabase default email rate limit = 4/hour — needs Resend SMTP ASAP
- orbitalhealth.app/app loads web app but bookmarking "/" hard-refreshes to landing.html
---
## 💰 REVENUE SNAPSHOT (forecast)
| Month | Target |
|-------|--------|
| Mar 2026 | $118 |
| Jun 2026 | $3,041 |
| Aug 2026 | $12,061 (first $10K month) |
| Nov 2026 | $32,010 |
| Dec 2026 | $40,812 |
| 10-month total | $142,217 |
| Dec annualized | $489,744 |
CCI reports = 35.7% of revenue
Therapist subscriptions = 14.2%
Group marketplace = 12.4%
---
## 👥 KEY CONTACTS
- Ali: Founding clinical partner, Cohort 1 starting Spring 2026
- Eric: eric133@hotmail.com / contact@orbitalhealth.app
