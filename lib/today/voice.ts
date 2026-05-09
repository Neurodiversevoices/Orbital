/**
 * Today voice — system voice + directive lookup, plus delta/momentum compute.
 *
 * Stub introduced for app/(tabs)/index.tsx imports.
 */

import type { CapacityDailyRecord } from '../dev/fakeCapacityData';
import type { CapacityState } from '../capacity/types';

export type Momentum = 'rising' | 'flat' | 'falling';

export interface DeltaAndMomentum {
  delta: number;
  momentum: Momentum;
  todayScore: number;
}

/**
 * Compute today's score, delta vs trailing-7d-avg, and momentum direction.
 * Expects an array of CapacityDailyRecord ordered oldest→newest. Defensive
 * against short/empty arrays.
 */
export function computeDeltaAndMomentum(data: CapacityDailyRecord[]): DeltaAndMomentum {
  if (!data || data.length === 0) {
    return { delta: 0, momentum: 'flat', todayScore: 0 };
  }
  const todayScore = data[data.length - 1].score ?? 0;
  const window = data.slice(-8, -1); // previous 7 days, excluding today
  if (window.length === 0) {
    return { delta: 0, momentum: 'flat', todayScore };
  }
  const avg = window.reduce((s, r) => s + (r.score ?? 0), 0) / window.length;
  const delta = todayScore - avg;
  const momentum: Momentum = delta > 2 ? 'rising' : delta < -2 ? 'falling' : 'flat';
  return { delta: Math.round(delta * 10) / 10, momentum, todayScore };
}

const SYSTEM_VOICE: Record<CapacityState, Record<Momentum, string>> = {
  RESOURCED: {
    rising: 'You are well-resourced and trending up. Hold steady.',
    flat: 'You are well-resourced. Stay the course.',
    falling: 'Resources are good but easing. Watch for early drift.',
  },
  ELEVATED: {
    rising: 'Capacity is climbing back. Keep momentum gentle.',
    flat: 'Capacity is mid-band. Protect the basics.',
    falling: 'Capacity is slipping. Pull back on optional load.',
  },
  DEPLETED: {
    rising: 'Recovering. Don’t outpace your runway.',
    flat: 'Depleted. Reduce load and prioritize sleep.',
    falling: 'Depleted and falling. Stop, rest, recover.',
  },
};

const DIRECTIVES: Record<CapacityState, string> = {
  RESOURCED: 'Today is a build day.',
  ELEVATED: 'Today is a maintain day.',
  DEPLETED: 'Today is a recovery day.',
};

export function getSystemVoice(state: CapacityState, momentum: Momentum): string {
  return SYSTEM_VOICE[state]?.[momentum] ?? '';
}

export function getDirective(state: CapacityState): string {
  return DIRECTIVES[state] ?? '';
}
