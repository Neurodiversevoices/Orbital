# NOVA PHASE 1 — Intelligence Push to iPhone
## Status: ACTIVE
## Objective: CEO receives proactive intelligence on iPhone without touching a computer

---

## Definition of Done

Phase 1 is complete when ALL of these are true:

1. CEO's iPhone receives ntfy push notifications with empire intelligence
2. `https://<tunnel>.cfargotunnel.com/nova/dashboard` loads on iPhone Safari
3. Nova pushes a morning briefing automatically (calendar + empire status + alerts)
4. Nova pushes an evening summary automatically
5. Nova pushes immediately on: division stall, error spike, bill due, calendar conflict
6. Dashboard shows all 9 divisions, active alerts, and last briefing — one page
7. Server survives Mac Mini reboot (launchd) and is reachable from outside LAN

---

## Architecture (Minimal — No New Dependencies)

```
Mac Mini (always on)
  orbital-nexus (Bun, port 3847)
    /nova/dashboard        — single-page empire dashboard (mobile-first)
    /api/v1/nova/briefing  — generates current briefing JSON
    /api/v1/nova/push      — triggers manual push to ntfy
    nova-intelligence.ts   — rebuilt: real intelligence, not file counting
  
  cloudflared tunnel       — exposes :3847 to public HTTPS URL
  n8n (:5678)              — schedule triggers only (morning, evening, hourly)
  Ollama (:11434)          — local LLM for briefing generation (already installed)

CEO iPhone
  ntfy app                 — receives all push notifications
  Safari bookmark          — dashboard URL (PWA optional, not required)
```

**No new bun/npm dependencies.** Ollama, n8n, ntfy, cloudflared are already
installed or referenced. If cloudflared is not installed: `brew install cloudflared`.

---

## Task List (Execute in Order)

### TASK 1: Cloudflare Tunnel — Nova Goes Public

```
TASK: Create persistent Cloudflare tunnel exposing port 3847
SCOPE:
  - scripts/nova-tunnel-setup.sh (new)
  - ops/launchd/com.nova.tunnel.plist (new, optional)
  - .env (add NOVA_PUBLIC_URL)
VERIFY:
  curl -sf https://<tunnel-url>/healthz  (from phone or external network)
BLOCKED_BY: nothing
```

Steps:
1. `cloudflared tunnel create nova-empire`
2. `cloudflared tunnel route dns nova-empire nova.orbital.health` (or subdomain you own)
3. Write config: `~/.cloudflared/config.yml` pointing `nova-empire` tunnel to `http://localhost:3847`
4. Test: `cloudflared tunnel run nova-empire`
5. Create launchd plist for auto-start on reboot
6. Record public URL in `.env` as `NOVA_PUBLIC_URL`

### TASK 2: Rebuild nova-intelligence.ts — Real Intelligence

```
TASK: Rewrite nova-intelligence.ts to generate actual CEO briefings
SCOPE:
  - src/lib/nova-intelligence.ts (rewrite)
  - src/lib/nova-briefing.ts (new)
VERIFY:
  curl -sf http://localhost:3847/api/v1/nova/briefing | jq .summary
BLOCKED_BY: nothing (can run parallel with Task 1)
```

The current pulse counts files and flags stalls. Replace with:

**Data sources for briefing:**
- `projects/*/progress.json` — division status (read, don't modify)
- `nova/memory/errors.jsonl` — recent errors (last 24h)
- `nova/memory/solutions.jsonl` — applied solutions
- Google Calendar (via MCP or direct API if available)
- `projects/cfo/bills.json` — upcoming bills
- `memory_bank/activeContext.md` — current context

**Briefing output (JSON):**
```json
{
  "summary": "One paragraph TTS-ready briefing",
  "divisions": {
    "stalled": ["avatar-engine", "movie-studio"],
    "progressing": ["ops-automation"],
    "blocked": []
  },
  "alerts": [
    { "type": "error", "msg": "Avatar engineering still banned — need Blender pipeline" },
    { "type": "bill", "msg": "Cloudflare domain renewal due April 15" }
  ],
  "calendar_today": [
    { "time": "10:00", "title": "Team sync" }
  ],
  "recommendations": [
    "Unfreeze avatar-engine after sourcing Meshy API key",
    "Movie studio needs a brief before any agent touches it"
  ]
}
```

**Ollama integration:** Pass collected data to Ollama (model: whatever is pulled
locally, e.g. `llama3.2` or `mistral`) with a system prompt:

```
You are Nova, the Digital Twin Executive for Nova Empire.
Generate a concise morning/evening briefing for the CEO.
Be direct. No fluff. Lead with what needs attention.
Format: one paragraph summary, then bullet alerts.
```

### TASK 3: ntfy Push System

```
TASK: Wire ntfy push notifications for briefings and alerts
SCOPE:
  - src/lib/nova-push.ts (new)
  - scripts/nova-push-test.sh (new)
VERIFY:
  bun run scripts/nova-push-test.sh  (CEO iPhone receives notification)
BLOCKED_BY: nothing
```

**Push function:**
```typescript
async function pushToNova(title: string, body: string, priority?: number, tags?: string[]) {
  await fetch(process.env.NTFY_URL || 'https://ntfy.sh/nova-empire', {
    method: 'POST',
    headers: {
      'Title': title,
      'Priority': String(priority || 3),
      'Tags': (tags || ['nova']).join(','),
    },
    body,
  });
}
```

**Push triggers:**
- Morning briefing (8:00 AM local) — full briefing from Task 2
- Evening summary (8:00 PM local) — day recap + tomorrow preview
- Immediate: any new error in errors.jsonl with kind = "critical"
- Immediate: division drops below 30% or goes STALL for >2 hours
- Immediate: bill due within 3 days (from CFO bills.json)
- On CEO request: `POST /api/v1/nova/push` with `{ "type": "briefing" }`

### TASK 4: n8n Schedule Wiring

```
TASK: Create/update n8n workflows for morning and evening push schedules
SCOPE:
  - n8n/nova-morning-briefing.json (new)
  - n8n/nova-evening-summary.json (new)
  - n8n/nova-hourly-check.json (new or update existing)
VERIFY:
  curl -sf http://localhost:5678/api/v1/workflows -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.[].name'
  (should list all three workflows as active)
BLOCKED_BY: Task 2, Task 3
```

Each workflow is simple (3 nodes max):
1. **Schedule Trigger** (cron: 0 8 * * * for morning, 0 20 * * * for evening)
2. **HTTP Request** to `http://localhost:3847/api/v1/nova/briefing`
3. **HTTP Request** to `http://localhost:3847/api/v1/nova/push` with briefing body

No executeCommand. No complexity. Clock fires, HTTP flows, phone buzzes.

### TASK 5: Mobile Dashboard — One Page

```
TASK: Build single-page mobile-first dashboard at /nova/dashboard
SCOPE:
  - src/lib/nova-dashboard-mobile.ts (new — serves HTML)
  - src/app.ts (add route)
VERIFY:
  Open https://<NOVA_PUBLIC_URL>/nova/dashboard on iPhone Safari
  All 9 divisions visible with status, last briefing shown, alerts listed
BLOCKED_BY: Task 1, Task 2
```

**Design constraints:**
- Black background (#0a0a0a), white text, teal accents (#2DD4BF)
- No framework. Vanilla HTML + CSS + JS. Inline everything.
- Mobile-first: designed for iPhone 15 Pro viewport (393px wide)
- Top section: "NOVA EMPIRE" + last briefing timestamp + summary paragraph
- Middle: 9 division cards (3x3 grid on desktop, single column on mobile)
  - Each card: name, percentage bar, status badge (RUNNING/STALLED/BLOCKED)
  - Color: teal bar for >60%, amber for 30-60%, red for <30%
- Bottom: alerts list (scrollable, newest first)
- Pull-to-refresh (or auto-refresh every 60s)
- Add to Home Screen meta tags (PWA-lite: icon, theme-color, standalone)
- NO chat input. NO text field. This is read-only intelligence.

### TASK 6: launchd Hardening

```
TASK: Ensure server + tunnel survive reboot and self-heal
SCOPE:
  - ops/launchd/com.nova.nexus.plist (update)
  - ops/launchd/com.nova.tunnel.plist (new or update)
  - ops/nova-empire-start.sh (update)
  - scripts/nova-health-loop.sh (new)
VERIFY:
  Reboot Mac Mini. Wait 2 minutes.
  curl -sf https://<NOVA_PUBLIC_URL>/healthz  (from phone)
  iPhone receives "Nova Empire online" ntfy notification
BLOCKED_BY: Task 1, Task 3
```

**Health loop (runs every 60s via launchd):**
1. `curl -sf http://localhost:3847/healthz` — if fail, restart Nexus
2. `curl -sf http://localhost:5678/healthz` — if fail, restart n8n
3. Check tunnel is running (`pgrep cloudflared`) — if not, restart
4. If any restart happened, push ntfy alert to CEO

### TASK 7: Integration Test

```
TASK: End-to-end test of the complete Phase 1 system
SCOPE: no new files — verification only
VERIFY: all 7 Definition of Done items pass
BLOCKED_BY: Tasks 1-6
```

Test script:
```bash
#!/bin/bash
set -e
echo "1. Tunnel reachable..."
curl -sf https://$NOVA_PUBLIC_URL/healthz

echo "2. Dashboard loads..."
curl -sf https://$NOVA_PUBLIC_URL/nova/dashboard | grep "NOVA EMPIRE"

echo "3. Briefing generates..."
curl -sf http://localhost:3847/api/v1/nova/briefing | jq .summary

echo "4. Push works..."
curl -X POST http://localhost:3847/api/v1/nova/push \
  -H "Content-Type: application/json" \
  -d '{"type":"test","message":"Phase 1 integration test"}'

echo "5. n8n workflows active..."
curl -sf http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq 'map(select(.active)) | length'

echo "6. Survives restart..."
echo "(Manual: reboot Mac Mini, wait 2 min, re-run steps 1-5)"

echo "PHASE 1 COMPLETE"
```

---

## What Phase 1 Does NOT Include

- Avatar/GLB/3D work (frozen)
- VR/WebXR/TalkingHead (frozen)
- Chat/conversation interface (not the product)
- New industry verticals (frozen)
- Film studio (frozen)
- R&D autonomous loop (paused)
- Any new dependencies

## What Phase 2 Will Be (Preview Only — Not Active)

Voice command: CEO speaks to Nova via phone (Siri Shortcut or dedicated
endpoint). Nova processes via Ollama, executes via n8n, pushes result.
Still no avatar. Intelligence first, presentation later.

---

*Phase 1 is the foundation. When the CEO's phone buzzes with a morning
briefing and they can glance at a dashboard URL, Nova is real. Everything
after that is upgrade.*
