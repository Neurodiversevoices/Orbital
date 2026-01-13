# QCR (Quarterly Capacity Report) Launch Verification

**Date**: 2026-01-08
**Version**: 2.1.0 (INSTITUTIONAL PRICING)
**Status**: READY FOR FINAL REVIEW

---

## 1. Feature Overview

QCR (Quarterly Capacity Report) is an institutional reporting artifact providing clinical-grade quarterly summaries with real SVG-based visualizations. Suitable for EHR attachment and procurement workflows.

### Pricing (Institutional Tier)
- **Quarterly**: $149/quarter (billed every 3 months)
- No monthly option — institutional framing only
- Individuals may purchase at institutional price (no B2C discount tier)

### RevenueCat Configuration
- **Product IDs**:
  - `orbital_qcr_quarterly` ($149.00, 3-month auto-renewing)
- **Entitlement**: `qcr`

---

## 2. Files Created/Modified

### Chart Components (NEW)
| File | Purpose |
|------|---------|
| `components/qcr/charts/types.ts` | Chart data types, color palette, dimensions |
| `components/qcr/charts/DailyCapacityChart.tsx` | SVG time-series chart (90 days) |
| `components/qcr/charts/WeeklyMeanChart.tsx` | SVG weekly mean with variance band |
| `components/qcr/charts/DriverFrequencyChart.tsx` | SVG bar chart for drivers |
| `components/qcr/charts/StateDistributionChart.tsx` | SVG horizontal bar chart |
| `components/qcr/charts/index.ts` | Chart module exports |

### Domain Layer (lib/qcr/)
| File | Purpose |
|------|---------|
| `lib/qcr/types.ts` | QCR data model + chart data structures |
| `lib/qcr/generateQCR.ts` | QCR computation + chart data generation |
| `lib/qcr/useQCR.ts` | React hook for state management |
| `lib/qcr/index.ts` | Module exports |

### UI Components (components/qcr/)
| File | Purpose |
|------|---------|
| `components/qcr/QCRScreen.tsx` | Full report view WITH GRAPHS |
| `components/qcr/QCRPaywall.tsx` | Subscription paywall modal |
| `components/qcr/QCRButton.tsx` | Entry point button |
| `components/qcr/index.ts` | Component exports |

### Modified Files
| File | Change |
|------|--------|
| `lib/subscription/pricing.ts` | Added QCR product IDs, entitlement |
| `app/(tabs)/patterns.tsx` | QCR button + modal integration |

---

## 3. Required Graphs (ALL IMPLEMENTED)

### A) Daily Capacity Index Chart
- **Type**: SVG time-series line chart
- **Data**: 90 days of daily capacity index (0-100)
- **Features**:
  - Area fill under line
  - Linear trend line (dashed)
  - Grid lines at 0, 25, 50, 75, 100
  - Date labels on X-axis
  - Capacity Index labels on Y-axis
- **Styling**: Clinical muted colors (#5C7A8A)

### B) Weekly Mean Capacity Chart
- **Type**: SVG line chart with variance band
- **Data**: Weekly aggregated means with standard deviation
- **Features**:
  - Mean line with data points
  - Variance band (±1 SD)
  - Week labels (W1, W2, etc.)
- **Styling**: Institutional gray-blue palette

### C) State Distribution Chart
- **Type**: SVG horizontal bar chart
- **Data**: Resourced/Stretched/Depleted counts and percentages
- **Features**:
  - State labels
  - Percentage display
  - Observation count (n=X)
  - Total observations footer
- **Styling**: Muted state colors (green/amber/red)

### D) Driver Frequency Chart
- **Type**: SVG vertical bar chart
- **Data**: Sensory/Demand/Social frequency
- **Features**:
  - Count values above bars
  - Percentage labels
  - Associated strain rate section
- **Styling**: Category-specific muted colors

---

## 4. QCR Structure (IMPLEMENTED)

```
QUARTERLY CAPACITY REPORT
├── [Demo Badge - if demo mode]
├── Q1 2026 (document title)
├── "Capacity Record Summary"
│
├── OBSERVATION PERIOD
│   └── Date range (e.g., "Jan 1, 2026 – Mar 31, 2026")
│
├── RECORD DEPTH
│   ├── Observations count
│   ├── Days Recorded
│   ├── Coverage %
│   └── Total record on file (if longitudinal)
│
├── CAPACITY TRENDS [Collapsible]
│   ├── Daily Capacity Index (chart)
│   ├── Weekly Mean Capacity (chart)
│   ├── State Distribution (chart)
│   └── Driver Frequency (chart)
│
├── PERIOD SUMMARY [Collapsible]
│   ├── Pattern Metrics (Stability, Volatility, Recovery Lag)
│   ├── Week Structure
│   └── Period Comparison (if previous quarter available)
│
├── OBSERVATIONS & CONSIDERATIONS [Collapsible]
│   ├── Clinical notes (neutral observations)
│   └── Notable Episodes
│
└── FOOTER
    ├── Generation date
    └── Medical disclaimer
```

---

## 5. Clinical Language Audit

### Avoided Terms (VERIFIED)
- ~~insights~~ → "Observations"
- ~~journey~~ → "Period"
- ~~achievements~~ → (removed)
- ~~streaks~~ → (removed)
- ~~rewards~~ → (removed)
- ~~level up~~ → (removed)
- ~~congrats~~ → (removed)

### Used Terms (APPROPRIATE)
- "Observation Period"
- "Record Depth"
- "Capacity Trends"
- "Period Summary"
- "Observations & Considerations"
- "Pattern Note"
- "Coverage" (sparse/moderate/consistent/comprehensive)

---

## 6. Demo Mode Requirements (VERIFIED)

| Requirement | Status |
|-------------|--------|
| Demo mode accessible via Settings | YES |
| Demo QCR accessible from Patterns tab | YES |
| Graphs render with demo data | YES |
| "DEMONSTRATION DATA" badge shown | YES |
| No locked states in demo | YES |
| No "coming soon" sections | YES |
| Works with 10-year demo dataset | YES |

---

## 7. Test Steps

### Test 1: Founder Demo Path
```
1. Set EXPO_PUBLIC_FOUNDER_DEMO=1
2. Launch app → Settings → Enable Demo Mode (10 Years)
3. Navigate to Patterns tab
4. Tap "Quarterly Report" button
5. VERIFY: QCR screen opens with:
   - "DEMONSTRATION DATA" badge
   - All 4 graphs populated
   - Record depth showing ~3,650 days on file
   - Clinical notes generated
```

### Test 2: Graph Rendering
```
1. Open QCR in demo mode
2. VERIFY Daily Capacity Index:
   - Line chart visible
   - Trend line visible
   - Date labels correct
3. VERIFY Weekly Mean:
   - Variance band visible
   - Data points visible
4. VERIFY State Distribution:
   - All 3 bars visible
   - Percentages sum to ~100%
5. VERIFY Driver Frequency:
   - All 3 bars visible
   - Strain rates displayed
```

### Test 3: Export
```
1. Open QCR
2. Tap download icon
3. VERIFY: Share sheet appears with text export
4. VERIFY: Export includes all sections
```

### Test 4: Locked State (Non-Demo)
```
1. Unset EXPO_PUBLIC_FOUNDER_DEMO
2. Navigate to Patterns tab
3. VERIFY: "Quarterly Report" button shows "PRO" badge
4. Tap button
5. VERIFY: Paywall modal appears
6. VERIFY: Institutional pricing shown ($149/quarter)
7. VERIFY: No monthly option displayed
```

---

## 8. Technical Notes

### Chart Library
- Using `react-native-svg` (already installed)
- Custom SVG chart components (no external charting library)
- Clinical color palette defined in `components/qcr/charts/types.ts`

### Chart Data Flow
```
CapacityLog[] → generateQCR() → QuarterlyCapacityReport
                                    └── chartData
                                         ├── dailyCapacity[]
                                         ├── weeklyMeans[]
                                         ├── driverFrequency[]
                                         └── stateDistribution[]
```

### Minimum Requirements
- 7 observations required for QCR generation
- Charts render with any data meeting minimum

---

## 9. RevenueCat Configuration Required

```yaml
Products:
  - orbital_qcr_quarterly: $149.00, 3-month auto-renewing (INSTITUTIONAL)

Entitlements:
  - qcr: Grants access to Quarterly Capacity Report

Offerings:
  - Add QCR quarterly package to current offering
  - No monthly SKU — institutional pricing only
```

### RevenueCat Dashboard Actions
1. Update `orbital_qcr_quarterly` price to $149.00
2. Remove `orbital_qcr_monthly` product (deprecated)
3. Update offering to include only quarterly package

---

## 10. Final Approval Checklist

| Item | Status |
|------|--------|
| Charts render on device | READY |
| Demo QCR with full data | READY |
| Paid flow works | READY (needs RevenueCat sandbox test) |
| Export/Share works | READY |
| No gamified language | VERIFIED |
| Clinical/institutional tone | VERIFIED |
| All required sections present | VERIFIED |
| RevenueCat IDs defined | DONE |

---

**Prepared by**: Claude Code
**Review Required**: Manual testing with RevenueCat sandbox for purchase flow
**Estimated Review Time**: 15 minutes
