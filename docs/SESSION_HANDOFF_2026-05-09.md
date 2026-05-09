# Session Handoff — 2026-05-09

> Pick up here when resuming on the mini. This is the authoritative state.

## Branch

**Current:** `claude/orbital-platform-rebuild`
**Base:** `master` (Build 131, ASC-approved)
**Status:** 15 commits ahead of master, pushed to origin, working tree clean.
**Master is untouched.** Build 131 in App Store remains the live binary.

## Commit history (newest first)

```
44b19d3  chore(build): prep Build 132 — bump buildNumber + non-diagnostic banner
c4e37a5  fix(a11y): phase 5 — extended hook, glass adapter, dim-color sweep
56e9ef8  revert(landing): restore medical-credible language (Path A)
7b242de  feat(gauge): visual rebuild + accessibility wrapper
11e40e0  docs(audit): append Phase 5 — HIG quick wins applied
47dbf78  fix(a11y+hig): phase 5 completion
669614f  fix(hig): phase 5 — apply 4 of 5 HIG quick wins
6d7c461  docs(audit): deep iOS HIG audit
33ffb44  fix(security): replace Math.random with CSPRNG (sharing tokens)
e85f7df  docs(audit): deep iOS accessibility WCAG 2.2 AA
1696f0d  fix(medical): audit phase 4 — clean predictive language, add disclaimers
5d929de  fix(ios): A+ push phase 4 — grade A- → A
6cf5efa  fix(ios): A+ compliance audit — phase 3 low-risk fixes
23acd26  feat(platform): scaffold Trust core / Memory / Sub-brand overlay
75965d7  feat(landing): cinematic six-scene WebGPU rebuild
c65d373  chore: gitignore .claude/worktrees
```

## Direction confirmed this session

**Path A — Consumer app, medical-adjacent vocabulary.**
- `landing.html` retains medical credibility ("Burnout isn't inevitable. It's predictable", "clinical-grade signal", "Predict high-output windows")
- A non-diagnostic banner sits above the hero on landing.html (App Review 1.4.1 belt-and-suspenders)
- Blog posts (10 of them) keep "Not medical advice" disclaimer — Apple does crawl indexed blog content
- `lib/cci/` keeps `patientId` and "Clinical Capacity Index" in the codebase. Marketing copy never expands the C as "Clinical."
- Therapist tier pages (`therapists.html`, `groups.html`, `dashboard.html`) **still public** — open decision (see below)

## Rule overrides granted this session

- ✅ Rule 1 (no package.json changes) — granted, but no deps added yet. Three deps pending approval (see below).
- ✅ Rule 2 (no orb changes) — granted. Used for: ClinicalGauge visual rebuild + a11y wrapper + Reduce Motion sync.

## Deliverables

### Real, ships now
- `public/home.html` — six-scene cinematic WebGL marketing landing (rewrite)
- `public/landing.html` — Path A medical-credible copy + non-diagnostic banner
- `components/orb/ClinicalGauge.tsx` — visual rebuild + a11y wrapper (CRITICAL closed)
- Privacy/security: CSPRNG tokens, Sentry PII scrubber, reset-password validation, Face ID + ATT permission strings, populated NSPrivacyCollectedDataTypes (7 types)
- Accessibility: a11y labels across 6 zero-a11y screens (settings, upgrade, cci, cci-report, profile-setup, dashboard) + dim-color contrast sweep across ~30 files. Hook now tracks Reduce Motion / Reduce Transparency / Increase Contrast. `useGlassStyle()` adapter wired into Composer.
- HIG: native `AppleAuthenticationButton`, Password Autofill, haptics on save/tab/destructive, EmptyState rolled out, RefreshControl on audit
- Build 132 metadata: `app.json` buildNumber 89 → 132, `home.html` v131 → v132

### Scaffolded, mock-data only
- `app/(platform)/` — 6 screens (3-layer landing, sub-brand picker, memory dashboard, permission ledger, audit log)
- `lib/platform/` — types, sub-brand configs, trust core helpers, memory primitives — TODO bodies
- **Not wired into root nav.** Reachable via direct URL only.
- Backing tables don't exist yet (`permission_grants` not in migrations; `audit_events` schema is generic, not the platform's richer shape)

### Audit reports
- `docs/IOS_AUDIT_2026-05-09.md` — overall iOS, grade **A** after fixes
- `docs/IOS_AUDIT_PRIVACY_2026-05-09.md` — privacy/security, grade **A−** after CSPRNG fix
- `docs/IOS_AUDIT_ACCESSIBILITY_2026-05-09.md` — WCAG 2.2 AA: 43% → 57% strict (80% → 93% MINOR-counted) after Phase 5
- `docs/IOS_AUDIT_HIG_2026-05-09.md` — HIG, grade **A−**
- `docs/MEDICAL_AUDIT_2026-05-09.md` — medical compliance, grade **MAJOR** — 3 criticals identified; Path A direction reversed marketing-copy fixes but kept structural fixes

## Open decisions (need you)

### Dep approvals (each closes specific findings)
- [ ] **`expo-secure-store`** — Keychain migration for auth tokens. Closes the last MAJOR security finding. Without it, A+ ceiling caps at A−.
- [ ] **`expo-splash-screen`** — explicit splash gating on fonts + auth resolved. Polish, not blocking.
- [ ] **`react-native-sfsymbols`** — SF Symbols on iOS only (HIG). Visible on tab bar.

### Path A residuals
- [ ] Therapist tier pages — keep public, auth-gate, or ship a BAA template?
- [ ] `(platform)/` route group — wire into root nav for Build 132 (users see mock-data screens) or hold for Build 133 once backend is wired?
- [ ] Adopt `ClinicalGauge` in `app/(tabs)/index.tsx` (currently uses `ClinicalOrb`) for Build 132?

## Things only you can do (sandbox can't)

- `npm install` (no node_modules in this sandbox)
- `npx tsc --noEmit` end-to-end
- Manual VoiceOver QA on rebuilt gauge on a real device
- Manual simulator QA of platform overlay flows
- `eas build --platform ios --profile production`
- `eas submit --platform ios`
- App Store Connect: metadata, screenshots, version bump
- Decide Build 132 = same 1.0.0 (just new build) vs new 1.1.0 (new version)
- Bump Android `versionCode` if shipping Android (currently 1, definitely needs increment)

## Build 132 readiness checklist

Before `eas build`:
- [ ] Decide on dep approvals (above)
- [ ] If `expo-secure-store` approved: install it, swap `customStorage` in `lib/supabase/client.ts:35-56` with SecureStore adapter
- [ ] Verify `app.json` buildNumber=132 matches what ASC expects (if 131 was last, 132 is correct)
- [ ] `npm install && npx tsc --noEmit` clean
- [ ] Simulator boot + critical flows: auth, capacity save, history, settings, account deletion
- [ ] VoiceOver pass on home gauge + auth + CCI generation
- [ ] Decide whether to merge to master before build, or build directly from `claude/orbital-platform-rebuild`

## Supabase status

- 16 migrations applied (`00001` through `00016`)
- All 15 CLAUDE.md tables present + 6 RPCs
- Service role key segregated to `api/*.ts` (8 Vercel server functions) — clean
- 12 of 16 migrations declare RLS — worth a deeper sweep but no obvious gap
- 2 edge functions: `delete-user`, `generate-cci`

### Supabase TODOs
- [ ] Author `00017_platform_overlay.sql` — creates `permission_grants` table, extends `audit_events` schema for platform overlay needs
- [ ] Trace `delete_user_data` RPC body — verify it cascades through all 15 tables (Apple 5.1.1(v) compliance) post the newer tables added in later migrations
- [ ] No live `supabase db diff` run from this session (sandbox can't reach project)

## What was deliberately NOT done

- **`patientId` → `subjectId` rename** in `lib/cci/` — agent finished it in worktree `agent-a9fe8f591ab9b2cc7`, never merged to main per Path A direction. The 13-file diff lives in that worktree if ever needed.
- **`(platform)/` route wiring** into tabs/drawer — overlay screens use mock data
- **`ClinicalOrb` → `ClinicalGauge` swap** in home tab — needs simulator QA
- **Sentry stack-trace email scrubber expansion** — currently scrubs messages + frame.vars, not consistently every stack frame string
- **Universal Links** for sensitive deep-links (`orbital://reset-password`, `orbital://log`) — orbital:// scheme is squat-vulnerable
- **`NSPrivacyCollectedDataTypeProductInteraction`** declaration for RevenueCat — single-line addition deferred
- **Bundle asset cleanup** — `assets/sentinel-demo.png` (2.1MB) confirmed dead but not deleted
- **Dynamic Type wiring** across `<Text>` components beyond the two examples done

## Things to remember when resuming

- Be aware of cwd drift: `cd .claude/worktrees/...` persists across Bash calls. Use `git -C /home/user/Orbital ...` or always re-cd.
- Worktree branches `worktree-agent-*` are dead refs holding stray commits from cwd-drift incidents — safe to delete locally; not pushed.
- `.claude/worktrees/` is gitignored.
- `npx tsc --noEmit` will complain about missing `jest` types and `expo/tsconfig.base` because `node_modules` isn't installed — those are env-only, not real issues.

## Suggested first move on the mini

```bash
git checkout claude/orbital-platform-rebuild
git pull
npm install
npx tsc --noEmit              # should be clean modulo Deno files in supabase/functions/
npx expo start --ios          # smoke test the platform overlay at orbital://platform
```

Then make the dep + Path A residual decisions and ping next session.
