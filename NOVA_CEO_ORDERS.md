# NOVA CEO ORDERS
## Classification: ACTIVE DIRECTIVE — replaces master_brief.md as execution authority
## Date: 2026-04-06
## CEO: Claude (Opus)

---

## 0. State of the Empire

Nova Empire has infrastructure. It does not have a product the CEO can use.

Nine divisions are stalled. The avatar has been touched 10+ times and banned from
engineering. The UI was rated D-. n8n was dead for a full day without anyone
noticing. The VR page requires localhost on a Mac Mini. The CEO cannot access
Nova from an iPhone.

**This ends now.**

All prior standing orders from `master_brief.md` are SUSPENDED except:
- Section 17 (n8n is clock, Cursor is brain — no executeCommand)
- Section 9 (Expo files untouched — hard split)
- Section 21 (CFO — no spending)

Everything else is governed by this document and the active phase file.

---

## 1. Execution Model — One Phase at a Time

The empire operates in **phases**. Only ONE phase is active. Every agent reads
the active phase file and executes ONLY what that file says. No freelancing.
No "while I'm here I'll also improve X." No touching files outside scope.

**Active phase: `NOVA_PHASE_1.md`**

When Phase 1 Definition of Done is met, the CEO activates Phase 2. Not before.
No agent activates the next phase. Only the CEO.

---

## 2. Division Status (Frozen Until Phase 1 Complete)

All division progress.json files are FROZEN. No agent modifies percentages,
sprint names, or status fields until the CEO explicitly unfreezes a division
in a phase file.

| Division | Frozen At | Notes |
|----------|-----------|-------|
| nova-core | 65% | Phase 1 touches server routes only |
| avatar-engine | 60% | BANNED from engineering changes |
| vr-lab | 75% | Not in Phase 1 |
| custom-ai | 55% | Not in Phase 1 |
| movie-studio | 50% | Not in Phase 1 |
| physical-projects | 55% | Not in Phase 1 |
| nova-intelligence | 60% | Phase 1 rebuilds this |
| rd-engine | 70% | Paused |
| ops-automation | 80% | Phase 1 touches ops |

---

## 3. What Nova IS (CEO Definition — Final)

Nova is not a chat window. Nova is not a VR experience. Nova is not an avatar.

**Nova is a proactive intelligence system that pushes decisions, status, and
warnings to the CEO's phone without the CEO asking.**

Nova's job:
1. Know what's happening across the empire (division status, errors, stalls)
2. Know what's happening in the CEO's world (calendar, deadlines, bills)
3. Push the right information at the right time to the CEO's phone
4. Accept voice/text commands WHEN THE CEO INITIATES (not as primary interface)
5. Execute commands through n8n and Cursor agents

Nova's surfaces (in priority order):
1. **ntfy push notifications** — CEO's iPhone, always-on
2. **Dashboard URL** — one page, Cloudflare tunnel, check when you want
3. **Voice/command endpoint** — when CEO wants to give orders
4. **VR/Avatar** — future. Not now.

---

## 4. Repo Hygiene (Enforced)

**Canonical path:** `~/Developer/Orbital/orbital-nexus`
**Never write to:** iCloud path, ~/orbital-nexus, or any other clone

**Active directive files (this structure):**
```
orbital-nexus/
  NOVA_CEO_ORDERS.md          <-- this file (replaces master_brief as authority)
  NOVA_PHASE_1.md             <-- active phase execution plan
  NOVA_AGENT_RULES.md         <-- hard constraints for all agents
  master_brief.md             <-- REFERENCE ONLY. Not executable. Archive.
  memory_bank/activeContext.md <-- agents update after each session
  nova/memory/errors.jsonl    <-- append-only error log
  nova/memory/solutions.jsonl <-- append-only solution log
```

**master_brief.md is demoted to reference.** It contains useful technical detail
(team structures, docker config, proven VR launch path) but is no longer the
execution authority. Agents read NOVA_CEO_ORDERS.md + the active phase file.

---

## 5. Agent Dispatch Model

No more 7 parallel teams. One agent, one task, one deliverable, verified, next.

**Dispatch format:**
```
TASK: <one sentence>
SCOPE: <files that may be created or modified>
VERIFY: <exact command that proves completion>
BLOCKED_BY: <nothing, or specific prior task>
```

Phase files contain ordered task lists in this format. Agents execute top to
bottom. Skip nothing. Verify everything. Report completion in activeContext.md.

---

## 6. CEO Communication Channel

The CEO does not sit at a computer waiting for agents. Communication is:

- **To CEO:** ntfy push notification (text + optional image)
- **From CEO:** This document, phase files, or direct chat session
- **Status:** `GET /api/v1/nova/empire-summary` (JSON, one call)

If an agent needs a CEO decision, it pushes the question to ntfy with
tag `ceo-decision` and STOPS that task. Does not guess. Does not infer.
Moves to the next unblocked task.

---

## 7. Hard Rules (Violation = Session Terminated)

1. Never modify avatar GLB, textures, materials, or Three.js material code
2. Never write files to iCloud path
3. Never modify progress.json percentages without CEO phase authorization
4. Never add npm/bun dependencies without listing them in the phase file
5. Never run master_brief.md team dispatch (it is archived)
6. Never build VR/WebXR/avatar features until CEO activates that phase
7. Never open multiple terminal sessions
8. Always verify with the exact command specified before reporting done
9. Always update activeContext.md at end of session
10. One phase at a time. One task at a time. No freelancing.

---

*This document is the supreme authority for Nova Empire operations.
master_brief.md is reference material only. Active execution comes from
the current phase file.*

*CEO: Claude (Opus) | Effective: 2026-04-06 | Phase: 1*
