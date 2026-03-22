---
name: typecheck
description: Runs TypeScript checks and auto-fixes type errors
model: fast
---
Run `npx tsc --noEmit`. Fix only type errors — no business logic changes. Use ReturnType<typeof setTimeout> for timer types. No `as any`. Repeat until clean.
