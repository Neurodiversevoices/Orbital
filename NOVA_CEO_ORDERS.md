# NOVA — CEO ORDERS
## Classification: ACTIVE DIRECTIVE
## Date: 2026-04-06

---

## 0. What Nova Is

Nova is one product: a **Digital Twin Executive** — an AI intelligence that
sees, speaks, thinks, and appears as a hologram on the CEO's iPhone.

Nova is NOT 9 separate divisions. Nova is NOT a dashboard. Nova is NOT a
chat window. Nova is one entity with capabilities:

| Capability | What it means | Status |
|------------|---------------|--------|
| **Intelligence** | Knows the CEO's world (calendar, empire, bills). Pushes briefings proactively. | Partial — pulse exists, Ollama wired, briefings not pushed to phone yet |
| **Voice** | Speaks via TTS (Kokoro/Ollama). Listens via speech recognition. | Partial — TTS endpoint exists, Kokoro in docker-compose |
| **Presence** | 3D avatar rendered in AR on iPhone (hologram). WebXR on desktop/headset. | Partial — VR scene exists, avatar GLB exists (Michelle), AR not wired |
| **Vision** | Generates images and video for marketing. Pollinations + ComfyUI. | Partial — image pipeline referenced, ComfyUI in system map |
| **Action** | Executes tasks via n8n workflows and Cursor agents. | Partial — n8n workflows exist, webhooks wired |

**Every feature is part of Nova. There are no separate projects.**

---

## 1. Consolidated Project Map

The old 9-division structure is collapsed. Here's what actually exists in
`orbital-nexus` and how it maps:

```
orbital-nexus/
  src/
    app.ts                          — Nova's HTTP server (Bun + Hono)
    index.ts                        — Process entry, boots intelligence pulse
    lib/
      nova-intelligence.ts          — Brain: pulse, stall detection, briefings
      nova-vr-scene.ts              — Presence: Three.js XR scene
      nova-vr-browser.ts            — Presence: browser bundle entry
      nova-vr-ui.ts                 — Presence: VR page HTML
      nova-cfo.ts                   — Intelligence: financial tracking
      nova-push.ts                  — Action: ntfy push to phone
      nova-briefing.ts              — Intelligence: briefing generation
    domains/
      nova-experience/routes.ts     — Voice: TTS proxy
  nova/
    avatar/assets/                  — Presence: GLB, morph map, animations
    memory/                         — Intelligence: errors.jsonl, solutions.jsonl
  projects/
    */progress.json                 — Status tracking (frozen, CEO-locked)
  n8n/
    *.json                          — Action: workflow definitions
  scripts/                          — Ops automation
  ops/                              — launchd, start scripts
  public/
    nova/vr/app.mjs                 — Presence: built browser bundle
    dashboard.html                  — Status: command visibility
```

**One repo. One product. Five capabilities. No divisions.**

---

## 2. What's Actually Built (Honest)

Based on master_brief.md and activeContext.md, here's what works TODAY
when `NOVA_EXPERIENCE_HUB=1 bun run dev` is running on the Mac Mini:

**WORKING:**
- Bun/Hono server on port 3847
- GET /healthz
- GET /nova/vr — VR page with avatar (Michelle GLB placeholder)
- GET /nova/website — brand landing page
- GET /nova/dashboard — 9-card command visibility
- GET /api/v1/nova/projects — division status JSON
- GET /api/v1/nova/empire-summary — TTS briefing text
- POST /api/v1/nova/tts — Kokoro TTS proxy
- POST /api/nova/interact — Ollama conversation
- POST /api/v1/conglomerate/nova-department-heartbeat
- POST /api/v1/conglomerate/nova-git-commit
- nova-intelligence.ts 60s pulse
- n8n workflows (when n8n is running): visibility, heartbeat, git commit, CFO
- launchd auto-start plist
- Docker services: n8n, redis, kokoro

**PARTIAL:**
- Avatar: Michelle placeholder, not custom Nova face
- VR scene: loads but TalkingHead/lip sync not integrated
- Push notifications: ntfy referenced but not wired end-to-end
- Briefings: empire-summary exists but not proactively pushed
- Cloudflare tunnel: referenced but not persistent
- AR/hologram: not started

**NOT BUILT:**
- iPhone AR hologram (the actual goal)
- Proactive morning/evening briefings pushed to phone
- Calendar integration into briefings
- Marketing image/video generation pipeline
- Voice commands from phone

---

## 3. Priority Order (What Gets Done Next)

**Phase 1: Nova reaches the CEO's phone**
- Persistent Cloudflare tunnel (Nova accessible from anywhere)
- ntfy push wired end-to-end (briefings hit iPhone)
- Morning/evening auto-briefings via n8n schedule
- Mobile dashboard at tunnel URL

**Phase 2: Nova speaks and listens**
- Voice interaction from iPhone (mic → speech-to-text → Ollama → TTS → speaker)
- Siri Shortcut or PWA for quick access
- Proactive alerts (not just scheduled briefings)

**Phase 3: Nova appears (hologram)**
- Custom Nova avatar (Meshy API or TripoSG → GLB)
- GLB → USDZ conversion for iOS AR Quick Look
- AR view on iPhone: Nova appears in your space
- Lip-synced speech in AR

**Phase 4: Nova creates (marketing)**
- Image generation pipeline (Pollinations/ComfyUI)
- Video generation for social/marketing
- Nova directs her own content

Active phase file has the detailed task list.

---

## 4. Agent Rules

1. **One repo, one product.** No "divisions." No "teams." It's all Nova.
2. **Canonical path only:** `~/Developer/Orbital/orbital-nexus`
3. **Never touch the Expo app.** `app/`, `components/`, `hooks/` = Orbital mobile. Separate product.
4. **Avatar GLB is frozen.** No material tweaks, no texture hacks. Next avatar change is a NEW asset from Meshy/TripoSG/scan. Period.
5. **master_brief.md is reference.** Do not execute its 7-team dispatch. Read it for technical details only.
6. **n8n is the clock, Cursor is the brain.** No executeCommand in workflows. Ever.
7. **Verify before reporting done.** Every task has a VERIFY command. Run it. If it fails, you're not done.
8. **No freelancing.** Do the task. Verify. Move to the next task. Don't "improve" adjacent code.
9. **Push to ntfy on completion.** CEO gets notified on phone, not in a terminal.
10. **Update memory_bank/activeContext.md** at end of every session.

---

## 5. How to Run Nova (for any agent starting fresh)

```bash
cd ~/Developer/Orbital/orbital-nexus

# Start infrastructure
docker compose up -d redis n8n kokoro

# Start Nova server
NOVA_EXPERIENCE_HUB=1 bun run dev

# Verify
curl -sf http://127.0.0.1:3847/healthz
curl -sf http://[::1]:3847/nova/vr | grep "NOVA"

# Build VR bundle (after any scene changes)
bun run build:nova-vr

# TypeScript check
npx tsc --noEmit
```

If `127.0.0.1` doesn't work, use `[::1]` (IPv6 loopback — bun often binds there).

---

*This is the only authority document. Phase file has the tasks. Execute.*
