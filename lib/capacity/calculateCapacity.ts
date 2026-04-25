// Orbital Capacity Engine — formula v1, deterministic. No medical claims.
import type { CapacityInput, CapacityReading, CapacityState, FactorWeight } from './types';

const STATE_BANDS: Array<[number, CapacityState]> = [
  [40, 'Low'], [65, 'Stable'], [85, 'Elevated'], [Infinity, 'Near Limit'],
];

function bandFor(score: number): CapacityState {
  for (const [ceiling, state] of STATE_BANDS) if (score < ceiling) return state;
  return 'Near Limit';
}

const clamp01 = (v: number | undefined): number =>
  typeof v === 'number' && !Number.isNaN(v) ? Math.max(0, Math.min(1, v)) : 0;

const minutesToFraction = (m: number | undefined, full: number): number =>
  clamp01((m ?? 0) / full);

export function calculateCapacity(input: CapacityInput): CapacityReading {
  const m = input.manualFactors ?? {};
  const h = input.healthInputs ?? {};
  const p = input.patternHistory ?? [];

  let score = 72;
  const weights: FactorWeight[] = [];

  // Drains
  const sleepFrac = minutesToFraction(h.sleepMinutes, 480);
  const sleepDeficit = (1 - sleepFrac) * 18;
  if (sleepDeficit > 0) weights.push({ name: 'sleep deficit', delta: -sleepDeficit, reason: `${Math.round((h.sleepMinutes ?? 0) / 60 * 10) / 10}h vs 8h target` });

  const lowHRV = h.hrv != null ? clamp01((50 - h.hrv) / 50) * 10 : 0;
  if (lowHRV > 0) weights.push({ name: 'low HRV', delta: -lowHRV, reason: `HRV ${h.hrv?.toFixed(0)}` });

  const elevatedRHR = h.restingHeartRate != null ? clamp01((h.restingHeartRate - 60) / 30) * 8 : 0;
  if (elevatedRHR > 0) weights.push({ name: 'elevated RHR', delta: -elevatedRHR, reason: `RHR ${h.restingHeartRate?.toFixed(0)}` });

  const calDensity = clamp01(m.calendarDensity) * 12;
  if (calDensity > 0) weights.push({ name: 'calendar density', delta: -calDensity, reason: 'high meeting load' });

  const inbox = clamp01(m.inboxBacklog) * 8;
  if (inbox > 0) weights.push({ name: 'inbox backlog', delta: -inbox, reason: 'open threads' });

  const memPressure = clamp01(m.memoryPressure) * 10;
  if (memPressure > 0) weights.push({ name: 'memory pressure', delta: -memPressure, reason: 'tracked items' });

  const recentVol = p.length > 0 ? p[0].volatility : 0;
  const volPenalty = clamp01(recentVol) * 10;
  if (volPenalty > 0) weights.push({ name: 'pattern volatility', delta: -volPenalty, reason: `${p[0]?.window} swings` });

  // Gains
  const deepWork = clamp01(m.deepWorkBlocks) * 6;
  if (deepWork > 0) weights.push({ name: 'deep work stability', delta: deepWork, reason: 'protected focus time' });

  const workout = minutesToFraction(h.workoutMinutes, 30) * 5;
  if (workout > 0) weights.push({ name: 'workout', delta: workout, reason: `${h.workoutMinutes}m` });

  const mindful = minutesToFraction(h.mindfulMinutes, 20) * 5;
  if (mindful > 0) weights.push({ name: 'mindful minutes', delta: mindful, reason: `${h.mindfulMinutes}m` });

  const strongSleep = sleepFrac >= 0.95 ? 8 : 0;
  if (strongSleep > 0) weights.push({ name: 'strong sleep', delta: strongSleep, reason: '8h+ achieved' });

  for (const w of weights) score += w.delta;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const r24 = input.rolling24h ?? [];
  const rolling24hAvg = r24.length ? r24.reduce((a, b) => a + b, 0) / r24.length : score;
  const drift = score - rolling24hAvg;
  const state = bandFor(score);
  const dataPoints = [h.sleepMinutes, h.hrv, h.restingHeartRate, m.calendarDensity, m.inboxBacklog, m.deepWorkBlocks].filter(v => v != null).length;
  const confidence = Math.max(0.2, dataPoints / 6);

  const drains = weights.filter(w => w.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 2).map(w => w.name);
  const driftPhrase = drift > 4 ? 'trending up vs your 24h baseline' : drift < -4 ? 'trending down vs your 24h baseline' : 'near your 24h baseline';
  const explanation = drains.length
    ? `Capacity is ${state.toLowerCase()}, ${driftPhrase}. Top drains: ${drains.join(', ')}.`
    : `Capacity is ${state.toLowerCase()}, ${driftPhrase}.`;

  return {
    capacityScore: score,
    state,
    drift,
    rolling24hAvg,
    factorWeights: weights.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 5),
    explanation,
    confidence,
    timestamp: input.timestamp,
  };
}
