import type { CapacityInput } from './types';

export const DEMO_INPUT: CapacityInput = {
  manualFactors: { calendarDensity: 0.55, inboxBacklog: 0.40, deepWorkBlocks: 0.62, memoryPressure: 0.32 },
  healthInputs: { sleepMinutes: 410, hrv: 42, restingHeartRate: 64, mindfulMinutes: 8, workoutMinutes: 22, capturedAt: new Date().toISOString() },
  patternHistory: [{ window: '7d', capacityAvg: 64, volatility: 0.28, topFactors: ['sleep deficit', 'calendar density'], trend: 'steady' }],
  rolling24h: [62, 64, 65, 60, 58, 63, 66, 64, 62, 61],
  timestamp: new Date().toISOString(),
};
