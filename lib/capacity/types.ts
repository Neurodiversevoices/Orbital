// v4 state names (used by OrbitalCapacityInstrument + Gauge)
export type CapacityState = 'RESOURCED' | 'ELEVATED' | 'DEPLETED';

export interface CapacityScore {
  value: number;
  state: CapacityState;
  computedAt: string;
}

export interface ContextualRange {
  low: number;
  high: number;
  windowDays: number;
  baselineDay: number;
  baselineTarget: number;
  ready: boolean;
}

export interface MetricSnapshot {
  label: string;
  value: string | null;
  trend: 'up' | 'down' | 'flat' | null;
}

export interface Insight {
  title: string;
  recommendation: string;
}

export interface SignalDaily {
  day: string;
  key: string;
  zValue: number | null;
  imputed: boolean;
}

// v1 engine types (preserved for calculateCapacity compatibility)
export type CapacityStateV1 = 'Low' | 'Stable' | 'Elevated' | 'Near Limit';

export interface ManualFactors {
  calendarDensity?: number;
  inboxBacklog?: number;
  deepWorkBlocks?: number;
  memoryPressure?: number;
}

export interface HealthInputs {
  steps?: number;
  heartRateAvg?: number;
  restingHeartRate?: number;
  sleepMinutes?: number;
  hrv?: number;
  mindfulMinutes?: number;
  workoutMinutes?: number;
  capturedAt?: string;
}

export interface PatternHistorySnapshot {
  window: '7d' | '30d' | '90d';
  capacityAvg: number;
  volatility: number;
  topFactors: string[];
  trend: 'rising' | 'steady' | 'falling';
}

export interface CapacityInput {
  manualFactors?: ManualFactors;
  healthInputs?: HealthInputs;
  patternHistory?: PatternHistorySnapshot[];
  rolling24h?: number[];
  timestamp: string;
}

export interface FactorWeight {
  name: string;
  delta: number;
  reason: string;
}

export interface CapacityReading {
  capacityScore: number;
  state: CapacityStateV1;
  drift: number;
  rolling24hAvg: number;
  factorWeights: FactorWeight[];
  explanation: string;
  confidence: number;
  timestamp: string;
}
