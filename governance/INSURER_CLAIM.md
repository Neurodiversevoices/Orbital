# INSURER-READY CLAIM SPECIFICATION

**Status**: FROZEN
**Effective**: Permanent
**Classification**: Infrastructure Law

---

## I. THE CLAIM

> **"Sustained capacity volatility predicts near-term functional failure independent of diagnosis, self-report, or biometrics."**

This is the single falsifiable claim Orbital is built to validate.

---

## II. TERM DEFINITIONS

### "Sustained"

**Operational Definition**: ≥14 consecutive days with signal data

**Why 14 days**:
- Long enough to distinguish pattern from noise
- Short enough to be actionable
- Aligns with clinical observation windows
- Matches disability accommodation review periods

**What qualifies**:
- User logged ≥1 signal on ≥10 of 14 days
- No gap longer than 3 consecutive days
- Data spans full 14-day window

**What does NOT qualify**:
- Sporadic logging (e.g., 5 signals over 14 days)
- Gaps >3 days (pattern interrupted)
- Incomplete windows (e.g., only 10 days of data)

### "Capacity Volatility"

**Operational Definition**: Standard deviation of normalized capacity scores within the sustained window

**Calculation**:
```typescript
// Normalize capacity states to numeric scale
const normalizedCapacity = {
  resourced: 100,
  stretched: 50,
  depleted: 0,
};

// Calculate volatility
function calculateVolatility(signals: CapacitySignal[]): number {
  const values = signals.map(s => normalizedCapacity[s.state]);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance); // Standard deviation
}
```

**Volatility Thresholds**:
| Volatility Score | Classification | Signal |
|------------------|----------------|--------|
| 0-15 | Stable | Low risk |
| 16-30 | Moderate | Monitoring |
| 31-40 | Elevated | Attention |
| 41+ | High | Predictive concern |

**What it measures**:
- Swing amplitude between states
- Frequency of state changes
- Absence of sustained stability

**What it does NOT measure**:
- Absolute capacity level (someone can be consistently depleted = low volatility)
- Reasons for volatility
- External circumstances

### "Near-Term Functional Failure"

**Operational Definition**: Observable inability to maintain expected role performance within 30 days

**Examples by context**:
| Context | Functional Failure Examples |
|---------|----------------------------|
| Employment | Unplanned absence, missed deadlines, performance incident |
| Education | Dropped course, failed exam, extended accommodation request |
| Healthcare | Missed appointment, medication non-adherence, ER visit |
| Caregiving | Respite request, child welfare contact, burnout leave |

**What qualifies**:
- Externally verifiable event
- Occurs within 30 days of volatility detection
- Represents departure from baseline function

**What does NOT qualify**:
- Internal distress without external marker
- Self-reported difficulty without functional impact
- Events beyond 30-day window

### "Independent of Diagnosis, Self-Report, or Biometrics"

This is the **critical differentiator**.

**Independent of Diagnosis**:
- Claim holds regardless of DSM/ICD classification
- No diagnosis required for prediction validity
- Prediction does not imply or suggest diagnosis

**Independent of Self-Report**:
- Capacity signal is behavioral (user taps a button), not cognitive (user explains feelings)
- Prediction based on signal pattern, not user interpretation
- No reliance on accuracy of user's self-assessment

**Independent of Biometrics**:
- No heart rate, sleep data, activity tracking
- No wearable integration
- No passive sensing
- Signal is active, discrete, user-initiated

---

## III. DATA REQUIREMENTS

### Required Data

| Data Element | Source | Purpose |
|--------------|--------|---------|
| Capacity state | User tap | Primary signal |
| Timestamp | System | Pattern analysis |
| Signal count | Derived | Engagement verification |
| Day-over-day variance | Derived | Volatility calculation |

### Explicitly Excluded Data

| Data Element | Why Excluded |
|--------------|--------------|
| Diagnosis codes | Creates medical device risk |
| Medication status | Creates medical advice risk |
| Biometric data | Creates passive surveillance risk |
| Location data | Privacy violation |
| Device usage patterns | Surveillance risk |
| Social connections | Creates inference risk |
| Employment status | Creates discrimination risk |
| Demographic data | Creates bias risk |

### Data Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA BOUNDARY                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INSIDE (Used for claim)          OUTSIDE (Never used)         │
│  ─────────────────────            ──────────────────────        │
│  • Capacity state (color)         • Why the state exists        │
│  • When signal logged             • What caused state change    │
│  • Signal frequency               • User interpretation         │
│  • State transitions              • External circumstances      │
│  • Volatility score               • Diagnosis status            │
│  • Pattern shape                  • Treatment status            │
│                                   • Demographic factors         │
│                                   • Biometric readings          │
│                                   • Location/context            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## IV. NON-DIAGNOSTIC POSTURE

### What Orbital Claims

- Capacity volatility **correlates with** functional risk
- The correlation is **observable and measurable**
- The correlation is **independent of diagnosis**

### What Orbital Does NOT Claim

- Capacity volatility **causes** functional failure
- Orbital can **diagnose** conditions
- Orbital can **predict** specific outcomes
- Orbital provides **medical advice**
- Orbital is a **clinical tool**

### Regulatory Classification

| Claim | Classification |
|-------|---------------|
| "Predicts risk" | Wellness product (non-regulated) |
| "Diagnoses condition" | Medical device (FDA regulated) |
| "Recommends treatment" | Medical device (FDA regulated) |
| "Monitors symptoms" | Context-dependent |

**Orbital's position**: Wellness product tracking self-reported capacity.

---

## V. INSURER LEGIBILITY

### Why Insurers Care

1. **Disability claims**: Volatility pattern precedes formal disability filing
2. **Healthcare utilization**: High volatility correlates with increased service use
3. **Workforce productivity**: Volatility predicts unplanned absence
4. **Early intervention**: Detection window enables support deployment

### What Orbital Provides (Aggregate, De-Identified)

| Metric | Insurer Value |
|--------|---------------|
| Cohort volatility distribution | Population risk stratification |
| Volatility-to-event correlation | Predictive model validation |
| Intervention timing windows | Support deployment optimization |
| Engagement patterns | Program design input |

### What Orbital Never Provides

| Data | Why Never |
|------|-----------|
| Individual-level volatility | Privacy violation |
| Named user data | HIPAA/privacy violation |
| Diagnosis correlation | Medical device risk |
| Employment status | Discrimination risk |

---

## VI. VALIDATION ROADMAP

### Phase 1: Correlation Establishment (Current)

**Objective**: Demonstrate volatility-outcome correlation in observational data

**Method**:
- Collect longitudinal capacity signals
- Correlate with self-reported functional events
- Calculate predictive validity metrics

**Output**: Internal correlation coefficients, not public claims

### Phase 2: Prospective Validation

**Objective**: Validate prediction in prospective cohort

**Method**:
- Enroll defined cohort with consent
- Track volatility prospectively
- Measure functional outcomes at 30/60/90 days
- Compare predicted vs. actual

**Output**: Peer-reviewable validation study

### Phase 3: External Replication

**Objective**: Independent validation by third party

**Method**:
- Share methodology (not data) with academic partner
- Support independent replication study
- Accept results regardless of outcome

**Output**: Published, peer-reviewed evidence

### Phase 4: Actuarial Integration

**Objective**: Incorporate volatility into risk models

**Method**:
- Partner with insurer/actuary
- Provide aggregate data under research agreement
- Support model development and validation

**Output**: Actuarially-validated risk factor

---

## VII. WHAT THIS IS NOT

### Not a Marketing Claim

This claim is for:
- Internal product direction
- Research validation
- Insurer/regulator communication
- Due diligence documentation

This claim is NOT for:
- User-facing messaging
- App store descriptions
- Sales materials
- Press releases

### Not a Guarantee

The claim is **falsifiable**. If evidence shows:
- Volatility does NOT predict functional failure
- Prediction is NOT independent of diagnosis
- Correlation is confounded by excluded variables

Then the claim is **wrong** and must be revised or abandoned.

### Not Medical Advice

Even if the claim validates, Orbital:
- Does not diagnose
- Does not recommend treatment
- Does not replace clinical assessment
- Does not constitute medical device functionality

---

## VIII. PERMANENCE

This claim specification is **frozen**. Changes require:

1. Evidence that the claim is false
2. Regulatory guidance requiring modification
3. Board-level approval

The claim is intentionally narrow, falsifiable, and conservative. This is a feature.

---

**Document Owner**: Infrastructure
**Last Frozen**: 2026-01-04
**Review Cycle**: Annual (validation progress only)
