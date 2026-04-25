// Pure math. No React, no Skia. Worklet-safe.
import type { CapacityState } from './types';

export const ARC_START_DEG = 225;
export const ARC_SWEEP_DEG = 270;
export const ARC_END_DEG = ARC_START_DEG + ARC_SWEEP_DEG;

export const DETENTS: readonly number[] = [0, 25, 50, 75, 100];
export const STATE_THRESHOLDS: readonly number[] = [40, 70];
export const SNAP_RADIUS = 4;
export const ACCESSIBILITY_STEP = 5;

export const stateOf = (score: number): CapacityState => {
  'worklet';
  if (score < 40) return 'DEPLETED';
  if (score < 70) return 'ELEVATED';
  return 'RESOURCED';
};

export const scoreToAngle = (score: number): number => {
  'worklet';
  const c = Math.max(0, Math.min(100, score));
  return ARC_START_DEG + (c / 100) * ARC_SWEEP_DEG;
};

export const pointToScore = (dx: number, dy: number): number => {
  'worklet';
  const radCcw = Math.atan2(dy, dx);
  let deg = (radCcw * 180) / Math.PI;
  deg = (deg + 360) % 360;
  let cw = (deg + 90) % 360;
  let onArc = (cw - ARC_START_DEG + 360) % 360;
  if (onArc > ARC_SWEEP_DEG) {
    onArc = onArc - ARC_SWEEP_DEG < 360 - onArc ? ARC_SWEEP_DEG : 0;
  }
  return (onArc / ARC_SWEEP_DEG) * 100;
};

export const snapToNearestDetent = (score: number): number => {
  'worklet';
  let best = score;
  let bestDist = Infinity;
  for (const d of DETENTS) {
    const dist = Math.abs(d - score);
    if (dist < bestDist) { bestDist = dist; best = d; }
  }
  return bestDist <= SNAP_RADIUS ? best : score;
};

export const crossedThreshold = (
  prev: number,
  curr: number,
): { detent: number | null; stateBoundary: number | null } => {
  'worklet';
  let detent: number | null = null;
  let stateBoundary: number | null = null;
  for (const d of DETENTS) {
    if ((prev < d && curr >= d) || (prev > d && curr <= d)) detent = d;
  }
  for (const s of STATE_THRESHOLDS) {
    if ((prev < s && curr >= s) || (prev > s && curr <= s)) stateBoundary = s;
  }
  return { detent, stateBoundary };
};
