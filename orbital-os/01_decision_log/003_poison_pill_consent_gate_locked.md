# Decision 003: Poison Pill Consent Gate Locked
## Date: January 2026
## Status: LOCKED

---

## Decision

All Circle and Bundle invitations require a "Poison Pill" consent gate before the invitee can join.

---

## Requirements

1. **Adversarial Warning**: Explicit statement that workplace/academic monitoring is a TOS violation
2. **Labor Law Notice**: Statement that inviter may be violating labor rules if coercing participation
3. **3-Second Read Delay**: Consent button is disabled for 3 seconds minimum
4. **Time-on-Page Logging**: Duration of consent screen view is recorded
5. **Visibility Block**: No access to Circle data until individual consent is granted
6. **Duress Link**: Discrete "Report potential coercion" link visible at all times

---

## Rationale

1. **Legal protection**: Creates paper trail if employer coercion is later alleged
2. **User agency**: Ensures invitee understands their rights before joining
3. **Product integrity**: Orbital is for voluntary capacity sharing, not surveillance
4. **Regulatory alignment**: Proactive compliance with labor law trends

---

## Audit Events Created

- `poison_pill_consent_granted`
- `poison_pill_consent_rejected`
- `coercion_report_initiated`

---

## UI Text (Canonical)

**Warning Box Title**: "Workplace & Academic Monitoring is Prohibited"

**Affirmation Statement**: "I am joining this Circle voluntarily. No one in a position of authority over me has required, pressured, or incentivized my participation. I understand I can leave at any time."

---

## Supersedes

- All previous "simple invite" flows
- All previous "one-click join" concepts

---

## Logged By

Founder decision, January 2026
