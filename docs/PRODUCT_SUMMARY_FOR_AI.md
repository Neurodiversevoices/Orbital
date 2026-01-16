# ORBITAL - Product Summary

*A capacity signal infrastructure for the long game*

---

## WHAT IS ORBITAL?

Orbital is a mobile app that lets people track their **capacity** - a simple, self-reported measure of how resourced or depleted they feel at any moment. Think of it as a "check engine light" for humans.

**Three states. That's it:**
- 🔵 **Resourced** - Full tank, ready to engage
- 🟡 **Stretched** - Managing, but running low
- 🔴 **Depleted** - Need recovery

Users log signals when they want (not required, not gamified). Over time, patterns emerge. After months and years, a longitudinal record becomes valuable for understanding personal capacity rhythms.

---

## WHO IS IT FOR?

### Individual Users (B2C)
- People who want to understand their energy patterns
- Those managing demanding careers, caregiving, health conditions
- Anyone curious about their capacity over time

### Institutions (B2B - Demo Phase)
Schools, employers, healthcare systems, and universities can use Orbital to understand **aggregate** capacity across populations - never individual surveillance.

---

## WHAT MAKES ORBITAL DIFFERENT?

### 1. Signal, Not Symptom
Orbital tracks capacity, not health conditions. It's deliberately **non-clinical, non-diagnostic, non-therapeutic**. Users report how they feel, not what's wrong.

### 2. Time Is The Product
The real value is the **longitudinal record**. A week of data is noise. A year starts showing patterns. Five years is strategic. Ten years is infrastructure. Competitors can't replicate time.

### 3. Privacy By Architecture
- All data stays on device by default
- Cloud sync is opt-in
- Institutions only see aggregates (never individuals)
- K-anonymity enforced (minimum 5 people per cohort)

### 4. Anti-Engagement Design
Orbital is intentionally **boring**:
- No streaks, badges, or gamification
- No push notifications badgering you to log
- No daily insights or "you should" recommendations
- No social feed or comparisons

### 5. Medical-Grade Governance
Over 250 features are explicitly **prohibited forever** (see Appendix). The product is frozen against scope creep.

---

## CORE FEATURES

### For Individuals

| Feature | Description |
|---------|-------------|
| **Signal Logging** | Tap to log resourced/stretched/depleted + optional drivers (sensory, demand, social) |
| **Pattern Discovery** | After 7+ signals, see your capacity trends over time |
| **Milestones** | 7-day, 30-day, 90-day record depth achievements (no gamification) |
| **Circles** | Share live capacity with trusted contacts (ephemeral "live dots") |
| **CCI Artifact** | Quarterly Clinical Capacity Instrument export (formal artifact) |
| **Data Export** | Full export of your data anytime |

### For Institutions (Demo Only)

| Feature | Description |
|---------|-------------|
| **Sentinel Brief** | Aggregate volatility early warning (K-anonymity enforced) |
| **Capacity Brief** | Population-level capacity trends |
| **Aggregate Dashboard** | Cohort-level views only - never individual data |

---

## THE CIRCLES FEATURE

Circles is Orbital's social layer - but it's radically constrained.

**What it is:**
Show your current capacity color to up to 25 trusted people. They see a colored dot (resourced/stretched/depleted). That's it.

**The Six Laws of Circles:**
1. **NO AGGREGATION** - Max 25 connections, no analytics
2. **NO HISTORY** - Signals expire in 1 hour
3. **BIDIRECTIONAL CONSENT** - Both people must accept
4. **SOCIAL FIREWALL** - Circles data is isolated from everything else
5. **NO HIERARCHY** - No admins, no managers, peer-to-peer only
6. **SYMMETRICAL VISIBILITY** - If you see them, they see you

---

## SUBSCRIPTION MODEL

| Tier | What You Get |
|------|--------------|
| **Free** | Basic logging, 7-day history, local storage |
| **Pro** | Full history, patterns, export, cloud backup |
| **Family** | Pro + family member seats |
| **Circles** | Live dots with trusted contacts (max 5 per circle) |
| **Bundle** | 10/15/20 Pro seats for organizations |
| **CCI** | Quarterly formal capacity artifact ($149-$199) |

---

## WHAT ORBITAL WILL NEVER DO

These aren't features we haven't built yet. They're **permanently prohibited**:

### Never: Surveillance
- ❌ Location tracking
- ❌ Activity monitoring
- ❌ Passive data collection
- ❌ Manager dashboards
- ❌ Individual-level institutional views

### Never: Gamification
- ❌ Streaks or badges
- ❌ Leaderboards
- ❌ Points or achievements
- ❌ Push notification campaigns
- ❌ Social feeds or likes

### Never: Medical/Therapeutic
- ❌ Diagnoses or screening
- ❌ "You should..." recommendations
- ❌ Crisis intervention
- ❌ Symptom tracking
- ❌ Medication reminders

### Never: Data Exploitation
- ❌ Selling user data
- ❌ Advertising
- ❌ Data broker partnerships
- ❌ Building profiles for sale
- ❌ Insurance underwriting data

---

## CAPACITY DOCTRINE

**Definition:** Capacity is the self-reported, momentary assessment of an individual's available functional resources at a given point in time.

**Capacity is:**
- Non-clinical (not a health measure)
- Non-psychological (not emotions or mood)
- Non-diagnostic (can't identify conditions)
- Self-reported (you're the authority)
- Momentary (point-in-time, not a state)

**Capacity is NOT:**
- Mood
- Stress level
- Mental health status
- Wellness score
- Productivity metric
- Performance indicator

---

## THE LONG GAME

Orbital is designed for a **10-year horizon**. The strategy:

1. **Year 1-2**: Build the foundation, prove the signal
2. **Year 3-5**: Longitudinal patterns become meaningful
3. **Year 5-10**: Population-level reference data emerges
4. **Year 10+**: Generational capacity patterns

**Why this works:**
- Time cannot be compressed or replicated
- A competitor in Year 5 can't acquire Year 1-4 data
- Patient compound growth beats rapid extraction

---

## DATA TRUST POSITION

### Absolute Prohibitions
| Code | Promise |
|------|---------|
| P-001 | NEVER sell individual user data |
| P-002 | NEVER sell aggregate data as standalone product |
| P-003 | NEVER license data for advertising |
| P-010 | NEVER provide individual monitoring to employers |
| P-011 | NEVER alert managers about specific employees |
| P-020 | NEVER provide clinical diagnoses |
| P-030 | NEVER generate individual "risk scores" |

### Governance-Controlled (Only With Consent)
- User-initiated sharing with individuals
- Aggregate institutional dashboards (min 10 users)
- Research participation (IRB approved, anonymized)
- Data export (anytime, full access)

---

## APP MODES

| Mode | Type | Description |
|------|------|-------------|
| **Personal** | Live | Individual use |
| **Caregiver** | Live | Supporting someone else |
| **Employer** | Demo | Workplace wellness (aggregate only) |
| **School District** | Demo | K-12 education (aggregate only) |
| **University** | Demo | Higher ed (aggregate only) |
| **Healthcare** | Demo | Clinical settings (aggregate only) |

*Institutional modes are demo-only in Phase 1*

---

## TECHNICAL FOUNDATION

- **Platform**: iOS, Android, Web (React Native/Expo)
- **Backend**: Supabase (PostgreSQL)
- **Auth**: Email, magic link, Apple Sign-In, MFA, biometrics
- **Privacy**: Offline-first, opt-in cloud, local-only identity
- **Security**: 15-min idle timeout, device registry, audit logging

---

## ARTIFACTS

### Clinical Capacity Instrument (CCI-Q4)
A formal quarterly artifact documenting capacity patterns. Not a diagnosis - a longitudinal record that can be shared with clinicians, therapists, or anyone the user chooses.

### Quarterly Capacity Report (QCR)
Summary document with charts and analysis of the observation period.

---

## ANTI-SCOPE-CREEP PROTOCOL

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

## THE ORBITAL PHILOSOPHY

> "Boring is a feature, not a bug."

Orbital optimizes for:
- **Long-term data integrity** over short-term engagement
- **Compound value** over immediate monetization
- **Infrastructure status** over feature parity
- **Patient capital** over rapid growth
- **Privacy** over completeness
- **Silence** over notifications

---

## FOUNDER OPERATING RHYTHM

The founder operates Orbital on minimal cognitive load:

| Cadence | Time | Work |
|---------|------|------|
| Daily | <15 min | System health check only |
| Weekly | <2 hrs | Prioritize max 3 items |
| Monthly | <4 hrs | Financial, feedback review |
| Quarterly | <8 hrs | Roadmap, governance review |

**Forbidden metrics**: Daily active users, session duration, feature usage frequency, streaks

---

## SUMMARY

**Orbital is:**
- A capacity signal logger
- A longitudinal record builder
- A privacy-first infrastructure
- A 10-year patient play

**Orbital is NOT:**
- A wellness app
- A productivity tool
- A mental health platform
- A social network
- A gamified experience

---

*This document represents Orbital's product philosophy and is designed to be shared with AI assistants, partners, investors, and anyone who needs to understand what Orbital is - and what it will never become.*

---

**Version**: 1.0.0
**Last Updated**: January 2026
**Classification**: External - Shareable
