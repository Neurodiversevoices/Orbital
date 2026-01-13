/**
 * Quarterly Capacity Report (QCR) Types
 *
 * Clinical-style quarterly summary of capacity patterns.
 * Institutional/archival tone — no wellness language.
 *
 * Pricing: $149/quarter (institutional tier — no consumer discount)
 */

import { CapacityState, Category, Tag } from '../../types';

// =============================================================================
// QCR DATA STRUCTURES
// =============================================================================

export interface QCRPeriod {
  /** Quarter identifier: e.g., "2025-Q4" */
  quarterId: string;
  /** Observation period start (timestamp) */
  startDate: number;
  /** Observation period end (timestamp) */
  endDate: number;
  /** Human-readable date range */
  dateRangeLabel: string;
}

export interface QCRRecordDepth {
  /** Total capacity observations in period */
  totalObservations: number;
  /** Unique days with at least one observation */
  uniqueDays: number;
  /** Days in the period */
  periodDays: number;
  /** Coverage percentage: uniqueDays / periodDays */
  coveragePercent: number;
  /** Qualitative assessment */
  coverageLevel: 'sparse' | 'moderate' | 'consistent' | 'comprehensive';
}

export interface QCRDistribution {
  /** Percentage of observations in resourced state */
  resourcedPercent: number;
  /** Percentage of observations in stretched state */
  stretchedPercent: number;
  /** Percentage of observations in depleted state */
  depletedPercent: number;
  /** Raw counts */
  counts: {
    resourced: number;
    stretched: number;
    depleted: number;
  };
}

export interface QCRPatternMetric {
  /** Metric identifier */
  id: 'stability' | 'volatility' | 'recovery_lag';
  /** Display label */
  label: string;
  /** Score 0-100 */
  score: number;
  /** Qualitative level */
  level: 'low' | 'moderate' | 'high';
  /** Clinical-style description */
  description: string;
}

export interface QCRDriverCorrelation {
  /** Driver tag */
  driver: Tag;
  /** Category if applicable */
  category: Category | null;
  /** Total occurrences in period */
  occurrences: number;
  /** Percentage of observations with this driver */
  frequency: number;
  /** Correlation with depleted state (0-1) */
  depletionCorrelation: number;
  /** Is this a top depleter? */
  isTopDepleter: boolean;
}

export interface QCRWeekStructure {
  /** Day with highest depletion rate */
  hardestDay: {
    dayOfWeek: number;
    dayName: string;
    depletionRate: number;
  };
  /** Day-of-week variance */
  dayOfWeekVariance: number;
  /** Time-of-day patterns */
  timeOfDay: {
    morning: { avgCapacity: number; observations: number };
    afternoon: { avgCapacity: number; observations: number };
    evening: { avgCapacity: number; observations: number };
  };
  /** Most vulnerable time slot */
  vulnerableTimeSlot: 'morning' | 'afternoon' | 'evening' | null;
}

export interface QCRNotableEpisode {
  /** Episode identifier */
  id: string;
  /** Start date */
  startDate: number;
  /** End date */
  endDate: number;
  /** Duration in days */
  durationDays: number;
  /** Episode type */
  type: 'depletion_cluster' | 'recovery_period' | 'stability_window';
  /** Neutral description */
  description: string;
  /** Associated drivers if any */
  associatedDrivers: Tag[];
}

export interface QCRClinicalNote {
  /** Note category */
  category: 'observation' | 'consideration' | 'pattern_note';
  /** Note text — neutral, non-diagnostic */
  text: string;
  /** Priority for display order */
  priority: number;
}

// =============================================================================
// CAPACITY COMPOSITION & CORRELATIONS (Pro Intelligence)
// =============================================================================

/**
 * Capacity Composition - Quarter-level breakdown of signal contributions
 * Shows how each input contributes to the composite Capacity Index.
 */
export interface QCRCapacityComposition {
  /** Sleep quality impact on capacity (-100 to +100, negative = depleting) */
  sleepImpact: number;
  /** Energy level impact on capacity */
  energyImpact: number;
  /** Cognitive/Brain load impact on capacity */
  brainImpact: number;
  /** Subjective self-report impact on capacity */
  subjectiveImpact: number;
  /** Qualitative summary of composition */
  summary: {
    sleep: 'depleting' | 'neutral' | 'compensatory';
    energy: 'depleting' | 'neutral' | 'compensatory';
    brain: 'depleting' | 'neutral' | 'compensatory';
    subjective: 'depleting' | 'neutral' | 'compensatory';
  };
}

/**
 * Event-Level Correlation Callout
 * Identifies the lowest weekly mean and explains contributing factors.
 */
export interface QCREventCorrelation {
  /** Week number (1-13) */
  weekNumber: number;
  /** Week start date */
  weekStart: number;
  /** Week end date */
  weekEnd: number;
  /** Mean capacity that week */
  meanCapacity: number;
  /** Contributing factors analysis */
  contributingFactors: {
    /** Sleep debt change in preceding 10 days (percentage) */
    sleepDebtChange: number;
    /** Energy variance relative to baseline */
    energyVariance: 'below_baseline' | 'within_baseline' | 'above_baseline';
    /** Cognitive load status */
    cognitiveLoad: 'elevated' | 'stable' | 'reduced';
    /** Primary driver of decline */
    primaryDriver: 'sleep' | 'energy' | 'cognitive' | 'demand' | 'social' | 'mixed';
  };
  /** Deterministic conclusion statement */
  conclusion: string;
}

// =============================================================================
// CHART DATA STRUCTURES
// =============================================================================

export interface QCRDailyCapacityPoint {
  /** Date of observation */
  date: Date;
  /** Normalized capacity index 0-100 */
  capacityIndex: number;
  /** Number of observations that day */
  observationCount: number;
}

export interface QCRWeeklyMeanPoint {
  /** Week start date */
  weekStart: Date;
  /** Week end date */
  weekEnd: Date;
  /** Mean capacity for the week 0-100 */
  meanCapacity: number;
  /** Standard deviation */
  stdDev: number;
  /** Number of observations */
  observationCount: number;
}

export interface QCRDriverFrequencyPoint {
  /** Driver category */
  driver: 'sensory' | 'demand' | 'social';
  /** Total occurrences */
  count: number;
  /** Percentage of total tagged observations */
  percentage: number;
  /** Strain rate when this driver present */
  strainRate: number;
}

export interface QCRStateDistributionPoint {
  /** Capacity state */
  state: 'resourced' | 'stretched' | 'depleted';
  /** Count */
  count: number;
  /** Percentage */
  percentage: number;
}

export interface QCRChartData {
  /** Daily capacity index for time-series chart */
  dailyCapacity: QCRDailyCapacityPoint[];
  /** Weekly aggregated data for trend chart */
  weeklyMeans: QCRWeeklyMeanPoint[];
  /** Driver frequency distribution */
  driverFrequency: QCRDriverFrequencyPoint[];
  /** State distribution */
  stateDistribution: QCRStateDistributionPoint[];
}

// =============================================================================
// CHAIN OF CUSTODY & DATA INTEGRITY (Forensic Infrastructure)
// =============================================================================

/**
 * Chain of Custody metadata for forensic-grade artifact provenance.
 * Establishes immutability and auditability for clinical/legal contexts.
 */
export interface QCRChainOfCustody {
  /** SHA-256 hash of report content (excluding this field) */
  integrityHash: string;
  /** Protocol version used for generation */
  protocolVersion: string;
  /** Generation timestamp (ISO 8601) */
  generatedTimestamp: string;
  /** Observation window start (ISO 8601) */
  observationWindowStart: string;
  /** Observation window end (ISO 8601) */
  observationWindowEnd: string;
  /** Report status - always IMMUTABLE after generation */
  status: 'IMMUTABLE_SNAPSHOT';
  /** Source system identifier */
  sourceSystem: 'Orbital Capacity Intelligence Platform';
  /** Data provenance attestation */
  dataProvenance: 'Client-reported capacity observations';
}

/**
 * Signal Fidelity Audit - the "lab test" section that cannot be replicated.
 * Provides objective metrics on data quality and reliability.
 */
export interface QCRSignalFidelity {
  /**
   * Compliance Rate: % of expected check-ins completed
   * High (>80%), Moderate (60-80%), Low (<60%)
   */
  complianceRate: {
    value: number;
    level: 'High Reliability' | 'Moderate Reliability' | 'Low Reliability';
  };

  /**
   * Input Latency: Mean time between prompt and response (seconds)
   * Consistent with thoughtful reporting: 3-10s
   * Rapid (possibly reflexive): <3s
   * Delayed (possibly interrupted): >10s
   */
  inputLatency: {
    meanSeconds: number;
    interpretation: 'Consistent with thoughtful reporting' | 'Rapid response pattern' | 'Delayed response pattern';
  };

  /**
   * Pattern Consistency: Statistical measure of response coherence
   * Higher = less random, more reliable signal
   */
  patternConsistency: {
    value: number;
    interpretation: 'Low probability of random entry' | 'Moderate coherence' | 'High variance detected';
  };

  /**
   * Session Completion Rate: % of started sessions completed
   */
  sessionCompletionRate: {
    value: number;
    level: 'Complete' | 'Partial' | 'Incomplete';
  };

  /**
   * Overall verdict on clinical reliability
   */
  verdict: 'CLINICALLY RELIABLE SIGNAL' | 'ACCEPTABLE SIGNAL QUALITY' | 'SIGNAL QUALITY CONCERNS';

  /**
   * Narrative summary for providers
   */
  narrativeSummary: string;
}

/**
 * Provider Shield footer - liability-safe attestation language
 */
export interface QCRProviderShield {
  /** Utility statement for clinical context */
  utilityStatement: string;
  /** Liability disclaimer */
  liabilityDisclaimer: string;
  /** Data handling notice */
  dataHandlingNotice: string;
  /** IP ownership statement */
  ipOwnership: string;
}

// =============================================================================
// MAIN QCR REPORT
// =============================================================================

export interface QuarterlyCapacityReport {
  /** Report ID */
  id: string;
  /** Report version */
  version: '1.0';
  /** Generation timestamp */
  generatedAt: number;
  /** Is this demo data? */
  isDemoReport: boolean;

  // Period
  period: QCRPeriod;

  // Record Depth
  recordDepth: QCRRecordDepth;

  // Summary Metrics
  distribution: QCRDistribution;

  // Pattern Metrics
  patternMetrics: QCRPatternMetric[];

  // Driver Correlations
  drivers: {
    all: QCRDriverCorrelation[];
    topOverall: QCRDriverCorrelation[];
    topDepleters: QCRDriverCorrelation[];
  };

  // Week Structure
  weekStructure: QCRWeekStructure;

  // Notable Episodes
  notableEpisodes: QCRNotableEpisode[];

  // Clinical Notes
  clinicalNotes: QCRClinicalNote[];

  // Chart Data for Visualization
  chartData: QCRChartData;

  // Capacity Composition (Pro Intelligence)
  capacityComposition?: QCRCapacityComposition;

  // Event-Level Correlation (Pro Intelligence)
  eventCorrelation?: QCREventCorrelation;

  // Longitudinal Context
  longitudinalContext: {
    /** Total record depth in days */
    totalRecordDays: number;
    /** Is this the first quarter? */
    isFirstQuarter: boolean;
    /** Comparison to previous quarter if available */
    previousQuarterComparison?: {
      capacityTrend: 'improving' | 'stable' | 'declining';
      depletionChange: number; // percentage point change
    };
  };

  // ==========================================================================
  // FORENSIC INFRASTRUCTURE (Clinical Artifact Compliance)
  // ==========================================================================

  /** Chain of Custody - forensic provenance and immutability attestation */
  chainOfCustody: QCRChainOfCustody;

  /** Signal Fidelity Audit - data quality metrics (the "lab test" section) */
  signalFidelity: QCRSignalFidelity;

  /** Provider Shield - liability-safe footer content */
  providerShield: QCRProviderShield;
}

// =============================================================================
// QCR GENERATION CONFIG
// =============================================================================

export interface QCRGenerationConfig {
  /** Quarter to generate (e.g., "2025-Q1") or "current" */
  quarter: string;
  /** Include clinical notes */
  includeClinicalNotes: boolean;
  /** Include previous quarter comparison */
  includePreviousComparison: boolean;
}

// =============================================================================
// QCR ENTITLEMENT
// =============================================================================

export const QCR_ENTITLEMENT = 'qcr' as const;

export const QCR_PRODUCT_IDS = {
  /** Institutional quarterly access — primary SKU */
  QUARTERLY: 'orbital_qcr_quarterly',
} as const;

export const QCR_PRICING = {
  quarterly: {
    price: 149,
    period: 'quarter' as const,
    label: '$149/quarter',
    /** Institutional framing — no consumer tier */
    positioning: 'institutional',
  },
} as const;

// =============================================================================
// QCR DISPLAY HELPERS
// =============================================================================

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function getQuarterLabel(quarterId: string): string {
  // "2025-Q1" -> "Q1 2025"
  const [year, q] = quarterId.split('-');
  return `${q} ${year}`;
}

export function getCurrentQuarterId(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()}-Q${quarter}`;
}

export function getQuarterDateRange(quarterId: string): { start: Date; end: Date } {
  const [yearStr, qStr] = quarterId.split('-');
  const year = parseInt(yearStr, 10);
  const quarter = parseInt(qStr.replace('Q', ''), 10);

  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);

  const endMonth = startMonth + 3;
  const end = new Date(year, endMonth, 0, 23, 59, 59, 999);

  return { start, end };
}

export function formatDateRange(start: number, end: number): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', opts)} – ${endDate.toLocaleDateString('en-US', opts)}`;
}
