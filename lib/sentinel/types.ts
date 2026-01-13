/**
 * Sentinel Types — Phase 2 Scaffolding
 *
 * GOVERNANCE: These types support future Sentinel implementation.
 * Currently NOT rendered — PNG is the golden master visual.
 *
 * DO NOT ACTIVATE without governance review.
 */

/**
 * Sentinel scope levels
 */
export type SentinelScope = 'personal' | 'organization' | 'global';

/**
 * System state classification
 */
export type SystemState =
  | 'baseline'
  | 'elevated'
  | 'sustained_volatility'
  | 'critical';

/**
 * Volatility trend data point
 */
export interface VolatilityDataPoint {
  /** Days relative to now (negative = past) */
  dayOffset: number;
  /** Normalized volatility value (0-100) */
  value: number;
  /** Whether this point exceeds baseline */
  exceedsBaseline: boolean;
}

/**
 * Sentinel trigger event
 */
export interface SentinelTrigger {
  /** When the sentinel was triggered */
  triggeredAt: Date;
  /** Days above baseline at trigger */
  daysAboveBaseline: number;
  /** Peak volatility value */
  peakValue: number;
}

/**
 * Assessment item
 */
export interface AssessmentItem {
  /** Assessment text */
  text: string;
  /** Severity level */
  severity: 'info' | 'warning' | 'critical';
}

/**
 * Full Sentinel dashboard data
 */
export interface SentinelData {
  /** Scope of this data */
  scope: SentinelScope;
  /** Cohort label (e.g., "Grade 8 - District A") */
  cohortLabel: string;
  /** Current system state */
  systemState: SystemState;
  /** Consecutive days above baseline */
  consecutiveDaysAboveBaseline: number;
  /** Volatility trend data (last 14 days) */
  volatilityTrend: VolatilityDataPoint[];
  /** Baseline value for comparison */
  baselineValue: number;
  /** Current trigger (if any) */
  currentTrigger: SentinelTrigger | null;
  /** Assessment items */
  assessments: AssessmentItem[];
  /** Whether this is demo/synthetic data */
  isDemo: boolean;
  /** Sample size (for synthetic data) */
  sampleSize?: number;
  /** Age cohort label (for global scope) */
  ageCohort?: string;
}

/**
 * Sentinel configuration
 */
export interface SentinelConfig {
  /** Days of history to show */
  historyDays: number;
  /** Baseline threshold for alerts */
  baselineThreshold: number;
  /** Days above baseline to trigger */
  triggerDays: number;
}

/**
 * Default configuration
 */
export const DEFAULT_SENTINEL_CONFIG: SentinelConfig = {
  historyDays: 14,
  baselineThreshold: 50,
  triggerDays: 5,
};
