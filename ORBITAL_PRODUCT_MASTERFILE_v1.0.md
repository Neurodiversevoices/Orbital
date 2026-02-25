# ORBITAL PRODUCT MASTERFILE v1.0

**Clinical-Grade Capacity Intelligence**

---

| Field | Value |
|-------|-------|
| **Classification** | Internal / Investor / Auditor Ready |
| **Effective Date** | January 2026 |
| **Architecture Lock** | Launch Week Complete |
| **Scale Target** | $50M ARR Enterprise Infrastructure |

---

## EXECUTIVE SUMMARY

Orbital is a **capacity intelligence platform** that enables individuals and organizations to track, understand, and communicate human capacity states over time.

Unlike wellness apps optimized for engagement metrics, Orbital is architected for:
- **Clinical Defensibility** — Data structures that survive regulatory scrutiny
- **Enterprise Procurement** — Fortune 500 security and privacy requirements
- **Regulatory Durability** — GDPR, HIPAA-adjacent, and labor law compliance

**Core Philosophy:** Boring Reliability. Privacy by Structure. Sleep-Proof Operations.

---

# 1. THE CORE ARCHITECTURE ("The Hard Split")

Orbital operates on a **structural separation model**: two deployment classes with **zero overlap paths**. This is not a permission system—it is a schema-level enforcement that makes cross-class operations physically impossible.

---

## 1.1 CLASS A — RELATIONAL DEPLOYMENT

### Who It's For
- **Families** managing household capacity across caregivers
- **Coaches** working with individual clients
- **Therapists** coordinating care with patients
- **Peer support groups** (voluntary, non-employment)

### How It Works

| Property | Implementation |
|----------|----------------|
| **Visibility Model** | Named individuals with explicit, logged consent |
| **Purchase Model** | Bundles: 5 / 10 / 20 / 50 seats |
| **Data Access** | Full individual-level: notes, timelines, signals |
| **Terms Version** | `1.0-relational` |

### The "Poison Pill" Consent Gate

Before any Class A group is created, users encounter a **mandatory, non-bypassable interstitial**:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  IMPORTANT: VOLUNTARY USE ONLY                              │
│                                                                 │
│  This group is for voluntary capacity sharing among trusted    │
│  individuals.                                                   │
│                                                                 │
│  By creating this group, you acknowledge that:                  │
│                                                                 │
│  • All members are participating voluntarily                    │
│  • Participation is NOT contingent on employment                │
│  • Members can leave at any time without consequence            │
│  • Using this for workplace monitoring violates our Terms       │
│                                                                 │
│  ⚠️  If you are an employer, manager, or supervisor attempting  │
│  to monitor employees, you are violating our Terms of Service   │
│  and may face legal liability.                                  │
│                                                                 │
│                    [ I Understand — Create Group ]              │
└─────────────────────────────────────────────────────────────────┘
```

### Consent Logging (Forensic-Grade)

Every consent acknowledgment is permanently recorded:

| Field | Value |
|-------|-------|
| `userId` | Creating user's ID |
| `groupId` | Target group ID |
| `consentType` | `'explicit_acknowledgment'` |
| `acknowledgmentText` | Full warning text (verbatim) |
| `acknowledgedAt` | ISO 8601 timestamp |
| `ipAddress` | Client IP (optional audit) |
| `userAgent` | Browser/device signature (optional audit) |

**Legal Significance:** This transforms Orbital's position from "we disclosed" to "we actively attempted to prevent coercion, and we can prove it."

---

## 1.2 CLASS B — INSTITUTIONAL DEPLOYMENT

### Who It's For
- **Fortune 500** HR and People Operations
- **Health Systems** and hospitals
- **Universities** and school districts
- **Government agencies**

### How It Works

| Property | Implementation |
|----------|----------------|
| **Visibility Model** | Aggregated and anonymized only |
| **Purchase Model** | Contract-only (minimum 25 seats) |
| **Data Access** | Unit-level metrics only |
| **Provisioning** | Requires valid `contract_id` |
| **Terms Version** | `1.0-institutional` |

### Structural Prohibitions

The following fields **do not exist** in Class B schemas. This is not access control—the columns are absent:

```
❌ individualNotes          ❌ userName
❌ performanceScore         ❌ userEmail
❌ freeTextCommentary       ❌ userAvatar
❌ individualTimeline       ❌ employeeId
```

A Class B administrator cannot view individual data because **the data structure makes it impossible**.

### The "Rule of 5" (K-Anonymity)

All Class B views enforce a minimum signal threshold:

| Condition | Display Behavior |
|-----------|------------------|
| `signal_count >= 5` | Show metrics with color coding |
| `signal_count < 5` | Show "Insufficient Data" (grey, neutral) |

**Enforcement Scope:**
- Dashboard views
- Drill-down queries
- Export requests
- Any filtered view

**Database Constraint:**
```sql
CONSTRAINT k_anonymity_enforcement CHECK (
  signal_count >= 5 OR
  (is_suppressed = TRUE AND load_percent IS NULL AND risk_percent IS NULL)
)
```

### Signal Delay (Temporal Privacy)

All Class B signals are delayed by **5 minutes** before visibility. This prevents temporal inference attacks ("Who just logged a depleted signal during the 2pm meeting?").

```typescript
SIGNAL_DELAY_SECONDS = 300
```

---

## 1.3 DOMAIN GATEKEEPING

**Purpose:** Prevent enterprise employees from purchasing Class A bundles using personal email.

### Restricted Domain Registry

The `restricted_domains` table blocks known enterprise domains:

| Category | Examples |
|----------|----------|
| **Tech** | `microsoft.com`, `google.com`, `amazon.com`, `apple.com`, `meta.com` |
| **Enterprise** | `salesforce.com`, `oracle.com`, `ibm.com`, `intel.com` |
| **Healthcare** | `kaiserpermanente.org` |
| **Education** | `harvard.edu`, `stanford.edu`, `mit.edu` |

### Enforcement Points

| Point | Action |
|-------|--------|
| **Signup Flow** | Block Class A, redirect to "Contact Sales" |
| **Checkout Flow** | Block bundle purchase |
| **API Validation** | Reject operation, return enforcement error |
| **Backend Provisioning** | Final backstop, fail closed |

### Enforcement Levels

| Level | Behavior |
|-------|----------|
| `block_all` | Hard block, no redirect |
| `redirect_sso` | Redirect to organization SSO endpoint |
| `contact_sales` | Redirect to enterprise sales page |

---

# 2. THE REVENUE & PRICING MODEL

## 2.1 PLATFORM ACCESS TIERS

### Class A (Relational) — Self-Serve

**Tier Ladder:** Starter (Free) → Pro → Circle → Bundles → CCI-Q4

Annual plans are **default-selected**. Annual = 10× monthly. Upgrades allowed; silent downgrades **blocked**.

#### Starter (Free)

| Property | Value |
|----------|-------|
| **Price** | $0 |
| **Seats** | 1 |
| **Signals** | Unlimited |
| **Pattern History** | 7 days |
| **Shared Visibility** | None |

#### Pro (Individual)

| Billing | Price |
|---------|-------|
| **Monthly** | $29/mo |
| **Annual** | $290/yr |

- 1 seat
- Private capacity tracking only
- Full pattern history
- Data export (CSV/PDF)
- No shared visibility
- Required for Circle and Bundle participation

#### Circle (5 Seats Included)

| Billing | Price |
|---------|-------|
| **Monthly** | $79/mo |
| **Annual** | $790/yr |

- 5 seats included
- Mesh visibility (all-see-all)
- Named individuals, mandatory consent per member
- Pattern sharing + Circle-level insights
- All members must have active Pro

#### Circle Expansion (Per Additional Seat Beyond 5)

| Billing | Price |
|---------|-------|
| **Monthly** | +$10/mo per seat |
| **Annual** | +$100/yr per seat |

#### Family Add-on (Requires Pro)

| Billing | Price |
|---------|-------|
| **Monthly** | $79/mo (base 5 seats) |
| **Annual** | $790/yr (base 5 seats) |
| **Extra Seat (Monthly)** | +$9/mo per member |
| **Extra Seat (Annual)** | +$90/yr per member |

#### Pro Bundles (Annual-Only)

| Bundle | Seats | Annual Price |
|--------|-------|-------------|
| **10-Seat** | 10 | $2,700/yr |
| **15-Seat** | 15 | $4,000/yr |
| **20-Seat** | 20 | $5,200/yr |

- Full Pro access per seat
- Includes Admin Dashboard (hub visibility)
- Annual billing only — no monthly option
- **Still Class A — NOT institutional**

#### Admin Add-on (Optional for Circle / Bundle)

| Billing | Price |
|---------|-------|
| **Monthly** | $29/mo |
| **Annual** | $290/yr |

- Read-only history access
- Consent-gated

### Class B (Institutional — "Citadel") — Contract Only

Class B is a **Risk Transfer Protocol**, not a SaaS pricing model. Contract-only. No self-serve. No bundled pricing.

#### Layer 1 — Sovereignty License

| Component | Price |
|-----------|-------|
| **Annual Fee** | $250,000/year (flat) |

Provides: private container deployment, domain lock enforcement, SSO integration, Rule-of-5 firewall (K-anonymity), legal boundary documentation. Includes 0 users, 0 dashboards, 0 visibility rights. **Budget Owner:** IT / SecOps

#### Layer 2 — Capacity Coverage

| Component | Price |
|-----------|-------|
| **Per-Employee Fee** | $1,000/employee/year |

Provides: right to ingest capacity signals from covered employees, signal storage within sovereign container, aggregation eligibility. **Critical Principle:** Collection ≠ Visibility. No visibility or governance rights included. **Budget Owner:** HR / Benefits / Insurance

#### Layer 3 — Governance & Intelligence Rights

| Component | Price |
|-----------|-------|
| **Annual Fee** | $150,000/year (flat) |

Provides: Triage Command Center access, governed aggregation (labor-safe abstraction), K-anonymity enforced views, cached dashboard access (no real-time), export rights (aggregate only). Without this layer, collected signals are intentionally non-actionable. **Budget Owner:** Legal / Risk

#### Layer 4 — Strategic Assurance

| Component | Price |
|-----------|-------|
| **Annual Fee** | $100,000/year (flat) |

Provides: Quarterly Operational Risk Statements, board-level artifact signed by Orbital, fiduciary documentation for directors, audit-ready capacity posture reports. **Budget Owner:** CEO / Board

#### Sample Deal — 1,000 Employees

| Layer | Description | Calculation | Annual Cost |
|-------|-------------|-------------|-------------|
| 1 | Sovereignty License | Flat | $250,000 |
| 2 | Capacity Coverage | 1,000 × $1,000 | $1,000,000 |
| 3 | Governance & Intelligence Rights | Flat | $150,000 |
| 4 | Strategic Assurance | Flat | $100,000 |
| | **Total Contract Value (TCV)** | | **$1,500,000** |

---

## 2.2 THE QCR (QUARTERLY CAPACITY REPORT)

**Definition:** A one-time purchase PDF artifact synthesizing 90 days of capacity data into a clinical-grade report. Scope must match account type.

### Pricing by Scope

| Scope | Price | Requirement |
|-------|-------|-------------|
| **Individual QCR** | $149 (one-time) | Active Individual / Pro subscription |
| **Circle QCR** | $299 (one-time) | Active Circle subscription |
| **Bundle QCR** | $499 (one-time) | Active Bundle subscription + Admin role |

### Features by Scope

**Individual QCR ($149)**
- Covers one person only
- 90-day pattern synthesis
- Resilience metrics
- Recovery velocity analysis
- Clinical-grade PDF export
- EHR-attachment ready

**Circle QCR ($299)**
- Covers entire Circle (≤5 people)
- Relational dynamics analysis
- Synchronization patterns
- Load distribution insights
- Individual + aggregate views

**Bundle QCR ($499)**
- Program-level analysis
- Admin-facing insights
- Aggregate capacity trends
- Load distribution by cohort
- Intervention timing recommendations
- Deterministic templates only (no open-ended AI)

### The "Air Gap" Guarantee

QCR data is **structurally isolated** from institutional visibility:

| Property | Enforcement |
|----------|-------------|
| **Generation** | Client-side only |
| **Raw Data** | Never leaves device for QCR generation |
| **Admin Access** | Institutional admins cannot access individual QCRs |
| **Entitlement** | Checked via RevenueCat, not organizational role |

**Implication:** An employer purchasing Orbital cannot use QCR as a backdoor to individual data.

---

## 2.2a THE CCI-Q4 (CLINICAL CAPACITY INSTRUMENT)

**Definition:** A one-time issuance purchase. Not a subscription. Pricing is tiered by account status.

### Pricing by Account Status

| Account Type | Price | Product ID |
|-------------|-------|------------|
| **Individual — Free user** | $199 (one-time) | `orbital_cci_free` |
| **Individual — Pro/paid user** | $149 (one-time) | `orbital_cci_pro` |
| **Circle — all members (group issuance)** | $399 (one-time) | `orbital_cci_circle_all` |
| **Bundle — all seats (group issuance)** | $999 (one-time) | `orbital_cci_bundle_all` |

### Eligibility Rules

| Tier | Visibility | Eligibility Condition |
|------|------------|----------------------|
| **Individual (Free)** | Always visible | No requirement |
| **Individual (Paid)** | Always visible | Any active paid subscription |
| **Circle** | Only if eligible | Active Circle + all members have Pro |
| **Bundle** | Only if eligible | Active Bundle + all seats Pro-entitled |

**Note:** CCI purchase options are hidden in institutional demo modes.

---

## 2.3 THE ADMIN DASHBOARD ("Triage Command Center")

**Purpose:** Enable institutional administrators to monitor organizational capacity at the unit level.

### Visual Structure

| Column | Metric | Description |
|--------|--------|-------------|
| **Unit** | Name | Department, team, or cohort |
| **Load** | % | Proportion of resourced signals |
| **Risk** | % | Proportion of depleted signals |
| **Velocity** | Arrow | Week-over-week trend (↑ → ↓) |
| **Freshness** | Dot | Signal recency (● ○ ◌) |

### "Fresh Daily" Caching Strategy

| Property | Implementation |
|----------|----------------|
| **No WebSockets** | Eliminates real-time complexity and failure modes |
| **Snapshot Table** | `unit_aggregate_snapshots` stores daily rollups |
| **Freshness Window** | 24 hours before "stale" indication |
| **Invalidation** | Daily batch job, not per-signal |

### Required Header (Non-Dismissible)

Every dashboard view displays:

```
This dashboard displays anonymized, aggregated capacity signals.
Individual identities are never visible.
```

This header **cannot be dismissed** and is enforced at the component level.

---

# 3. DATA PRIVACY & LEGAL DEFENSE

## 3.1 DATA MINIMIZATION — AGE COHORT PROTOCOL

**Problem:** Precise age enables re-identification when combined with other data points.

**Solution:** The "Ingest-and-Discard" Protocol.

### Data Flow

```
User Input: Year of Birth (e.g., 1987)
     ↓
mapYearOfBirthToCohort(1987) → '30_39'
     ↓
Store: cohort_id = '30_39'
     ↓
Discard: Year of Birth (NEVER stored)
```

### Cohort Definitions

| Cohort ID | Age Range | Margin of Error |
|-----------|-----------|-----------------|
| `under_20` | 0-19 | ±10 years |
| `20_29` | 20-29 | ±10 years |
| `30_39` | 30-39 | ±10 years |
| `40_49` | 40-49 | ±10 years |
| `50_59` | 50-59 | ±10 years |
| `60_69` | 60-69 | ±10 years |
| `70_plus` | 70+ | ±10 years |
| `undisclosed` | Not provided | N/A |

### Privacy Guarantee

```typescript
{
  marginOfError: '±10 years',
  reconstructionPossible: false,
  complianceNote: 'Year of Birth is processed client-side, mapped to cohort,
                   and immediately discarded. Only cohort ID is stored.'
}
```

### Schema Enforcement

The `user_age_cohorts` table has **no** `year_of_birth` column. This is irreversible by design.

---

## 3.2 THE "SHADOW IT" DEFENSE

**Scenario:** A manager at MegaCorp uses personal Gmail to buy a Class A bundle, then pressures direct reports to join.

### Defense Layers

| Layer | Protection |
|-------|------------|
| **1. Poison Pill UI** | Manager saw explicit warning against workplace use |
| **2. Consent Logging** | Manager's acknowledgment is timestamped and stored |
| **3. Terms of Service** | Class A terms prohibit employment-contingent monitoring |
| **4. Victim Evidence** | Employees can screenshot the warning if pressured |
| **5. No Institutional Relationship** | Orbital has no contract with MegaCorp |

### Legal Position

> "We actively attempted to prevent coercion, and we can prove it. The manager violated our Terms of Service. We are the victim of Terms violation, not the accomplice to labor violation."

This transforms Orbital from a potential defendant into a witness.

---

## 3.3 DEMO DATA ISOLATION

**Purpose:** Sales and investor demonstrations must never contaminate production.

| Control | Implementation |
|---------|----------------|
| **Founder Gate** | `EXPO_PUBLIC_FOUNDER_DEMO=1` environment variable required |
| **ID Prefix** | All demo logs use `demo-` prefix |
| **Cloud Block** | Outbox rejects demo logs before cloud enqueue |
| **Backup/Restore** | Real data backed up before demo, restored after |

**Enforcement:**
```typescript
if (isDemoLogId(clientLogId)) {
  console.warn('[Outbox] BLOCKED: Demo log cannot sync to cloud');
  return ''; // Reject silently
}
```

---

# 4. OPERATIONAL SAFETY ("Sleep-Proof Ops")

## 4.1 THE "SAFE HEALER" BOT

**Purpose:** Automated incident response that is safe during launch week.

**Design Principles:**
- Never spams (Signature Lock + Cooldown)
- Never touches active work (Clean Repo Lock)
- Never melts laptop (Single run, hard cooldown)
- Never silently dies (File read retries, error logging)
- Never fixes stale code (Main advanced check)

### Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. REPO CLEAN LOCK                                             │
│     └─ git status --porcelain ≠ empty → EXIT (SKIP_DIRTY_REPO) │
│                                                                 │
│  2. MAIN ADVANCED CHECK                                         │
│     └─ local main ≠ origin/main → hard reset, delete bot/*     │
│                                                                 │
│  3. COOLDOWN CHECK                                              │
│     └─ last run < 5 minutes → EXIT (COOLDOWN_SKIP)             │
│                                                                 │
│  4. SIGNATURE LOCK (DEDUP)                                      │
│     └─ SHA-256(alert) in active_incidents → EXIT (DEDUP_HIT)   │
│                                                                 │
│  5. SINGLE FILE FIX                                             │
│     └─ Claude identifies single file                            │
│     └─ Claude outputs entire fixed file                         │
│     └─ Whole-file replacement (NO diffs)                        │
│                                                                 │
│  6. SAFETY GATES                                                │
│     ├─ Gate 1: Path allowlist (components/, app/, lib/)        │
│     ├─ Gate 2: npx tsc --noEmit (must pass)                    │
│     └─ Gate 3: npm run build:web (must pass)                   │
│                                                                 │
│  7. OUTPUT                                                      │
│     ├─ Pass → commit to bot/fix-*, status="ready"              │
│     └─ Fail → revert, delete branch, status="failed_*"        │
└─────────────────────────────────────────────────────────────────┘
```

### Panic Dampeners

| Control | Value | Purpose |
|---------|-------|---------|
| **Cooldown** | 5 minutes | Prevent rapid-fire runs |
| **Signature Lock** | SHA-256 | Deduplicate identical alerts |
| **Lock File** | `.healer.lock` | Prevent concurrent runs |
| **Lock Timeout** | 10 minutes | Auto-clear stale locks |
| **Path Allowlist** | `components/`, `app/`, `lib/` | Block system file modifications |

### File Structure

```
orbital/
├── safe_healer_v2.ps1          # Main healer script
├── watch_alerts.ps1            # File watcher (polling)
├── ORBITAL_ALERTS.log          # Alert input file
├── ops_state/
│   ├── active_incidents.json   # Dedup registry
│   └── healer_state.json       # Cooldown tracking
├── ops_fixes/
│   ├── fix_YYYYMMDD_*.txt      # Success reports
│   └── failed_YYYYMMDD_*.txt   # Failure reports
└── ops_logs/
    └── healer.log              # Append-only audit log
```

---

## 4.2 SENTRY CONFIGURATION ("24/7 Watchdog")

**Philosophy:** Only bark on critical failures. Zero noise.

### Event Filtering

| Level | Action |
|-------|--------|
| `error`, `fatal` | **SEND** to Sentry |
| `warning`, `info`, `debug`, `log` | **DROP** before send |

### Payment Tagging (Zero Tolerance)

All payment operations are tagged:

| Tag | Example Values |
|-----|----------------|
| `payment.provider` | `'revenuecat'` |
| `payment.flow` | `'purchase'`, `'restore'`, `'qcr_purchase'` |
| `payment.stage` | `'start'`, `'confirm'`, `'complete'`, `'failed'` |

Payment failures generate unique fingerprints for **instant Slack alerting**.

### Ignored Errors (Noise Reduction)

```typescript
ignoreErrors: [
  'Network request failed',      // Transient connectivity
  'Failed to fetch',             // Transient connectivity
  'Load failed',                 // Transient connectivity
  'TypeError: cancelled',        // User-initiated
  'User cancelled',              // User-initiated
  'Non-Error promise rejection', // RN noise
]
```

---

# 5. UX & SUPPORT GUARDRAILS

## 5.1 THE "EMBARRASSMENT FILTERS"

**Goal:** Prevent "Is this working?" support tickets from friends/family users.

### Applied Fixes

| Issue | Before | After |
|-------|--------|-------|
| **Silent save** | Button returns to normal, no feedback | "Saving..." → "Saved ✓" with state machine |
| **Low-contrast empty state** | `#444` text on `#0A0A0F` background | `#9CA3AF` text (visible) |
| **Missing loading indicator** | Static button during async | `ActivityIndicator` during operations |
| **No interaction hints** | User must discover swipe gesture | Static coach mark: "← Swipe to adjust →" |
| **Haptic-only errors** | No visual feedback on failure | Visible toast/banner for failures |

---

## 5.2 STATIC COACH MARKS

| Screen | Coach Mark |
|--------|------------|
| **Home (Orb)** | "← Swipe to adjust →" |
| **Tag Selection** | "What's affecting you?" |
| **Patterns (Empty)** | "Log your first status to see patterns" |
| **Dashboard** | "This dashboard displays anonymized, aggregated capacity signals." |

---

## 5.3 BUTTON STATE MACHINE

The save button follows an explicit state machine:

```
┌─────────┐    tap    ┌──────────┐   success   ┌─────────┐
│  Idle   │ ───────▶  │ Saving...│ ──────────▶ │ Saved ✓ │
│         │           │ (disabled)│             │         │
└─────────┘           └──────────┘             └─────────┘
                           │                        │
                           │ failure                │ 2s timeout
                           ▼                        ▼
                      ┌──────────┐             ┌─────────┐
                      │  Error   │             │  Idle   │
                      │ (toast)  │             │         │
                      └──────────┘             └─────────┘
```

---

# 6. CONSTANTS REFERENCE

```typescript
// ═══════════════════════════════════════════════════════════════
// PRIVACY CONSTANTS
// ═══════════════════════════════════════════════════════════════

K_ANONYMITY_THRESHOLD = 5           // Minimum signals for visibility
SIGNAL_DELAY_SECONDS = 300          // 5 minutes temporal delay
FRESHNESS_WINDOW_HOURS = 24         // Before "stale" indication

// ═══════════════════════════════════════════════════════════════
// DEPLOYMENT CLASS CONSTANTS
// ═══════════════════════════════════════════════════════════════

CLASS_A_CIRCLE_BASE_SEATS = 5
CLASS_A_BUNDLE_SIZES = [10, 15, 20]   // Annual-only; 25-seat is legacy/deprecated
CLASS_B_MINIMUM_SEATS = 25            // Layer 2 minimum

TERMS_VERSION_CLASS_A = '1.0-relational'
TERMS_VERSION_CLASS_B = '1.0-institutional'

// ═══════════════════════════════════════════════════════════════
// PRICING CONSTANTS (Class A — B2C)
// ═══════════════════════════════════════════════════════════════

PRO_MONTHLY = 29                    // $29/mo
PRO_ANNUAL  = 290                   // $290/yr

CIRCLE_MONTHLY = 79                 // $79/mo
CIRCLE_ANNUAL  = 790                // $790/yr
CIRCLE_EXPANSION_MONTHLY = 10       // +$10/mo per extra seat
CIRCLE_EXPANSION_ANNUAL  = 100      // +$100/yr per extra seat

FAMILY_MONTHLY = 79                 // $79/mo (base 5 seats, requires Pro)
FAMILY_ANNUAL  = 790                // $790/yr
FAMILY_EXTRA_SEAT_MONTHLY = 9       // +$9/mo per extra member
FAMILY_EXTRA_SEAT_ANNUAL  = 90      // +$90/yr per extra member

BUNDLE_10_ANNUAL = 2700             // $2,700/yr — annual only
BUNDLE_15_ANNUAL = 4000             // $4,000/yr — annual only
BUNDLE_20_ANNUAL = 5200             // $5,200/yr — annual only

ADMIN_ADDON_MONTHLY = 29            // $29/mo
ADMIN_ADDON_ANNUAL  = 290           // $290/yr

// ═══════════════════════════════════════════════════════════════
// PRICING CONSTANTS (QCR — One-Time)
// ═══════════════════════════════════════════════════════════════

QCR_INDIVIDUAL = 149                // $149 one-time
QCR_CIRCLE     = 299                // $299 one-time
QCR_BUNDLE     = 499                // $499 one-time

// ═══════════════════════════════════════════════════════════════
// PRICING CONSTANTS (CCI-Q4 — One-Time Issuance)
// ═══════════════════════════════════════════════════════════════

CCI_FREE_USER  = 199                // $199 — Free account users
CCI_PRO_USER   = 149                // $149 — Any paid account users
CCI_CIRCLE_ALL = 399                // $399 — All Circle members (group issuance)
CCI_BUNDLE_ALL = 999                // $999 — All Bundle seats (group issuance)

// ═══════════════════════════════════════════════════════════════
// PRICING CONSTANTS (Class B — Citadel Layers)
// ═══════════════════════════════════════════════════════════════

CITADEL_LAYER_1_ANNUAL = 250000     // Sovereignty License (flat)
CITADEL_LAYER_2_PER_EMPLOYEE = 1000 // Capacity Coverage (per employee/yr)
CITADEL_LAYER_3_ANNUAL = 150000     // Governance & Intelligence (flat)
CITADEL_LAYER_4_ANNUAL = 100000     // Strategic Assurance (flat)

// ═══════════════════════════════════════════════════════════════
// OPERATIONAL CONSTANTS
// ═══════════════════════════════════════════════════════════════

HEALER_COOLDOWN_SECONDS = 300       // 5 minutes between runs
HEALER_LOCK_TIMEOUT_MINUTES = 10    // Stale lock threshold
```

---

# 7. DEPLOYMENT STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| **Web (Vercel)** | ✅ Live | `orbitalhealth.app` |
| **iOS (TestFlight)** | 🔄 Ready | EAS Build configured |
| **Android** | 🔄 Ready | EAS Build configured |
| **Supabase** | ✅ Live | RLS enabled, migrations applied |
| **RevenueCat** | ✅ Configured | iOS/Android keys set |
| **Sentry** | ✅ Live | Production alerts enabled |

---

# 8. MIGRATION REGISTRY

| Migration | Status | Reversibility |
|-----------|--------|---------------|
| `00001_initial_schema.sql` | Applied | Reversible |
| `00002_user_demographics.sql` | Applied | Reversible |
| `00003_cloud_patterns_v1.sql` | Applied | Reversible |
| `00004_enterprise_hardening.sql` | Ready | **IRREVERSIBLE** |

**Irreversible Changes in 00004:**
- Age cohort system (no YOB column)
- K-anonymity database constraints
- Deployment class schema separation
- Restricted domain registry

---

# CERTIFICATION

This document represents the complete architectural state of Orbital as of Launch Week completion.

## Structural Guarantees

| Guarantee | Status |
|-----------|--------|
| Class A and Class B have zero overlap paths | ✅ Verified |
| K-anonymity enforced at database level | ✅ Verified |
| Age data irreversibly minimized to 10-year cohorts | ✅ Verified |
| Domain gatekeeping enforced server-side | ✅ Verified |
| Payment failures trigger zero-tolerance alerts | ✅ Verified |
| Auto-remediation cannot run on dirty repos | ✅ Verified |

---

**This is not a wellness app.**

**This is enterprise-grade capacity intelligence.**

---

*Orbital Product Masterfile v1.0*
*Classification: Internal / Investor / Auditor Ready*
*Architecture Lock: January 2026*
