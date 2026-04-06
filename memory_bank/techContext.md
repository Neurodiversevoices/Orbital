# Technical Context

> For canonical stack and architecture definitions, see
> [master_brief.md](../master_brief.md) Sections 3, 4, 6, 10, 11.

## Stack Summary

- Expo SDK 54 / React Native 0.81.5 / TypeScript 5.9.2
- expo-router v6 / Reanimated 4.1.x / Hermes engine
- Supabase (auth + postgres + realtime) / AsyncStorage (local)
- RevenueCat (mobile payments) / Stripe (web payments)
- Sentry (monitoring) / Vercel (hosting)

**LOCKED:** No dependency changes without explicit approval.

## Design System (see master_brief.md Section 4)

- Background: `#01020A`
- Primary: `#2DD4BF` (teal)
- Capacity states: Cyan `#00D7FF` / Amber `#F5B700` / Red `#FF3B30`
- Dark mode only, glass surfaces, DM Sans + Space Mono

## Key Files (see master_brief.md Section 11)

- `app/_layout.tsx` — Root layout
- `app/(tabs)/index.tsx` — Home (LOCKED)
- `components/GlassOrb.tsx` — Orb (LOCKED)
- `lib/supabase/` — Backend client, auth, sync
- `theme/colors.ts` — Color system (LOCKED)
- `types/index.ts` — All TypeScript definitions

## Database (see master_brief.md Section 10)

15 Supabase tables. All queries use RLS (`auth.uid() = user_id`).
No `service_role` bypass exists.

## Architecture (see master_brief.md Section 6)

- Class A (Relational): named individuals, self-serve
- Class B (Institutional): aggregated only, contract-only
- Zero overlap at schema level
- K-anonymity threshold: 5

## Nova Empire — Planned Tech (NOT YET IN REPO)

Cursor designed but has not committed the following infrastructure:

| Component | Tech | Port | Status |
|-----------|------|------|--------|
| Nova Nexus | Bun server | 3847 | **NOT IN REPO** |
| n8n workflows | Docker containers | 5678+ | **NOT IN REPO** |
| nova-intelligence.ts | 5-min pulse interval | — | **NOT IN REPO** |
| CFO endpoint | GET /nova/cfo | 3847 | **NOT IN REPO** |
| VR briefing | TTS via nova-vr-browser.ts | — | **NOT IN REPO** |
| Empire dashboard | SSE + HTML | 3847 | **NOT IN REPO** |

Key env vars (planned): `NOVA_EXPERIENCE_HUB`, `NOVA_INTELLIGENCE_PULSE_MS`,
`NOVA_CLIENT_CONFIG_TRUST_LAN`, `INTERNAL_SERVICE_TOKEN`.

See `memory_bank/activeContext.md` for full planned-vs-real breakdown.
