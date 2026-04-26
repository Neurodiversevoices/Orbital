// Pure math. No React, no Skia. Worklet-safe.
import type { CapacityState } from './types';

export const ARC_START_DEG = 180;
export const ARC_SWEEP_DEG = 180;
export const ARC_END_DEG = ARC_START_DEG + ARC_SWEEP_DEG; // 360

export const DETENTS: readonly number[] = [0, 25, 50, 75, 100];
export const STATE_THRESHOLDS: readonly number[] = [40, 70];
export const SNAP_RADIUS = 4;
export const ACCESSIBILITY_STEP = 5;

// Lowercase State for new components
export type State = 'depleted' | 'elevated' | 'resourced';

export const STATE_COLOR: Record<State, string> = {
  depleted:  '#E5484D',
  elevated:  '#F5B547',
  resourced: '#5DD9D4',
};

// Original uppercase version (kept for CapacityState consumers)
export const stateOf = (score: number): CapacityState => {
  'worklet';
  if (score < 40) return 'DEPLETED';
  if (score < 70) return 'ELEVATED';
  return 'RESOURCED';
};

// Lowercase version for new gauge components
export const stateOfLower = (score: number): State => {
  'worklet';
  if (score < 40) return 'depleted';
  if (score < 70) return 'elevated';
  return 'resourced';
};

export function stateColorFloat3(s: State): [number, number, number] {
  'worklet';
  if (s === 'depleted')  return [0xE5/255, 0x48/255, 0x4D/255];
  if (s === 'elevated')  return [0xF5/255, 0xB5/255, 0x47/255];
  return [0x5D/255, 0xD9/255, 0xD4/255];
}

export const scoreToAngle = (score: number): number => {
  'worklet';
  const c = Math.max(0, Math.min(100, score));
  return ARC_START_DEG + (c / 100) * ARC_SWEEP_DEG;
};

// Alias
export const scoreToAngleDeg = scoreToAngle;

export const degToRad = (deg: number): number => {
  'worklet';
  return (deg * Math.PI) / 180;
};

export const arcPoint = (cx: number, cy: number, r: number, deg: number) => {
  'worklet';
  const rad = degToRad(deg);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

export const pointToScore = (dx: number, dy: number): number => {
  'worklet';
  const radCcw = Math.atan2(dy, dx);
  let deg = (radCcw * 180) / Math.PI;
  deg = (deg + 360) % 360;
  let onArc = (deg - ARC_START_DEG + 360) % 360;
  if (onArc > ARC_SWEEP_DEG) {
    onArc = onArc - ARC_SWEEP_DEG < 360 - onArc ? ARC_SWEEP_DEG : 0;
  }
  return Math.max(0, Math.min(100, (onArc / ARC_SWEEP_DEG) * 100));
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

export const scoreToFontWeight = (score: number): number => {
  return Math.round(700 + (Math.max(0, Math.min(100, score)) / 100) * 200);
};
