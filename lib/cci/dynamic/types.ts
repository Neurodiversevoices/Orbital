/**
 * Dynamic CCI v1 — Type Definitions
 *
 * Pure type declarations for the CCI compute layer.
 * No runtime code. No imports from artifact.ts or rendering modules.
 */

// =============================================================================
// COMPUTE CONFIG
// =============================================================================

export interface CCIComputeConfig {
  /** Observation window start (YYYY-MM-DD) */
  windowStart: string;
  /** Observation window end (YYYY-MM-DD) */
  windowEnd: string;
  /** Minimum unique days with at least one entry required (Phase 3 gate). Default: 90. */
  minimumDays: number;
  /** Seed for deterministic anonymized patient ID generation */
  patientIdSeed?: string;
}

// =============================================================================
// COMPUTED DATA (raw numbers)
// =============================================================================

export interface CCIMonthlyBreakdown {
  /** Month identifier (YYYY-MM) */
  month: string;
  /** Number of signals in this month */
  signalCount: number;
  /** Pattern stability 0-100 */
  stability: number;
  /** Volatility 0-100 */
  volatility: number;
  /** State distribution counts */
  distribution: {
    resourced: number;
    stretched: number;
    depleted: number;
  };
}

export interface CCIDynamicData {
  // Observation window
  observationStart: string;
  observationEnd: string;
  windowStatus: 'open' | 'closed';

  // Patient identification
  patientId: string;

  // Tracking continuity
  totalDaysInWindow: number;
  daysWithEntries: number;
  trackingContinuityPercent: number;
  trackingContinuityRating: 'high' | 'moderate' | 'low';

  // Stability & volatility
  patternStabilityPercent: number;
  volatilityRaw: number;

  // Verdict
  verdict: string;

  // Chart data (6 downsampled values, 0-100 scale)
  chartValues: number[];

  // X-axis labels (month abbreviations)
  chartXLabels: [string, string, string];

  // Monthly breakdown
  monthlyBreakdown: CCIMonthlyBreakdown[];

  // Overall distribution
  overallDistribution: {
    resourced: number;
    stretched: number;
    depleted: number;
    total: number;
  };

  // Signal count
  totalSignals: number;
}

// =============================================================================
// FORMATTED STRINGS (display-ready)
// =============================================================================

export interface CCIFormattedStrings {
  /** "YYYY-MM-DD to YYYY-MM-DD" */
  observationWindow: string;
  /** "Mon D, YYYY – Mon D, YYYY" */
  observationWindowDisplay: string;
  /** "(Closed)" or "(Open)" */
  windowStatus: string;
  /** "NNNNN-AAA" */
  patientId: string;
  /** "78% (Moderate Reliability)" */
  trackingContinuity: string;
  /** "Mean 4.2s" — HARDCODED in v1 */
  responseTiming: string;
  /** "84%" */
  patternStability: string;
  /** "Interpretable Capacity Trends" */
  verdict: string;
  /** Complete <svg>...</svg> string */
  chartSVG: string;
  /** Month abbreviations for x-axis */
  chartXLabels: [string, string, string];
}
