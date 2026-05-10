# Orbital — Development Guide
## Stack
- Expo SDK 54, React Native 0.81.5
- react-native-reanimated 4.1.x, react-native-worklets 0.5.1
- expo-router v6
- Supabase (auth + postgres + realtime)
- AsyncStorage for local persistence (auth tokens migrated to Keychain via expo-secure-store)
- HealthKit via react-native-health (iOS only)
- Dependency changes require explicit approval (rule 1)
## Design System (light surface as of May 2026)
- Background: #FFFFFF
- Text primary: #0F1624
- Text secondary: rgba(15, 22, 36, 0.62)
- Text tertiary: rgba(15, 22, 36, 0.38)
- Hairline / card border: rgba(15, 22, 36, 0.08–0.10)
- Card shadow: rgba(15, 22, 36, 0.06)
- Primary action: #2DD4BF (teal)
- Capacity spectrum (semantic): crimson #DC2626 → amber #F59E0B → teal #2DD4BF → cyan #06B6D4
- NO orange anywhere — use spec amber #F59E0B
- Fonts: DM Sans 400/500/600/700 (headlines + body), JetBrains Mono / Space Mono (eyebrows + labels uppercase letterspaced 0.16–0.22em)
- Border radius: 14px buttons, 12px inputs, 14–16px cards
- Button height: 54px
- Horizontal padding: 32px
- Headlines: large bold sans-serif, sentence case (NOT uppercase mono — that's eyebrows only)
- Eyebrows / labels: mono, uppercase, letterspaced, secondary text color
- Card style: white bg, hairline border, soft shadow, generous padding
## Visual Language (replaces orb/gauge)
- **Capacity ribbon**: flowing horizontal curve crimson→amber→teal with glowing position dot — `components/CapacityRibbon.tsx`
- **Health metric cards**: Apple-Health-style stat cards (Recovery, Nervous System Load, Cardiac Drift) — `components/HealthMetricCard.tsx`
- **Pattern bars chart**: vertical colored bars for time series — `components/PatternBarsChart.tsx`
- **Detected pattern cards**: eyebrow + value + description — `components/DetectedPatternCard.tsx`
- The orb / gauge components (`components/orb/`, `components/GlassOrb.tsx`) are DEPRECATED and being removed
## Rules
1. Dependency changes require explicit approval
2. Always run `npx tsc --noEmit` before committing
3. Always commit and push after completing tasks
4. Backend-only tasks = no UI changes
5. Test in simulator when UI changes are made
## Supabase Tables (16, post-migration 00017)
capacity_logs, user_daily_metrics, org_memberships, org_aggregate_snapshots,
audit_events (extended: actor, target, metadata), user_preferences,
user_entitlements, restricted_domains, purchase_history, circles,
circle_members, circle_invites, user_push_tokens, proof_events,
capacity_baselines, **permission_grants** (NEW), **platform_memory_records** (NEW)
## Platform Overlay (`app/(platform)/`)
- 5 screens: index (3-layer landing), sub-brand picker, memory dashboard,
  permission ledger, audit log
- 6 sub-brands: Personal · Workspace · Enterprise · Health · Edu · Gov
- Sub-brand selection drives accent color, audit-logging gate, and posture
  enforcement (memory default, tenancy isolation)
- Reachable from Settings · Platform · Beta section
## Key Files
- app/auth/index.tsx — Auth screen
- app/(tabs)/index.tsx — Home (System Status: capacity ribbon + health metric cards)
- app/(tabs)/patterns.tsx — Pattern Intelligence (bars chart + detected patterns)
- app/(platform)/* — Platform overlay (Trust core / Memory / Permissions / Audit / Sub-brand)
- lib/supabase/types.ts — All database types
- lib/supabase/secureStorage.ts — Keychain adapter (auth tokens)
- lib/supabase/sync.ts — Sync engine
- lib/supabase/auth.ts — Auth helpers
- lib/health/index.ts — HealthKit adapter (Recovery / Nervous Load / Cardiac Drift)
- lib/platform/* — Platform overlay primitives (trust core, memory, sub-brand)
- theme/colors.ts — Light theme tokens (darkLegacy export for screens not yet repainted)
