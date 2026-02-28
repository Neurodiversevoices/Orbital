# Orbital — Development Guide
## Stack
- Expo SDK 54, React Native 0.81.5
- react-native-reanimated 4.1.x, react-native-worklets 0.5.1
- expo-router v6
- Supabase (auth + postgres + realtime)
- AsyncStorage for local persistence
- NO dependency changes without explicit approval
## Design System
- Background: #01020A
- Primary: #2DD4BF (teal)
- Fonts: DM Sans (headings/buttons), Space Mono (labels/monospace)
- Capacity spectrum: crimson (#DC2626) → amber (#F59E0B) → teal (#2DD4BF) → cyan (#06B6D4)
- NO orange in UI (only in orb capacity spectrum transitions)
- Glass surfaces: bg rgba(255,255,255,0.07), border rgba(255,255,255,0.15)
- Border radius: 14px buttons, 12px inputs, 10px cards
- Button height: 54px
- Horizontal padding: 32px
## Rules
1. Never change package.json dependencies
2. Never modify the orb component without explicit approval
3. Always run `npx tsc --noEmit` before committing
4. Always commit and push after completing tasks
5. Backend-only tasks = no UI changes
6. Test in simulator when UI changes are made
## Supabase Tables (15)
capacity_logs, user_daily_metrics, org_memberships, org_aggregate_snapshots,
audit_events, user_preferences, user_entitlements, restricted_domains,
purchase_history, circles, circle_members, circle_invites, user_push_tokens,
proof_events, capacity_baselines
## Key Files
- app/auth/index.tsx — Auth screen
- app/(tabs)/index.tsx — Home screen with orb
- app/(tabs)/patterns.tsx — Patterns/history tab
- lib/supabase/types.ts — All database types
- lib/supabase/sync.ts — Sync engine
- lib/supabase/auth.ts — Auth helpers
