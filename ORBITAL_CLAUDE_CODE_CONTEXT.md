## Paste this at the start of every Claude Code session
---
## WHO I AM
I am Eric Parrish, founder of Orbital Health Intelligence Inc.
I am AuDHD. I built Orbital to solve a problem I personally experienced.
I have executive function limitations — keep workflows streamlined and "child-proof".
Budget: $500. Solo founder.
---
## WHAT ORBITAL IS
Orbital is a clinical-grade capacity tracking app for adults who experience
burnout, overload, and capacity differently. It is NOT just for ADHD —
it is for anyone who experiences capacity differently than neurotypical
expectations demand.
Daily check-in: one swipeable orb → cyan (Good/Resourced), amber (Strain/Stretched),
crimson (Burnout/Depleted). Optional context tags. 5 seconds per day.
Business model: Free app → therapist-led groups → CCI report upsell.
Revenue: Therapist subscriptions + CCI reports + Group marketplace (20% cut).
---
## TECH STACK
- React Native / Expo SDK 54
- expo-router v6
- react-native-reanimated 4.1.x
- react-native-worklets 0.5.1
- Supabase (auth + database)
- Stripe (payments, live mode)
- Vercel (website hosting)
- Resend (email)
- Sentry (error tracking)
- Apollo (cold outreach)
**DO NOT suggest dependency upgrades. The Expo environment is locked.**
---
## LOCKED FILES — DO NOT TOUCH EVER
- app/(tabs)/index.tsx
- components/GlassOrb.tsx
- Any theme file
If a fix requires touching a locked file, find another way.
---
## REPOSITORY
GitHub: https://github.com/Neurodiversevoices/Orbital
Branch naming: ALL Claude branches must end with session ID suffix (e.g. claude/feature-name-E3H1c)
Pushing to bare claude/feature-name will fail with HTTP 403.
---
## WEBSITE
Live at: orbitalhealth.app (Vercel)
Pages: / (landing), /therapists, /coach, /groups, /dashboard, /app (web app)
All static HTML files in public/ — expo export copies to dist/
---
## STRIPE (LIVE MODE)
All products use lookup keys. Current products and lookup keys:
- Pro Monthly: orbital_pro_monthly ($29/mo)
- Pro Annual: orbital_pro_annual ($290/yr)
- Family Monthly: orbital_family_monthly ($49/mo)
- Family Annual: orbital_family_annual ($490/yr)
- Family+ Monthly: orbital_family_plus_monthly ($69/mo)
- Family+ Annual: orbital_family_plus_annual ($690/yr)
- CCI 30-day: orbital_cci_30 ($99 one-time)
- CCI 60-day: orbital_cci_60 ($149 one-time)
- CCI 90-day: orbital_cci_90 ($199 one-time)
- CCI Bundle: orbital_cci_bundle ($349 one-time)
- Therapist Solo: $39/mo (5 seats)
- Therapist Practice: $89/mo (15 seats)
- Therapist Group: $159/mo (30 seats)
- Therapist Clinic: $279/mo (60 seats)
---
## SUPABASE SCHEMA (KEY TABLES)
- capacity_logs: id, user_id, occurred_at, state (resourced/stretched/depleted), drivers JSONB, note
- user_daily_metrics: computed by DB trigger — never write directly
- org_memberships: therapist/client relationships
- user_entitlements: what plans/products a user has access to
- purchase_history: Stripe purchase records
- bundles: Bundle 10/15/20 seat plans
- circles: Circle groups (max 25 members per DB, 5 per pricing.ts — mismatch to fix)
---
## PRICING (pricing.ts canonical structure)
CCI pricing properties: .thirtyDay, .sixtyDay, .ninetyDay, .bundle, .circleAll, .bundleAll
Family: standalone plans (NOT add-ons requiring Pro)
DO NOT use old property names: freeUser, proUser, FAMILY_ADDON_PRICING, FAMILY_EXTRA_SEAT_PRICING
---
## DESIGN SYSTEM
Dark theme always. Colors:
- Background: #080810
- Card: #12121E
- Cyan/Resourced: #00D1FF
- Amber/Stretched: #FFB347
- Crimson/Depleted: #FF4D4D
- Text primary: #FFFFFF
- Text secondary: #AAAACC
- Gray: #888899
---
## CURRENT STATUS
- App is under Apple App Store review — NO new app builds until approved
- Website is live at orbitalhealth.app
- Auth gate implemented — all users must authenticate (no anonymous usage)
- Dashboard live at orbitalhealth.app/dashboard (needs Supabase creds injected via build script)
- Apollo coach outreach sequence: ACTIVE
- First clinical partner Ali: onboarded, needs to sign into app to sync local logs
---
## RULES FOR THIS SESSION
1. Read ORBITAL_TASK_BOARD.md before doing anything — it has current priorities
2. ONE branch per session. Branch name must end with session ID.
3. Do NOT push until all tasks in the session are complete
4. Do NOT touch locked files
5. After completing work, update ORBITAL_TASK_BOARD.md with what was done
6. Use gh CLI to open and merge PRs — do not ask Eric to do it manually
7. If you find a bug not in the task list, fix it but document it
8. Always run tsc --noEmit before pushing
9. Keep Eric informed of findings before making changes
---
## GH CLI COMMANDS (use these)
```bash
# Create and merge a PR
gh pr create --base master --head BRANCH_NAME --title "TITLE" --body "DESCRIPTION"
gh pr merge PR_NUMBER --merge --delete-branch
# Check PR status
gh pr status
# List open PRs
gh pr list
```
---
*Last updated: Feb 26, 2026*
*Update this file whenever the stack, pricing, or status changes.*
