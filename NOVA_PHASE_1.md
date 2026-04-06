# NOVA PHASE 1 — Reach the CEO's iPhone
## Status: ACTIVE
## Prerequisite: Nova server boots clean on Mac Mini

---

## Done When

1. CEO's iPhone buzzes with a Nova briefing (ntfy) — no computer open
2. CEO taps a URL on iPhone and sees Nova's dashboard with live status
3. This happens every morning at 8 AM and evening at 8 PM automatically
4. This survives a Mac Mini reboot

---

## Tasks

### 1. Tunnel — Nova goes public

Make Nova reachable from the internet. CEO should never need to be on the
same WiFi as the Mac Mini.

```
DO:
  cloudflared tunnel create nova
  Write ~/.cloudflared/config.yml routing to localhost:3847
  cloudflared tunnel run nova
  Record URL in .env as NOVA_PUBLIC_URL
  Create launchd plist: ops/launchd/com.nova.tunnel.plist

VERIFY:
  From iPhone (not on home WiFi):
  curl -sf https://<NOVA_PUBLIC_URL>/healthz

SCOPE: scripts/nova-tunnel-setup.sh, ops/launchd/com.nova.tunnel.plist, .env
```

### 2. Push — Nova reaches the phone

Wire ntfy so Nova can push any message to the CEO's iPhone.

```
DO:
  Create src/lib/nova-push.ts with pushToNova(title, body, priority, tags)
  Default topic: process.env.NTFY_TOPIC || 'nova-empire'
  Add POST /api/v1/nova/push route to src/app.ts
  Create scripts/nova-push-test.sh that sends a test notification

VERIFY:
  bun run scripts/nova-push-test.sh
  iPhone ntfy app shows "Nova Push Test" notification

SCOPE: src/lib/nova-push.ts, src/app.ts, scripts/nova-push-test.sh
```

### 3. Briefing — Nova thinks before she speaks

Generate real briefings from actual data, not file counts.

```
DO:
  Create src/lib/nova-briefing.ts
  Reads: projects/*/progress.json, nova/memory/errors.jsonl (last 24h),
         projects/cfo/bills.json, memory_bank/activeContext.md
  Calls Ollama (localhost:11434) with collected data + system prompt:
    "You are Nova. Generate a 3-sentence CEO briefing. Lead with what
     needs attention. Be direct. No fluff."
  Returns: { summary, alerts[], divisions_needing_attention[], recommendations[] }
  Add GET /api/v1/nova/briefing route

VERIFY:
  curl -sf http://localhost:3847/api/v1/nova/briefing | jq .summary
  (returns actual English briefing, not an error)

SCOPE: src/lib/nova-briefing.ts, src/app.ts
```

### 4. Auto-push — Nova briefs the CEO on schedule

Wire briefing generation to ntfy on a schedule via n8n.

```
DO:
  Create n8n/nova-morning-briefing.json:
    Schedule (cron 0 8 * * *) → HTTP GET /api/v1/nova/briefing → HTTP POST /api/v1/nova/push
  Create n8n/nova-evening-summary.json:
    Schedule (cron 0 20 * * *) → same flow
  Create n8n/nova-alert-check.json:
    Schedule (every 15 min) → GET /briefing → IF alerts.length > 0 → POST /push
  Import and activate all three via n8n REST API (not UI)

VERIFY:
  curl -sf http://localhost:5678/api/v1/workflows \
    -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '[.data[] | select(.active) | .name]'
  (shows all three workflows active)
  Manually trigger morning workflow → iPhone gets briefing notification

SCOPE: n8n/nova-morning-briefing.json, n8n/nova-evening-summary.json, n8n/nova-alert-check.json
```

### 5. Dashboard — Nova at a glance

One mobile-first page the CEO bookmarks on iPhone.

```
DO:
  Rewrite or create src/lib/nova-dashboard-mobile.ts
  Serves at GET /nova/command (or /nova/dashboard — pick one, kill the other)
  Design:
    - Black bg (#05050d), teal accents (#2DD4BF)
    - Top: "NOVA" + last briefing summary (2-3 sentences)
    - Middle: 5 capability status bars (Intelligence, Voice, Presence, Vision, Action)
      pulled from GET /api/v1/nova/projects (consolidated, not 9 separate rows)
    - Bottom: active alerts, newest first
    - PWA meta tags (Add to Home Screen on iPhone)
    - Auto-refresh every 60s via fetch, no full page reload
    - NO chat input. NO text field. Read-only intelligence.
  Vanilla HTML + CSS + JS. No dependencies. Inline everything.
  Mobile-first: iPhone 15 Pro width (393px)

VERIFY:
  Open https://<NOVA_PUBLIC_URL>/nova/command on iPhone Safari
  See Nova branding, briefing summary, capability bars, alerts
  Add to Home Screen works (icon appears)

SCOPE: src/lib/nova-dashboard-mobile.ts, src/app.ts
```

### 6. Survive reboot

Nova must come back automatically after Mac Mini restart.

```
DO:
  Update ops/launchd/com.nova.nexus.plist:
    - Runs ops/nova-empire-start.sh
    - Starts docker compose (redis, n8n, kokoro)
    - Starts bun run dev with NOVA_EXPERIENCE_HUB=1
    - Waits for /healthz, then pushes "Nova Empire online" to ntfy
  Ensure com.nova.tunnel.plist auto-starts cloudflared
  Create scripts/nova-health-loop.sh (runs every 60s):
    - Check :3847 /healthz — restart if dead
    - Check :5678 n8n — restart if dead
    - Check cloudflared running — restart if dead
    - Push ntfy alert on any restart

VERIFY:
  Reboot Mac Mini. Wait 2 minutes.
  From iPhone: curl -sf https://<NOVA_PUBLIC_URL>/healthz
  iPhone should have received "Nova Empire online" notification

SCOPE: ops/launchd/*.plist, ops/nova-empire-start.sh, scripts/nova-health-loop.sh
```

### 7. Integration test

```
VERIFY (all must pass):
  1. curl -sf https://$NOVA_PUBLIC_URL/healthz
  2. curl -sf https://$NOVA_PUBLIC_URL/nova/command | grep "NOVA"
  3. curl -sf http://localhost:3847/api/v1/nova/briefing | jq .summary
  4. POST /api/v1/nova/push sends notification to iPhone
  5. n8n has 3 active briefing workflows
  6. Mac Mini reboot → Nova recovers → iPhone notified

When all 6 pass: Phase 1 is done. Push "PHASE 1 COMPLETE" to ntfy.
CEO activates Phase 2.
```

---

## Phase 2 Preview: Voice + Commands (NOT ACTIVE)

- CEO talks to Nova from iPhone (voice endpoint + Siri Shortcut)
- Nova responds via TTS audio
- Nova can execute commands ("check on movie studio", "push the latest avatar")

## Phase 3 Preview: Hologram (NOT ACTIVE)

- Custom Nova avatar via Meshy/TripoSG
- GLB → USDZ for native iOS AR Quick Look
- Nova appears in CEO's physical space on iPhone
- Lip-synced speech in AR
- This is the real digital twin moment

---

*Phase 1 is infrastructure. When your phone buzzes at 8 AM with Nova's
briefing and you can glance at a dashboard URL from anywhere, the
foundation is set. Everything after compounds.*
