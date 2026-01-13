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
 * System state classification (legacy)
 */
export type SystemState =
  | 'baseline'
  | 'elevated'
  | 'sustained_volatility'
  | 'critical';

// =============================================================================
// SENTINEL STATE — EXECUTIVE SAFETY-CRITICAL (STATE FIRST)
// =============================================================================

/**
 * SentinelState — Single enum drives entire screen render
 * Must be resolved BEFORE chart renders.
 */
export type SentinelState = 'CALM' | 'DEGRADED' | 'BREACH_CONFIRMED' | 'RECOVERING';

/**
 * RenderMode contract — keyed by SentinelState
 * Controls all visual aspects of the Sentinel screen.
 */
export interface SentinelRenderMode {
  /** Banner background color */
  bannerBg: string;
  /** Banner text color */
  bannerText: string;
  /** Banner label (shown after "SYSTEM STATE:") */
  bannerLabel: string;
  /** Whether alert window is present */
  alertWindowPresent: boolean;
  /** Alert window opacity (0 = hidden, 1 = dominant) */
  alertWindowOpacity: number;
  /** Line color for pre-trigger segments */
  lineColorPre: string;
  /** Line color for post-trigger segments (breach only) */
  lineColorPost: string;
  /** Whether to show trigger annotation */
  showAnnotation: boolean;
}

/**
 * RENDER MODE CONTRACT — STATE → VISUAL MAPPING
 * Non-negotiable. Do not add gradients or decorative variations.
 */
export const RENDER_MODES: Record<SentinelState, SentinelRenderMode> = {
  CALM: {
    bannerBg: 'rgba(34, 211, 238, 0.15)',
    bannerText: 'rgba(34, 211, 238, 0.95)',
    bannerLabel: 'MONITORING',
    alertWindowPresent: false,
    alertWindowOpacity: 0,
    lineColorPre: 'rgba(34, 211, 238, 0.9)',   // cyan
    lineColorPost: 'rgba(34, 211, 238, 0.9)',  // cyan (no breach)
    showAnnotation: false,
  },
  DEGRADED: {
    bannerBg: 'rgba(245, 180, 60, 0.18)',
    bannerText: 'rgba(245, 180, 60, 0.95)',
    bannerLabel: 'ELEVATED',
    alertWindowPresent: true,
    alertWindowOpacity: 0.12,
    lineColorPre: 'rgba(245, 180, 60, 0.9)',   // amber
    lineColorPost: 'rgba(245, 180, 60, 0.9)',  // amber (no red)
    showAnnotation: false,
  },
  BREACH_CONFIRMED: {
    bannerBg: 'rgba(248, 113, 113, 0.22)',
    bannerText: 'rgba(248, 113, 113, 0.95)',
    bannerLabel: 'BASELINE BREACH CONFIRMED',
    alertWindowPresent: true,
    alertWindowOpacity: 0.25,
    lineColorPre: 'rgba(245, 180, 60, 0.9)',   // amber pre-trigger
    lineColorPost: 'rgba(248, 113, 113, 0.9)', // red post-trigger
    showAnnotation: true,
  },
  RECOVERING: {
    bannerBg: 'rgba(245, 180, 60, 0.15)',
    bannerText: 'rgba(245, 180, 60, 0.90)',
    bannerLabel: 'RECOVERING',
    alertWindowPresent: true,
    alertWindowOpacity: 0.08,
    lineColorPre: 'rgba(245, 180, 60, 0.9)',   // amber
    lineColorPost: 'rgba(34, 211, 238, 0.9)',  // cyan (trending toward calm)
    showAnnotation: false,
  },
};

/**
 * Derive SentinelState from legacy SystemState and data
 */
export function deriveSentinelState(
  systemState: SystemState,
  consecutiveDays: number,
  isRecovering: boolean = false
): SentinelState {
  if (isRecovering) return 'RECOVERING';

  switch (systemState) {
    case 'critical':
    case 'sustained_volatility':
      return 'BREACH_CONFIRMED';
    case 'elevated':
      return 'DEGRADED';
    case 'baseline':
    default:
      return 'CALM';
  }
}

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
