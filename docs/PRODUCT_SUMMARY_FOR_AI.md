# ORBITAL - Product Summary for AI Review

*A capacity signal infrastructure for the long game*

**Version**: 2.0.0
**Last Updated**: February 2026
**Classification**: External - Shareable
**Build**: 44 (iOS TestFlight)

---

## 1. WHAT IS ORBITAL?

Orbital is a mobile app that lets people track their **capacity** - a simple, self-reported measure of how resourced or depleted they feel at any moment. Think of it as a "check engine light" for humans.

**Three states. That's it:**
- Resourced (cyan) - Full tank, ready to engage
- Stretched (amber) - Managing, but running low
- Depleted (red) - Need recovery

Users log signals when they want (not required, not gamified). Over time, patterns emerge. After months and years, a longitudinal record becomes valuable for understanding personal capacity rhythms.

**Orbital is:**
- A capacity signal logger
- A longitudinal record builder
- A privacy-first infrastructure
- A 10-year patient-capital play

**Orbital is NOT:**
- A wellness app
- A mental health platform
- A productivity tool
- A social network
- A gamified experience
- A diagnostic or therapeutic tool

---

## 2. WHO IS IT FOR?

### Individual Users (B2C)
- People who want to understand their energy patterns
- Those managing demanding careers, caregiving, health conditions
- Neurodivergent users seeking self-awareness without clinical framing
- Clinicians/therapists wanting to track patient trends (read-only)

### Institutions (B2B - Demo Phase)
Schools, employers, healthcare systems, and universities can use Orbital to understand **aggregate** capacity across populations - never individual surveillance.

---

## 3. CORE FEATURES

### For Individuals

| Feature | Description |
|---------|-------------|
| **Signal Logging** | Swipe glass orb: Resourced (cyan) -> Stretched (amber) -> Depleted (red) |
| **Category Tags** | Optional context: Sensory, Demand, Social |
| **Notes/Details** | Free-text observations (stored locally) |
| **Pattern Discovery** | Trends unlock at 7, 14, 30, 90, 365 signals |
| **Circles** | Pairwise "live dots" with up to 25 trusted contacts (current state only, 90-min expiry) |
| **CCI Artifact** | Clinical Capacity Instrument - quarterly PDF export |
| **QCR** | Quarterly Capacity Report with charts and clinical-grade observations |
| **Data Export** | Full JSON/CSV export anytime, user-initiated |
| **Milestones** | 7-day, 30-day, 90-day record depth achievements (no gamification) |

### For Institutions (Demo Only in Phase 1)

| Feature | Description |
|---------|-------------|
| **Sentinel Brief** | Early warning for aggregate volatility (K-anonymity enforced) |
| **Capacity Brief** | Population-level trends (cohort-only, no individual data) |
| **Triage Dashboard** | Unit-level metrics: Load %, Risk %, Velocity, Freshness |

---

## 4. THE GLASS ORB (Core Interaction)

The primary UI is a 240px animated SVG orb with a pan gesture:
- Drag up = Resourced (cyan glow)
- Middle = Stretched (amber glow)
- Drag down = Depleted (red glow)
- Breathing animation (3-second cycle)
- Save confirmation pulse on submit
- Optional category selector and note composer appear after positioning

---

## 5. THE CIRCLES FEATURE

Circles is Orbital's social layer - radically constrained by design.

**What it is:** Show your current capacity color to up to 25 trusted people. They see a colored dot (resourced/stretched/depleted). That's it.

**What transmits:** Color only (cyan/amber/red/unknown) + TTL expiration.

**What does NOT transmit:** Reasons, tags, scores, text, timestamps, history, location, device info.

**The Six Laws of Circles (Frozen in Code):**
1. **NO AGGREGATION** - Max 25 connections, no analytics
2. **NO HISTORY** - Signals expire in 90 minutes
3. **BIDIRECTIONAL CONSENT** - Both people must accept, either can revoke
4. **NO HIERARCHY** - No admins, no managers, peer-to-peer only
5. **SOCIAL FIREWALL** - Circles data is isolated from all other data
6. **NEVER INSTITUTION-OWNED** - Belongs to individuals; organizations cannot require Circles

**Invite Flow:** QR code or display code + PIN -> single-use -> creator confirms -> active. Either party can revoke instantly.

---

## 6. SUBSCRIPTION MODEL

### Pricing Tiers

| Tier | Monthly | Annual |
|------|---------|--------|
| Individual | $19 | $179 |
| Individual Pro | $49 | $449 |
| Family (per seat) | $9 | $79 |
| Family Pro (per seat) | $29 | $259 |
| Sponsor Seat Core | - | $200 |
| Sponsor Seat Pro | - | $349 |
| Circle Pack (10) | - | $3,500 |
| Sponsor Pack (25) | - | $9,000 |
| Cohort Pack (50) | - | $18,000 |

### Premium Artifacts
- CCI Export: $149-199/quarter
- QCR Export: $149-199/quarter

### Free Tier
- 30 signals/month
- Local storage only
- No cloud sync
- No advanced patterns
- No CCI/QCR export

---

## 7. CAPACITY DOCTRINE (Frozen)

**Definition:** Capacity is the self-reported availability of personal resources to meet anticipated demands at a given moment.

**Capacity IS:**
- Subjective (user-reported)
- Momentary (point-in-time)
- Relative (longitudinal only)
- Non-specific (not tied to a domain)
- Non-causal (explains nothing)

**Capacity is NOT:**
- Mood, emotion, or stress
- Symptom, diagnosis, or clinical measure
- Energy, productivity, or wellness
- Health indicator or performance metric

**Prohibited Language (enforced via ESLint at CI/CD):**
Cannot use: "wellness," "mental health," "mood," "stress," "anxiety," "depression," "diagnosis," "therapy," "symptoms," "check-in," "streak," "reminder," "notification"

---

## 8. INSTITUTIONAL ARCHITECTURE ("The Hard Split")

### Class A - Relational (Self-Serve)
- Named individuals with explicit consent
- Bundles: 5 / 10 / 20 / 50 seats
- Full individual-level access: notes, timelines, signals
- Terms: `1.0-relational`

### Class B - Institutional (Contract-Only)
- Minimum 25 seats, annual contract
- Aggregate and anonymized views ONLY
- No individual fields: no notes, names, emails, employee IDs
- K-anonymity enforcement (minimum 5 signals per cohort)
- 5-minute signal delay (temporal privacy)
- Terms: `1.0-institutional`

### Domain Gatekeeping
Enterprise email domains (microsoft.com, google.com, etc.) are blocked from purchasing personal bundles to prevent institutional misuse.

---

## 9. DATA TRUST POSITION

### Absolute Prohibitions (Never, Without Exception)

| Code | Promise |
|------|---------|
| P-001 | NEVER sell individual user data to any third party |
| P-002 | NEVER sell aggregate data as standalone product |
| P-003 | NEVER license user data for advertising |
| P-004 | NEVER share data with data brokers |
| P-010 | NEVER provide individual-level monitoring to employers |
| P-011 | NEVER alert managers about specific employee states |
| P-012 | NEVER enable real-time behavior surveillance |
| P-013 | NEVER track location, device usage, or biometric data |
| P-020 | NEVER provide clinical diagnoses |
| P-021 | NEVER screen for medical/psychological conditions |
| P-022 | NEVER claim therapeutic or treatment value |
| P-030 | NEVER generate "risk scores" for individuals |
| P-031 | NEVER predict future behavior or performance |
| P-034 | NEVER contribute to insurance underwriting for individuals |

### Governance-Controlled (Only With Explicit Consent)
- User-initiated sharing with individuals (scoped, expiring, revocable)
- Clinician sharing (HIPAA-aware recipient, audit logged)
- Aggregate institutional dashboards (minimum 10 users per cohort)
- Research participation (IRB approved, anonymized)
- Data export (anytime, full access)

### Deletion Rights
- Individual signals: in-app, immediate
- Date ranges: in-app, immediate
- All data: account deletion, 30-day processing
- Deletion certificate issued with verification hash
- Pattern history is soft-deleted (de-identified, not erased) to preserve longitudinal integrity

### Acquisition Protection
- Data stays with users (no bulk transfer without explicit consent)
- Governance survives post-acquisition
- 90-day advance notice of any change
- Opt-out right: export and delete before transfer

---

## 10. WHAT ORBITAL WILL NEVER DO

These are **permanently prohibited** (250+ features, append-only list):

### Surveillance
- Location tracking, activity monitoring, passive data collection
- Manager dashboards, individual-level institutional views

### Gamification
- Streaks, badges, leaderboards, points
- Push notification campaigns, social feeds, likes

### Medical/Therapeutic
- Diagnoses, screening, "you should..." recommendations
- Crisis intervention, symptom tracking, medication reminders

### Data Exploitation
- Selling user data, advertising, data broker partnerships
- Building profiles for sale, insurance underwriting data

---

## 11. CLINICAL CLAIM (Governance-Level, Not User-Facing)

**The single falsifiable claim Orbital validates:**

> "Sustained capacity volatility predicts near-term functional failure independent of diagnosis, self-report, or biometrics."

### Key Definitions

| Term | Operational Definition | Threshold |
|------|----------------------|-----------|
| Sustained | >=14 consecutive days, >=10/14 with signals, no gap >3 days | 14 days minimum |
| Capacity Volatility | Std dev of normalized capacity scores (0-100) | 0-15: Stable, 16-30: Moderate, 31-40: Elevated, 41+: High |
| Near-Term Functional Failure | Observable inability to maintain role performance within 30 days | 30-day window |
| Independent | No DSM/ICD codes, no biometrics, no passive sensing - user-initiated taps only | Behavioral signal only |

### Validation Roadmap
1. **Phase 1 (Current):** Correlation establishment in observational data - internal only
2. **Phase 2:** Prospective validation with defined cohort, 30/60/90-day outcome tracking
3. **Phase 3:** External replication by independent academic partner
4. **Phase 4:** Actuarial integration with insurer for risk model incorporation

### Reference Implementation
**Selected Cohort:** K-12 Special Education Staff
- High volatility baseline, measurable failure mode (unplanned absence, FMLA, mid-year resignation)
- 50-150 participants, single district, 6-12 month timeline
- Artifacts: Capacity Volatility Report (CVR), Staff Capacity Language Guide, UCD Risk Stratification, Replication Toolkit

---

## 12. QUARTERLY ARTIFACTS

### QSB (Quarterly Strategic Brief)
| Component | Description |
|-----------|-------------|
| Capacity Index | Overall capacity distribution over 90 days |
| Recovery Elasticity | Bounce-back speed from depleted states |
| Load Friction | Frequency/intensity of stretched signals |
| Intervention Sensitivity | Correlation between interventions and capacity shifts |
| Early Drift | Deviation from user's baseline |

### QCR (Quarterly Capacity Report)
Premium PDF artifact ($149-199/quarter) synthesizing 90 days into clinical-grade report:
- Why Analysis (pattern identification)
- Resilience Metrics (recovery velocity, baseline stability, crisis frequency)
- Trend Visualization (90-day trajectory with confidence intervals)
- Clinical Notes (auto-generated observations suitable for provider sharing)
- Air-gap guarantee: generated client-side only, raw data never leaves device

### CCI (Clinical Capacity Instrument)
Formal quarterly artifact documenting capacity patterns. Not a diagnosis - a longitudinal record shareable with clinicians, therapists, or anyone the user chooses.

---

## 13. APP MODES

| Mode | Type | Description |
|------|------|-------------|
| Personal | Live | Individual capacity tracking |
| Caregiver | Live | Supporting someone else |
| Employer | Demo | Aggregate workplace capacity |
| School District | Demo | K-12 aggregate capacity |
| University | Demo | Higher ed aggregate trends |
| Healthcare | Demo | Clinical aggregate capacity |

Institutional modes are demo-only in Phase 1.

---

## 14. TECHNICAL ARCHITECTURE

### Stack
| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81.5 + Expo SDK 54 |
| Language | TypeScript 5.9.2, React 19.1.0 |
| Navigation | Expo Router 6.0.21 (file-based) |
| JS Engine | Hermes (production) |
| Architecture | New Architecture enabled |
| Local Storage | AsyncStorage (offline-first, device-only default) |
| Cloud Backend | Supabase (PostgreSQL, RLS enforced, opt-in) |
| Auth | Email, magic link, Apple Sign-In, anonymous, MFA, biometrics |
| Payments | RevenueCat (iOS/Android in-app purchase) |
| Monitoring | Sentry (error/fatal only, 5% trace sample) |
| Animations | Reanimated 4.1.1 + Gesture Handler 2.28.0 |
| Charts | Vega / Vega-Lite |
| Icons | Lucide React Native |

### Codebase Structure
```
app/           28 screens (home, patterns, brief, settings, dashboard, CCI, circles...)
lib/           74 modules (hooks, storage, circles, enterprise, research, dataroom, qcr...)
components/    26 reusable UI components
types/         2,410 lines of TypeScript definitions
governance/    22 frozen governance documents
modules/       Native modules (iOS widget)
```

### Data Model
```
Primary keys:
  @orbital:logs              - Active capacity logs
  @orbital:patterns          - Pattern data
  @orbital:circles:*         - Pairwise signals (isolated namespace)
  @orbital:vault             - Archived capacity logs
  @orbital:shares            - Share tokens
  @orbital:audit             - Audit trail
  @orbital:preferences       - User preferences

Core type:
  CapacityState = 'resourced' | 'stretched' | 'depleted'
  Category = 'sensory' | 'demand' | 'social'
  CapacityLog { id, state, timestamp, tags, category?, note?, localDate? }
```

### Cloud Sync (Opt-In)
- Supabase PostgreSQL with Row-Level Security (all policies use `auth.uid() = user_id`)
- No service_role bypass exists
- Offline-first: outbox pattern, 60-second sync interval, server-wins conflict resolution
- Sync on reconnect via NetInfo listener

### Authentication
- Email/password (min 12 chars, uppercase, lowercase, number, special)
- Magic link (passwordless)
- Apple Sign-In (iOS)
- Anonymous auth
- MFA support (TOTP)
- Biometric unlock
- 15-minute idle timeout
- Device registry

---

## 15. BUILD AND DEPLOYMENT

| Item | Value |
|------|-------|
| Bundle ID | `com.erparris.orbital` |
| Apple Team ID | `2KM3QL4UMV` |
| EAS Project ID | `60d17137-74cc-4a95-a1d5-bd0692cf1e2a` |
| Current Build | 44 (iOS) |
| iOS Status | TestFlight ready |
| Android Status | EAS configured |
| Web Status | Live at orbitalhealth.app |
| Sentry | Production alerts enabled |
| RevenueCat | Configured for iOS/Android |

### Build Commands
```
npm start               # Dev server
npm run build:ios        # EAS Build iOS
npm run build:android    # EAS Build Android
npm run submit:ios       # Submit to TestFlight
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm run format           # Prettier
```

---

## 16. DESIGN SYSTEM

### Visual Language
- Dark mode only (background: `#05060A`)
- No light mode
- Canonical colors: Resourced `#00D7FF` (cyan), Stretched `#F5B700` (amber), Depleted `#FF3B30` (red)
- Glass card aesthetic: `rgba(255,255,255,0.03)` frost effect
- Runtime assertion (`assertStateColor()`) catches color mapping bugs

### Accessibility
- Colorblind modes: Protanopia, Deuteranopia, Tritanopia, Monochrome
- Text scaling: 1x, 1.25x, 1.5x
- Button scaling: 1x, 1.3x, 1.6x
- Haptics: Configurable (off/light/medium/strong)
- High contrast mode
- Simple mode (hides advanced features)

### Internationalization (8 Languages)
English, Spanish, German, French, Italian, Japanese, Portuguese (BR)

---

## 17. ENGINEERING ENFORCEMENT

### Code-Level Controls
- **ESLint plugin** (`eslint-plugin-orbital-language`): Rejects prohibited clinical/wellness terms at build time
- **CI/CD gate**: Build fails if prohibited terms detected
- **RLS policies**: All Supabase queries filtered by `auth.uid() = user_id`
- **K-anonymity**: Aggregate queries return NULL if cohort < threshold
- **Audit chain**: Append-only, hash-linked, 7-year retention
- **Demo isolation**: Separate storage namespace (`@orbital:demo:*`)

### Sentry Configuration
- Production only (disabled in `__DEV__`)
- Drops warning/info/debug levels; keeps error/fatal only
- Payment failure zero-tolerance alerting
- 5% trace sample rate
- Startup breadcrumbs for cold-launch tracing

---

## 18. LONGITUDINAL PHASES

| Phase | Signals | Features Unlocked | Restrictions |
|-------|---------|-------------------|-------------|
| 0: Capture | 1-6 | Raw signal storage only | No trends, no insights |
| 1: Baseline | 7-29 | 7-day graph, basic stats | No week-over-week comparison |
| 2: Pattern | 30-89 | 30-day graph, trends, correlations | No predictions, no "you should" |
| 3: Longitudinal | 90+ | Full graph suite, quarterly summaries, artifacts | Full historical analysis |

---

## 19. THE LONG GAME

Orbital is designed for a **10-year horizon**:

1. **Year 1-2**: Build the foundation, prove the signal
2. **Year 3-5**: Longitudinal patterns become meaningful
3. **Year 5-10**: Population-level reference data emerges
4. **Year 10+**: Generational capacity patterns

**Why this works:**
- Time cannot be compressed or replicated
- A competitor in Year 5 can't acquire Year 1-4 data
- Patient compound growth beats rapid extraction

### Natural Lock-In (Not Artificial)
Three triggers create perceived switching cost:
1. **Longitudinal Memory** (>=30 signals, >=14 unique days): Pattern baselines can't be recreated
2. **Circle Relationships** (>=1 active connection): Shared language and implicit availability contract
3. **Interpretive Reference** (>=3 logs/week for >=4 weeks): Orb becomes self-reference framework

Users can export and delete at any time. Lock-in is through accumulated meaning, not restriction.

---

## 20. ANTI-SCOPE-CREEP PROTOCOL

Before ANY feature is approved:

| Gate | Question | Must Answer |
|------|----------|-------------|
| G1 | Does this require daily user attention? | **No** |
| G2 | Does this create engagement pressure? | **No** |
| G3 | Does this interpret individual signals? | **No** |
| G4 | Does this use prohibited language? | **No** |
| G5 | Does this add cognitive load? | **No** |
| G6 | Would removal break longitudinal value? | **Yes** |

---

## 21. FOUNDER OPERATING RHYTHM

| Cadence | Time | Work |
|---------|------|------|
| Daily | <15 min | System health check only |
| Weekly | <2 hrs | Prioritize max 3 items |
| Monthly | <4 hrs | Financial, feedback review |
| Quarterly | <8 hrs | Roadmap, governance review |

**Forbidden metrics**: Daily active users, session duration, feature usage frequency, streaks

---

## 22. GOVERNANCE DOCUMENTS (Frozen)

| Document | Status | Scope |
|----------|--------|-------|
| ORBITAL_CANON.md | Frozen | Capacity definition, language enforcement charter |
| PROHIBITED_FEATURES.md | Append-only | 250+ permanently banned features |
| CIRCLES_DOCTRINE.md | Frozen | 6 immutable laws for social layer |
| SILENT_ONBOARDING.md | Frozen | No tutorials, no tooltips, no instructions |
| IRREVERSIBILITY_SPEC.md | Frozen | 3 natural lock-in triggers |
| LONGITUDINAL_PHASES.md | Locked | Phase-gated feature access |
| DATA_TRUST_POSITION.md | Binding | 34+ absolute prohibitions |
| INSURER_CLAIM.md | Frozen | Falsifiable claim, validation roadmap |
| ENGINEERING_ENFORCEMENT_PLAN.md | Active | Code-level technical controls |
| REFERENCE_IMPLEMENTATION.md | Active | K-12 special ed cohort plan |

Amendment requires board + legal review. Fundamental changes require user vote.

---

## 23. REGULATORY POSITIONING

- **NOT a medical device** - Makes no medical claims, no diagnostic claims, no treatment recommendations
- **Non-clinical by design** - "Capacity" is deliberately non-psychological, non-diagnostic
- **GDPR/CCPA compliant** - Privacy by architecture, not by policy
- **Not HIPAA-covered** - But operates at HIPAA-grade controls; BAA available for institutional deployments
- **Pre-regulation positioning** - Operating in the forming regulatory window before hardening occurs

---

## 24. POTENTIAL AREAS FOR REVIEW

1. **Demo-Only Institutional Features**: B2B is not yet live; features are demo/placeholder
2. **Supabase Dependency**: Cloud sync relies on external service; migration risk exists
3. **RevenueCat Dependency**: Payment processing with no internal fallback
4. **Single Founder**: All architecture decisions; bus factor risk
5. **Testing Coverage**: Playwright configured but test suite is sparse
6. **Circles Isolation**: Cannot join Circle signals with capacity logs (intentional, but limits cross-feature insights)
7. **Regulatory Ambiguity**: "Capacity" is non-clinical by design, but regulatory clarity may be needed at scale

---

## 25. THE ORBITAL PHILOSOPHY

> "Boring is a feature, not a bug."

Orbital optimizes for:
- **Long-term data integrity** over short-term engagement
- **Compound value** over immediate monetization
- **Infrastructure status** over feature parity
- **Patient capital** over rapid growth
- **Privacy** over completeness
- **Silence** over notifications

---

*This document represents Orbital's complete product philosophy, technical architecture, governance framework, and market positioning. It is designed to be shared with AI assistants, partners, investors, reviewers, and anyone who needs to understand what Orbital is - and what it will never become.*
