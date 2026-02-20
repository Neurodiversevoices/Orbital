# Dynamic CCI v1 — Implementation Plan

**PLANNING MODE ACKNOWLEDGED — NO CODE WRITTEN**

**Date:** 2026-02-20
**Author:** Claude (Orbital codebase)
**Status:** PLAN ONLY — awaiting approval before any implementation
**Branch:** `claude/continue-work-VaScT`

---

## Absolute Constraints

| Constraint | Enforcement |
|-----------|-------------|
| NO builds (`eas build`, `expo prebuild`, CI) | Not invoked in this plan |
| NO iOS/Apple review changes | No `app.json` iOS block, no `eas.json` iOS profiles touched |
| NO HTML/CSS/SVG layout changes | Template structure, class names, CSS rules, element order all FROZEN |
| NO print/PDF pipeline changes | `@page`, `print-color-adjust`, page dimensions untouched |
| NO new npm dependencies | All computation uses existing JS/TS primitives |
| CCI requires Phase 3 (90+ signals) | Hard gate enforced in compute layer |

---

## Objective

Wire real `CapacityLog[]` data into the existing CCI artifact so that every issuance reflects the individual's actual capacity history — **without changing the artifact's layout, markup structure, or rendering behaviors**.

The golden master HTML template remains structurally identical. Only the **text content** of specific `<span>` elements and the **data-driven SVG paths/coordinates** change between issuances.

---

## Scope: In vs. Deferred

### In Scope (v1 — Numbers Only)

| # | Field | Current Hardcoded Value | Source |
|---|-------|------------------------|--------|
| 1 | Observation Window | `2025-10-01 to 2025-12-31` | Computed from first/last log dates in window |
| 2 | Observation Period (display) | `Oct 1, 2025 – Dec 31, 2025` | Same dates, formatted for display |
| 3 | Patient ID | `34827-AFJ` | Generated per-user anonymized ID |
| 4 | Tracking Continuity | `85% (High Reliability)` | `(daysWithEntries / totalDaysInWindow) * 100` |
| 5 | Capacity Pattern Stability | `92%` | `100 - normalizedVolatility` (capped 0-100) |
| 6 | Pattern Summary (verdict) | `Interpretable Capacity Trends` | Deterministic lookup from stability + continuity |
| 7 | SVG chart (6 data points) | Hardcoded Bezier paths + circle coords | `downsampleTo6Points()` → `renderSummaryChartSVG()` |
| 8 | SVG x-axis labels | `Oct / Nov / Dec` | Derived from observation window months |
| 9 | Monthly breakdown (JSON) | `stability: 66/59/63, volatility: 25/31/29` | Computed per calendar month |
| 10 | Capacity distribution (JSON) | N/A (not in HTML, only JSON export) | `resourced/stretched/depleted` counts |

### Deferred (v2+)

| Field | Why Deferred |
|-------|-------------|
| Response Timing (`Mean 4.2s`) | No `responseTimeMs` field in `CapacityLog` — requires schema addition |
| Functional Impact narrative | Requires governance-approved phrase bank — not yet authored |
| Strengths / Driver Correlation charts | Requires second SVG chart zone — layout change territory |
| AI-generated narrative | Prohibited by `governance/PROHIBITED_FEATURES.md` Category I |
| Driver ranking in HTML | Not present in current HTML template — would require new DOM elements |

**Response Timing** remains hardcoded at `Mean 4.2s` in v1. A future schema migration adding `responseTimeMs` to `CapacityLog` will unblock this.

---

## Architecture Overview

```
CapacityLog[] (from AsyncStorage/Supabase)
      │
      ▼
┌──────────────────────────────┐
│  lib/cci/dynamic/compute.ts  │  Pure functions. No side effects. No async.
│                              │  Input:  CapacityLog[], window config
│                              │  Output: CCIDynamicData (typed JSON)
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  lib/cci/dynamic/format.ts   │  String formatters for each field.
│                              │  Enforces max-length, clamping, rounding.
│                              │  Returns: CCIFormattedStrings
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  lib/cci/artifact.ts         │  MODIFIED (minimal):
│  generateCCIArtifactHTML()   │  Accepts optional CCIFormattedStrings param.
│                              │  If provided → uses dynamic values.
│                              │  If absent → falls back to current hardcoded.
└──────────────────────────────┘
```

**Key Principle:** The compute layer is a pure function from `CapacityLog[]` → JSON. The artifact renderer reads JSON values and places them into the same `<span>` positions. Zero layout changes.

---

## File-by-File Change Plan

### 1. NEW: `lib/cci/dynamic/types.ts`

**Purpose:** Type definitions for the compute layer output.

**What it contains:**
- `CCIDynamicData` interface — the raw computed numbers
- `CCIFormattedStrings` interface — the display-ready strings
- `CCIComputeConfig` interface — window configuration

**What it does NOT contain:**
- No HTML/CSS/SVG references
- No rendering logic
- No imports from `artifact.ts`

```
Proposed types (signatures only — no implementation):

interface CCIComputeConfig {
  windowStart: string;         // YYYY-MM-DD
  windowEnd: string;           // YYYY-MM-DD
  minimumSignals: number;      // Default: 90 (Phase 3 gate)
  patientIdSeed?: string;      // For deterministic anonymized ID generation
}

interface CCIDynamicData {
  // Observation window
  observationStart: string;    // YYYY-MM-DD
  observationEnd: string;      // YYYY-MM-DD
  windowStatus: 'open' | 'closed';

  // Patient identification
  patientId: string;           // Format: NNNNN-AAA (5 digits, dash, 3 uppercase letters)

  // Tracking continuity
  totalDaysInWindow: number;
  daysWithEntries: number;
  trackingContinuityPercent: number;   // 0-100, integer
  trackingContinuityRating: 'high' | 'moderate' | 'low';

  // Stability & volatility
  patternStabilityPercent: number;     // 0-100, integer
  volatilityRaw: number;              // Raw avg absolute day-to-day change (0-100 scale)

  // Verdict
  verdict: string;                     // Deterministic from stability + continuity

  // Chart data (6 downsampled values, 0-100 scale)
  chartValues: number[];               // Exactly 6 elements

  // X-axis labels (month abbreviations)
  chartXLabels: [string, string, string];  // e.g. ['Jan', 'Feb', 'Mar']

  // Monthly breakdown
  monthlyBreakdown: Array<{
    month: string;              // YYYY-MM
    signalCount: number;
    stability: number;          // 0-100
    volatility: number;         // 0-100
    distribution: {
      resourced: number;        // count
      stretched: number;
      depleted: number;
    };
  }>;

  // Overall distribution (for JSON export)
  overallDistribution: {
    resourced: number;
    stretched: number;
    depleted: number;
    total: number;
  };

  // Signal count (for Phase gate enforcement)
  totalSignals: number;
}

interface CCIFormattedStrings {
  observationWindow: string;          // "2026-01-01 to 2026-03-31"
  observationWindowDisplay: string;   // "Jan 1, 2026 – Mar 31, 2026"
  windowStatus: string;               // "(Closed)" or "(Open)"
  patientId: string;                  // "48291-KMR"
  trackingContinuity: string;         // "78% (Moderate Reliability)"
  responseTiming: string;             // "Mean 4.2s" (HARDCODED in v1)
  patternStability: string;           // "84%"
  verdict: string;                    // "Interpretable Capacity Trends"
  chartSVG: string;                   // Complete <svg>...</svg> string
  chartXLabels: [string, string, string];
}
```

### 2. NEW: `lib/cci/dynamic/compute.ts`

**Purpose:** Pure computation. No side effects. No async. No DOM.

**Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `computeCCIDynamicData` | `(logs: CapacityLog[], config: CCIComputeConfig) => CCIDynamicData \| null` | Main entry point. Returns `null` if <90 signals (Phase 3 gate). |
| `computeObservationWindow` | `(logs: CapacityLog[], config: CCIComputeConfig) => { start: string, end: string }` | Determines actual first/last dates within config window. |
| `computeTrackingContinuity` | `(logs: CapacityLog[], start: string, end: string) => { percent: number, rating: string, daysWithEntries: number, totalDays: number }` | Days with ≥1 entry / total days in window. |
| `computePatternStability` | `(dailyValues: number[]) => { stabilityPercent: number, volatilityRaw: number }` | Uses `calculateVolatility()` algorithm from `trajectoryReports.ts`, normalized to 0-100. |
| `computeVerdict` | `(stabilityPercent: number, continuityPercent: number) => string` | Deterministic lookup (see Verdict Logic below). |
| `computeChartValues` | `(logs: CapacityLog[], start: string, end: string) => number[]` | Aggregates logs to daily normalized values, then `downsampleTo6Points()`. |
| `computeMonthlyBreakdown` | `(logs: CapacityLog[], start: string, end: string) => MonthlyBreakdown[]` | Per-calendar-month stats. |
| `generateAnonymizedPatientId` | `(seed: string) => string` | Deterministic NNNNN-AAA from user ID hash. |

**Algorithms — reused from existing code (NOT duplicated, re-imported or re-implemented with same logic):**

| Algorithm | Existing Location | Reuse Strategy |
|-----------|------------------|----------------|
| Mean | `lib/research/trajectoryReports.ts:19-22` | Re-implement locally (private function, 3 lines — not worth cross-module import for such trivial code) |
| Volatility | `lib/research/trajectoryReports.ts:50-60` | Re-implement locally (same algorithm: avg absolute consecutive delta) |
| Trend (linear regression) | `lib/research/trajectoryReports.ts:30-48` | Re-implement locally (needed for monthly trend) |
| Downsample to 6 points | `lib/cci/summaryChart.ts:159-177` | Import directly: `import { downsampleTo6Points } from '../summaryChart'` |
| Unique dates extraction | `lib/baselineUtils.ts:39-46` | Import directly: `import { getUniqueDates } from '../../baselineUtils'` |
| Capacity state → numeric | `lib/baselineUtils.ts:255-263` | Re-implement locally (3-line switch) |

**Why re-implement trivial functions instead of importing?**
The `trajectoryReports.ts` functions are `function` (not `export function`) — they are module-private. Exporting them would change the module's public API. The implementations are 3-5 lines each. Local re-implementation is safer than modifying a research module.

### 3. NEW: `lib/cci/dynamic/format.ts`

**Purpose:** Convert `CCIDynamicData` → `CCIFormattedStrings` with format safety.

**Functions:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `formatCCIDynamicData` | `(data: CCIDynamicData) => CCIFormattedStrings` | Main formatter. |
| `formatObservationWindow` | `(start: string, end: string) => string` | `"YYYY-MM-DD to YYYY-MM-DD"` |
| `formatObservationWindowDisplay` | `(start: string, end: string) => string` | `"Mon D, YYYY – Mon D, YYYY"` |
| `formatTrackingContinuity` | `(percent: number, rating: string) => string` | `"78% (Moderate Reliability)"` |
| `formatPatternStability` | `(percent: number) => string` | `"84%"` |
| `formatVerdict` | `(verdict: string) => string` | Pass-through with max-length enforcement |
| `generateChartSVG` | `(chartValues: number[], xLabels: [string,string,string]) => string` | Delegates to `renderSummaryChartSVG()` with dynamic x-axis labels |

**Format Safety Rules** (enforced in this module):

| Field | Max Length | Clamping | Rounding | Fallback if Invalid |
|-------|-----------|----------|----------|---------------------|
| `trackingContinuityPercent` | N/A | 0–100 | `Math.round()` | `0` |
| `patternStabilityPercent` | N/A | 0–100 | `Math.round()` | `0` |
| `verdict` | 40 chars | Truncate | N/A | `"Insufficient Data"` |
| `patientId` | 9 chars (`NNNNN-AAA`) | N/A | N/A | `"00000-UNK"` |
| `observationWindow` | 27 chars | N/A | N/A | Error thrown |
| `observationWindowDisplay` | 40 chars | N/A | N/A | Error thrown |
| `chartValues` | 6 elements exactly | Each value 0–100 | `Math.round()` | Fill with 50 |
| `chartXLabels` | 3 elements, each 3 chars | N/A | N/A | `['???','???','???']` |
| `responseTiming` | — | — | — | `"Mean 4.2s"` (HARDCODED v1) |

### 4. NEW: `lib/cci/dynamic/index.ts`

**Purpose:** Module entry point. Clean public API.

```
Exports:
  - computeCCIDynamicData (from compute.ts)
  - formatCCIDynamicData (from format.ts)
  - CCIDynamicData, CCIFormattedStrings, CCIComputeConfig (from types.ts)
```

### 5. MODIFIED: `lib/cci/summaryChart.ts`

**Changes:** Minimal — make x-axis labels parameterizable.

| Line Range | Current | Change |
|-----------|---------|--------|
| 271-273 (function signature) | `renderSummaryChartSVG(values, options)` | Add optional `xLabels?: [string, string, string]` to `SummaryChartOptions` |
| 340-342 (x-axis labels) | Hardcoded `Oct`, `Nov`, `Dec` | Use `options.xLabels?.[0] ?? 'Oct'` etc. |

**What is NOT changed:**
- SVG `viewBox`, dimensions, padding, colors, gradients, node styles
- `downsampleTo6Points()` algorithm
- `generateBezierPath()` algorithm
- All CSS classes and structural markup
- Gradient IDs and definitions

**Risk:** LOW. The x-axis labels are pure text nodes at fixed positions. Changing their content from "Oct" to "Jan" does not affect layout, paths, or coordinates.

### 6. MODIFIED: `lib/cci/artifact.ts`

**Changes:** Add optional `CCIFormattedStrings` parameter. Use it for text injection only.

| Line | Current | Change |
|------|---------|--------|
| 24 (function signature) | `generateCCIArtifactHTML(metadata?: Partial<CCIIssuanceMetadata>): string` | `generateCCIArtifactHTML(metadata?: Partial<CCIIssuanceMetadata>, dynamic?: CCIFormattedStrings): string` |
| 454 (observation window) | `2025-10-01 to 2025-12-31 <em>(Closed)</em>` | `${dynamic?.observationWindow ?? '2025-10-01 to 2025-12-31'} <em>${dynamic?.windowStatus ?? '(Closed)'}</em>` |
| 491 (patient ID) | `34827-AFJ` | `${dynamic?.patientId ?? '34827-AFJ'}` |
| 493 (observation period display) | `Oct 1, 2025 – Dec 31, 2025` | `${dynamic?.observationWindowDisplay ?? 'Oct 1, 2025 – Dec 31, 2025'}` |
| 504 (tracking continuity) | `85% (High Reliability)` | `${dynamic?.trackingContinuity ?? '85% (High Reliability)'}` |
| 509 (response timing) | `Mean 4.2s` | `${dynamic?.responseTiming ?? 'Mean 4.2s'}` |
| 514 (pattern stability) | `92%` | `${dynamic?.patternStability ?? '92%'}` |
| 519 (verdict) | `Interpretable Capacity Trends` | `${dynamic?.verdict ?? 'Interpretable Capacity Trends'}` |
| 530-626 (entire SVG chart) | Inline SVG with hardcoded paths | `${dynamic?.chartSVG ?? INLINE_HARDCODED_SVG}` |

**Implementation strategy for the SVG swap (lines 530-626):**
Extract the current hardcoded SVG into a `const GOLDEN_MASTER_CHART_SVG` at the top of the file. The template then uses `${dynamic?.chartSVG ?? GOLDEN_MASTER_CHART_SVG}`. This preserves the golden master exactly when `dynamic` is undefined, and allows the computed SVG when `dynamic` is provided.

**What is NOT changed:**
- All CSS (lines 39-432) — FROZEN
- All HTML structure — FROZEN (same elements, same classes, same nesting)
- `@page` size — FROZEN
- Font imports — FROZEN
- Footer/legal/provider sections — FROZEN
- Circle CCI template — NOT TOUCHED in v1 (separate deliverable)
- `getGoldenMasterHTML()` — continues to call with no `dynamic` param → golden master preserved

### 7. MODIFIED: `lib/cci/artifact.ts` — JSON export

| Line | Current | Change |
|------|---------|--------|
| 997-1053 (`createCCIArtifactJSON`) | Hardcoded values | Accept optional `CCIDynamicData` parameter. If provided, use computed values for `reportingQuality`, `monthlyBreakdown`, `patientId`. If absent, fall back to current hardcoded values. |

### 8. MODIFIED: `lib/cci/types.ts`

**Changes:** Add re-export of new dynamic types.

| Change | Details |
|--------|---------|
| Add import/re-export | `export type { CCIDynamicData, CCIFormattedStrings, CCIComputeConfig } from './dynamic/types';` |

### 9. MODIFIED: `lib/cci/index.ts`

**Changes:** Add re-export of dynamic module public API.

| Change | Details |
|--------|---------|
| Add export line | `export { computeCCIDynamicData, formatCCIDynamicData } from './dynamic';` |
| Add type export | `export type { CCIDynamicData, CCIFormattedStrings, CCIComputeConfig } from './dynamic';` |

### 10. NOT MODIFIED (explicitly listed)

| File | Reason |
|------|--------|
| `app/cci.tsx` | Caller. v1 does NOT wire dynamic data into the screen yet — that requires a separate integration step after compute layer is verified. |
| `app.json` | No config changes needed. |
| `eas.json` | No build config changes. |
| `lib/cci/bundleArtifact.ts` | Bundle CCI is a separate artifact — out of scope for v1. |
| `lib/cci/demoData.ts` | Demo data remains for golden master rendering. |
| `lib/baselineUtils.ts` | Used via import only; no modifications. |
| `lib/research/trajectoryReports.ts` | Not modified; algorithms re-implemented locally in compute.ts. |
| `governance/*` | Read-only reference; not modified. |
| All CSS/HTML in artifact.ts | FROZEN per constraint. |

---

## Verdict Logic (Deterministic Lookup Table)

The verdict is determined by a 2-axis matrix: **stability** and **continuity**.

| | Continuity ≥70% | Continuity 40-69% | Continuity <40% |
|---|---|---|---|
| **Stability ≥80%** | Interpretable Capacity Trends | Partial Capacity Trends | Insufficient Observation |
| **Stability 50-79%** | Variable Capacity Patterns | Partial Capacity Patterns | Insufficient Observation |
| **Stability <50%** | Highly Variable Capacity | Insufficient Stability | Insufficient Observation |

**Language compliance:** All verdict strings avoid prohibited words from `PHASE_SEMANTICS.ts` Phase 3 prohibited list and `PROHIBITED_FEATURES.md`. No "improving", "declining", "good", "bad", "healthy", "normal", "diagnosis", "treatment".

---

## Missing-Day Policy

### Recommendation: **Option A — Null Gaps (Honest Gaps)**

**Policy:** Days without entries are excluded from computation. They are counted for tracking continuity but do NOT contribute synthetic values to the chart or stability calculation.

**Rationale:**
1. **Governance alignment:** Orbital's core principle is "The system reveals nothing before the data supports it" (PHASE_SEMANTICS.ts). Carry-forward or interpolation would present fabricated data as real.
2. **Chart impact:** `downsampleTo6Points()` already handles arrays shorter than 90 elements. The 6-point summary naturally compresses sparse data into a meaningful shape.
3. **Stability impact:** Volatility is computed only on days with entries. A 60-day span with 50 entries has volatility computed over 50 data points. The tracking continuity (50/60 = 83%) independently communicates data density.
4. **Simplicity:** No synthetic data generation. No edge cases around gap boundaries. No configuration complexity.

**How it works in practice:**
- Daily values array: one entry per day that has ≥1 log (average of that day's normalized capacity values)
- Missing days → no entry in array
- `computeChartValues()` gets an array of length = `daysWithEntries`, which may be <90
- `downsampleTo6Points()` compresses this to 6 representative points
- Tracking continuity separately reports `daysWithEntries / totalDaysInWindow`

**Rejected alternatives:**
- **Option B (Carry-forward):** Last known value repeated for missing days. Rejected: artificially inflates stability and misrepresents the data. A user who stopped logging during a crisis would appear "stable" through the gap.
- **Option C (Interpolation):** Linear interpolation between bookend values. Rejected: fabricates data. Violates "no interpretation" principle. Could mask significant events that occurred during gaps.

---

## Computation Details

### Normalized Capacity Value (per log entry)

```
resourced → 100
stretched → 50
depleted  → 0
```

This matches `lib/baselineUtils.ts:255-263` (`stateToPercent`).

### Daily Value (when multiple entries per day)

If a user logs multiple times in one day, the daily value is the **arithmetic mean** of all entries for that date:

```
dailyValue = mean(normalizedValues for that localDate)
```

### Tracking Continuity

```
percent = Math.round((daysWithEntries / totalDaysInWindow) * 100)
```

Where:
- `daysWithEntries` = count of unique `localDate` values in the window with ≥1 log
- `totalDaysInWindow` = calendar days between `windowStart` and `windowEnd` inclusive

Rating thresholds:
- ≥70%: `"High Reliability"` → `"high"`
- 40-69%: `"Moderate Reliability"` → `"moderate"`
- <40%: `"Low Reliability"` → `"low"`

### Pattern Stability

```
volatilityRaw = averageAbsoluteConsecutiveChange(dailyValues)
                                                  // same algorithm as trajectoryReports.ts:50-60
maxPossibleVolatility = 100  // if capacity alternates 0↔100 every day
normalizedVolatility = Math.min(100, (volatilityRaw / maxPossibleVolatility) * 100)
patternStabilityPercent = Math.round(100 - normalizedVolatility)
```

Clamped to 0-100. Rounded to integer.

**Why `maxPossibleVolatility = 100`?** The theoretical maximum average absolute consecutive change is 100 (alternating between 0 and 100 every day). In practice, real values will be much lower (typically 10-30). This scaling maps real volatility into a human-readable 0-100% stability score where higher = more stable.

### Anonymized Patient ID

```
hash = SHA-256(userId + patientIdSeed)    // or simple deterministic hash if crypto not available
digits = first 5 numeric chars from hex hash
letters = first 3 alpha chars from hex hash, uppercased
patientId = `${digits}-${letters}`
```

Format: `NNNNN-AAA` (e.g., `48291-KMR`). Deterministic — same user always gets same ID. Not reversible. The `patientIdSeed` allows rotation if needed.

**Fallback (no crypto available):** Use a simpler hash: `(userId.charCodeAt(0) * 31 + ...) mod 99999` for digits, similar for letters. The requirement is determinism and non-reversibility, not cryptographic strength.

### Chart Value Computation

```
1. Filter logs to observation window
2. Group by localDate
3. For each date: compute mean normalized capacity (0-100)
4. Produce array of daily values (only days with entries)
5. Call downsampleTo6Points(dailyValues, 6)
6. Result: 6 values, each 0-100
```

These 6 values are passed to `renderSummaryChartSVG()` which handles:
- Value → Y coordinate mapping (`valueToY`)
- Bezier path generation (`generateBezierPath`)
- Area fill path generation (`generateAreaPath`)
- Multi-layer node rendering (`generateNodesSVG`)
- Color selection per zone (`getCapacityColor`)

### X-Axis Labels

Derived from the observation window. Take the 3 most representative months:

```
if window spans ≤3 months: use those month abbreviations
if window spans >3 months: use first, middle, last month abbreviations
```

Each label is a 3-character month abbreviation: `Jan`, `Feb`, `Mar`, etc.

---

## Governance Copy Scan

### Purpose

Before any dynamic string enters the HTML template, verify it contains no prohibited language. This is a compile-time/test-time check, not a runtime filter.

### Proposal: `lib/cci/dynamic/governance.ts`

A utility that scans all possible verdict strings and formatted outputs against the prohibited word lists.

**Prohibited word sources:**
- `governance/PHASE_SEMANTICS.ts` → Phase 3 `prohibitedLanguage` array
- `governance/PROHIBITED_FEATURES.md` → Category D (Scoring) and Category I (Interpretation)

**Words to scan for in all CCI dynamic output strings:**

```
PROHIBITED_IN_CCI = [
  // From Phase 3 prohibited
  'improving', 'declining', 'you should', 'this means',
  'this indicates', 'consider', 'good', 'bad',
  'healthy', 'unhealthy', 'normal', 'abnormal',
  'diagnosis', 'treatment', 'intervention', 'recommendation',

  // From Prohibited Features Category D
  'wellness score', 'health score', 'daily grade', 'weekly grade',
  'progress percentage',

  // From Prohibited Features Category I
  'why are you', 'cause', 'suggested reason', 'symptom',

  // From store listing compliance
  'mental health', 'therapy', 'clinical assessment', 'cure',
  'AI-powered', 'AI analysis', 'monitor',
]
```

**Implementation:** A test-time assertion function:

```
function assertGovernanceCompliance(strings: CCIFormattedStrings): void
  // Throws if any prohibited word found in any formatted string
  // Called in unit tests, not at runtime (to avoid perf overhead)
```

**Additionally:** A grep-based CI check (can be run manually without builds):

```bash
# Scan all verdict strings and format constants for prohibited words
grep -riE "(improving|declining|diagnosis|treatment|health score|wellness score)" lib/cci/dynamic/
```

---

## Risk Matrix

### Print/PDF Regression Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Dynamic text overflows `<span>` width** | MEDIUM | HIGH — breaks PDF layout | Format safety: all strings max-length enforced. Continuity: max `"100% (High Reliability)"` = 26 chars (same as golden master's 25 chars). Stability: max `"100%"` = 4 chars (same as `"92%"` = 3). Verdict: max 40 chars (golden master is 32). |
| **SVG chart dimensions change** | LOW | HIGH — breaks chart card | `renderSummaryChartSVG()` always produces `viewBox="0 0 320 140"`. Values are clamped 0-100. Bezier paths are computed from fixed X positions. |
| **Dynamic SVG gradient IDs conflict** | LOW | MEDIUM — colors break | Individual CCI uses default `gradientId='chart'`. Same as current hardcoded SVG which uses `areaGrad`/`lineGrad`. Must ensure the generated SVG uses matching IDs. **Mitigation:** The `renderSummaryChartSVG` function uses `${gradientId}AreaGrad` and `${gradientId}LineGrad`. For the individual CCI, pass `gradientId: 'area'` to produce `areaGrad` and `lineGrad` matching the golden master. OR: accept the new IDs (`chartAreaGrad`, `chartLineGrad`) since the SVG is self-contained with its own `<defs>`. |
| **Font rendering differs with dynamic text** | NEGLIGIBLE | LOW | Same fonts (Inter, JetBrains Mono). Only text content changes, not font properties. |
| **Date formatting produces unexpected length** | LOW | MEDIUM — overflow | Format safety: observation window display uses `Intl.DateTimeFormat` with fixed format. Max: `"Sep 30, 2026 – Dec 31, 2026"` = 30 chars. Golden master: 28 chars. Within tolerance. |
| **No-data / insufficient-data edge case** | MEDIUM | HIGH — blank or broken | Phase 3 gate: `computeCCIDynamicData()` returns `null` if <90 signals. Caller must check. If null, fall back to golden master (demo data). |
| **`downsampleTo6Points` produces <6 values** | LOW | HIGH — SVG crash | Already handled: function pads with duplicates to ensure exactly `targetPoints` output. Verified in `summaryChart.ts:145-150`. |
| **Golden master regression (existing behavior)** | NEGLIGIBLE | CRITICAL | `getGoldenMasterHTML()` calls `generateCCIArtifactHTML()` with NO `dynamic` param. All `??` fallbacks produce identical hardcoded values. Golden master is byte-identical. |

### Gradient ID Detail

The current hardcoded SVG in `artifact.ts:556-566` uses gradient IDs `areaGrad` and `lineGrad`. The `renderSummaryChartSVG()` function uses `${gradientId}AreaGrad` and `${gradientId}LineGrad` (default `gradientId='chart'` → `chartAreaGrad`, `chartLineGrad`).

**Resolution:** Since the dynamic SVG replaces the entire `<svg>` block (lines 530-626), including the `<defs>` with gradient definitions, the gradient IDs are self-contained. There is no conflict. The generated SVG references its own gradients. The surrounding HTML has no references to these IDs.

**Verdict:** No action needed. The SVG is self-contained.

---

## Test & Verification Checklist

All of these can be verified **without builds** — they are pure TypeScript unit tests and manual inspection.

### Unit Tests (`lib/cci/dynamic/__tests__/`)

| # | Test | Assertion |
|---|------|-----------|
| 1 | `computeCCIDynamicData` returns `null` for <90 signals | Pass 89 logs → expect `null` |
| 2 | `computeCCIDynamicData` returns data for exactly 90 signals | Pass 90 logs → expect `CCIDynamicData` |
| 3 | Tracking continuity: 90 entries on 90 unique days → 100% | `trackingContinuityPercent === 100` |
| 4 | Tracking continuity: 90 entries on 45 unique days → 50% (assuming 90-day window) | `trackingContinuityPercent === 50` |
| 5 | Pattern stability: all-resourced input → very high (≥95%) | Constant input → volatility near 0 → stability near 100 |
| 6 | Pattern stability: alternating resourced/depleted → very low (<20%) | Max volatility → stability near 0 |
| 7 | Verdict lookup: high stability + high continuity → "Interpretable Capacity Trends" | Exact string match |
| 8 | Verdict lookup: low stability + low continuity → "Insufficient Observation" | Exact string match |
| 9 | Chart values: exactly 6 elements | `chartValues.length === 6` |
| 10 | Chart values: each element 0-100 | `chartValues.every(v => v >= 0 && v <= 100)` |
| 11 | Patient ID format: `NNNNN-AAA` | Regex: `/^\d{5}-[A-Z]{3}$/` |
| 12 | Patient ID determinism: same input → same output | Call twice with same userId → identical result |
| 13 | Monthly breakdown: correct month count | 3-month window → 3 monthly entries |
| 14 | Format safety: continuity clamped to 0-100 | Pass 150 → get "100% (High Reliability)" |
| 15 | Format safety: verdict truncated at 40 chars | Pass 50-char string → get 40-char output |
| 16 | Governance scan: all verdicts pass prohibited word check | `assertGovernanceCompliance()` on every verdict string |

### Integration Tests

| # | Test | Assertion |
|---|------|-----------|
| 17 | Golden master preservation: `getGoldenMasterHTML()` output unchanged | Byte-identical comparison with saved snapshot |
| 18 | Dynamic HTML structure: `generateCCIArtifactHTML(meta, dynamic)` produces valid HTML | Parse with DOMParser, check for expected elements |
| 19 | Dynamic SVG: chart renders correctly for known input | Known 6-value input → check SVG contains expected Bezier path (snapshot) |
| 20 | JSON export with dynamic data: all fields populated | `createCCIArtifactJSON(meta, data)` → check `reportingQuality`, `monthlyBreakdown` |

### Manual Verification (No Build Required)

| # | Step | Expected |
|---|------|----------|
| 21 | Run `npx tsc --noEmit` on new files | No type errors |
| 22 | Run unit tests via `npx jest lib/cci/dynamic/` | All pass |
| 23 | Open golden master HTML in browser, compare with `getGoldenMasterHTML()` output | Pixel-identical |
| 24 | Generate dynamic HTML with test data, open in browser at 612x792 viewport | Text fits in all spans. No overflow. Chart renders correctly. |
| 25 | Print dynamic HTML to PDF (browser print dialog) | Page fits US Letter. Colors match. No clipping. |

---

## Implementation Order

| Step | Description | Dependencies |
|------|-------------|-------------|
| 1 | Create `lib/cci/dynamic/types.ts` | None |
| 2 | Create `lib/cci/dynamic/compute.ts` | Step 1, existing `summaryChart.ts` and `baselineUtils.ts` imports |
| 3 | Create `lib/cci/dynamic/format.ts` | Step 1, existing `summaryChart.ts` import |
| 4 | Create `lib/cci/dynamic/index.ts` | Steps 1-3 |
| 5 | Create `lib/cci/dynamic/governance.ts` | Step 1 |
| 6 | Modify `lib/cci/summaryChart.ts` — add `xLabels` option | None (independent) |
| 7 | Modify `lib/cci/artifact.ts` — add `dynamic` parameter | Steps 1-4 |
| 8 | Modify `lib/cci/types.ts` — re-export dynamic types | Step 1 |
| 9 | Modify `lib/cci/index.ts` — re-export dynamic API | Step 4 |
| 10 | Write unit tests | Steps 1-5 |
| 11 | Write integration tests (golden master snapshot) | Steps 6-9 |
| 12 | Governance copy scan (manual grep + test) | Steps 5, 10 |

Steps 1-5 can be done in parallel. Step 6 is independent. Steps 7-9 depend on 1-4. Tests (10-12) depend on all implementation steps.

---

## What This Plan Does NOT Cover (Explicitly)

| Item | Why Excluded |
|------|-------------|
| Wiring dynamic data into `app/cci.tsx` | Separate integration step. Requires fetching logs from storage and deciding when to use real vs. demo data. |
| Circle CCI dynamic data | Circle artifact has different data model (5 members). Separate plan needed. |
| Bundle CCI dynamic data | Bundle artifact has different data model (N seats). Separate plan needed. |
| Supabase queries for CCI window | Data access layer is outside the compute module scope. |
| CCI purchase flow changes | No pricing or payment changes. |
| Adding `responseTimeMs` to CapacityLog | Schema migration — deferred to v2. |

---

## Summary

**4 new files** created in `lib/cci/dynamic/`:
- `types.ts` — Type definitions
- `compute.ts` — Pure computation (8 functions)
- `format.ts` — String formatting with safety (7 functions)
- `index.ts` — Module entry point

**1 new file** for governance:
- `governance.ts` — Prohibited word scanner

**3 existing files** modified (minimal, backwards-compatible):
- `lib/cci/summaryChart.ts` — Add optional `xLabels` to options
- `lib/cci/artifact.ts` — Add optional `dynamic` parameter with `??` fallbacks
- `lib/cci/index.ts` + `lib/cci/types.ts` — Re-exports only

**Zero layout changes.** Zero CSS changes. Zero HTML structure changes. Zero build requirements.

The golden master is preserved by the `??` fallback pattern: when `dynamic` is `undefined` (which it is for `getGoldenMasterHTML()`), every value falls back to the current hardcoded string. The output is byte-identical.
