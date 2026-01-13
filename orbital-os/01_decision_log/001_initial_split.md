# Decision 001: Initial Class Split
## Date: January 2026
## Status: LOCKED

---

## Decision

Orbital will have exactly two deployment classes with no overlap paths:

1. **Class A (Relational)** — Named individuals, consent-based, self-serve
2. **Class B (Institutional)** — Anonymous aggregates only, contract-only

---

## Rationale

1. **Legal separation**: Employment law prohibits certain monitoring practices
2. **Ethical clarity**: Users must know exactly what visibility model applies
3. **Product focus**: Trying to serve both models in one flow creates confusion
4. **Liability firewall**: Class B contracts carry different legal obligations

---

## Constraints Created

- No hybrid tier
- No upgrade path from A to B
- No downgrade path from B to A
- Domain determines class automatically
- Bundles remain Class A (not institutional)

---

## Supersedes

- All previous discussions of "enterprise lite"
- All previous discussions of "team mode for employers"
- All previous discussions of "anonymous Circle"

---

## Logged By

Founder decision, January 2026
