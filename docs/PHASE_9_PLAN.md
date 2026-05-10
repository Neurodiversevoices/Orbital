# Phase 9 Plan — Atmospheric Reservoir + Working iOS App on Dev Branch

> Goal: bring `claude/orbital-platform-rebuild` from "source-ready" to "working
> iOS app you can install and use" — including the new Atmospheric Reservoir
> volumetric centerpiece, per-user signal seeds, clinical copy system, the
> 5-tab nav, and end-to-end wiring.

## Outcome definition (what "working" means)

When this phase completes, `claude/orbital-platform-rebuild` HEAD will:

1. Build successfully via `eas build --platform ios --profile production`
   on a Mac with the deps installed.
2. Boot in iOS Simulator with **no crash, no red-screen TS errors**.
3. Show the 5-tab nav (Field / Trends / Load / Insights / Profile).
4. Render the **Atmospheric Reservoir** (two-body volumetric shader) on the
   Field tab driven by real capacity + HealthKit data.
5. Generate a **per-user signature** that makes every user's reservoir
   visibly unique (deterministic from their physiological constants).
6. Use the **clinical copy system** for every status / metric / insight
   string in the Personal flow — no ad-hoc copy left.
7. Generate **CCI 30/60/90 PDF reports for therapists** end-to-end (already
   wired in commit `2daed3b`; verified by smoke test).
8. Pass `npx tsc --noEmit` with zero new errors beyond pre-existing
   Deno / supabase-functions noise.
9. Apply migration `00017_platform_overlay.sql` cleanly to a Supabase
   project.
10. Hide `(platform)/` overlay screens behind real data (the migration must
    be applied for them to render without errors).

What it does NOT include (deliberately deferred):
- Watch / Vision Pro variants
- Audio-reactive surface displacement (toggle wired but defaulted off)
- Reaction-diffusion premium surface pattern
- The other ~30 enterprise/admin/B2B/circles/qsb screens still on legacy
  styles (Personal flow only — Workspace, Health, etc. tiers come later)
- Real Supabase RLS audit (audit reports flag follow-ups)
- App Store submission itself (`eas submit` is your call)

## Phase 9 work breakdown

### Block A — Atmospheric Reservoir component (parallel agent)

**Deliverable:** `components/AtmosphericReservoir.tsx` + `components/atmosphericShader.ts`

**Approach:** React Native Skia + custom SKSL shader
- Single full-screen `<Canvas>` running a fragment shader that raymarches
  two SDF spheres in the same 3D space
- Reservoir SDF: large, FBM-displaced, full-spectrum gradient (crimson →
  amber → teal → cyan)
- Demand SDF: smaller, curl-noise-displaced, red/amber-weighted
- `smin()` blending so the bodies merge metaball-style when close
- Per-user `uSeed: vec4`, `uHueShift: float`, `uPattern: int`,
  `uPulseSeconds: float`, `uRotationSpeed: float` uniforms (from signal seed)
- Live data: `uReserves: float` (0..1), `uDemand: float` (0..1)
- Reduce-motion: skip animation, render single frame
- Performance: 60fps target on iPhone 12+, 30fps minimum on older;
  step count drops when battery <20% or thermal throttle detected

**Public props:**
```ts
interface AtmosphericReservoirProps {
  reserves: SharedValue<number>;      // 0..1 user capacity baseline
  demand: SharedValue<number>;        // 0..1 today's load
  seed: SignalSeed;                    // from useSignalSeed
  width: number;
  height: number;
  audioReactive?: boolean;             // default false
  onAccessibilityAction?: (action: 'increment' | 'decrement') => void;
}
```

**Accessibility:**
- Wrapper `<View>` with `accessibilityRole="adjustable"`,
  `accessibilityLabel="Atmospheric reservoir"`,
  `accessibilityValue` reading reserves + demand + state band

### Block B — Signal seed module (parallel agent)

**Deliverable:** `lib/health/signalSeed.ts` + `lib/health/useSignalSeed.ts`

**Approach:**
- Inputs: long-term physiological constants (resting HR baseline, HRV SDNN
  baseline, bedtime midpoint, sleep duration mean, signal age in days)
- Salt: random 16 bytes stored in Keychain via `expo-secure-store` (already
  in deps)
- SHA-256 hash via `expo-crypto` of bucketed inputs + salt
- Hash bytes split into shader uniforms (8 floats / ints / arrays)
- Hook `useSignalSeed()` returns the seed; subscribes to HealthKit snapshot
  changes and re-derives when long-term constants shift
- New-user fallback: salt-only seed (their visual evolves over the first
  week as physiology data fills in)

### Block C — Clinical copy system (parallel agent)

**Deliverables:**
- `lib/copy/clinical.ts` — typed status pattern (eyebrow / headline /
  subline) with state table, metric card pattern, insight card pattern
- `lib/copy/words.ts` — approved vocabulary + forbidden list + lint helper
- `scripts/copy-lint.js` — scans `app/` and `components/` for forbidden
  words, exit code non-zero if hits found
- `package.json` script: `"copy:lint": "node scripts/copy-lint.js"`

**Replaces ad-hoc strings in:**
- `app/(tabs)/index.tsx` Field status copy
- `app/(tabs)/patterns.tsx` Pattern Intelligence copy + insight cards
- `app/cci.tsx`, `app/cci-report.tsx` headers + actions
- New Load + Insights tabs

### Block D — 5-tab navigation restructure (parallel agent)

**Deliverable:** updated `app/(tabs)/_layout.tsx` + new tab files

**Tab map:**
- `app/(tabs)/index.tsx` → **Field** (label change only; same screen)
- `app/(tabs)/patterns.tsx` → **Trends** (label change only; same screen)
- `app/(tabs)/load.tsx` (new) → **Load** — demand decomposition
- `app/(tabs)/insights.tsx` (new) → **Insights** — reservoir × demand
  relationship over time
- `app/(tabs)/profile.tsx` (new) → **Profile** — links to Settings,
  Account, Subscription, Apple Health connect

**Tab icons:**
- Field: `Circle` (lucide)
- Trends: `TrendingUp`
- Load: `Zap`
- Insights: `Lightbulb`
- Profile: `User`

**Brief tab** (`app/(tabs)/brief.tsx`) — moved from tabs to a deep link
inside Insights or removed entirely. Decision: **remove from tabs**,
existing `/brief` route still works via direct nav from Insights cards.

### Block E — Wire AtmosphericReservoir into home (sequential, me)

**Deliverable:** updated `app/(tabs)/index.tsx`

- Replace `<CapacityRibbon>` with `<AtmosphericReservoir>`
- `reserves` derived from baseline confidence + recent capacity log mean
- `demand` derived from today's HealthKit (HRV SDNN delta from baseline +
  sleep deficit + RHR drift) + today's logged demand events
- Use clinical copy from `lib/copy/clinical.ts` for status block
- Sparkline metric cards (Recovery / NSL / Cardiac Drift) with mini line
  charts — replace the static cards with sparkline-augmented variants

### Block F — Light theme finish on logic-heavy files (parallel agent)

**Files** (Phase 8 kept my logic; needs targeted color sweep):
- `app/_layout.tsx` (idle-timeout overlay, error boundary, modal scrims)
- `app/auth/index.tsx` (input borders, Apple Sign In ring)
- `app/settings.tsx` (header, demo banner, free-user banner, sub-brand chip)
- `components/Composer.tsx` (input shell, send button)
- `components/HistoryItem.tsx` (row chrome)

Color-only changes; preserve all logic.

### Block G — `(platform)/` light theme (parallel agent)

**Deliverable:** repaint 5 platform overlay screens to light theme

- `app/(platform)/_layout.tsx` (sticky chip header)
- `app/(platform)/index.tsx` (3-layer landing)
- `app/(platform)/sub-brand.tsx` (6 cards picker)
- `app/(platform)/memory.tsx` (4-section dashboard)
- `app/(platform)/permissions.tsx` (grant ledger)
- `app/(platform)/audit.tsx` (audit log viewer)

### Block H — Cleanup (sequential, me)

- `app/device-preview.tsx`: remove `<GlassOrb>` import, replace with
  `<AtmosphericReservoir>` mockup or static image
- `git rm components/GlassOrb.tsx` (now unreferenced)
- `git rm` any layer/shader leftovers
- Update `components/index.ts` to drop GlassOrb re-export

### Block I — Build preparation (sequential, me)

**Deliverables:**
- `docs/BUILD_132_RUN_BOOK.md` — exact commands you run on the mini
- `docs/SESSION_HANDOFF_v2.md` — updated handoff
- Verify `app.json` `buildNumber` (132 already set)
- Verify `eas.json` profiles
- Verify privacy manifest entries are complete (Health, Fitness, Email,
  etc.) — already done in earlier phases
- Verify migration ordering (00001 → 00017 — already done)
- Spot-check `.env.example` against required vars

**Run book contents:**
```bash
git checkout claude/orbital-platform-rebuild
git pull
npm install
npx supabase db push           # applies 00017 migration
npx expo prebuild --clean --platform ios
npx tsc --noEmit               # should pass cleanly
npm run copy:lint              # forbidden words scan
npx expo start --ios           # simulator boot test
# manual QA checklist:
#   - permission prompts (Face ID, ATT, HealthKit)
#   - 5-tab nav navigates correctly
#   - Field tab renders Atmospheric Reservoir at 60fps
#   - Reservoir hue/pattern stable across cold launches (signal seed
#     determinism)
#   - Capacity log → reservoir deformation
#   - HealthKit denial → "Connect Apple Health" CTA on metric cards
#   - CCI 30/60/90 picker → recipient field → PDF generation → share
#     sheet → opens with correct headers
#   - Settings → Platform Beta → all 5 overlay screens render
#   - Sub-brand picker → switching brand updates accent in tabs/composer
#   - Reduce Motion → reservoir snaps instead of animating
#   - VoiceOver: reservoir reads "Reserves X%, Demand Y%, headroom Z%"
eas build --platform ios --profile production
# manually inspect the build, then:
eas submit --platform ios       # YOUR CALL — do not auto-submit
```

## Execution model

- 5 parallel agents in worktrees: A (Atmospheric Reservoir), B (signal seed),
  C (clinical copy), D (5-tab nav), F (light-theme finish on logic files)
- I do E (wire reservoir into home), G (platform overlay light theme), H
  (cleanup), and I (run book) sequentially after agents land.
- Estimated wall-clock: **6–10 hours** with parallelism. Conservative.

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| Skia SKSL raymarcher too slow on older iPhones | Adaptive step count + frame-skip when thermal throttled. Static fallback for reduce-motion. |
| `react-native-health` config plugin missing in Expo SDK 54 | Plugin is community-maintained; fallback to `expo prebuild --clean` to regenerate native code. If plugin breaks, swap to `react-native-health-connect` or hand-roll a tiny native module. Document in run book. |
| Migration 00017 conflicts with existing Supabase state | Migration uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`. Re-runnable. Worst case: `npx supabase db reset --local` for testing. |
| Five-tab nav exceeds Apple HIG recommendation | HIG allows 5; Apple Health uses 5. No issue. |
| AtmosphericReservoir replaces CapacityRibbon mid-stream | Keep `CapacityRibbon` exported for screens that don't have room for the full reservoir (e.g. cci screens use it inline). Both coexist. |
| Audio-reactive feature scope creep | Default `audioReactive={false}`. Toggle in Accessibility settings. Implementation is single-line addition later. |
| Forbidden-word lint flags valid uses (e.g. `patient` in CCI codebase per Path A) | Lint scans only UI surface (`app/`, `components/`). `lib/cci/` excluded by default. Allowlist file for known-safe occurrences. |
| Per-user seed re-derives constantly when user is new | Seed function bucket-rounds aggressively; cache result in AsyncStorage with 24h TTL. Re-derive only on physiology drift or new salt. |

## Definition of done

- [ ] All 5 agents' worktrees integrated and pushed
- [ ] `npx tsc --noEmit` clean (excluding known Deno errors)
- [ ] `npm run copy:lint` clean (no forbidden words in UI)
- [ ] `app/(tabs)/_layout.tsx` shows 5 tabs
- [ ] `app/(tabs)/index.tsx` renders `<AtmosphericReservoir>`
- [ ] `lib/health/signalSeed.ts` + `useSignalSeed` exist and are consumed
- [ ] `lib/copy/clinical.ts` + `lib/copy/words.ts` exist and are consumed
- [ ] No `components/orb/`, no `components/GlassOrb.tsx`
- [ ] `docs/BUILD_132_RUN_BOOK.md` exists with full command checklist
- [ ] `docs/SESSION_HANDOFF_v2.md` updated
- [ ] Final commit pushed to `origin/claude/orbital-platform-rebuild`

## Approvals required from you before I start

1. **Block H confirmation** — OK to delete `components/GlassOrb.tsx`?
   It's currently used only in `app/device-preview.tsx` (dev-only).
2. **Block D confirmation** — OK to remove `Brief` from the tab bar?
   The route stays accessible via Insights deep link.
3. **Audio-reactive default** — confirm `audioReactive={false}` (toggle
   later in Accessibility) vs always-off vs always-on.
4. **Skia performance budget** — accept 30fps on iPhone 11 / SE2 if 60fps
   isn't achievable, or hard-require 60fps everywhere?

I'll wait for your green light + answers to those four before launching
agents.
