# NOVA AGENT RULES
## Every Cursor agent reads this before touching orbital-nexus

---

## Identity

You are building **Nova** — one AI digital intelligence product.
Not 9 divisions. Not 7 teams. One entity with five capabilities:
Intelligence, Voice, Presence, Vision, Action.

Read `NOVA_CEO_ORDERS.md` for what Nova is.
Read the active phase file (currently `NOVA_PHASE_1.md`) for what to do.
Read `master_brief.md` ONLY for technical reference (docker config, proven
launch steps, API details). Do NOT execute its team dispatch system.

---

## Absolute Rules

1. **Canonical path:** `~/Developer/Orbital/orbital-nexus` — ONLY.
   Never write to iCloud, ~/orbital-nexus, /tmp clones, or anywhere else.

2. **One task at a time.** Read the phase file. Do the next incomplete task.
   Verify it. Mark it done in activeContext.md. Move to the next.

3. **No freelancing.** Don't refactor adjacent code. Don't improve the
   avatar. Don't add features not in the phase file. Don't "clean up"
   anything outside your task scope.

4. **Avatar is frozen.** No changes to GLB files, Three.js materials,
   textures, lighting, or any visual avatar code. The next avatar change
   is a NEW asset from an external tool, approved by the CEO.

5. **Verify before done.** Every task has a VERIFY block with exact
   commands. Run them. If they fail, fix and re-verify. Do not report
   completion without passing verification.

6. **n8n rules:** No executeCommand nodes in any workflow JSON. Ever.
   n8n fires schedules and makes HTTP requests. Cursor does the thinking.

7. **No new dependencies** unless explicitly listed in the phase file.
   If you need something not listed, push the question to ntfy with
   tag `ceo-decision` and move to the next unblocked task.

8. **Expo app is separate.** Never touch `app/`, `components/`, `hooks/`,
   or any React Native / Expo file. That's Orbital, not Nova.

9. **progress.json is CEO-locked.** Never change percentages, sprint
   names, or status fields unless the phase file explicitly says to.

10. **Update memory at session end:**
    - `memory_bank/activeContext.md` — what you did, what's next
    - `nova/memory/errors.jsonl` — append any new errors encountered
    - `nova/memory/solutions.jsonl` — append any solutions found

---

## Session Start Checklist

Before doing anything, confirm:

```bash
cd ~/Developer/Orbital/orbital-nexus
pwd  # must be the canonical path
git status  # clean working tree or known state
cat NOVA_CEO_ORDERS.md | head -5  # confirm this is the right repo
```

Then read the active phase file and find the first incomplete task.

---

## When You're Stuck

1. Read the error. Fix the error. Don't retry blindly.
2. Check master_brief.md for technical details (docker, proven paths, API specs).
3. Check nova/memory/errors.jsonl — someone may have hit this before.
4. Check nova/memory/solutions.jsonl — there may be a known fix.
5. If truly blocked and need a CEO decision: push to ntfy with tag
   `ceo-decision`, include the specific question, and move to the
   next unblocked task. Do NOT guess. Do NOT infer. Do NOT stop working.

---

## Commit Format

```
nova: <what changed in plain English>
```

Examples:
- `nova: wire ntfy push notifications to briefing endpoint`
- `nova: create cloudflare tunnel setup script`
- `nova: rebuild mobile dashboard with consolidated capability view`

No team numbers. No division names. It's all Nova.
