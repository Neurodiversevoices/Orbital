# LONGITUDINAL PHASE MODEL

**Classification:** INTERNAL
**Version:** 1.0.0
**Effective Date:** 2025-01-01
**Status:** LOCKED

---

## 1. OVERVIEW

Orbital operates in distinct longitudinal phases. Each phase unlocks specific system capabilities, user-facing features, and language permissions. Phases are progressive and irreversible (once a user enters a phase, they do not regress).

### 1.1 Phase Progression

```
Phase 0          Phase 1          Phase 2          Phase 3
CAPTURE    -->   BASELINE    -->  PATTERN     -->  LONGITUDINAL
(1-6 signals)    (7-29 signals)   (30-89 signals)  (90+ signals)
```

### 1.2 Governing Principle

No phase may expose interpretation, insight, or recommendation that is not supported by sufficient longitudinal data. Premature interpretation violates the non-diagnostic doctrine.

---

## 2. PHASE 0: CAPTURE-ONLY

**Signal Range:** 1-6 signals
**Duration:** Typically 1-7 days
**Status:** Initial state for all users

### 2.1 What System Computes

| Computation | Specification |
|-------------|---------------|
| Signal storage | Append-only storage of each signal |
| Timestamp indexing | Temporal ordering maintained |
| Category tagging | User-selected tags stored |
| Note storage | Optional notes encrypted and stored |

**Prohibited Computations:**
- No averages
- No trends
- No comparisons
- No pattern detection

### 2.2 What User Sees

| Element | Display |
|---------|---------|
| Signal log | Chronological list of recent signals |
| Current signal | Most recent capacity state |
| History count | "6 signals recorded" |
| Graph | Empty state with message |

**Graph Empty State Message:**
"Patterns will appear after 7 signals. Continue when ready."

### 2.3 Language Allowed

| Permitted | Example |
|-----------|---------|
| Signal count | "3 signals recorded" |
| Recency | "Last signal: 2 hours ago" |
| Encouragement (neutral) | "Building your record" |

### 2.4 Language Forbidden

| Prohibited | Reason |
|------------|--------|
| Any trend language | Insufficient data |
| Any pattern language | Insufficient data |
| Any insight language | Premature interpretation |
| Comparison to baseline | No baseline exists |

---

## 3. PHASE 1: BASELINE FORMATION

**Signal Range:** 7-29 signals
**Duration:** Typically 1-4 weeks
**Status:** Early longitudinal state

### 3.1 What System Computes

| Computation | Specification |
|-------------|---------------|
| 7-day rolling average | Mean capacity over trailing 7 days |
| State distribution | Percentage of signals in each state |
| Signal frequency | Average signals per day |
| Category distribution | Percentage by category |

**Prohibited Computations:**
- No week-over-week comparison
- No trend direction
- No predictions
- No correlations

### 3.2 What User Sees

| Element | Display |
|---------|---------|
| 7-day graph | Visual timeline with signals plotted |
| Basic stats | Average capacity (percentage) |
| Distribution | State breakdown (High/Stable/Low) |

**Baseline Formation Message:**
"Establishing your baseline. Patterns become visible at 30 signals."

### 3.3 Language Allowed

| Permitted | Example |
|-----------|---------|
| Average | "Average capacity: 62%" |
| Distribution | "45% high capacity, 35% stable, 20% low" |
| Time reference | "Last 7 days" |
| Progress | "22 of 30 signals toward pattern view" |

### 3.4 Language Forbidden

| Prohibited | Reason |
|------------|--------|
| "Trend" | No trend computed |
| "Pattern" | Patterns not yet valid |
| "Improving/Declining" | Directional language premature |
| "Compared to last week" | Comparison not supported |
| "Usually" or "Typically" | Normative language premature |

---

## 4. PHASE 2: PATTERN EMERGENCE

**Signal Range:** 30-89 signals
**Duration:** Typically 1-3 months
**Status:** Pattern-eligible state

### 4.1 What System Computes

| Computation | Specification |
|-------------|---------------|
| 30-day rolling average | Mean capacity over trailing 30 days |
| Week-over-week delta | Change in weekly average |
| Day-of-week analysis | Average by day of week |
| Time-of-day analysis | Average by time segment |
| Category correlation | Co-occurrence of categories with states |

**Prohibited Computations:**
- No seasonal analysis
- No year-over-year comparison
- No predictive modeling
- No clinical correlations

### 4.2 What User Sees

| Element | Display |
|---------|---------|
| 30-day graph | Extended timeline visualization |
| Pattern indicators | Day/time correlations (if statistically significant) |
| Trend arrow | Direction of change (neutral presentation) |
| Category insights | "Demand often coincides with lower capacity" |

### 4.3 Language Allowed

| Permitted | Example |
|-----------|---------|
| Pattern (qualified) | "Emerging pattern: lower capacity on Mondays" |
| Trend (directional) | "Capacity has increased 8% over 30 days" |
| Correlation (observed) | "Sensory signals often appear with depleted states" |
| Comparative | "This week vs. last week" |

### 4.4 Language Forbidden

| Prohibited | Reason |
|------------|--------|
| "Prediction" | No predictive claims allowed |
| "You should" | No recommendations |
| "Warning" | No alert language |
| Diagnostic terms | Non-diagnostic doctrine |
| "Significant" (clinical) | Statistical, not clinical significance |

---

## 5. PHASE 3: LONGITUDINAL RECOGNITION

**Signal Range:** 90+ signals
**Duration:** Ongoing
**Status:** Full longitudinal state

### 5.1 What System Computes

| Computation | Specification |
|-------------|---------------|
| 90-day rolling average | Quarterly capacity baseline |
| Quarterly comparison | Q-over-Q change |
| Annual baseline (365+ only) | Yearly capacity average |
| Seasonal patterns (365+ only) | Month-over-month historical |
| Coverage metrics | Signal continuity percentage |
| Artifact generation | Quarterly summary eligible |

### 5.2 What User Sees

| Element | Display |
|---------|---------|
| Full graph suite | 7d, 14d, 30d, 90d, 1y views |
| Quarterly summary | Downloadable PDF artifact |
| Longitudinal baseline | "Your 90-day baseline: 58%" |
| Pattern library | Confirmed patterns with confidence |
| Annual view (365+) | Year-over-year comparison |

### 5.3 Language Allowed

| Permitted | Example |
|-----------|---------|
| Baseline (established) | "Your established baseline is 58%" |
| Longitudinal pattern | "Over 90 days, Tuesdays average 12% lower" |
| Historical comparison | "Q4 capacity was 5% higher than Q3" |
| Seasonal observation | "Winter months show 8% lower average" |

### 5.4 Language Forbidden

| Prohibited | Reason |
|------------|--------|
| Diagnostic language | Always prohibited |
| Prescriptive language | Orbital does not recommend |
| Predictive confidence | No future-state claims |
| Normative comparison | No comparison to population norms |

---

## 6. PHASE TRANSITION RULES

### 6.1 Progression

| Transition | Trigger | User Notification |
|------------|---------|-------------------|
| 0 → 1 | 7th signal logged | "7-day view now available" |
| 1 → 2 | 30th signal logged | "Pattern view unlocked" |
| 2 → 3 | 90th signal logged | "Quarterly summary available" |

### 6.2 Non-Regression Principle

Once a user reaches a phase, they remain in that phase regardless of:
- Inactivity periods
- Data deletion requests (handled separately)
- Signal frequency changes

### 6.3 Signal Count Persistence

Signal count is:
- Immutable after recording
- Preserved across app reinstalls
- Synchronized across devices (if applicable)
- Auditable for compliance

---

## 7. IMPLEMENTATION REFERENCE

### 7.1 Phase Detection

```typescript
function getPhase(signalCount: number): Phase {
  if (signalCount < 7) return 'capture';
  if (signalCount < 30) return 'baseline';
  if (signalCount < 90) return 'pattern';
  return 'longitudinal';
}

function getPhaseFeatures(phase: Phase): FeatureSet {
  const features: Record<Phase, FeatureSet> = {
    capture: {
      graphs: [],
      stats: ['count'],
      artifacts: [],
      language: 'minimal'
    },
    baseline: {
      graphs: ['7d'],
      stats: ['count', 'average', 'distribution'],
      artifacts: [],
      language: 'descriptive'
    },
    pattern: {
      graphs: ['7d', '14d', '30d'],
      stats: ['count', 'average', 'distribution', 'trend', 'correlation'],
      artifacts: [],
      language: 'pattern-aware'
    },
    longitudinal: {
      graphs: ['7d', '14d', '30d', '90d', '1y'],
      stats: ['all'],
      artifacts: ['quarterly-summary', 'annual-summary'],
      language: 'full'
    }
  };
  return features[phase];
}
```

### 7.2 Feature Gating

All UI components MUST check phase before rendering:

```typescript
function shouldShowTrendArrow(phase: Phase): boolean {
  return phase === 'pattern' || phase === 'longitudinal';
}

function shouldShowQuarterlySummary(phase: Phase): boolean {
  return phase === 'longitudinal';
}

function getAllowedTimeRanges(phase: Phase): TimeRange[] {
  const phaseRanges: Record<Phase, TimeRange[]> = {
    capture: [],
    baseline: ['7d'],
    pattern: ['7d', '14d', '30d'],
    longitudinal: ['7d', '14d', '30d', '90d', '1y']
  };
  return phaseRanges[phase];
}
```

---

## 8. AUDIT REQUIREMENTS

| Event | Logged Data | Retention |
|-------|-------------|-----------|
| Phase transition | User ID, old phase, new phase, timestamp | Permanent |
| Feature access attempt | User ID, feature, phase, allowed/denied | 1 year |
| Artifact generation | User ID, artifact type, phase, timestamp | Permanent |

---

*End of Document*
