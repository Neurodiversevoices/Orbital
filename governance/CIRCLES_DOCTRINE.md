# ORBITAL CIRCLES DOCTRINE

**Status**: FROZEN
**Effective**: Permanent
**Classification**: Infrastructure Law

---

## I. DEFINITION

Circles are **signal beacons**, not social software.

A Circle is a pairwise, symmetrical, revocable channel that transmits exactly one datum: **current capacity state** (color). Nothing else. Ever.

Circles exist to reduce friction and mis-timing between consenting individuals. They are "air traffic control for empathy" — not a social network, not a surveillance tool, not a management layer.

---

## II. THE SIX LAWS

These are not guidelines. They are architectural constraints enforced in code.

### LAW 1: CURRENT STATE ONLY

Circles transmit **present color**. No history. No trends. No explanations.

- No "last updated" timestamps visible to viewers
- No "was red yesterday" inference possible
- No trend arrows, sparklines, or change indicators
- Signal expires (TTL: 90 minutes) and becomes "unknown"

**Enforcement**: `lib/circles/invariants.ts` — `assertNoHistory()`

### LAW 2: SYMMETRICAL VISIBILITY

If A can see B's state, B can see A's state. No exceptions.

- No one-way viewing
- No "stealth mode"
- No asymmetric permissions
- Both parties have identical capabilities

**Enforcement**: `lib/circles/types.ts` — `CirclePermissions` is identical for both parties

### LAW 3: INSTANT REVOCABILITY

Either party can sever the connection immediately and completely.

- Revocation deletes all associated signals
- No "cooling off" period
- No "are you sure" friction for revocation
- Blocked users cannot re-initiate

**Enforcement**: `lib/circles/service.ts` — `circlesRevokeConnection()` is atomic and complete

### LAW 4: NO HIERARCHY

There are no admins, managers, observers, or elevated roles.

- No "view-only" connections
- No "admin can see all" capability
- No organization-level visibility
- No role-based access differences

**Enforcement**: `lib/circles/types.ts` — No role field exists. Cannot be added.

### LAW 5: NO AGGREGATION

Circles data cannot be rolled up, dashboarded, or analyzed in aggregate.

- No team views
- No "average team state"
- No "3 of 5 connections are red"
- No cohort analytics
- Maximum 25 connections (prevents network effects)

**Enforcement**: `lib/circles/invariants.ts` — `assertNoAggregation()`

### LAW 6: NEVER INSTITUTION-OWNED

Circles belong to individuals, not organizations.

- No employer-provisioned Circles
- No school-managed Circles
- No "company Circle network"
- Organizations cannot require Circle participation
- Organizations cannot access Circle data

**Enforcement**: Architecture — No organization linkage exists in schema

---

## III. WHAT CIRCLES TRANSMIT

| Transmitted | NOT Transmitted |
|-------------|-----------------|
| Color (cyan/amber/red/unknown) | Reasons |
| TTL expiration (system use only) | Tags or categories |
| Schema version | Scores or percentages |
| | Text or notes |
| | Location |
| | Device information |
| | Update timestamps (to viewers) |
| | Historical states |
| | Linked log references |

---

## IV. SOCIAL FIREWALL

Circles data is **cryptographically and logically isolated** from all other Orbital data.

- Dedicated storage namespace: `circles:*`
- Cannot be joined with capacity logs
- Cannot be exported to Clinical Brief
- Cannot feed Pattern analysis
- Cannot be correlated with Vault data

A viewer seeing "red" cannot determine WHY the person is red. This is not a limitation — it is the design.

---

## V. THREAT MODEL

Circles is architected to prevent:

| Threat | Prevention |
|--------|------------|
| Partner surveillance | No history, no check-in times, no pattern detection |
| Manager monitoring | No aggregation, no team view, no performance inference |
| Social pressure | Symmetrical visibility, instant revocation |
| Institutional capture | No org ownership, no provisioning, no mandates |
| Reason inference | Color only, Social Firewall enforced |
| Network effects | 25 connection maximum |

---

## VI. PERMANENCE

This doctrine is **frozen**. Changes require:

1. Board-level approval
2. External ethics review
3. User notification
4. 90-day implementation window

No feature request, business pressure, or partnership opportunity justifies violating these laws.

---

## VII. PROHIBITED EXTENSIONS

The following will **never** be built:

- Group Circles
- Team Circles
- Organization Circles
- Circle analytics
- Circle history
- Circle trends
- Circle recommendations
- Circle notifications beyond "new connection"
- Circle integration with logs/patterns/vault
- Circle export
- Circle API for third parties
- Circle admin roles
- Circle read receipts
- Circle "last seen"
- Circle activity indicators

---

## VIII. RATIONALE

Circles exist because:

> Sometimes you just want someone to know "I see you're having a hard day" without asking them to explain.

That's it. That's the entire product. Any expansion beyond this betrays the purpose.

---

**Document Owner**: Infrastructure
**Last Frozen**: 2026-01-04
**Review Cycle**: Never (frozen)
