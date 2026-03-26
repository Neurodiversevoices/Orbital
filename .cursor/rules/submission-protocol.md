# Orbital Submission Protocol v2.0
# Trigger: "submit", "TestFlight", "App Store", "archive", "resubmit"
# Action: Execute all stages without asking. Stop only on BLOCKING errors.

## STAGE 1 — Semantic Code Audit
- Clinical violations: grep "medical device\|diagnosis\|diagnose\|treatment\|clinical-grade" app/ components/ locales/ — BLOCKING if found in user-facing strings
- Console.log: grep -rn "console\.log" app/ components/ | grep -v "__DEV__" — BLOCKING if found
- Mock purchase paths: grep -rn "handleMockPurchase\|executePurchase\|isSandbox" app/upgrade.tsx — BLOCKING if active on iOS native
- TypeScript: npx tsc --noEmit 2>&1 | grep -v "supabase/functions" — flag errors
- Icon alpha: sips -g hasAlpha assets/icon.png — if YES, auto-strip with sips --removeTag alpha

## STAGE 2 — ASC MCP Deep-Sync (app 6757295146)
- Dynamic build: use builds_list to find latest VALID build — never hardcode number
- IAP audit: list all 6 SKUs, status must be APPROVED or WAITING_FOR_REVIEW
  - orbital_cci_free, orbital_cci_pro
  - orbital_individual_annual, orbital_individual_monthly
  - orbital_pro_annual, orbital_pro_monthly
- Description scrub: auto-replace "clinical-grade" → "pattern-based", "diagnose" → "identify patterns", "treatment" → "support"
- Review notes: contact eric@orbitalhealth.app, demo review@orbital.health / Review2026!
- Support email: eric@orbitalhealth.app (never Zoho)
- Terms URL: https://orbitalhealth.app/terms (verify 200)
- Privacy URL: https://orbitalhealth.app/privacy (verify 200)

## STAGE 3 — Visual & Asset Validation
- Boot iPhone 16 simulator, run app, capture screenshots
- Required sizes: 6.7" (1290x2796), 6.1" (1179x2556), iPad 12.9" (2048x2732)
- Upload to ASC replacing stale sets
- Contents.json: must be modern single-icon format (idiom: universal, platform: ios)

## STAGE 4 — Paywall & Compliance UX
- Restore Purchases: visible without scrolling — BLOCKING if not
- Renewal terms: present before purchase CTA — BLOCKING if missing
- Privacy Policy link: present in paywall — BLOCKING if missing
- Terms link: present in paywall — BLOCKING if missing
- No dollar amounts in App Store description

## STAGE 5 — Autonomous Submission
If stages 1-4 pass:
- Generate reviewer note explaining interoception/alexithymia use case
- Attach latest build via ASC MCP
- Submit via ASC MCP
- Report: submission ID + WAITING_FOR_REVIEW confirmation

## REPORT FORMAT
BLOCKING: [list] — must fix before submit
HIGH: [list] — fix soon
MEDIUM: [list] — fix post-launch
Final line: READY TO SUBMIT or NOT READY — [reason]
Only escalate to Eric for: 2FA, final Submit button click, ASC state conflicts
