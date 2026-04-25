import type { ContextualRange } from './types';

export function typicalRange(
  scores: number[],
  baselineDay: number,
  baselineTarget = 14,
  windowDays = 30,
): ContextualRange {
  const ready = baselineDay >= baselineTarget && scores.length >= 5;
  if (!ready) {
    return { low: 0, high: 0, windowDays, baselineDay, baselineTarget, ready: false };
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.25)] ?? 40;
  const hi = sorted[Math.floor(sorted.length * 0.75)] ?? 75;
  return {
    low: Math.round(lo),
    high: Math.round(hi),
    windowDays,
    baselineDay,
    baselineTarget,
    ready: true,
  };
}
