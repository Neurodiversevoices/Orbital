# Decision record — the personal-assistant surface is withdrawn from Orbital

**Owner decision**: 2026-09-12 — *"Withdrawn personal assistant to orbital."*
**Status**: APPLIED. The frozen prohibition stands; nothing was unfrozen.

## What was proposed

A personal-assistant surface for Orbital: medication tracking, life coaching
for AuDHD users, appointment scheduling, capacity tracking.

## Why it could not ship as proposed

Three of those are banned **by name** in `governance/PROHIBITED_FEATURES.md`,
a file marked `Status: FROZEN · Effective: Permanent · Classification:
Infrastructure Law`:

| line | banned | stated reason |
|---|---|---|
| 156 | Medication reminders | Medical device function |
| 155 | Treatment tracking | Medical advice risk |
| 64 | Chatbot for support | Creates therapeutic relationship |
| 66 | Wellness tips | Generic advice dilutes signal focus |
| 68 | Mood improvement suggestions | Therapeutic advice risk |
| 60 | Personalized recommendations | Creates advice liability |

`ORBITAL_CANON.md:126` agrees: "No therapy, counseling, crisis intervention, or
clinical workflows."

Shipping them would also have reversed the owner's own sign-off earlier the
same day (`DECISION_2026-09-12_CRISIS_FEATURE_CONFLICT.md`), which withdrew
`crisis frequency` and `Clinical Notes` from the product masterfile for exactly
these reasons.

## The decision

**The assistant surface is withdrawn.** The prohibition is not amended, not
narrowed, and not unfrozen. `PROHIBITED_FEATURES.md` is untouched by this
record.

## What Orbital still is, and it is not a consolation prize

Two of the four proposed features were never prohibited, and one of them is the
product's own founding doctrine:

- **Capacity tracking** — `governance/CAPACITY_DOCTRINE.ts` is the internal
  doctrine the whole product is built on. Tracking capacity is Orbital.
- **Appointment scheduling** — appears nowhere in the prohibition list. A
  calendar is not a clinical workflow.

Both are descriptive: they record what happened and what is scheduled. Neither
advises, recommends, interprets, or prompts. That is the line the frozen law
draws, and staying on the descriptive side of it is what keeps Orbital out of
medical-device territory — which is a market position, not a limitation.

## What this forecloses

No medication log. No treatment history. No coaching, chat, tips, mood
suggestions, or personalised recommendations — for AuDHD users or anyone else.
An agent may not add them back without a new owner decision unfreezing
`PROHIBITED_FEATURES.md`, which only the owner can do.

## Reversal

If the intent is ever the opposite, the path is to unfreeze the prohibition
first and amend it explicitly — not to build against it and reconcile later.
No code has been written against either direction.
