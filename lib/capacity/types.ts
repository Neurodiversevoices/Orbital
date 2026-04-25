export type CapacityState = 'Low' | 'Stable' | 'Elevated' | 'Near Limit';

export interface ManualFactors {
  calendarDensity?: number;  // 0..1
  inboxBacklog?: number;     // 0..1
  deepWorkBlocks?: number;   // 0..1 (protected focus time)
  memoryPressure?: number;   // 0..1
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
  capacityScore: number;     // 0..100
  state: CapacityState;
  drift: number;
  rolling24hAvg: number;
  factorWeights: FactorWeight[];
  explanation: string;
  confidence: number;        // 0..1
  timestamp: string;
}
