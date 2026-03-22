---
name: review
description: Review code against project rules
---
# Code Review
1. Run npx tsc --noEmit — report any type errors
2. Run npm run lint — report hooks violations only
3. Scan for forbidden regulatory terms in app/ and components/
4. Check for console.log not gated behind __DEV__
5. Check for any `as any` casts in changed files
6. Report findings grouped by severity: critical, warning, info
