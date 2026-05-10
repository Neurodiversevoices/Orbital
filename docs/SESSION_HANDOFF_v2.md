# Session Handoff v2 — 2026-05-10 (Phase 9 complete)

> Resume from here on the mini. Authoritative state of `claude/orbital-platform-rebuild`.

## Branch

**Current:** `claude/orbital-platform-rebuild`
**Base:** `master` (Build 131, ASC-approved)
**Status:** ~50 commits ahead of master · working tree clean · master untouched.

## What shipped in this session (Phases 7–9)

### Phase 7 — Light theme + new components + HealthKit
- New light theme tokens (`theme/colors.ts`)
- 4 new light-theme components: CapacityRibbon, HealthMetricCard, PatternBarsChart, DetectedPatternCard
- HealthKit adapter (`lib/health/index.ts` + `useHealth.ts`)
- 2 new deps: `react-native-health`, `expo-secure-store`, `expo-splash-screen`
- App.json: `userInterfaceStyle: "light"`, HealthKit usage strings, plugin config
- PrivacyInfo.xcprivacy: NSPrivacyCollectedDataTypeHealth + Fitness added
- Home tab + Patterns tab rewritten to light theme
- Cinematic landing rewritten (no WebGL orb; SVG ribbon hero)

### Phase 8 — Personal version end-to-end
- CCI 30/60/90 day picker + therapist PDF wiring (`components/CCIWindowPicker.tsx`)
- 17 Personal-flow screens repainted to light theme
- `components/orb/` directory deleted (2,523 LOC removed)

### Phase 9 — Atmospheric Reservoir + ready-to-build
- **Block A** — `components/AtmosphericReservoir.tsx` + shader + helpers + fallback (1,209 LOC, custom SKSL raymarcher with two-body SDF, smin blending, FBM displacement, curl noise, per-user seed uniforms, 5-band stateBand helper)
- **Block B** — `lib/health/signalSeed.ts` + `useSignalSeed.ts` + `docs/SIGNAL_SEED_v1.md` (per-user shader signature from physiological constants, Keychain salt, 24h cache)
- **Block C** — `lib/copy/clinical.ts` + `lib/copy/words.ts` + `scripts/copy-lint.js` + `docs/COPY_SYSTEM_v1.md` (typed clinical copy system, forbidden-word lint, vocabulary lists, tone benchmarks)
- **Block D** — 5-tab nav (Field/Trends/Load/Insights/Profile), new Load + Insights + Profile tab screens, Brief moved out of tabs
- **Block E** — Wired Atmospheric Reservoir + clinical copy + signal seed into home tab; reserves/demand math
- **Block F** — Logic-heavy files repainted (auth, settings, _layout, Composer, HistoryItem)
- **Block G** — Platform overlay (`app/(platform)/`) repainted to light (6 screens)
- **Block H** — `components/GlassOrb.tsx` deleted, `device-preview.tsx` migrated to `<AtmosphericReservoirFallback>`, `components/index.ts` exports expanded
- **Block I** — `docs/BUILD_132_RUN_BOOK.md` (this doc + run book)

## Critical: Build 132 prerequisites

**Run on the mini before `eas build`:**
1. `git pull` on `claude/orbital-platform-rebuild`
2. `npm install` — pulls 3 new deps (react-native-health, expo-secure-store, expo-splash-screen)
3. `npx supabase db push` — applies migration 00017_platform_overlay.sql
4. `npx expo prebuild --clean --platform ios` — regenerates native code
5. `npx tsc --noEmit` — should pass clean
6. `npm run copy:lint` — fix or allowlist any flagged words
7. `npx expo start --ios` — simulator boot test (see BUILD_132_RUN_BOOK.md for full QA checklist)

Then:
8. `eas build --platform ios --profile production`
9. (optional) `eas submit --platform ios --latest`

## Visible feature surface in Build 132

| Surface | Visible to user |
|---|---|
| **5-tab nav** | Field / Trends / Load / Insights / Profile (was 3) |
| **Field tab** | Atmospheric Reservoir centerpiece (volumetric two-body SDF shader) + 7-day micro-bars + 3 health metric cards + Confidence pill |
| **Trends tab** | Pattern Intelligence with bars chart + 3 detected pattern cards |
| **Load tab** | Demand decomposition with logged events (mock for now where HealthKit data missing) |
| **Insights tab** | Reservoir × Demand relationship view (mock chart for now) |
| **Profile tab** | Account / Settings / Subscription / Health / Circles / Privacy / Help / Sign out |
| **CCI generation** | 30/60/90 picker + recipient name → therapist-ready PDF |
| **Cinematic landing (web)** | Six-scene scroll with SVG ribbon hero (light theme, no WebGL orb) |
| **Sub-brand picker** | Settings → Platform · Beta — 6 brands, switching changes app accent + posture |
| **Memory Dashboard** | 4-scope dashboard (Ephemeral/Workspace/Profile/Implicit) with tenant isolation note |
| **Permission Ledger** | Tool grants with revoke |
| **Audit Log** | Reverse-chrono with actor/action filter |

## What's NOT in Build 132 (deliberate deferrals)

- Watch / Vision Pro variants
- Audio-reactive reservoir surface (toggle wired but defaulted off)
- Reaction-diffusion premium surface pattern
- ~30 enterprise/admin/B2B/circles/qsb screens still on legacy dark styles
- Real Supabase RLS audit (audit reports flag follow-ups)
- Pattern bars chart wired to live HealthKit history (currently mocked)
- Real Insights tab dual-line chart (currently mocked)
- App Store submission — your call on `eas submit`

## Critical files

| File | Purpose |
|---|---|
| `components/AtmosphericReservoir.tsx` | Volumetric centerpiece (Skia + SKSL) |
| `components/atmosphericShader.ts` | The shader source |
| `components/AtmosphericReservoirFallback.tsx` | SVG fallback for non-Skia devices |
| `lib/health/signalSeed.ts` | Per-user visual signature derivation |
| `lib/health/useSignalSeed.ts` | React hook for the seed |
| `lib/health/index.ts` | HealthKit adapter |
| `lib/copy/clinical.ts` | Typed clinical copy patterns |
| `lib/copy/words.ts` | Approved + forbidden vocabulary |
| `scripts/copy-lint.js` | Forbidden-word linter |
| `app/(tabs)/_layout.tsx` | 5-tab definition |
| `app/(tabs)/index.tsx` | Field tab — Atmospheric Reservoir wired |
| `supabase/migrations/00017_platform_overlay.sql` | Permission grants + memory records tables |
| `docs/BUILD_132_RUN_BOOK.md` | Full step-by-step build instructions |

## Known issues / followups

| Item | Severity | Mitigation |
|---|---|---|
| `react-native-health` Expo plugin compat with SDK 54 | Medium | Test `expo prebuild` early; community-maintained, may need SDK pin |
| Migration 00017 against existing Supabase RLS | Low | Re-runnable (`IF NOT EXISTS` / `pg_policies` guards) |
| Atmospheric Reservoir on iPhone 11 / SE2 | Low | Adaptive 24-step path; static fallback if FPS drops below 30 |
| Path A "predictable" copy on landing | Medium | Non-diagnostic banner mitigates; see medical audit |
| Mock data on Load + Insights tabs | Medium | UI complete; wire to live data in Phase 10 |
| `app/(tabs)/index.tsx` capacityNumber → reservesNumber bridge | Low | Both used; reservesNumber drives shader, capacityNumber drives composer state |
| ~30 enterprise screens still dark | Low | Personal flow is the priority surface; sweep deferred |

## Cwd-drift guard (lesson from this session)

When working in main checkout, prefix `git` with `-C /home/user/Orbital`
or always re-cd to `/home/user/Orbital` before the next command. Bash tool
calls share cwd. Several agent merges accidentally landed on
`worktree-agent-*` branches and had to be re-applied.

## Recommended next session

1. **Manual QA + first eas build** on the mini — work the BUILD_132_RUN_BOOK.md checklist
2. **Wire Insights tab dual-line chart to real reservoir/demand history** from `lib/health/getHealthHistory(days)`
3. **Wire Load tab demand contributors** to real HealthKit deficits
4. **Repaint remaining ~30 enterprise/admin screens** to light theme (parallel agents per screen group)
5. **Fix `copy:lint` flagged words** in `app/(tabs)/brief.tsx`, `app/about.tsx`, `app/security-controls.tsx`
6. **Test on iPhone 11 / SE2** to verify the 24-step adaptive path
7. **Decide audio-reactive default** — toggle on / off / never

Welcome to Build 132 territory. Ship when ready.
