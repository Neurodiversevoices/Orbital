/**
 * QSB (Quarterly Strategic Brief) Type Definitions
 *
 * Core types for all 5 QSB features:
 * 1. Capacity Index (QSI)
 * 2. Load Friction Map
 * 3. Recovery Elasticity Score
 * 4. Early Drift Detector
 * 5. Intervention Sensitivity Layer
 */

export type QSBScope = 'personal' | 'org' | 'global';

export interface QSBScopeConfig {
  scope: QSBScope;
  orgId?: string;
  cohortSize?: number;
}

// Minimum cohort size for aggregate data
export const MIN_COHORT_SIZE = 10;

// ============================================
// 1. CAPACITY INDEX (QSI)
// ============================================

export interface CapacitySubIndex {
  label: string;
  value: number; // 0-100
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export interface QSIData {
  headline: number; // 0-100 composite score
  headlineTrend: 'up' | 'down' | 'stable';
  subIndices: {
    capacityLevel: CapacitySubIndex;
    volatility: CapacitySubIndex;
    recoveryVelocity: CapacitySubIndex;
  };
  sparkline: number[]; // 90-day trend data points
  scope: QSBScope;
  cohortSize?: number;
  lastUpdated: string;
  isDemo: boolean;
}

// ============================================
// 2. LOAD FRICTION MAP
// ============================================

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type TimeBlock = 'Morning' | 'Midday' | 'Afternoon' | 'Evening' | 'Night';

export interface HeatmapCell {
  day: DayOfWeek;
  time: TimeBlock;
  value: number; // 0-100, lower = more friction/dips
  sampleCount: number;
}

export interface LoadFrictionData {
  heatmap: HeatmapCell[];
  peakFrictionTimes: Array<{ day: DayOfWeek; time: TimeBlock; severity: number }>;
  lowFrictionTimes: Array<{ day: DayOfWeek; time: TimeBlock; score: number }>;
  weekdayAvg: number;
  weekendAvg: number;
  scope: QSBScope;
  cohortSize?: number;
  lastUpdated: string;
  isDemo: boolean;
}

// ============================================
// 3. RECOVERY ELASTICITY SCORE
// ============================================

export interface RecoveryEvent {
  date: string;
  dipDepth: number; // How low capacity dropped (0-100)
  recoveryTime: number; // Hours to recover to baseline
  recoveryCompleteness: number; // % of baseline reached (0-100)
}

export interface RecoveryElasticityData {
  score: number; // 0-100, higher = faster/better recovery
  trend: 'improving' | 'declining' | 'stable';
  avgRecoveryHours: number;
  avgRecoveryCompleteness: number;
  recentEvents: RecoveryEvent[];
  historicalComparison: {
    last30Days: number;
    previous30Days: number;
    changePercent: number;
  };
  scope: QSBScope;
  cohortSize?: number;
  lastUpdated: string;
  isDemo: boolean;
}

// ============================================
// 4. EARLY DRIFT DETECTOR
// ============================================

export type DriftSignalType = 'recovery_lag' | 'volatility_increase' | 'downward_slope' | 'pattern_break';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DriftSignal {
  type: DriftSignalType;
  label: string;
  description: string;
  confidence: ConfidenceLevel;
  severity: number; // 0-100
  detectedAt: string;
  dataPoints: number; // How many data points support this signal
}

export interface EarlyDriftData {
  overallRisk: 'low' | 'moderate' | 'elevated';
  signals: DriftSignal[];
  trendDirection: 'improving' | 'stable' | 'declining';
  daysUntilPotentialIssue?: number; // Predictive estimate
  recommendations: string[];
  scope: QSBScope;
  cohortSize?: number;
  lastUpdated: string;
  isDemo: boolean;
}

// ============================================
// 5. INTERVENTION SENSITIVITY LAYER
// ============================================

export type InterventionType =
  | 'schedule_change'
  | 'workload_adjustment'
  | 'break_added'
  | 'meeting_reduction'
  | 'deadline_extension'
  | 'support_added'
  | 'environment_change'
  | 'custom';

export interface Intervention {
  id: string;
  type: InterventionType;
  label: string;
  startDate: string;
  endDate?: string;
  isOngoing: boolean;
}

export interface InterventionEffect {
  intervention: Intervention;
  preCapacityAvg: number;
  postCapacityAvg: number;
  changePercent: number;
  confidence: ConfidenceLevel;
  sampleSizePre: number;
  sampleSizePost: number;
  isStatisticallySignificant: boolean;
}

export interface InterventionSensitivityData {
  activeInterventions: Intervention[];
  historicalEffects: InterventionEffect[];
  mostEffective?: InterventionEffect;
  leastEffective?: InterventionEffect;
  suggestedInterventions: Array<{
    type: InterventionType;
    label: string;
    expectedImpact: number;
    confidence: ConfidenceLevel;
  }>;
  scope: QSBScope;
  cohortSize?: number;
  lastUpdated: string;
  isDemo: boolean;
}

// ============================================
// AGGREGATE QSB OVERVIEW
// ============================================

export interface QSBOverviewData {
  qsi: QSIData;
  loadFriction: LoadFrictionData;
  recoveryElasticity: RecoveryElasticityData;
  earlyDrift: EarlyDriftData;
  interventionSensitivity: InterventionSensitivityData;
  generatedAt: string;
  scope: QSBScope;
  isDemo: boolean;
}

// ============================================
// HELPER TYPES
// ============================================

export interface InsufficientDataError {
  type: 'insufficient_cohort' | 'insufficient_signals' | 'no_data';
  message: string;
  required: number;
  actual: number;
}

export type QSBResult<T> =
  | { success: true; data: T }
  | { success: false; error: InsufficientDataError };
