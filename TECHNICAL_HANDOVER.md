# Orbital - Technical Handover Document

**Version:** 1.0.0 (Build 23)
**Last Updated:** January 2026
**Platform:** iOS (TestFlight), Android (in development)
**Repository:** `C:\Users\eric1\Orbital-v2\orbital`

---

## 1. The 'One-Liner' & Core Purpose

### What Orbital Does

**Orbital is a privacy-first capacity tracking app that helps individuals (especially neurodivergent users) and organizations understand patterns in mental/emotional capacity over time—without surveillance, optimization pressure, or data exploitation.**

### Who It's For

| Audience | Use Case |
|----------|----------|
| **Individuals** | Personal capacity tracking, pattern recognition, self-awareness |
| **Caregivers** | Monitor family member capacity with consent, share with clinicians |
| **Employers/ERGs** | Aggregate team pulse (anonymized, 10+ participant minimum) |
| **Schools/Universities** | Student wellbeing aggregates for administrators |
| **Healthcare** | Clinician-shared capacity trends for treatment planning |
| **Researchers** | De-identified cohort data for real-world evidence studies |

### Core Philosophy

1. **Privacy-First**: All data stored locally on device. No accounts, no cloud sync by default.
2. **Pattern History Retention**: Deleted signals are de-identified, not destroyed—preserving longitudinal patterns.
3. **Aggregate-Only Institutional Views**: Organizations only see aggregate data (minimum 10 participants).
4. **Absence as Signal**: Missing data points are meaningful, not failures.

---

## 2. User Journey Walkthrough

### First-Time Launch Flow

```
App Launch
    │
    ▼
┌─────────────────────────────┐
│   Tutorial Screen           │  ← 5-step onboarding
│   (app/tutorial.tsx)        │     explaining core concepts
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│   "Why Orbital Exists"      │  ← Philosophy moment
│   (app/why-orbital.tsx)     │     (shown once, dismissable)
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│   Home Screen               │  ← Main capacity logging
│   (app/(tabs)/index.tsx)    │
└─────────────────────────────┘
```

### Core User Flow (Logging a Capacity Signal)

```
1. USER OPENS APP
   └── Sees: Date, Today's %, Trend indicator, Signal count

2. USER INTERACTS WITH GLASS ORB (center of screen)
   └── Swipe UP = Resourced (Cyan, high capacity)
   └── Swipe CENTER = Stretched (Amber, moderate)
   └── Swipe DOWN = Depleted (Red, low capacity)

3. ORB CHANGES COLOR + SPECTRUM INDICATOR MOVES
   └── Visual feedback: color gradient shifts

4. (OPTIONAL) USER SELECTS CATEGORY
   └── Sensory | Demand | Social
   └── Context for what's driving capacity

5. (OPTIONAL) USER ADDS NOTE
   └── Composer slides up from bottom
   └── Free-text details (stored locally only)

6. USER TAPS SAVE (or taps orb)
   └── SavePulse animation confirms
   └── Log saved to AsyncStorage
   └── Pattern history updated (de-identified copy)

7. USER NAVIGATES TO PATTERNS TAB
   └── Sees: Time-range selector (7d, 14d, 30d, 90d+)
   └── Sees: Capacity graph, milestones, pattern insights
```

### Key Screens

| Screen | Path | Purpose |
|--------|------|---------|
| Home | `app/(tabs)/index.tsx` | Log capacity signals |
| Patterns | `app/(tabs)/patterns.tsx` | View trends and insights |
| Brief | `app/(tabs)/brief.tsx` | QSB strategic metrics overview |
| Settings | `app/settings.tsx` | Preferences, data, legal |
| Dashboard | `app/dashboard.tsx` | Executive/institutional view |
| Export | `app/export.tsx` | Export data (JSON, CSV, Summary) |
| Sharing | `app/sharing.tsx` | Configure token-based sharing |

---

## 3. The Tech Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | 0.81.5 | Cross-platform mobile framework |
| **Expo** | 54.0.30 | Build, deploy, and development tooling |
| **Expo Router** | 6.0.21 | File-based navigation |
| **React** | 19.1.0 | UI library |
| **TypeScript** | 5.9.2 | Type safety |

### Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| **react-native-reanimated** | 4.1.1 | Gesture-driven animations (orb, transitions) |
| **react-native-gesture-handler** | 2.28.0 | Touch/pan gestures |
| **@react-native-async-storage/async-storage** | 2.2.0 | Local data persistence |
| **react-native-purchases** | 8.12.0 | RevenueCat subscription management |
| **@sentry/react-native** | 7.8.0 | Error tracking and monitoring |
| **lucide-react-native** | 0.562.0 | Icon system |
| **react-native-svg** | 15.12.1 | SVG rendering (orb gradients) |
| **react-native-safe-area-context** | 5.6.0 | Safe area handling |

### Build & Deploy

| Tool | Purpose |
|------|---------|
| **EAS Build** | Cloud builds for iOS/Android |
| **EAS Submit** | TestFlight/App Store submission |
| **Metro** | JavaScript bundler |
| **Hermes** | JavaScript engine (production) |

### Configuration Files

```
app.json          → Expo app configuration (bundle IDs, splash, plugins)
eas.json          → EAS Build profiles and credentials
package.json      → Dependencies and npm scripts
tsconfig.json     → TypeScript configuration
metro.config.js   → Metro bundler customization
babel.config.js   → Babel transpilation config
```

---

## 4. Architecture & Data Flow

### Data Storage Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      AsyncStorage (Local)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  @orbital:logs           ← Active capacity logs (CapacityLog[]) │
│  @orbital:preferences    ← User preferences (locale, mode)      │
│  @orbital:recipients     ← Share recipients                     │
│  @orbital:shares         ← Active share configurations          │
│  @orbital:audit          ← Audit trail (last 50 entries)        │
│  @orbital:vault          ← Long-term archived logs              │
│  @orbital:app_mode       ← Current mode (personal/org/demo)     │
│  @orbital:demo_logs      ← Demo mode sample data                │
│  @orbital:terms_acceptance ← ToS acceptance records             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Pattern History Layer                        │
│              (lib/patternHistory.ts - NEVER DELETED)            │
├─────────────────────────────────────────────────────────────────┤
│  - Capacity logs saved here in parallel                          │
│  - On user delete: log is DE-IDENTIFIED, not removed            │
│  - Preserves longitudinal patterns for research/insights        │
│  - Implements "soft delete" with opaque reference replacement   │
└─────────────────────────────────────────────────────────────────┘
```

### State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Context Providers                       │
│                    (app/_layout.tsx)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GestureHandlerRootView                                         │
│    └── LocaleProvider          ← i18n (8 languages)             │
│          └── AccessibilityProvider  ← A11y settings             │
│                └── DemoModeProvider     ← Demo data toggle      │
│                      └── AppModeProvider    ← User mode          │
│                            └── SubscriptionProvider  ← Pro/Free │
│                                  └── TermsAcceptanceProvider    │
│                                        └── <Stack> (Router)     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Saving a Capacity Log

```
User Interaction (GlassOrb swipe)
         │
         ▼
HomeScreen.handleSave()
         │
         ▼
useEnergyLogs().saveEntry(state, tags, note)
         │
         ├──► storage.savelog(log)
         │         │
         │         ├──► AsyncStorage.setItem(@orbital:logs)
         │         │
         │         └──► patternHistory.onCapacityLogSaved(log)
         │                   │
         │                   └──► PatternHistoryRecord created
         │                        (permanent, de-identifiable)
         │
         └──► React state updated: setLogs([newLog, ...prev])
                   │
                   └──► UI re-renders with new signal
```

### External Services

| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| **Sentry** | Error tracking | `@sentry/react-native` in `_layout.tsx` |
| **RevenueCat** | Subscriptions | `react-native-purchases` in `lib/subscription/` |
| **Apple App Store Connect** | iOS distribution | EAS Submit with ASC API key |

---

## 5. Key File Map

### Critical Files (Top 10)

| File | Purpose | Key Logic |
|------|---------|-----------|
| **`app/_layout.tsx`** | Root layout, all providers | Sentry init, context nesting, global navigation |
| **`app/(tabs)/index.tsx`** | Home screen | Capacity logging, orb interaction, save flow |
| **`components/GlassOrb.tsx`** | Interactive orb | Pan gestures, color interpolation, state selection |
| **`lib/hooks/useEnergyLogs.ts`** | Log management hook | CRUD for capacity logs, signal limits |
| **`lib/storage.ts`** | Data persistence | AsyncStorage wrapper, 20+ storage keys |
| **`lib/patternHistory.ts`** | Pattern retention | Soft-delete, de-identification, immutable records |
| **`types/index.ts`** | Type definitions | 2000+ lines, all data models |
| **`theme/colors.ts`** | Color system | Capacity state colors, dashboard colors, assertions |
| **`lib/hooks/useAppMode.tsx`** | Mode management | Personal/Org/Demo mode switching |
| **`lib/subscription/useSubscription.tsx`** | Subscription state | Free tier limits, Pro access checks |

### Directory Structure

```
app/                    # Expo Router screens (28 files)
├── (tabs)/             # Bottom tab navigation
│   ├── index.tsx       # Home (capacity logging)
│   ├── patterns.tsx    # Pattern analysis
│   └── brief.tsx       # QSB overview
├── qsb/                # Strategic Brief detail screens (5 metrics)
├── settings.tsx        # User settings
├── dashboard.tsx       # Institutional dashboard
└── _layout.tsx         # Root navigation + providers

components/             # Reusable UI (26 files)
├── GlassOrb.tsx        # Core interactive orb
├── Composer.tsx        # Note input
├── qsb/                # QSB components
└── legal/              # Terms, footer

lib/                    # Business logic (74 files)
├── hooks/              # React hooks (14 files)
├── storage.ts          # AsyncStorage operations
├── patternHistory.ts   # Pattern retention logic
├── qsb/                # QSB data & hooks
├── subscription/       # RevenueCat integration
├── sharing/            # Token-based sharing
├── export/             # Data export (CSV, JSON)
├── governance/         # Compliance, audit, consent
├── research/           # De-identified research exports
└── dataroom/           # Enterprise due diligence

theme/                  # Design system
├── colors.ts           # Color palette + assertions
├── spacing.ts          # Spacing scale
└── styles.ts           # Common styles (glass, glow)

types/index.ts          # All TypeScript definitions
locales/                # i18n (8 languages)
governance/             # Philosophy documents
scripts/doctor.js       # Build validation script
```

---

## 6. Visual Logic (UI/UX Paradigm)

### Design Language

| Aspect | Implementation |
|--------|----------------|
| **Theme** | Dark mode only (`#05060A` background) |
| **Primary Accent** | Cyan `#00E5FF` (high capacity) |
| **Secondary Accent** | Amber `#E8A830` / `#F5B700` (stretched) |
| **Alert Color** | Red `#F44336` / `#FF3B30` (depleted) |
| **Typography** | System fonts, light weights (200-400), wide letter-spacing |
| **Cards** | Frosted glass effect (`rgba(255,255,255,0.03)` + border) |
| **Iconography** | Lucide React Native |

### Capacity State Colors (Canonical)

```typescript
// theme/colors.ts - DASHBOARD_STATE_COLORS (authoritative)
high / resourced / strong   = '#00D7FF'  // Cyan
stable / stretched / moderate = '#F5B700'  // Amber
low / depleted / atRisk      = '#FF3B30'  // Red
```

**Runtime Assertion:** `assertStateColor()` logs errors if LOW states render with cyan or HIGH states render with red.

### Animation System

| Animation | Library | Usage |
|-----------|---------|-------|
| **Orb breathing** | Reanimated `withRepeat` | Subtle scale pulse |
| **Orb color shift** | Reanimated `interpolateColor` | Gradient on pan |
| **Screen transitions** | Reanimated `FadeIn`, `SlideInDown` | Entry/exit animations |
| **Composer slide** | Reanimated `SlideInDown` | Bottom sheet appearance |
| **Keyboard collapse** | Reanimated `withTiming` | Header scale on focus |

### Key UI Components

#### GlassOrb (`components/GlassOrb.tsx`)
- **Size:** 240px diameter with 80px container padding
- **Interaction:** Pan gesture controls color position (0-1 scale)
- **States:** Maps to `resourced` (top), `stretched` (middle), `depleted` (bottom)
- **Visual:** SVG radial gradient, animated rim glow

#### Composer (`components/Composer.tsx`)
- **Position:** Fixed at bottom, slides up when capacity selected
- **Height:** 72px (constant `COMPOSER_HEIGHT`)
- **Features:** Text input, submit button, keyboard avoidance

#### Signal Bar (Home Screen)
- **Layout:** Horizontal flex with dividers
- **Metrics:** Today's %, Trend (↑↓→), Total Signals
- **Styling:** Glass card with mode-accent border

### Layout Patterns

```
┌────────────────────────────────────────┐
│  Header (Mode selector | Title | Gear) │
├────────────────────────────────────────┤
│                                        │
│           ScrollView Content           │
│                                        │
│    ┌──────────────────────────────┐   │
│    │      Signal Bar (stats)      │   │
│    └──────────────────────────────┘   │
│                                        │
│    ┌──────────────────────────────┐   │
│    │                              │   │
│    │        GlassOrb (240px)      │   │
│    │                              │   │
│    └──────────────────────────────┘   │
│                                        │
│    [Category Selector - if active]    │
│                                        │
├────────────────────────────────────────┤
│  Composer (slides up when active)      │
├────────────────────────────────────────┤
│  Tab Bar (Home | Patterns | Brief)     │
└────────────────────────────────────────┘
```

### Accessibility

- **Colorblind modes:** Protanopia, Deuteranopia, Tritanopia, Monochrome
- **Text scaling:** 1x, 1.25x, 1.5x
- **Button scaling:** 1x, 1.3x, 1.6x
- **Haptics:** Configurable intensity (off, light, medium, strong)
- **High contrast:** Increased opacity on text/borders
- **Simple mode:** Hides advanced features

---

## 7. Build & Deploy Commands

```bash
# Development
npm start                    # Start Expo dev server
npm run doctor               # Run diagnostic checks

# Production Build
npm run build:ios            # Doctor + EAS Build iOS
npm run build:android        # Doctor + EAS Build Android

# TestFlight Submission
npm run submit:ios           # Submit latest build to App Store Connect

# Manual Commands
npx expo prebuild --clean    # Regenerate native projects
CI=1 npx eas build --platform ios --profile production --non-interactive
CI=1 npx eas submit --platform ios --latest --profile production --non-interactive
```

---

## 8. Key Gotchas & Warnings

### Critical Issues Resolved

1. **Why Orbital Soft-Lock** (Fixed): The philosophy screen used `router.back()` after `router.replace()`, trapping users. Fixed by using `router.replace('/')` + `markWhyOrbitalSeen()` + 30-second auto-dismiss.

2. **Color Mapping Bug**: Dashboard was showing LOW capacity as cyan. Fixed with `DASHBOARD_STATE_COLORS` canonical mapping and `assertStateColor()` runtime guard.

3. **GlassOrb Worklet Crashes**: Stale closure issues in production. Fixed with `useRef` pattern for callbacks.

### Things to Watch

- **Pattern History is NEVER deleted**: Even when users "delete" logs, de-identified records persist.
- **Free tier limits**: 50 signals/month (`FREE_TIER_LIMITS.maxSignalsPerMonth`).
- **10+ participant minimum**: Institutional aggregates require 10+ to protect privacy.
- **Sentry disabled in `__DEV__`**: Errors only report in production builds.
- **New Architecture required**: `reanimated@4.x` requires `newArchEnabled: true` in `app.json`.

---

## 9. Useful Entry Points for New Developers

| Task | Start Here |
|------|------------|
| Understand data models | `types/index.ts` |
| Modify capacity logging | `app/(tabs)/index.tsx` + `useEnergyLogs.ts` |
| Add new screen | `app/` directory (file = route) |
| Modify orb behavior | `components/GlassOrb.tsx` |
| Add new storage key | `lib/storage.ts` → `STORAGE_KEYS` |
| Add language | `locales/` + `lib/hooks/useLocale.tsx` |
| Modify colors | `theme/colors.ts` |
| Add subscription feature | `lib/subscription/useSubscription.tsx` |
| Debug build issues | `scripts/doctor.js` |

---

## 10. Contact & Resources

- **Build Logs:** https://expo.dev/accounts/orbital-health/projects/orbital/builds
- **TestFlight:** https://appstoreconnect.apple.com/apps/6757295146/testflight/ios
- **Bundle ID:** `com.erparris.orbital`
- **Apple Team ID:** `2KM3QL4UMV`
- **EAS Project ID:** `60d17137-74cc-4a95-a1d5-bd0692cf1e2a`

---

*This document was generated for developer onboarding. For philosophy and product principles, see `governance/` directory.*
