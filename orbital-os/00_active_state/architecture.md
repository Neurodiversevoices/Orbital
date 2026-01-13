# Orbital Architecture — LOCKED
## Version: 1.0 | Effective: January 2026

This document defines the structural constraints of Orbital. These are not suggestions. They are facts.

---

## HARD SPLIT: CLASS A vs CLASS B

There are exactly two deployment classes. They have NO overlap paths.

| Aspect | Class A (Relational) | Class B (Institutional) |
|--------|---------------------|------------------------|
| Target | Families, trusted groups, small programs | Enterprises, schools, clinics |
| Named individuals | YES | NO |
| Individual timelines | YES | NO |
| Bundles available | YES (5/10/25 seats) | NO |
| Consent model | Explicit per-member | Contract-based |
| Visibility | Mesh (all-see-all) or hub | Aggregated only |
| Dashboard | People-first UI | Triage Command Center |
| Pricing | Self-serve | Contract-only |

### No Overlap Paths

- A Class A user CANNOT upgrade to Class B features
- A Class B contract CANNOT access individual-level data
- Enterprise domains are BLOCKED from Class A at signup
- There is no "hybrid" tier

---

## CLASS A STRUCTURAL FACTS

### Named Visibility

- Names are stored and displayed
- Each member consents individually
- Consent acknowledgment is logged with timestamp
- Terms forbid employment-contingent monitoring

### Bundle Sizes

Valid Class A bundle sizes: **5, 10, 25**

Bundles are Class A. They are NOT institutional. They include:
- Named individuals
- Admin Dashboard (hub visibility, not surveillance)
- Program-level insights
- Aggregate reporting (voluntary, not mandated)

### Consent Requirements

Before joining any Circle or Bundle:
1. User reads adversarial warning (3-second minimum)
2. User confirms voluntary participation
3. Consent is logged immutably
4. Duress reporting link is visible

---

## CLASS B STRUCTURAL FACTS

### What Class B DOES NOT Have

- No names anywhere
- No individual identifiers in schemas
- No individual timelines
- No individual notes
- No individual drill-downs
- No real-time dashboards

### Rule of 5 (K-Anonymity)

If any unit or filtered view contains fewer than 5 active signals:
- Return "Insufficient Data"
- Render neutral/grey UI
- Do NOT show percentages
- Do NOT show red/green indicators

This applies to:
- Dashboards
- Drill-downs
- Exports
- Any filtered view

### Signal Delay

All signals are delayed by 5 minutes before appearing in aggregates. This breaks temporal inference attacks.

### Cached Dashboards

Class B dashboards are NOT real-time. They refresh on a scheduled basis (minimum 15-minute cache).

### Governance Separation (Citadel Principle)

**Visibility is a regulated act.** Collection does not imply visibility.

Class B operates on a 4-layer model where:
1. **Layer 1 (Sovereignty)** provides infrastructure containment
2. **Layer 2 (Coverage)** provides the right to collect signals
3. **Layer 3 (Governance)** provides the right to operationalize data
4. **Layer 4 (Assurance)** provides board-level documentation

Critical constraints:
- Raw signal access without Layer 3 is **intentionally non-actionable**
- Collected signals cannot be viewed, exported, or analyzed without Governance Layer
- This separation exists to **prevent labor-law violations**
- No bundled pricing — each layer is priced and sold independently
- This is Risk Transfer Protocol, not SaaS pricing

---

## DOMAIN GATEKEEPING

### Restricted Domain Registry

Enterprise domains are blocked from creating Class A accounts. Examples:
- microsoft.com
- google.com
- amazon.com
- apple.com
- meta.com
- [+ Fortune 500 list]

### Enforcement Points

Domain gatekeeping is enforced at:
1. Signup flow (server-side)
2. Checkout flow (server-side)
3. API validation (server-side)

UI-only blocking is INSUFFICIENT. All enforcement is server-side.

### Enforcement Actions

| Level | Action |
|-------|--------|
| block_all | Cannot create any account |
| redirect_sso | Redirect to enterprise SSO |
| contact_sales | Redirect to sales contact form |

---

## AGE DATA HANDLING

### Ingest-and-Discard

1. User provides year of birth during onboarding
2. System immediately maps to 10-year cohort
3. Year of birth is PURGED (never stored)
4. Only cohort identifier persists

### Cohorts

- under_20
- 20_29
- 30_39
- 40_49
- 50_59
- 60_69
- 70_plus
- undisclosed

### Privacy Guarantee

Exact age cannot be derived. Minimum cohort width is 10 years.

---

## QCR CONSTRAINTS

### Not a Backdoor

QCR cannot be used as a backdoor for employer surveillance:
- Individual QCR is user-owned, not employer-accessible
- Circle QCR requires consent from all members
- Bundle QCR is admin-facing aggregate only
- No QCR exposes individual data to non-consenting parties

### Scope Matching

QCR scope MUST match account type:
- Individual account can only purchase Individual QCR
- Circle account can only purchase Circle QCR
- Bundle account can only purchase Bundle QCR

---

## DEPLOYMENT CLASS DETECTION

```
if (domain is restricted) → Class B
else → Class A
```

There is no manual override. Domain determines class.

---

## FAIL-CLOSED BEHAVIOR

All enforcement mechanisms fail closed:
- Unknown deployment class → DENY
- Missing consent record → DENY
- K-anonymity check fails → SUPPRESS
- Domain check fails → BLOCK

Security overrides usability.
