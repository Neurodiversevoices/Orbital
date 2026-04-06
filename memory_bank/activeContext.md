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

Cursor designed the full Nova Empire architecture but **has not committed
or pushed any of it**. The following is PLANNED, not LANDED:

### Planned Architecture (from Cursor, not yet in repo)

| Component | File | Status |
|-----------|------|--------|
| Nova Nexus server | `orbital-nexus/` | **NOT IN REPO** — directory doesn't exist |
| Intelligence pulse | `nova-intelligence.ts` | **NOT IN REPO** — designed, 5-min interval |
| CFO dashboard | `GET /nova/cfo` via `routes-nova-surface.ts` | **NOT IN REPO** |
| Empire score | `buildNovaVisibilityBundle()` | **NOT IN REPO** |
| VR browser briefing | `nova-vr-browser.ts` + `public/nova/vr/` | **NOT IN REPO** |
| Git commit webhook | `POST /webhook/nova-git-commit` | **NOT IN REPO** — requires n8n |
| Division heartbeat | `bun run nova:team-run` | **NOT IN REPO** |

### Planned Nova Stack (when Cursor executes)
- Runtime: Bun
- Server: orbital-nexus/ (port 3847)
- Workflows: n8n containers (port 5678+)
- Dashboard: SSE + loadOnce pattern
- VR: TTS empire briefing every 5 min
- Git: resolveGitRepoRoot() scoped to orbital-nexus/

### Blockers Before Cursor Can Execute
1. `orbital-nexus/` directory must be created or exist on Mac Mini
2. n8n containers must be running with INTERNAL_SERVICE_TOKEN
3. Any stuck `.git/index.lock` must be cleared first
4. Nexus must be restarted with `NOVA_EXPERIENCE_HUB=1`

### What DOES exist in this repo
- `master_brief.md` — consolidated source of truth (done)
- `memory_bank/` — context files (done)
- `CLAUDE.md` — references master_brief (done)
- The Orbital app itself (Expo/React Native) — fully functional
