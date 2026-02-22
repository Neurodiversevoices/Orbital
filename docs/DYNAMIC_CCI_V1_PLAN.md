# Dynamic CCI v1 — Implementation Plan

**PLANNING MODE ACKNOWLEDGED — NO CODE WRITTEN**

**Date:** 2026-02-20
**Author:** Claude (Orbital codebase)
**Status:** PLAN ONLY — awaiting approval before any implementation
**Branch:** `claude/continue-work-VaScT`

---

## PLAN LOCK (Non-Negotiable)

These constraints are absolute. Any PR that violates them MUST be rejected.

| # | Constraint | Enforcement | Verification |
|---|-----------|-------------|--------------|
| L1 | **NO BUILDS** of any kind | `eas build`, `expo prebuild`, `fastlane`, `xcodebuild`, CI pipelines — NONE invoked | Grep git log for build commands |
| L2 | **No changes to print/PDF pipeline** | `@page`, `print-color-adjust`, page dimensions, Playwright config — FROZEN | sha256 of artifact.ts CSS block before/after |
| L3 | **No DOM structure changes** | No new elements, no removed elements, no reordered elements, no changed class names | Diff of HTML structure (tags only) before/after |
| L4 | **No CSS changes** | No modified styles, no new styles, no removed styles | sha256 of CSS block in artifact.ts before/after |
| L5 | **No font changes** | Inter, JetBrains Mono imports and usage — FROZEN | Visual inspection |
| L6 | **No SVG viewBox changes** | `viewBox="0 0 320 140"` — FROZEN | Test assertion |
| L7 | **Golden master byte-identical** | `getGoldenMasterHTML()` output sha256 MUST match pre-implementation snapshot | Automated test (see Verification Protocol) |
| L8 | **Dynamic path opt-in only** | Dynamic path MUST NOT affect golden-master path. `getGoldenMasterHTML()` never receives a `dynamic` argument. | Code review + test |

### Verification Protocol

The **binding gate** is OUTPUT hashes (the generated HTML/SVG strings), not file hashes.
File hashes are secondary — they confirm source didn't change, but the output hash is what
proves the golden master is byte-identical.

#### Binding Gate: Output Hashes

**Before ANY PR is merged**, capture and compare these output hashes:

**Linux / macOS:**

```bash
# GATE 1: Golden master HTML output hash (BINDING — must match pre/post)
node -e "
  const {getGoldenMasterHTML} = require('./lib/cci');
  const crypto = require('crypto');
  console.log(crypto.createHash('sha256').update(getGoldenMasterHTML()).digest('hex'));
"

# GATE 2: summaryChart SVG output hash with default args (BINDING — must match pre/post)
# Uses the same demo values the golden master chart is built from.
node -e "
  const {renderSummaryChartSVG} = require('./lib/cci/summaryChart');
  const crypto = require('crypto');
  const svg = renderSummaryChartSVG([80, 55, 70, 40, 60, 85]);
  console.log(crypto.createHash('sha256').update(svg).digest('hex'));
"
```

**Windows (PowerShell):**

```powershell
# GATE 1: Golden master HTML output hash (BINDING)
node -e "const {getGoldenMasterHTML} = require('./lib/cci'); const crypto = require('crypto'); console.log(crypto.createHash('sha256').update(getGoldenMasterHTML()).digest('hex'));"

# GATE 2: summaryChart SVG output hash with default args (BINDING)
node -e "const {renderSummaryChartSVG} = require('./lib/cci/summaryChart'); const crypto = require('crypto'); const svg = renderSummaryChartSVG([80, 55, 70, 40, 60, 85]); console.log(crypto.createHash('sha256').update(svg).digest('hex'));"
```

These two hashes are captured BEFORE implementation and AFTER implementation.
**If either hash differs, the PR is REJECTED. No exceptions.**

#### Secondary: File Hashes

File hashes confirm that source files haven't been modified when they shouldn't be (e.g. PR1 must not touch `artifact.ts`).

**Pre-implementation "before" snapshot — Source Files:**

| File | SHA-256 | Role |
|------|---------|------|
| `lib/cci/artifact.ts` | `fd6fbc833dbd294fe509d0243af1c123db85000551ab31921cb4fbb8d9ec3411` | Golden master HTML generator |
| `lib/cci/summaryChart.ts` | `e6ef5671edfaef2554cc89224530665a9cb1e06b55ede1d28fdcc943e5380a2e` | Chart SVG renderer (SSOT) |
| `lib/cci/types.ts` | `5259048a1b9e0771b6c2ccf73cce68d62361ecbe1dc82b0a062997f304d4f912` | CCI type definitions |
| `lib/cci/index.ts` | `5b4d9592b9d2e1b105d086ebc742ee828fb4e643ae139eeaaee6750e632e1505` | CCI module entry point |

**Pre-implementation "before" snapshot — Entrypoint & Pipeline Files (MUST NOT be modified):**

| File | SHA-256 | Role |
|------|---------|------|
| `app/cci.tsx` | `1eaef11478292ad0adece443243711f36ebdf5fb4984fe8c7fcbff2e2df4270f` | CCI viewer screen (calls `getGoldenMasterHTML()`) |
| `scripts/cci-export-pdf.js` | `039539153ac324ebe006b68a0947d73d5672366d61977502837a64456dc317bc` | Playwright PDF export script |
| `scripts/cci-verify-golden.js` | `677739a6e886a1626df5dfcc75c7b83943e6182088b4279150ea235280eda369` | Golden master visual verification |
| `scripts/bundle-cci-export-pdf.ts` | `0eba18a5a077c7a83bf95e0b002296baf83105802a2ad5e0dbec1bd7e1846be9` | Bundle CCI PDF export |
| `lib/cci/bundleArtifact.ts` | `a0f7124b5281b5e44f9cea934dca9c6cd65e490f30e905fe5df29c135f5ccc2c` | Bundle CCI HTML generator |

**Note:** `components/CCI90DayChart.tsx` and `lib/charts/capacityOverTime90d.ts` exist but are NOT used by the CCI artifact pipeline. They are app-screen chart components. No CCI artifact code imports them.

**Linux / macOS — Generate all file hashes:**

```bash
sha256sum \
  lib/cci/artifact.ts \
  lib/cci/summaryChart.ts \
  lib/cci/types.ts \
  lib/cci/index.ts \
  app/cci.tsx \
  scripts/cci-export-pdf.js \
  scripts/cci-verify-golden.js \
  scripts/bundle-cci-export-pdf.ts \
  lib/cci/bundleArtifact.ts
```

**Windows (PowerShell) — Generate all file hashes:**

```powershell
@(
  "lib/cci/artifact.ts",
  "lib/cci/summaryChart.ts",
  "lib/cci/types.ts",
  "lib/cci/index.ts",
  "app/cci.tsx",
  "scripts/cci-export-pdf.js",
  "scripts/cci-verify-golden.js",
  "scripts/bundle-cci-export-pdf.ts",
  "lib/cci/bundleArtifact.ts"
) | ForEach-Object {
  $hash = (Get-FileHash -Algorithm SHA256 -Path $_).Hash
  Write-Output "$hash  $_"
}
```

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

### 5. MODIFIED: `lib/cci/summaryChart.ts` (PR2 ONLY — NOT in PR1)

**Changes:** Minimal — make x-axis labels parameterizable. Default behavior preserved.

| Line Range | Current | Change |
|-----------|---------|--------|
| 260-265 (`SummaryChartOptions`) | No `xLabels` field | Add `xLabels?: [string, string, string]` |
| 340-342 (x-axis text elements) | Hardcoded `Oct`, `Nov`, `Dec` | Use `options.xLabels?.[0] ?? 'Oct'` etc. |

**Default behavior guarantee:** When `xLabels` is not provided (which is the case for ALL existing callers), the `?? 'Oct'` / `?? 'Nov'` / `?? 'Dec'` fallbacks produce identical output.

**What is NOT changed:**
- SVG `viewBox`, dimensions, padding, colors, gradients, node styles
- `downsampleTo6Points()` algorithm
- `generateBezierPath()` algorithm
- All CSS classes and structural markup
- Gradient IDs and definitions

**Risk:** LOW. The x-axis labels are pure `<text>` nodes at fixed positions. Changing their content from "Oct" to "Jan" does not affect layout, paths, or coordinates. When called without `xLabels`, SVG output is byte-identical.

### 6. MODIFIED: `lib/cci/artifact.ts` (PR2 ONLY — NOT in PR1)

**Pattern:** `const data = dynamic ?? GOLDEN_CONSTANTS;`

All hardcoded values are extracted into a single `GOLDEN_CONSTANTS` object at the top of the file. The template references `data.xxx` for every dynamic field. When `dynamic` is `undefined`, `data` IS `GOLDEN_CONSTANTS` — the template produces byte-identical output.

**Step 1 — Extract constants (no behavioral change):**

```
const GOLDEN_CONSTANTS = {
  observationWindow: '2025-10-01 to 2025-12-31',
  observationWindowDisplay: 'Oct 1, 2025 – Dec 31, 2025',
  windowStatus: '(Closed)',
  patientId: '34827-AFJ',
  trackingContinuity: '85% (High Reliability)',
  responseTiming: 'Mean 4.2s',
  patternStability: '92%',
  verdict: 'Interpretable Capacity Trends',
  chartSVG: GOLDEN_MASTER_CHART_SVG,  // extracted from lines 530-626
} as const;
```

**Step 2 — Single resolution line in `generateCCIArtifactHTML`:**

```
export function generateCCIArtifactHTML(
  metadata?: Partial<CCIIssuanceMetadata>,
  dynamic?: CCIFormattedStrings,
): string {
  const data = dynamic ?? GOLDEN_CONSTANTS;
  // ... rest of template uses ${data.observationWindow}, ${data.patientId}, etc.
}
```

**Why this pattern is safe:**
- When `dynamic` is `undefined` (which is ALWAYS the case for `getGoldenMasterHTML()`), `data` is literally `GOLDEN_CONSTANTS` — the same hardcoded values that are inline today.
- No `??` chains scattered throughout the template. One resolution point.
- The sha256 of `getGoldenMasterHTML()` output MUST match the pre-implementation baseline. This is tested.

**Line-by-line changes in the template:**

| Line | Current Inline Value | Change To |
|------|---------------------|-----------|
| 454 | `2025-10-01 to 2025-12-31 <em>(Closed)</em>` | `${data.observationWindow} <em>${data.windowStatus}</em>` |
| 491 | `34827-AFJ` | `${data.patientId}` |
| 493 | `Oct 1, 2025 – Dec 31, 2025` | `${data.observationWindowDisplay}` |
| 504 | `85% (High Reliability)` | `${data.trackingContinuity}` |
| 509 | `Mean 4.2s` | `${data.responseTiming}` |
| 514 | `92%` | `${data.patternStability}` |
| 519 | `Interpretable Capacity Trends` | `${data.verdict}` |
| 530-626 | Inline SVG block | `${data.chartSVG}` |

**SVG extraction:** The existing hardcoded SVG (lines 530-626) is moved verbatim into `GOLDEN_MASTER_CHART_SVG` const. Not a single character changed. The template slot becomes `${data.chartSVG}`.

**What is NOT changed:**
- All CSS (lines 39-432) — FROZEN
- All HTML structure — FROZEN (same elements, same classes, same nesting)
- `@page` size — FROZEN
- Font imports — FROZEN
- Footer/legal/provider sections — FROZEN
- Circle CCI template — NOT TOUCHED in v1 (separate deliverable)
- `getGoldenMasterHTML()` — calls with no `dynamic` param → `data = GOLDEN_CONSTANTS` → byte-identical

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

## Implementation Staging

Implementation is split into two PRs. PR2 MUST NOT begin until PR1 is merged and verified.

### PR1: Compute Layer + Tests Only (No Render Changes)

**Scope:** Add `lib/cci/dynamic/*` — pure computation and tests. Zero changes to any existing file that produces HTML/SVG output.

| Step | File | Action |
|------|------|--------|
| 1 | `lib/cci/dynamic/types.ts` | CREATE — type definitions |
| 2 | `lib/cci/dynamic/compute.ts` | CREATE — pure compute functions |
| 3 | `lib/cci/dynamic/format.ts` | CREATE — string formatters with safety rules |
| 4 | `lib/cci/dynamic/governance.ts` | CREATE — prohibited word scanner |
| 5 | `lib/cci/dynamic/index.ts` | CREATE — module entry point |
| 6 | `lib/cci/dynamic/__tests__/compute.test.ts` | CREATE — unit tests for compute (tests 1-13) |
| 7 | `lib/cci/dynamic/__tests__/format.test.ts` | CREATE — unit tests for format safety (tests 14-15) |
| 8 | `lib/cci/dynamic/__tests__/governance.test.ts` | CREATE — governance compliance test (test 16) |

**PR1 modified existing files (re-exports only — NO render/HTML/SVG changes):**

| File | Change | Risk |
|------|--------|------|
| `lib/cci/types.ts` | Add `export type` re-exports of dynamic types | ZERO — type-only, no runtime effect |
| `lib/cci/index.ts` | Add `export` re-exports of dynamic module API | ZERO — adds exports, changes no existing exports |

**PR1 does NOT touch:**
- `lib/cci/artifact.ts` — NOT MODIFIED
- `lib/cci/summaryChart.ts` — NOT MODIFIED
- `app/cci.tsx` — NOT MODIFIED
- `scripts/cci-export-pdf.js` — NOT MODIFIED
- `scripts/cci-verify-golden.js` — NOT MODIFIED
- `scripts/bundle-cci-export-pdf.ts` — NOT MODIFIED
- `lib/cci/bundleArtifact.ts` — NOT MODIFIED
- Any HTML, CSS, SVG, or print/PDF pipeline file

**PR1 verification — Linux / macOS:**

```bash
# OUTPUT GATE 1: Golden master HTML output hash must be unchanged
node -e "
  const {getGoldenMasterHTML} = require('./lib/cci');
  const crypto = require('crypto');
  console.log('HTML OUTPUT:', crypto.createHash('sha256').update(getGoldenMasterHTML()).digest('hex'));
"
# Must match pre-implementation baseline.

# OUTPUT GATE 2: SVG output hash must be unchanged
node -e "
  const {renderSummaryChartSVG} = require('./lib/cci/summaryChart');
  const crypto = require('crypto');
  const svg = renderSummaryChartSVG([80, 55, 70, 40, 60, 85]);
  console.log('SVG OUTPUT:', crypto.createHash('sha256').update(svg).digest('hex'));
"
# Must match pre-implementation baseline.

# FILE CHECKS: Confirm render files are byte-identical (unchanged)
sha256sum lib/cci/artifact.ts lib/cci/summaryChart.ts app/cci.tsx \
  scripts/cci-export-pdf.js scripts/cci-verify-golden.js \
  scripts/bundle-cci-export-pdf.ts lib/cci/bundleArtifact.ts
# artifact.ts must equal:       fd6fbc833dbd294fe509d0243af1c123db85000551ab31921cb4fbb8d9ec3411
# summaryChart.ts must equal:   e6ef5671edfaef2554cc89224530665a9cb1e06b55ede1d28fdcc943e5380a2e
# app/cci.tsx must equal:        1eaef11478292ad0adece443243711f36ebdf5fb4984fe8c7fcbff2e2df4270f
# cci-export-pdf.js must equal:  039539153ac324ebe006b68a0947d73d5672366d61977502837a64456dc317bc
# cci-verify-golden.js must:     677739a6e886a1626df5dfcc75c7b83943e6182088b4279150ea235280eda369
# bundle-cci-export-pdf.ts must: 0eba18a5a077c7a83bf95e0b002296baf83105802a2ad5e0dbec1bd7e1846be9
# bundleArtifact.ts must equal:  a0f7124b5281b5e44f9cea934dca9c6cd65e490f30e905fe5df29c135f5ccc2c

# RUN TESTS (no build needed)
npx jest lib/cci/dynamic/ --no-cache
```

**PR1 verification — Windows (PowerShell):**

```powershell
# OUTPUT GATE 1: Golden master HTML output hash
node -e "const {getGoldenMasterHTML} = require('./lib/cci'); const crypto = require('crypto'); console.log('HTML OUTPUT:', crypto.createHash('sha256').update(getGoldenMasterHTML()).digest('hex'));"

# OUTPUT GATE 2: SVG output hash
node -e "const {renderSummaryChartSVG} = require('./lib/cci/summaryChart'); const crypto = require('crypto'); const svg = renderSummaryChartSVG([80, 55, 70, 40, 60, 85]); console.log('SVG OUTPUT:', crypto.createHash('sha256').update(svg).digest('hex'));"

# FILE CHECKS: Confirm render files are byte-identical
@(
  "lib/cci/artifact.ts",
  "lib/cci/summaryChart.ts",
  "app/cci.tsx",
  "scripts/cci-export-pdf.js",
  "scripts/cci-verify-golden.js",
  "scripts/bundle-cci-export-pdf.ts",
  "lib/cci/bundleArtifact.ts"
) | ForEach-Object {
  $hash = (Get-FileHash -Algorithm SHA256 -Path $_).Hash
  Write-Output "$hash  $_"
}

# RUN TESTS
npx jest lib/cci/dynamic/ --no-cache
```

---

### PR2: Minimal Wiring in artifact.ts (Output-Hash-Verified)

**Scope:** Wire the compute layer output into `artifact.ts` using the `const data = dynamic ?? GOLDEN_CONSTANTS` pattern. Add `xLabels` option to `summaryChart.ts`.

**PR2 is gated on:** PR1 merged + all PR1 tests passing.

| Step | File | Action |
|------|------|--------|
| 1 | `lib/cci/artifact.ts` | MODIFY — extract `GOLDEN_CONSTANTS`, add `dynamic` param, use `data.xxx` references |
| 2 | `lib/cci/summaryChart.ts` | MODIFY — add optional `xLabels` to `SummaryChartOptions` |
| 3 | `lib/cci/dynamic/__tests__/golden-master.test.ts` | CREATE — golden master sha256 equality test |
| 4 | `lib/cci/dynamic/__tests__/integration.test.ts` | CREATE — integration tests (tests 17-20) |

**PR2 does NOT touch:**
- `app/cci.tsx` — NOT MODIFIED (wiring to screen is a separate step)
- `scripts/cci-export-pdf.js` — NOT MODIFIED
- `scripts/cci-verify-golden.js` — NOT MODIFIED
- `scripts/bundle-cci-export-pdf.ts` — NOT MODIFIED
- `lib/cci/bundleArtifact.ts` — NOT MODIFIED

**PR2 verification (MANDATORY before merge) — Linux / macOS:**

```bash
# ===========================================================
# STEP 1: Capture BEFORE output hashes (run BEFORE applying PR2 changes)
# ===========================================================

# BEFORE — Golden master HTML output
node -e "
  const {getGoldenMasterHTML} = require('./lib/cci');
  const crypto = require('crypto');
  console.log('BEFORE HTML:', crypto.createHash('sha256').update(getGoldenMasterHTML()).digest('hex'));
"

# BEFORE — SVG output with default args (no xLabels)
node -e "
  const {renderSummaryChartSVG} = require('./lib/cci/summaryChart');
  const crypto = require('crypto');
  const svg = renderSummaryChartSVG([80, 55, 70, 40, 60, 85]);
  console.log('BEFORE SVG:', crypto.createHash('sha256').update(svg).digest('hex'));
"

# Save both hashes.

# ===========================================================
# STEP 2: Apply PR2 changes.
# ===========================================================

# ===========================================================
# STEP 3: Capture AFTER output hashes (run AFTER applying PR2 changes)
# ===========================================================

# AFTER — Golden master HTML output
node -e "
  const {getGoldenMasterHTML} = require('./lib/cci');
  const crypto = require('crypto');
  console.log('AFTER HTML:', crypto.createHash('sha256').update(getGoldenMasterHTML()).digest('hex'));
"

# AFTER — SVG output with default args (no xLabels)
node -e "
  const {renderSummaryChartSVG} = require('./lib/cci/summaryChart');
  const crypto = require('crypto');
  const svg = renderSummaryChartSVG([80, 55, 70, 40, 60, 85]);
  console.log('AFTER SVG:', crypto.createHash('sha256').update(svg).digest('hex'));
"

# ===========================================================
# STEP 4: COMPARE
# ===========================================================
# BEFORE HTML hash MUST EQUAL AFTER HTML hash. If not → PR2 REJECTED.
# BEFORE SVG hash MUST EQUAL AFTER SVG hash.  If not → PR2 REJECTED.

# ===========================================================
# STEP 5: File-level checks (secondary — files WILL differ, output must not)
# ===========================================================
sha256sum lib/cci/artifact.ts lib/cci/summaryChart.ts
# These WILL differ from baseline (code was refactored).
# That is EXPECTED. The OUTPUT hashes above are what matters.

# Confirm pipeline/entrypoint files are STILL untouched:
sha256sum app/cci.tsx scripts/cci-export-pdf.js scripts/cci-verify-golden.js \
  scripts/bundle-cci-export-pdf.ts lib/cci/bundleArtifact.ts
# All must match pre-implementation baseline hashes.

# ===========================================================
# STEP 6: Run all tests
# ===========================================================
npx jest lib/cci/dynamic/ --no-cache
```

**PR2 verification — Windows (PowerShell):**

```powershell
# STEP 1: BEFORE output hashes (run BEFORE applying PR2 changes)
node -e "const {getGoldenMasterHTML} = require('./lib/cci'); const crypto = require('crypto'); console.log('BEFORE HTML:', crypto.createHash('sha256').update(getGoldenMasterHTML()).digest('hex'));"
node -e "const {renderSummaryChartSVG} = require('./lib/cci/summaryChart'); const crypto = require('crypto'); const svg = renderSummaryChartSVG([80, 55, 70, 40, 60, 85]); console.log('BEFORE SVG:', crypto.createHash('sha256').update(svg).digest('hex'));"

# STEP 2: Apply PR2 changes.

# STEP 3: AFTER output hashes (run AFTER applying PR2 changes)
node -e "const {getGoldenMasterHTML} = require('./lib/cci'); const crypto = require('crypto'); console.log('AFTER HTML:', crypto.createHash('sha256').update(getGoldenMasterHTML()).digest('hex'));"
node -e "const {renderSummaryChartSVG} = require('./lib/cci/summaryChart'); const crypto = require('crypto'); const svg = renderSummaryChartSVG([80, 55, 70, 40, 60, 85]); console.log('AFTER SVG:', crypto.createHash('sha256').update(svg).digest('hex'));"

# STEP 4: BEFORE HTML == AFTER HTML. BEFORE SVG == AFTER SVG. Else REJECT.

# STEP 5: Pipeline/entrypoint files must be untouched
@(
  "app/cci.tsx",
  "scripts/cci-export-pdf.js",
  "scripts/cci-verify-golden.js",
  "scripts/bundle-cci-export-pdf.ts",
  "lib/cci/bundleArtifact.ts"
) | ForEach-Object {
  $hash = (Get-FileHash -Algorithm SHA256 -Path $_).Hash
  Write-Output "$hash  $_"
}

# STEP 6: Run tests
npx jest lib/cci/dynamic/ --no-cache
```

**PR2 automated golden master test (added in step 3):**

```
test('golden master HTML is byte-identical after refactor', () => {
  const html = getGoldenMasterHTML();
  const hash = crypto.createHash('sha256').update(html).digest('hex');
  expect(hash).toBe(GOLDEN_MASTER_SHA256);  // captured pre-implementation
});

test('summaryChart SVG is byte-identical with default args', () => {
  const svg = renderSummaryChartSVG([80, 55, 70, 40, 60, 85]);
  const hash = crypto.createHash('sha256').update(svg).digest('hex');
  expect(hash).toBe(GOLDEN_MASTER_SVG_SHA256);  // captured pre-implementation
});
```

These tests run on every commit. If anyone modifies `artifact.ts` or `summaryChart.ts` in a way that changes the golden master output, the test fails immediately.

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

### PR1 — Compute Layer (Zero Render Changes)

**5 new files** created in `lib/cci/dynamic/`:
- `types.ts` — Type definitions
- `compute.ts` — Pure computation (8 functions)
- `format.ts` — String formatting with safety (7 functions)
- `governance.ts` — Prohibited word scanner
- `index.ts` — Module entry point

**3 new test files** in `lib/cci/dynamic/__tests__/`:
- `compute.test.ts` — Compute unit tests
- `format.test.ts` — Format safety tests
- `governance.test.ts` — Governance compliance tests

**2 existing files** modified (re-exports only):
- `lib/cci/index.ts` — Add export of dynamic module API
- `lib/cci/types.ts` — Add type re-exports

**PR1 touches ZERO render/HTML/SVG files.** `artifact.ts` and `summaryChart.ts` are unchanged. sha256 verification required.

### PR2 — Minimal Wiring (sha256-Verified)

**2 existing files** modified:
- `lib/cci/artifact.ts` — Extract `GOLDEN_CONSTANTS`, add `dynamic` param, use `const data = dynamic ?? GOLDEN_CONSTANTS`
- `lib/cci/summaryChart.ts` — Add optional `xLabels` to `SummaryChartOptions`

**2 new test files:**
- `golden-master.test.ts` — sha256 equality assertion
- `integration.test.ts` — Dynamic HTML structure tests

**PR2 GATE:** `getGoldenMasterHTML()` output sha256 MUST match pre-implementation baseline. If hashes differ, PR2 is rejected. No exceptions.

### Invariant

The golden master is preserved by the `const data = dynamic ?? GOLDEN_CONSTANTS` pattern: when `dynamic` is `undefined` (which is ALWAYS the case for `getGoldenMasterHTML()`), `data` IS `GOLDEN_CONSTANTS` — the identical hardcoded values that exist inline today. The template output is byte-identical. This is enforced by an automated sha256 test that runs on every commit.
