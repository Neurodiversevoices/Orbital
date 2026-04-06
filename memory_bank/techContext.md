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

## Nova Empire — Tech Stack

### In Repo (REAL)
| Component | Location | Status |
|-----------|----------|--------|
| Empire spec | `nova/EMPIRE.md` | Complete |
| Memory system | `nova/memory/*.jsonl` | 7 files, active |
| n8n workflows | `nova/divisions/*.json` | 4 workflows, ready to import |
| Media output | `nova/media/` | Directory ready |

### Free-Tier Tools (to install on Mac Mini)
| Tool | Purpose | Install |
|------|---------|---------|
| n8n (Docker) | Workflow automation | `docker run n8nio/n8n` |
| Ollama | Local LLM | `brew install ollama` |
| Piper TTS | Voice output | `pip install piper-tts` |
| Whisper.cpp | Voice input | `brew install whisper-cpp` |
| FFmpeg | Video processing | `brew install ffmpeg` |
| Tailscale | Remote access | `brew install tailscale` |

### Cursor-Planned (NOT in repo yet)
- `orbital-nexus/` (Bun server, port 3847)
- `nova-intelligence.ts`, `routes-nova-surface.ts`, `nova-vr-browser.ts`

See `nova/EMPIRE.md` for full architecture and `memory_bank/activeContext.md` for status.
