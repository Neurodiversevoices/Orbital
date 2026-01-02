# ABSENCE AS SIGNAL SPECIFICATION

**Classification:** INTERNAL
**Version:** 1.0.0
**Effective Date:** 2025-01-01
**Status:** APPROVED

---

## 1. OVERVIEW

Absence of signal is a first-class longitudinal condition in Orbital. It is meaningful, but it is never framed as failure, neglect, or disengagement.

### 1.1 Core Principle

Absence is data. Absence is not failure.

When a user does not log a capacity signal, Orbital:
- Records the absence as a temporal gap
- Preserves the gap in longitudinal analysis
- Never prompts, nudges, or reminds about the gap
- Never penalizes, scores, or highlights the gap in daily UX

---

## 2. RULES

### 2.1 Storage Rules

| Rule ID | Specification |
|---------|---------------|
| ABS-001 | Absence is never stored as an explicit record |
| ABS-002 | Absence is derived at query time from signal timestamps |
| ABS-003 | Gap duration is calculated as: `next_signal_timestamp - previous_signal_timestamp` |
| ABS-004 | Gaps less than 24 hours are not classified as absence |
| ABS-005 | Gaps are categorized: Short (1-3 days), Medium (4-14 days), Extended (15+ days) |

### 2.2 Computation Rules

| Rule ID | Specification |
|---------|---------------|
| ABS-010 | Absence SHALL NOT affect capacity averages (excluded from mean calculations) |
| ABS-011 | Absence SHALL be represented in continuity metrics |
| ABS-012 | Absence periods MAY be included in longitudinal artifacts (90+ day views only) |
| ABS-013 | Absence SHALL NOT trigger any automated action |
| ABS-014 | Absence patterns SHALL NOT be shared in aggregate institutional views |

### 2.3 Display Rules

| Rule ID | Specification |
|---------|---------------|
| ABS-020 | Absence SHALL NOT appear in any view shorter than 90 days |
| ABS-021 | When displayed, absence uses neutral visual treatment (no red, no warning) |
| ABS-022 | Absence label SHALL be "No signals recorded" (not "Missing" or "Skipped") |
| ABS-023 | Absence SHALL NOT show in daily, weekly, or monthly summary views |
| ABS-024 | Absence MAY appear in annual summaries as "Coverage: X%" |

---

## 3. DATA LOGIC

### 3.1 Gap Detection Algorithm

```
function detectGaps(signals: Signal[]): Gap[] {
  const gaps: Gap[] = [];
  const sortedSignals = signals.sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 1; i < sortedSignals.length; i++) {
    const gapMs = sortedSignals[i].timestamp - sortedSignals[i-1].timestamp;
    const gapDays = gapMs / (24 * 60 * 60 * 1000);

    if (gapDays >= 1) {
      gaps.push({
        startTimestamp: sortedSignals[i-1].timestamp,
        endTimestamp: sortedSignals[i].timestamp,
        durationDays: Math.floor(gapDays),
        category: categorizeGap(gapDays)
      });
    }
  }

  return gaps;
}

function categorizeGap(days: number): GapCategory {
  if (days < 4) return 'short';
  if (days < 15) return 'medium';
  return 'extended';
}
```

### 3.2 Coverage Calculation

```
function calculateCoverage(signals: Signal[], periodDays: number): number {
  if (signals.length === 0) return 0;

  const sortedSignals = signals.sort((a, b) => a.timestamp - b.timestamp);
  const firstSignal = sortedSignals[0].timestamp;
  const lastSignal = sortedSignals[sortedSignals.length - 1].timestamp;

  const activePeriodDays = (lastSignal - firstSignal) / (24 * 60 * 60 * 1000);
  const daysWithSignals = new Set(
    sortedSignals.map(s => Math.floor(s.timestamp / (24 * 60 * 60 * 1000)))
  ).size;

  return Math.round((daysWithSignals / Math.max(activePeriodDays, 1)) * 100);
}
```

### 3.3 Data Model

```typescript
// Gaps are NEVER stored - always derived
interface DerivedGap {
  startTimestamp: number;    // End of previous signal day
  endTimestamp: number;      // Start of next signal day
  durationDays: number;      // Whole days only
  category: 'short' | 'medium' | 'extended';
}

// Coverage is computed, not stored
interface CoverageMetric {
  periodDays: number;        // Analysis window
  signalDays: number;        // Days with at least one signal
  coveragePercent: number;   // signalDays / periodDays * 100
  gapCount: number;          // Number of gaps > 1 day
  longestGapDays: number;    // Maximum gap duration
}
```

---

## 4. ALLOWED LANGUAGE

### 4.1 Permitted Descriptions of Absence

| Context | Permitted Phrasing |
|---------|-------------------|
| Artifact summary | "Coverage: 78% of days" |
| Gap notation | "No signals recorded" |
| Period description | "Signals present on 72 of 90 days" |
| Neutral reference | "Period without signals" |

### 4.2 Prohibited Descriptions of Absence

| Prohibited | Reason |
|------------|--------|
| "Missing data" | Implies obligation |
| "Skipped days" | Implies neglect |
| "Gaps in tracking" | Uses prohibited term |
| "Incomplete record" | Implies failure |
| "You didn't log" | Accusatory framing |
| "Remember to log" | Nudge/reminder |
| "Keep your streak" | Gamification |
| "Don't break your chain" | Shame-based |

---

## 5. UX CONSTRAINTS

### 5.1 Absolute Prohibitions

The following SHALL NOT exist in Orbital:

| Prohibition ID | Description |
|----------------|-------------|
| UX-ABS-001 | No push notifications about absence |
| UX-ABS-002 | No email reminders about logging |
| UX-ABS-003 | No in-app prompts about gaps |
| UX-ABS-004 | No streak counters or chain visualizations |
| UX-ABS-005 | No "days since last log" displays |
| UX-ABS-006 | No color-coding of calendar days as "logged" vs "not logged" |
| UX-ABS-007 | No guilt-inducing copy about returning after absence |
| UX-ABS-008 | No "welcome back" messaging that references time away |
| UX-ABS-009 | No comparison of current logging frequency to past frequency |
| UX-ABS-010 | No badges, achievements, or rewards for consistency |

### 5.2 Permitted Displays (90+ Day Views Only)

| Display Type | Implementation |
|--------------|----------------|
| Annual coverage percentage | "Signals recorded on 287 of 365 days (79%)" |
| Gap visualization in timeline | Neutral gray bar, no emphasis, no label unless hovered |
| Quarterly summary note | "This period includes 12 days without signals" |

### 5.3 Return Experience

When a user returns after any absence period:

1. App opens to normal state (no special messaging)
2. No reference to time away
3. No prompts to "get back on track"
4. Signal logging available immediately with no friction
5. Historical data preserved exactly as left

---

## 6. INSTITUTIONAL CONSIDERATIONS

### 6.1 Aggregate Views

Institutional dashboards SHALL NOT display:
- Individual user absence patterns
- "Engagement" metrics based on logging frequency
- Alerts when specific users have gaps
- Comparisons of logging consistency between users

Institutional dashboards MAY display:
- Aggregate coverage percentage across cohort (e.g., "78% average coverage")
- Total signals received in period (volume, not per-user)

### 6.2 Research Applications

For governed research contexts:
- Absence patterns may be analyzed in aggregate
- Individual absence data requires explicit consent beyond base consent
- Absence SHALL NOT be used to infer non-capacity conditions

---

## 7. IMPLEMENTATION CHECKLIST

| Item | Owner | Status |
|------|-------|--------|
| Remove all reminder/notification code | Engineering | Required |
| Audit UI for streak/chain references | Engineering | Required |
| Implement gap derivation at query time | Engineering | Required |
| Add coverage calculation to artifact generator | Engineering | Required |
| Review all copy for absence language | Product | Required |
| Update institutional dashboard to exclude absence | Engineering | Required |
| Add lint rules for prohibited absence terms | Engineering | Required |

---

*End of Document*
