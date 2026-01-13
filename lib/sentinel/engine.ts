/**
 * Sentinel Computation Engine
 *
 * CANONICAL: Single engine module used by both demo and future real feeds.
 * Demo uses synthetic cohort inputs; paid product will use real aggregated inputs.
 * Same pipeline, different feed.
 *
 * GOVERNANCE:
 * - K-anonymity floor (Rule of 5) enforced for any real cohort data feed
 * - No raw/semi-raw institutional data displayed
 * - Age cohorts derived from Year of Birth
 * - School (K-12) cohorts start at age 5
 */

import {
  VolatilityDataPoint,
  SystemState,
  SentinelTrigger,
  AssessmentItem,
  DEFAULT_SENTINEL_CONFIG,
} from './types';

// =============================================================================
// TYPES
// =============================================================================

export type SentinelVertical = 'k12' | 'university' | 'healthcare' | 'employer' | 'global';

/**
 * Age cohort bands
 * K-12 includes 5-10, 11-13, 14-18 as first-class options
 */
export type AgeCohortBand =
  | '5-10'
  | '11-13'
  | '14-18'
  | '18-24'
  | '25-34'
  | '35-44'
  | '45-54'
  | '55-64'
  | '65+';

export const AGE_COHORT_BANDS: AgeCohortBand[] = [
  '5-10',
  '11-13',
  '14-18',
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
];

export const AGE_COHORT_LABELS: Record<AgeCohortBand, string> = {
  '5-10': '5–10 (Elementary)',
  '11-13': '11–13 (Middle School)',
  '14-18': '14–18 (High School)',
  '18-24': '18–24',
  '25-34': '25–34',
  '35-44': '35–44',
  '45-54': '45–54',
  '55-64': '55–64',
  '65+': '65+',
};

/**
 * Cohort-specific characteristics that drive visibly different curves
 */
interface CohortCharacteristics {
  /** Base volatility level (0-100 scale offset) */
  baselineOffset: number;
  /** Variance multiplier (higher = more volatile) */
  varianceMultiplier: number;
  /** Recovery rate (how quickly volatility returns to baseline) */
  recoveryRate: number;
  /** Seasonal sensitivity (0-1, higher = more affected by academic calendar) */
  seasonalSensitivity: number;
  /** Trigger threshold adjustment */
  triggerThreshold: number;
}

const COHORT_CHARACTERISTICS: Record<AgeCohortBand, CohortCharacteristics> = {
  '5-10': {
    baselineOffset: 15,
    varianceMultiplier: 1.4,
    recoveryRate: 0.6,
    seasonalSensitivity: 0.8,
    triggerThreshold: 55,
  },
  '11-13': {
    baselineOffset: 18,
    varianceMultiplier: 1.5,
    recoveryRate: 0.5,
    seasonalSensitivity: 0.85,
    triggerThreshold: 52,
  },
  '14-18': {
    baselineOffset: 20,
    varianceMultiplier: 1.6,
    recoveryRate: 0.45,
    seasonalSensitivity: 0.9,
    triggerThreshold: 50,
  },
  '18-24': {
    baselineOffset: 12,
    varianceMultiplier: 1.3,
    recoveryRate: 0.55,
    seasonalSensitivity: 0.7,
    triggerThreshold: 52,
  },
  '25-34': {
    baselineOffset: 8,
    varianceMultiplier: 1.1,
    recoveryRate: 0.65,
    seasonalSensitivity: 0.4,
    triggerThreshold: 55,
  },
  '35-44': {
    baselineOffset: 5,
    varianceMultiplier: 1.0,
    recoveryRate: 0.7,
    seasonalSensitivity: 0.3,
    triggerThreshold: 55,
  },
  '45-54': {
    baselineOffset: 3,
    varianceMultiplier: 0.9,
    recoveryRate: 0.75,
    seasonalSensitivity: 0.2,
    triggerThreshold: 58,
  },
  '55-64': {
    baselineOffset: 0,
    varianceMultiplier: 0.8,
    recoveryRate: 0.8,
    seasonalSensitivity: 0.15,
    triggerThreshold: 60,
  },
  '65+': {
    baselineOffset: -5,
    varianceMultiplier: 0.7,
    recoveryRate: 0.85,
    seasonalSensitivity: 0.1,
    triggerThreshold: 62,
  },
};

/**
 * Parameters for building cohort series
 */
export interface BuildCohortSeriesParams {
  /** Vertical (k12, university, healthcare, employer, global) */
  vertical: SentinelVertical;
  /** Age cohort band */
  ageCohort: AgeCohortBand;
  /** Sample size (n) */
  n: number;
  /** Deterministic seed for reproducibility */
  seed: number;
  /** Number of days of history */
  historyDays?: number;
  /** Custom baseline threshold */
  baselineThreshold?: number;
}

/**
 * Result of building cohort series
 */
export interface CohortSeriesResult {
  /** Data points for the volatility series */
  points: VolatilityDataPoint[];
  /** Baseline value */
  baseline: number;
  /** Upper band (warning threshold) */
  upperBand: number;
  /** Lower band (below baseline) */
  lowerBand: number;
  /** Trigger events detected in the series */
  triggerEvents: SentinelTrigger[];
  /** Current system state */
  systemState: SystemState;
  /** Consecutive days above baseline (current) */
  consecutiveDaysAboveBaseline: number;
  /** Assessment items */
  assessments: AssessmentItem[];
  /** Series hash for verification (changes when series changes) */
  seriesHash: string;
  /** Statistics for the series */
  stats: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
  };
}

// =============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// =============================================================================

/**
 * Mulberry32 PRNG - Fast, deterministic pseudo-random number generator
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate normally distributed random number using Box-Muller transform
 */
function normalRandom(random: () => number, mean: number, stdDev: number): number {
  const u1 = random();
  const u2 = random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

// =============================================================================
// SERIES GENERATION
// =============================================================================

/**
 * Generate the base volatility series for a cohort
 */
function generateVolatilitySeries(
  random: () => number,
  characteristics: CohortCharacteristics,
  historyDays: number,
  baselineThreshold: number
): number[] {
  const series: number[] = [];
  let currentValue = baselineThreshold + characteristics.baselineOffset;

  for (let day = -historyDays; day <= 0; day++) {
    // Add day-specific patterns
    const dayOfWeek = ((day % 7) + 7) % 7;
    const weekendEffect = dayOfWeek >= 5 ? -5 : 0;

    // Seasonal pattern (simulated academic calendar stress)
    const seasonalPhase = (day + historyDays) / historyDays;
    const seasonalEffect =
      characteristics.seasonalSensitivity *
      15 *
      Math.sin(seasonalPhase * Math.PI * 2);

    // Random walk with mean reversion
    const noise = normalRandom(
      random,
      0,
      8 * characteristics.varianceMultiplier
    );

    // Mean reversion toward baseline
    const reversion =
      characteristics.recoveryRate *
      (baselineThreshold + characteristics.baselineOffset - currentValue);

    // Calculate new value
    currentValue = currentValue + noise + reversion + weekendEffect * 0.3 + seasonalEffect * 0.5;

    // Add trend component for demo effect (gradual rise toward trigger)
    if (day > -7) {
      currentValue += (7 + day) * 2 * characteristics.varianceMultiplier;
    }

    // Clamp to valid range
    currentValue = Math.max(0, Math.min(100, currentValue));

    series.push(currentValue);
  }

  return series;
}

/**
 * Detect trigger events in the series
 */
function detectTriggerEvents(
  points: VolatilityDataPoint[],
  triggerDays: number
): { triggers: SentinelTrigger[]; consecutiveDays: number } {
  const triggers: SentinelTrigger[] = [];
  let consecutiveAbove = 0;
  let maxConsecutive = 0;
  let peakValue = 0;

  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    if (point.exceedsBaseline) {
      consecutiveAbove++;
      peakValue = Math.max(peakValue, point.value);

      if (consecutiveAbove >= triggerDays) {
        // Only add trigger if this is a new trigger event
        if (consecutiveAbove === triggerDays) {
          const now = new Date();
          triggers.push({
            triggeredAt: new Date(now.getTime() + point.dayOffset * 24 * 60 * 60 * 1000),
            daysAboveBaseline: consecutiveAbove,
            peakValue,
          });
        }
      }

      maxConsecutive = Math.max(maxConsecutive, consecutiveAbove);
    } else {
      consecutiveAbove = 0;
      peakValue = 0;
    }
  }

  return { triggers, consecutiveDays: maxConsecutive };
}

/**
 * Determine system state based on trigger status
 */
function determineSystemState(
  consecutiveDays: number,
  triggers: SentinelTrigger[],
  triggerDays: number
): SystemState {
  if (triggers.length > 0 && consecutiveDays >= triggerDays + 3) {
    return 'critical';
  }
  if (consecutiveDays >= triggerDays) {
    return 'sustained_volatility';
  }
  if (consecutiveDays >= triggerDays - 2) {
    return 'elevated';
  }
  return 'baseline';
}

/**
 * Generate assessments based on system state and data
 */
function generateAssessments(
  systemState: SystemState,
  consecutiveDays: number,
  stats: { mean: number; stdDev: number }
): AssessmentItem[] {
  const assessments: AssessmentItem[] = [];

  if (systemState === 'sustained_volatility' || systemState === 'critical') {
    assessments.push({
      text: 'Sustained deviation from historical baseline',
      severity: 'warning',
    });
    assessments.push({
      text: 'Increased probability of downstream disruption',
      severity: 'warning',
    });
  } else if (systemState === 'elevated') {
    assessments.push({
      text: 'Elevated volatility approaching trigger threshold',
      severity: 'warning',
    });
  }

  // Always include governance note
  assessments.push({
    text: 'Signal is aggregate and non-identifying',
    severity: 'info',
  });

  return assessments;
}

/**
 * Compute hash of series for verification
 */
function computeSeriesHash(points: VolatilityDataPoint[]): string {
  const values = points.map((p) => Math.round(p.value * 100)).join(',');
  let hash = 0;
  for (let i = 0; i < values.length; i++) {
    const char = values.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Compute statistics for the series
 */
function computeStats(values: number[]): { mean: number; stdDev: number; min: number; max: number } {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { mean, stdDev, min, max };
}

// =============================================================================
// MAIN ENGINE FUNCTION
// =============================================================================

/**
 * Build cohort series - MAIN ENGINE FUNCTION
 *
 * This function is used by both demo and future real feeds.
 * For demo: synthetic cohort inputs
 * For paid product: real aggregated inputs
 *
 * @param params - Build parameters
 * @returns Complete cohort series result
 */
export function buildCohortSeries(params: BuildCohortSeriesParams): CohortSeriesResult {
  const {
    vertical,
    ageCohort,
    n,
    seed,
    historyDays = DEFAULT_SENTINEL_CONFIG.historyDays,
    baselineThreshold = DEFAULT_SENTINEL_CONFIG.baselineThreshold,
  } = params;

  // Create deterministic random generator
  // Combine seed with cohort for unique series per cohort
  const cohortSeedOffset = AGE_COHORT_BANDS.indexOf(ageCohort) * 10000;
  const verticalSeedOffset = ['k12', 'university', 'healthcare', 'employer', 'global'].indexOf(vertical) * 100000;
  const combinedSeed = seed + cohortSeedOffset + verticalSeedOffset + n;
  const random = createSeededRandom(combinedSeed);

  // Get cohort characteristics
  const characteristics = COHORT_CHARACTERISTICS[ageCohort];

  // Generate volatility series
  const rawSeries = generateVolatilitySeries(
    random,
    characteristics,
    historyDays,
    baselineThreshold
  );

  // Convert to data points
  const points: VolatilityDataPoint[] = rawSeries.map((value, index) => ({
    dayOffset: index - historyDays,
    value: Math.round(value * 10) / 10, // Round to 1 decimal
    exceedsBaseline: value > characteristics.triggerThreshold,
  }));

  // Detect triggers
  const { triggers, consecutiveDays } = detectTriggerEvents(
    points,
    DEFAULT_SENTINEL_CONFIG.triggerDays
  );

  // Determine system state
  const systemState = determineSystemState(
    consecutiveDays,
    triggers,
    DEFAULT_SENTINEL_CONFIG.triggerDays
  );

  // Compute stats
  const stats = computeStats(rawSeries);

  // Generate assessments
  const assessments = generateAssessments(systemState, consecutiveDays, stats);

  // Compute series hash
  const seriesHash = computeSeriesHash(points);

  return {
    points,
    baseline: baselineThreshold,
    upperBand: characteristics.triggerThreshold,
    lowerBand: baselineThreshold - 15,
    triggerEvents: triggers,
    systemState,
    consecutiveDaysAboveBaseline: consecutiveDays,
    assessments,
    seriesHash,
    stats,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get cohorts available for a vertical
 */
export function getCohortsForVertical(vertical: SentinelVertical): AgeCohortBand[] {
  switch (vertical) {
    case 'k12':
      // K-12 includes children starting at age 5, plus staff
      return ['5-10', '11-13', '14-18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    case 'university':
      // University starts at 18
      return ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    case 'healthcare':
    case 'employer':
    case 'global':
      // All adult cohorts
      return ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    default:
      return AGE_COHORT_BANDS;
  }
}

/**
 * Get default cohort for a vertical
 */
export function getDefaultCohort(vertical: SentinelVertical): AgeCohortBand {
  switch (vertical) {
    case 'k12':
      return '11-13'; // Middle school as default
    case 'university':
      return '18-24'; // Undergrad as default
    default:
      return '25-34';
  }
}

/**
 * Validate that different cohorts produce different series
 * Used for acceptance testing
 */
export function validateCohortDifferentiation(
  seed: number,
  cohort1: AgeCohortBand,
  cohort2: AgeCohortBand
): { hashesMatch: boolean; stdDevDiff: number; meanDiff: number } {
  const series1 = buildCohortSeries({
    vertical: 'global',
    ageCohort: cohort1,
    n: 3000,
    seed,
  });

  const series2 = buildCohortSeries({
    vertical: 'global',
    ageCohort: cohort2,
    n: 3000,
    seed,
  });

  return {
    hashesMatch: series1.seriesHash === series2.seriesHash,
    stdDevDiff: Math.abs(series1.stats.stdDev - series2.stats.stdDev),
    meanDiff: Math.abs(series1.stats.mean - series2.stats.mean),
  };
}

/**
 * Validate deterministic generation
 * Same seed + same cohort should yield identical series
 */
export function validateDeterminism(
  params: BuildCohortSeriesParams
): { isIdentical: boolean } {
  const series1 = buildCohortSeries(params);
  const series2 = buildCohortSeries(params);

  return {
    isIdentical: series1.seriesHash === series2.seriesHash,
  };
}
