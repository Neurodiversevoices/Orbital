import type { ContextualRange } from './types';

/** IQR-based typical range from a rolling window of past scores. */
export function typicalRange(scores: number[], windowDays = 30): ContextualRange {
  const sorted = [...scores].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.25)] ?? 40;
  const hi = sorted[Math.floor(sorted.length * 0.75)] ?? 75;
  return { low: Math.round(lo), high: Math.round(hi), windowDays };
}
