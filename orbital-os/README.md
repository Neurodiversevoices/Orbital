# Orbital OS
## Git-Based Operating System for AI Memory Persistence

**Version**: 1.0
**Effective**: January 2026

---

## Purpose

This directory is the canonical source of truth for Orbital product decisions. It exists to eliminate AI memory drift by persisting decisions in files rather than relying on chat context.

**Git is the hard drive. Chat is RAM.**

---

## For AI Sessions: READ THIS FIRST

Before doing ANY work on Orbital, you MUST:

1. Read `/00_active_state/pricing_model.md`
2. Read `/00_active_state/architecture.md`
3. Read `/00_active_state/branding.md`
4. Read `/00_active_state/anti_scope.md`

These files are HARD CONSTRAINTS. They are not suggestions.

---

## Directory Structure

```
/orbital-os
├── /00_active_state    ← CURRENT TRUTH (read-only unless updating)
│   ├── pricing_model.md
│   ├── architecture.md
│   ├── branding.md
│   └── anti_scope.md
│
├── /01_decision_log    ← HISTORY (append-only)
│   ├── 001_initial_split.md
│   ├── 002_circle_first_pricing_locked.md
│   └── 003_poison_pill_consent_gate_locked.md
│
├── /02_prompts         ← AI PROMPTS (reference)
│   ├── bootloader_prompt.md
│   ├── architect_referee_v1.md
│   ├── pricing_referee_v1.md
│   └── code_surgeon_v1.md
│
├── /03_ops             ← OPERATIONS (reference)
│   ├── deploy_manual.md
│   └── safe_healer_rules.md
│
└── README.md           ← THIS FILE (bootloader)
```

---

## Rules for AI Sessions

### Rule 1: Active State is Truth

`/00_active_state/` contains the current truth. If something is not in these files, it does not exist. Do not invent prices, tiers, features, or architecture.

### Rule 2: Decision Log is History

`/01_decision_log/` contains past decisions. These are for context only. Do not re-litigate. Do not suggest "what if we went back to..."

### Rule 3: Anti-Scope is Sacred

`/00_active_state/anti_scope.md` is the kill list. If a feature is on this list, it will NEVER be built. Do not suggest workarounds. Do not suggest "lite versions."

### Rule 4: Changes Require Logging

To change anything in `/00_active_state/`:

1. Create a new file in `/01_decision_log/` with format `NNN_description.md`
2. Document the proposed change with rationale
3. Get explicit approval from founder
4. Update the relevant file in `/00_active_state/`
5. Commit with message: `decision: NNN description`

### Rule 5: No Overlap Paths

Class A (Relational) and Class B (Institutional) have NO overlap paths. Do not suggest hybrid solutions. Do not suggest "enterprise lite." Do not blur the line.

---

## Quick Reference: Canonical Prices

### Class A

| Tier | Monthly | Annual |
|------|---------|--------|
| Individual | $29 | $290 |
| Circle (5 seats) | $79 | $790 |
| Circle Expansion | +$10/seat | +$100/seat |
| Bundle 10 | $399 | $3,990 |
| Bundle 25 | $899 | $8,990 |

### QCR Artifacts

| Scope | Price |
|-------|-------|
| Individual | $149 |
| Circle | $299 |
| Bundle | $499 |

### Class B

Contract-only. No self-serve. Contact sales.

---

## Quick Reference: Key Constraints

- Bundles are CLASS A (not institutional)
- Annual = 10x monthly (everywhere)
- No free tier, no trials, no freemium
- K-anonymity threshold = 5 (Rule of 5)
- Signal delay = 5 minutes
- Domain gatekeeping blocks enterprise domains from Class A
- Poison Pill consent gate required for all invitations

---

## Standing Orders

1. **Surgeon Mode**: Execute without unnecessary questions
2. **Fail-Closed**: Deny/block/suppress when uncertain
3. **Minimal Changes**: Smallest fix that solves the problem
4. **Anti-Scope Awareness**: Check kill list before implementing

---

## Maintenance

This directory is maintained by:
- Founder (primary)
- AI sessions (with logged decisions)

Last updated: January 2026
