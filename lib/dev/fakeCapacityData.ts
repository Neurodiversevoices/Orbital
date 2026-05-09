/**
 * Fake capacity data — deterministic seeded RNG for dev / preview surfaces.
 *
 * Stub introduced to satisfy imports from app/(tabs)/index.tsx and
 * app/(tabs)/patterns.tsx. Produces N days of synthetic capacity records
 * with stable values (same seed → same series).
 */

export type RangeKey = '14d' | '30d' | '90d' | '1y' | 'all';

export interface CapacityDailyRecord {
  date: string;        // ISO yyyy-mm-dd
  sleep_hours: number;
  hrv_ms: number;
  rhr_bpm: number;
  score: number;       // 0..100
}

const RANGE_DAYS: Record<RangeKey, number> = {
  '14d': 14,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  'all': 1825,
};

// Mulberry32 — deterministic 32-bit PRNG
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function isoDay(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function generate(days: number, seed: number): CapacityDailyRecord[] {
  const rand = mulberry32(seed);
  const out: CapacityDailyRecord[] = [];
  // Seed a baseline that drifts slowly to mimic a person.
  let sleepBase = 7.2;
  let hrvBase = 52;
  let rhrBase = 58;
  for (let i = days - 1; i >= 0; i--) {
    sleepBase += (rand() - 0.5) * 0.3;
    hrvBase += (rand() - 0.5) * 4;
    rhrBase += (rand() - 0.5) * 1.5;
    const sleep = clamp(sleepBase + (rand() - 0.5) * 0.6, 4, 10);
    const hrv = clamp(hrvBase + (rand() - 0.5) * 6, 20, 110);
    const rhr = clamp(rhrBase + (rand() - 0.5) * 3, 45, 85);
    // Score blend — sleep & hrv positive, rhr negative
    const score = clamp(
      50 + (sleep - 7) * 6 + (hrv - 50) * 0.6 - (rhr - 60) * 0.8,
      0,
      100,
    );
    out.push({
      date: isoDay(i),
      sleep_hours: Math.round(sleep * 10) / 10,
      hrv_ms: Math.round(hrv),
      rhr_bpm: Math.round(rhr),
      score: Math.round(score),
    });
  }
  return out;
}

export function getFakeCapacityData(range: RangeKey, seed: number): CapacityDailyRecord[] {
  const days = RANGE_DAYS[range] ?? 30;
  return generate(days, seed);
}

export const ALL_FAKE_DATA: CapacityDailyRecord[] = generate(RANGE_DAYS.all, 42);
