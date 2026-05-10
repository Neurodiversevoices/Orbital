# Build 132 Run Book — `claude/orbital-platform-rebuild`

> Step-by-step to take the dev branch from "source-ready" to a working
> iOS build you can install on a device.

## Prerequisites

- Mac with Xcode 15+ installed
- Apple Developer account with provisioning profile for `com.erparris.orbital`
- EAS CLI authenticated (`eas whoami`)
- Supabase CLI authenticated (for migration push)
- Node 20+ and npm

## 1. Pull and install

```bash
git checkout claude/orbital-platform-rebuild
git pull
npm install                     # picks up react-native-health, expo-secure-store, expo-splash-screen
```

If `npm install` warns about peer-dep issues with `react-native-health`,
run `npm install --legacy-peer-deps` once. The plugin is community-maintained
and sometimes lags on peer ranges.

## 2. Apply Supabase migration 00017

```bash
npx supabase db push            # applies migration 00017_platform_overlay.sql
```

This creates:
- `permission_grants` table (RLS — owner only, soft-delete via revoked_at)
- `platform_memory_records` table (RLS — owner only, full CRUD)
- Adds `actor`, `target`, `metadata` columns to `audit_events`

The migration is `IF NOT EXISTS` guarded, safe to re-run.

## 3. Generate native code

```bash
npx expo prebuild --clean --platform ios
```

This regenerates `ios/` with:
- `react-native-health` Expo config plugin (HealthKit entitlements)
- `expo-splash-screen` native splash gating
- `expo-secure-store` Keychain configuration
- All Phase-4–Phase-9 `app.json` updates (NSFaceID, NSUserTracking,
  NSHealthShare, NSHealthUpdate strings)

## 4. Type-check + copy lint

```bash
npx tsc --noEmit                # should pass clean
npm run copy:lint               # forbidden-word scan in app/ + components/
```

`tsc` may surface pre-existing Deno errors in `supabase/functions/*` —
ignore those (they're Edge Functions, not part of the iOS bundle).

`copy:lint` may flag 3 known hits in `app/(tabs)/brief.tsx`,
`app/about.tsx`, `app/security-controls.tsx` — review and either rewrite
or add to `scripts/copy-allowlist.json`.

## 5. Simulator boot test

```bash
npx expo start --ios
```

### Manual QA checklist

**First-run flow:**
- [ ] Splash holds until fonts + auth resolved (no flash of unstyled content)
- [ ] Auth screen renders light theme; Apple Sign In button is native + black
- [ ] Email autofill: tab from email → password works with iOS keyboard
- [ ] Permission prompts fire correctly:
  - [ ] Face ID prompt on biometric-gated action
  - [ ] HealthKit prompt on first home tab open
  - [ ] ATT prompt only if `initAttribution` is unstubbed (currently stubbed)

**5-tab navigation:**
- [ ] Bottom bar shows 5 tabs: Field / Trends / Load / Insights / Profile
- [ ] Tab icons: Circle / TrendingUp / Zap / Lightbulb / User
- [ ] Tab labels in mono uppercase letterspaced
- [ ] Active tab tint follows brand accent (default teal #2DD4BF)
- [ ] Haptic on tab change (iOS only)

**Field tab (home):**
- [ ] Atmospheric Reservoir renders at 60fps on iPhone 12+ (30fps on 11/SE2)
- [ ] If Skia GPU unavailable, AtmosphericReservoirFallback (SVG) renders
- [ ] Reservoir hue / pattern / pulse stable across cold launches
  (signal seed determinism — same physiology = same visual)
- [ ] Capacity log → reservoir deformation (demand body responds)
- [ ] HealthKit denial → "Connect Apple Health" CTA on metric cards
- [ ] Field status copy follows the 5-band table:
  - reserves > demand × 1.4 → "Your capacity is flowing."
  - reserves > demand × 1.1 → "Capacity holds the line."
  - reserves ≈ demand → "Capacity is matched."
  - demand > reserves × 1.1 → "Capacity is slipping."
  - demand > reserves × 1.4 → "Reduce optional load."

**Trends tab:**
- [ ] Pattern Intelligence headline "What we've learned about you."
- [ ] Time-range tabs 14D / 30D / 90D / 1Y / ALL
- [ ] Pattern bars chart renders
- [ ] 3 detected pattern cards: Monday Pattern / Sleep Average / 30D Trend

**Load tab:**
- [ ] "What's pulling on you today." headline
- [ ] Demand load score + decomposition list
- [ ] Add demand event CTA opens Composer
- [ ] Recent demand log shows last 7 demand-tagged entries

**Insights tab:**
- [ ] "Where reservoir meets demand." headline
- [ ] Time-range tabs (14D / 30D / 90D)
- [ ] Mock dual-line chart renders
- [ ] 3 insight cards link to /sentinel-brief

**Profile tab:**
- [ ] User avatar + email + member-since header
- [ ] Settings rows route correctly: Account, Settings, Subscription,
  Health, Circles, Privacy, Help, Sign out

**CCI flow:**
- [ ] Settings → CCI opens cci.tsx with light theme
- [ ] 30 / 60 / 90 day picker switches selection
- [ ] Recipient field accepts therapist name
- [ ] Generate PDF → expo-print produces single PDF with:
  - RECIPIENT header (name / date generated / window)
  - Capacity summary chart
  - Provider Utility Statement
  - Signature line "Reviewed by: ___ Date: ___"
  - "FOR CLINICAL DOCUMENTATION USE — NON-DIAGNOSTIC" footer
- [ ] expo-sharing share sheet → email/airdrop to therapist
- [ ] PDF opens in Mail/Files with correct content

**Platform overlay (Settings → Platform · Beta):**
- [ ] Sub-brand picker shows 6 cards (Personal/Workspace/Enterprise/
  Health/Edu/Gov)
- [ ] Switching brand updates accent in tabs/composer/settings header
- [ ] Memory Dashboard renders 4 sections (Ephemeral/Workspace/Profile/Implicit)
- [ ] Tenant isolation note appears for non-Personal brands
- [ ] Permission Ledger shows mock grants (no DB hit until you create grants)
- [ ] Audit Log shows queue-merged events

**Accessibility:**
- [ ] VoiceOver: reservoir reads "Reserves X%, demand Y%, BAND state"
- [ ] VoiceOver: capacity log buttons all labeled
- [ ] Reduce Motion (Settings → Accessibility): reservoir snaps instead
  of animating; transitions disabled
- [ ] Reduce Transparency: glass surfaces become solid where wired
- [ ] Dynamic Type: text scales up to 1.5× without breakage
- [ ] All Pressables have accessibilityRole + accessibilityLabel

**Security:**
- [ ] Auth tokens persist in Keychain (not AsyncStorage) — verify no
  Supabase token in `~/Library/Developer/CoreSimulator/.../AsyncStorage`
- [ ] Sharing token generation uses CSPRNG (lib/storage.ts)
- [ ] Sentry events scrub emails/phone numbers (test via dev panic)

## 6. EAS production build

```bash
eas build --platform ios --profile production
```

Wait ~15 min. Inspect the build artifact:

- [ ] `Build 132` shows in eas dashboard
- [ ] Bundle size reasonable (target <80MB IPA)
- [ ] No build-time warnings about missing entitlements

## 7. TestFlight upload (optional dry-run before App Store)

```bash
eas submit --platform ios --latest
```

This uploads to App Store Connect for internal TestFlight distribution.
Recommended before submitting for App Store review.

## 8. App Store Connect updates

When ready to submit to review, update on App Store Connect:

- [ ] App Privacy nutrition label — match the 10 collected data types in
  `ios/PrivacyInfo.xcprivacy`:
  - Email Address (Linked, no tracking, App Functionality)
  - Name (Linked, no tracking, App Functionality)
  - User ID (Linked, no tracking, App Functionality + Analytics)
  - Purchase History (Linked, no tracking, App Functionality + Analytics)
  - Crash Data (Linked, no tracking, Analytics)
  - Performance Data (Linked, no tracking, Analytics)
  - Other Diagnostic Data (Linked, no tracking, Analytics)
  - Other User Content (Linked, no tracking, App Functionality)
  - Health (Linked, no tracking, App Functionality)
  - Fitness (Linked, no tracking, App Functionality)
- [ ] What's New in This Version: cite the major changes (Atmospheric
  Reservoir, HealthKit integration, CCI 30/60/90 picker)
- [ ] Screenshots — capture the new home tab + patterns + CCI flow on
  6.7" / 5.5" devices
- [ ] App Review notes — explain the non-diagnostic positioning (Path A)
  to pre-empt 1.4.1 questions

## Known caveats

- **`react-native-health` v1.19+** — community plugin. If `expo prebuild`
  fails on the plugin, see plugin README for SDK 54 compatibility notes.
- **Migration 00017** must run BEFORE the app launches against the
  Supabase project, or platform overlay screens render with empty data.
- **Atmospheric Reservoir on Android** — Skia path works but visual
  fidelity may differ slightly. Test if Android is in scope this build;
  iOS-first acceptable.
- **Platform overlay screens** are reachable from Settings → Platform · Beta.
  They show real Supabase data once migration 00017 has run; otherwise
  they render empty states.

## Rollback plan

If Build 132 fails review or has a critical regression:

```bash
git checkout master
eas build --platform ios --profile production
```

Master is still at the last shipped state; the dev branch is isolated
on `claude/orbital-platform-rebuild`.

## Files of note

- `docs/PHASE_9_PLAN.md` — Phase 9 plan + outcome definition
- `docs/SIGNAL_SEED_v1.md` — per-user signature spec
- `docs/COPY_SYSTEM_v1.md` — clinical copy system spec
- `docs/IOS_AUDIT_2026-05-09.md` — overall iOS audit (grade A → A+ candidate)
- `docs/IOS_AUDIT_PRIVACY_2026-05-09.md` — privacy/security audit
- `docs/IOS_AUDIT_ACCESSIBILITY_2026-05-09.md` — WCAG 2.2 AA audit
- `docs/IOS_AUDIT_HIG_2026-05-09.md` — HIG audit
- `docs/MEDICAL_AUDIT_2026-05-09.md` — medical compliance (Path A)
- `docs/SESSION_HANDOFF_2026-05-09.md` — earlier session handoff
