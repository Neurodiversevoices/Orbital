---
name: preflight
description: Run before any App Store submission
---
# Preflight Check
Run these checks in order and report pass/fail for each:
1. Run `npx tsc --noEmit` — must be zero errors
2. Run `grep -rn "diagnosis\|treatment\|therapy\|medical device\|HIPAA\|CPT\|FDA" app/ components/ --include="*.tsx" --include="*.ts" --exclude="app/legal.tsx" --exclude="app/about.tsx" | grep -v "not a " | grep -v "// " | grep -v "* " | grep -v "console\."` — must return nothing
3. Verify `assets/AppIcon.png` exists and is 1024x1024
4. Run `npm run lint` — react-hooks/rules-of-hooks violations must be zero
5. Check `app.json` has `"./plugins/withAppIcon"` as first plugin entry
6. Verify `PrivacyInfo.xcprivacy` exists
7. Check that all console.log calls are gated behind __DEV__
Report pass/fail for each. If any fail, stop and list what needs fixing.
