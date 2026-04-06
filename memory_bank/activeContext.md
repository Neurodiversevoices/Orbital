# Active Context

> This file tracks current project state. For canonical definitions,
> see [master_brief.md](../master_brief.md).

## Current Status (April 2026)

- **iOS:** Under Apple App Store review — NO new app builds until approved
- **Web:** Live at orbitalhealth.app
- **Auth:** Gate implemented — all users must authenticate
- **Dashboard:** Live at orbitalhealth.app/dashboard
- **Apollo:** Coach outreach sequence ACTIVE
- **First clinical partner (Ali):** Onboarded, needs app sign-in to sync local logs

## Active Priorities

See [ORBITAL_TASK_BOARD.md](../ORBITAL_TASK_BOARD.md) for current task list.

## Key Constraints

- Budget: $500 (solo founder) — see master_brief.md Section 1
- No dependency changes — see master_brief.md Section 3
- Locked files — see master_brief.md Section 12
- Dev rules — see master_brief.md Section 13

## Architecture References

- Hard Split (Class A/B): master_brief.md Section 6
- Data Trust: master_brief.md Section 9
- Capacity Model: master_brief.md Section 5

## Nova Empire — Status (April 6, 2026)

### What EXISTS in this repo (REAL)
- `master_brief.md` — consolidated source of truth
- `memory_bank/` — session-to-session context
- `nova/EMPIRE.md` — full empire architecture spec ($0 budget)
- `nova/memory/` — 7 JSONL files (learnings, decisions, suggestions, outcomes, research, skills, errors)
- `nova/divisions/` — 4 n8n workflow JSON files ready to import (creative, R&D, ops, CEO brief)
- `nova/media/` — output directory for generated images/video
- `CLAUDE.md` — references master_brief
- The Orbital app itself (Expo/React Native) — fully functional

### What Cursor PLANNED but has NOT committed
- `orbital-nexus/` — Bun server (port 3847) — not in repo
- `nova-intelligence.ts` — designed, not written
- `routes-nova-surface.ts` — designed, not written
- `nova-vr-browser.ts` — designed, not written

### Next Steps to Activate Empire
1. On Mac Mini: `docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n:latest`
2. Import `nova/divisions/*.json` into n8n
3. Activate all 4 workflows
4. Images will appear in `nova/media/` and email via Resend
