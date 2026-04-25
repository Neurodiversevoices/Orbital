import type { CapacityScore, CapacityState } from './types';

const stateOf = (v: number): CapacityState =>
  v >= 70 ? 'RESOURCED' : v >= 40 ? 'ELEVATED' : 'DEPLETED';

/** Derive a 0–100 capacity score from an array of z-values. */
export function scoreFromSignals(zValues: number[]): CapacityScore {
  if (!zValues.length) {
    return { value: 50, state: 'ELEVATED', computedAt: new Date().toISOString() };
  }
  const mean = zValues.reduce((a, b) => a + b, 0) / zValues.length;
  const v = Math.max(0, Math.min(100, 50 + mean * 25));
  return {
    value: Math.round(v * 100) / 100,
    state: stateOf(v),
    computedAt: new Date().toISOString(),
  };
}
