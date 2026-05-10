/**
 * atmosphericHelpers.ts — small utilities shared by AtmosphericReservoir and
 * its SVG fallback. Kept separate so they can be unit-tested without pulling
 * Skia or React into scope.
 */

import type { SharedValue } from 'react-native-reanimated';

// =============================================================================
// pct() — read a SharedValue<number> or plain number and return a 0..100
//         integer. Defensive against NaN / out-of-range inputs.
// =============================================================================

/**
 * Convert a 0..1 value (or a Reanimated SharedValue thereof) to a rounded
 * percentage 0..100. Out-of-range and NaN values clamp to 0..100.
 */
export function pct(input: SharedValue<number> | number): number {
  const raw =
    typeof input === 'number'
      ? input
      : (input as { value: number }).value;
  if (!Number.isFinite(raw)) return 0;
  const clamped = Math.max(0, Math.min(1, raw));
  return Math.round(clamped * 100);
}

// =============================================================================
// stateBand() — coarse 5-band classification used by clinical copy and a11y.
//
// The thresholds come from the Phase 9 "clinical copy state table":
//
//   demand vs. reserves ratio:
//     <= 0.55 of reserves              => NOMINAL
//     <= 0.85 of reserves              => STEADY
//     <= 1.10 of reserves              => CAUTION
//     <= 1.40 of reserves              => ELEVATED
//     >  1.40 of reserves              => CRITICAL
//
// We special-case very-low reserves (< 0.10) — even with low demand this
// reads as CAUTION at minimum, since the user's headroom is already gone.
// =============================================================================

export type StateBand =
  | 'NOMINAL'
  | 'STEADY'
  | 'CAUTION'
  | 'ELEVATED'
  | 'CRITICAL';

export function stateBand(reserves: number, demand: number): StateBand {
  const r = clamp01(reserves);
  const d = clamp01(demand);

  // Headroom-empty floor: very low reserves can't be NOMINAL/STEADY.
  const floor: StateBand =
    r < 0.1 ? 'CAUTION' : r < 0.2 ? 'STEADY' : 'NOMINAL';

  // Avoid divide-by-zero — when reserves are effectively zero we treat any
  // demand > 0 as CRITICAL.
  if (r < 0.001) {
    return d > 0 ? 'CRITICAL' : floor;
  }

  const ratio = d / r;
  let band: StateBand;
  if (ratio <= 0.55) band = 'NOMINAL';
  else if (ratio <= 0.85) band = 'STEADY';
  else if (ratio <= 1.1) band = 'CAUTION';
  else if (ratio <= 1.4) band = 'ELEVATED';
  else band = 'CRITICAL';

  return strongerOf(band, floor);
}

// =============================================================================
// internal
// =============================================================================

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

const BAND_RANK: Record<StateBand, number> = {
  NOMINAL: 0,
  STEADY: 1,
  CAUTION: 2,
  ELEVATED: 3,
  CRITICAL: 4,
};

function strongerOf(a: StateBand, b: StateBand): StateBand {
  return BAND_RANK[a] >= BAND_RANK[b] ? a : b;
}
