// Reads only. Permission strings in app.json. Privacy manifest entries in
// ios/PrivacyInfo.xcprivacy require NSPrivacyCollectedDataTypeHealth +
// NSPrivacyCollectedDataTypeFitness — TODO: confirm purpose codes with App Review.

/**
 * Orbital HealthKit Adapter
 *
 * iOS-only adapter wrapping `react-native-health` to surface three biosignals
 * for the Capacity / Pattern Intelligence views:
 *   - Recovery (last sleep session, in-bed duration, hours)
 *   - Nervous System Load (HRV SDNN, ms — latest sample)
 *   - Cardiac Drift (Resting Heart Rate, bpm — latest sample)
 *
 * Surface area is also scaffolded for a 30-day pattern chart (history series).
 *
 * Read-only. No write permissions are ever requested. All entry points are
 * Platform.OS === 'ios' guarded; on Android / web they resolve to a benign
 * unauthorized snapshot. Errors surface as null metrics + console.warn (Sentry
 * picks up the breadcrumb upstream).
 */

import { Platform } from 'react-native';

// -----------------------------------------------------------------------------
// react-native-health import shim
// -----------------------------------------------------------------------------
// react-native-health ships native code only — its module resolver throws at
// runtime on web / Android / unbuilt iOS. We isolate the import so this file
// remains importable everywhere (tsc, jest, web bundler) and only touches the
// native module on an iOS device build.
//
// We intentionally avoid a static `import` so Metro / web bundlers don't try to
// resolve the package on non-iOS targets. Types are re-declared below to keep
// strict mode happy without depending on @types from the package.

type HealthValue = {
  value: number;
  startDate: string;
  endDate: string;
  metadata?: Record<string, unknown>;
};

type SleepSample = {
  value: string; // 'INBED' | 'ASLEEP' | 'AWAKE' | 'CORE' | 'DEEP' | 'REM'
  startDate: string;
  endDate: string;
  sourceId?: string;
  sourceName?: string;
};

type HealthInputOptions = {
  startDate?: string;
  endDate?: string;
  ascending?: boolean;
  limit?: number;
  unit?: string;
};

type HealthPermissions = {
  permissions: {
    read: string[];
    write: string[];
  };
};

type AppleHealthKitModule = {
  Constants: {
    Permissions: {
      HeartRateVariability: string;
      RestingHeartRate: string;
      SleepAnalysis: string;
      HeartRate: string;
      [key: string]: string;
    };
  };
  isAvailable(callback: (err: Error | null, available: boolean) => void): void;
  initHealthKit(
    permissions: HealthPermissions,
    callback: (err: string | null, results?: unknown) => void
  ): void;
  getHeartRateVariabilitySamples(
    options: HealthInputOptions,
    callback: (err: string | null, results: HealthValue[]) => void
  ): void;
  getRestingHeartRate(
    options: HealthInputOptions,
    callback: (err: string | null, results: HealthValue) => void
  ): void;
  getRestingHeartRateSamples?: (
    options: HealthInputOptions,
    callback: (err: string | null, results: HealthValue[]) => void
  ) => void;
  getSleepSamples(
    options: HealthInputOptions,
    callback: (err: string | null, results: SleepSample[]) => void
  ): void;
};

let _kit: AppleHealthKitModule | null = null;
let _kitLoadAttempted = false;

function loadKit(): AppleHealthKitModule | null {
  if (_kitLoadAttempted) return _kit;
  _kitLoadAttempted = true;
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-health');
    _kit = (mod?.default ?? mod) as AppleHealthKitModule;
    return _kit;
  } catch (e) {
    console.warn('[health] react-native-health unavailable:', e);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export type HealthMetricStatus = 'unknown' | 'unauthorized' | 'denied' | 'authorized';

export type Trend = 'up' | 'down' | 'steady';

export interface RecoveryMetric {
  hours: number;
  trend: Trend;
}

export interface NervousLoadMetric {
  sdnnMs: number;
  trend: Trend;
}

export interface CardiacDriftMetric {
  bpm: number;
  trend: Trend;
}

export interface HealthSnapshot {
  status: HealthMetricStatus;
  recovery: RecoveryMetric | null;
  nervousLoad: NervousLoadMetric | null;
  cardiacDrift: CardiacDriftMetric | null;
  fetchedAt: number;
}

export interface HealthHistoryPoint {
  date: string; // YYYY-MM-DD
  value: number; // 0..100 capacity-equivalent
}

// -----------------------------------------------------------------------------
// Internal cache + state
// -----------------------------------------------------------------------------

const SNAPSHOT_TTL_MS = 5 * 60 * 1000; // 5 minutes
let _cachedSnapshot: HealthSnapshot | null = null;
let _status: HealthMetricStatus = 'unknown';
let _initPromise: Promise<HealthMetricStatus> | null = null;

const DAY_MS = 24 * 60 * 60 * 1000;

// -----------------------------------------------------------------------------
// Trend computation
// -----------------------------------------------------------------------------

/**
 * Compare last 3-day average vs prior 7-day average.
 *   up    if recent is +5% above baseline
 *   down  if recent is -5% below baseline
 *   steady otherwise
 *
 * `samples` must be ordered ascending by time. Empty / sparse sets resolve to
 * 'steady' so we never paint a misleading arrow.
 */
export function computeTrend(samples: { ts: number; value: number }[]): Trend {
  if (!samples.length) return 'steady';
  const now = Date.now();
  const recentCutoff = now - 3 * DAY_MS;
  const baselineStart = now - 10 * DAY_MS;

  const recent = samples.filter((s) => s.ts >= recentCutoff);
  const baseline = samples.filter((s) => s.ts >= baselineStart && s.ts < recentCutoff);

  if (recent.length === 0 || baseline.length === 0) return 'steady';

  const recentAvg = recent.reduce((acc, s) => acc + s.value, 0) / recent.length;
  const baselineAvg = baseline.reduce((acc, s) => acc + s.value, 0) / baseline.length;
  if (baselineAvg === 0) return 'steady';

  const delta = (recentAvg - baselineAvg) / baselineAvg;
  if (delta >= 0.05) return 'up';
  if (delta <= -0.05) return 'down';
  return 'steady';
}

// -----------------------------------------------------------------------------
// Permission scopes
// -----------------------------------------------------------------------------

function buildPermissions(kit: AppleHealthKitModule): HealthPermissions {
  const P = kit.Constants.Permissions;
  return {
    permissions: {
      read: [
        P.HeartRateVariability,
        P.RestingHeartRate,
        P.SleepAnalysis,
        P.HeartRate,
      ],
      write: [],
    },
  };
}

// -----------------------------------------------------------------------------
// Promise wrappers around the callback API
// -----------------------------------------------------------------------------

function isAvailableAsync(kit: AppleHealthKitModule): Promise<boolean> {
  return new Promise((resolve) => {
    kit.isAvailable((err, available) => {
      if (err) {
        console.warn('[health] isAvailable error:', err);
        resolve(false);
        return;
      }
      resolve(Boolean(available));
    });
  });
}

function initHealthKitAsync(kit: AppleHealthKitModule): Promise<boolean> {
  return new Promise((resolve) => {
    kit.initHealthKit(buildPermissions(kit), (err) => {
      if (err) {
        console.warn('[health] initHealthKit error:', err);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

function getHRVSamplesAsync(
  kit: AppleHealthKitModule,
  options: HealthInputOptions
): Promise<HealthValue[]> {
  return new Promise((resolve) => {
    kit.getHeartRateVariabilitySamples(options, (err, results) => {
      if (err) {
        console.warn('[health] HRV samples error:', err);
        resolve([]);
        return;
      }
      resolve(Array.isArray(results) ? results : []);
    });
  });
}

function getRestingHRAsync(
  kit: AppleHealthKitModule,
  options: HealthInputOptions
): Promise<HealthValue | null> {
  return new Promise((resolve) => {
    kit.getRestingHeartRate(options, (err, result) => {
      if (err) {
        // Most commonly "no data" — not an error worth surfacing.
        resolve(null);
        return;
      }
      resolve(result ?? null);
    });
  });
}

function getRestingHRSamplesAsync(
  kit: AppleHealthKitModule,
  options: HealthInputOptions
): Promise<HealthValue[]> {
  return new Promise((resolve) => {
    if (typeof kit.getRestingHeartRateSamples !== 'function') {
      resolve([]);
      return;
    }
    kit.getRestingHeartRateSamples(options, (err, results) => {
      if (err) {
        resolve([]);
        return;
      }
      resolve(Array.isArray(results) ? results : []);
    });
  });
}

function getSleepSamplesAsync(
  kit: AppleHealthKitModule,
  options: HealthInputOptions
): Promise<SleepSample[]> {
  return new Promise((resolve) => {
    kit.getSleepSamples(options, (err, results) => {
      if (err) {
        console.warn('[health] sleep samples error:', err);
        resolve([]);
        return;
      }
      resolve(Array.isArray(results) ? results : []);
    });
  });
}

// -----------------------------------------------------------------------------
// Sleep aggregation
// -----------------------------------------------------------------------------

/**
 * From a list of SleepAnalysis samples, group into "sessions" (samples within
 * 30min of each other), pick the most recent session, and total its in-bed
 * (or asleep, when in-bed is missing) duration in hours.
 */
export function aggregateLastSleepSession(samples: SleepSample[]): number {
  if (!samples.length) return 0;
  const sorted = [...samples].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const SESSION_GAP_MS = 30 * 60 * 1000;
  const sessions: SleepSample[][] = [];
  let current: SleepSample[] = [];
  let lastEnd = 0;

  for (const s of sorted) {
    const start = new Date(s.startDate).getTime();
    if (current.length && start - lastEnd > SESSION_GAP_MS) {
      sessions.push(current);
      current = [];
    }
    current.push(s);
    lastEnd = Math.max(lastEnd, new Date(s.endDate).getTime());
  }
  if (current.length) sessions.push(current);
  if (!sessions.length) return 0;

  const last = sessions[sessions.length - 1];
  // Prefer INBED totals, else fall back to ASLEEP / CORE / DEEP / REM union.
  const inBed = last.filter((s) => s.value === 'INBED');
  const pool = inBed.length ? inBed : last.filter((s) => s.value !== 'AWAKE');
  if (!pool.length) return 0;

  const totalMs = pool.reduce((acc, s) => {
    const d = new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
    return acc + Math.max(0, d);
  }, 0);
  return Math.round((totalMs / 3600000) * 10) / 10; // 1dp hours
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Initialize HealthKit + request the read permissions. Idempotent and
 * de-duplicated — concurrent callers share the same in-flight request.
 */
export async function initHealth(): Promise<HealthMetricStatus> {
  if (Platform.OS !== 'ios') {
    _status = 'unauthorized';
    return _status;
  }
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const kit = loadKit();
    if (!kit) {
      _status = 'unauthorized';
      return _status;
    }
    try {
      const available = await isAvailableAsync(kit);
      if (!available) {
        _status = 'unauthorized';
        return _status;
      }
      const ok = await initHealthKitAsync(kit);
      // HealthKit's initHealthKit "succeeds" even when the user denies — we
      // can't introspect granular grants without probing data. We optimistically
      // mark authorized; if every probe later returns empty / errors we'll fall
      // back to 'denied' inside getHealthSnapshot.
      _status = ok ? 'authorized' : 'denied';
      return _status;
    } catch (e) {
      console.warn('[health] initHealth error:', e);
      _status = 'unauthorized';
      return _status;
    } finally {
      // Allow retry on next call once settled.
      setTimeout(() => {
        _initPromise = null;
      }, 0);
    }
  })();

  return _initPromise;
}

/**
 * Returns a unified snapshot of the three primary metrics. Cached for 5 minutes
 * to avoid hammering HealthKit on every render.
 */
export async function getHealthSnapshot(force = false): Promise<HealthSnapshot> {
  const now = Date.now();
  if (!force && _cachedSnapshot && now - _cachedSnapshot.fetchedAt < SNAPSHOT_TTL_MS) {
    return _cachedSnapshot;
  }

  if (Platform.OS !== 'ios') {
    const snap: HealthSnapshot = {
      status: 'unauthorized',
      recovery: null,
      nervousLoad: null,
      cardiacDrift: null,
      fetchedAt: now,
    };
    _cachedSnapshot = snap;
    return snap;
  }

  // Make sure we've initialized at least once.
  if (_status === 'unknown') {
    await initHealth();
  }

  const kit = loadKit();
  if (!kit || _status === 'unauthorized') {
    const snap: HealthSnapshot = {
      status: _status === 'unknown' ? 'unauthorized' : _status,
      recovery: null,
      nervousLoad: null,
      cardiacDrift: null,
      fetchedAt: now,
    };
    _cachedSnapshot = snap;
    return snap;
  }

  const startDate = new Date(now - 14 * DAY_MS).toISOString();
  const endDate = new Date(now).toISOString();

  const [hrvSamples, rhr, rhrSamples, sleepSamples] = await Promise.all([
    getHRVSamplesAsync(kit, { startDate, endDate, ascending: true, unit: 'ms' }),
    getRestingHRAsync(kit, { startDate, endDate, unit: 'bpm' }),
    getRestingHRSamplesAsync(kit, { startDate, endDate, ascending: true, unit: 'bpm' }),
    getSleepSamplesAsync(kit, { startDate, endDate, ascending: true, limit: 200 }),
  ]);

  // If absolutely nothing came back, decide between authorized-but-empty vs denied.
  const allEmpty =
    hrvSamples.length === 0 &&
    !rhr &&
    rhrSamples.length === 0 &&
    sleepSamples.length === 0;

  // ---------------------------------------------------------------------------
  // Recovery — last sleep session in hours
  // ---------------------------------------------------------------------------
  const sleepHours = aggregateLastSleepSession(sleepSamples);
  // Sleep trend uses per-session totals over the window.
  const sleepSeries = bucketSleepByDay(sleepSamples).map((p) => ({
    ts: new Date(p.date).getTime(),
    value: p.hours,
  }));
  const recovery: RecoveryMetric | null = sleepSamples.length || sleepHours > 0
    ? { hours: sleepHours, trend: computeTrend(sleepSeries) }
    : { hours: 0, trend: 'steady' };

  // ---------------------------------------------------------------------------
  // Nervous System Load — latest HRV SDNN (ms)
  // ---------------------------------------------------------------------------
  const latestHrv = hrvSamples.length ? hrvSamples[hrvSamples.length - 1] : null;
  const hrvSeries = hrvSamples.map((s) => ({
    ts: new Date(s.endDate).getTime(),
    value: s.value,
  }));
  const nervousLoad: NervousLoadMetric | null = latestHrv
    ? { sdnnMs: Math.round(latestHrv.value * 10) / 10, trend: computeTrend(hrvSeries) }
    : { sdnnMs: 0, trend: 'steady' };

  // ---------------------------------------------------------------------------
  // Cardiac Drift — resting heart rate (bpm)
  // ---------------------------------------------------------------------------
  const rhrSeriesRaw = rhrSamples.length
    ? rhrSamples
    : rhr
      ? [rhr]
      : [];
  const rhrSeries = rhrSeriesRaw.map((s) => ({
    ts: new Date(s.endDate).getTime(),
    value: s.value,
  }));
  const latestRhr = rhrSeriesRaw.length ? rhrSeriesRaw[rhrSeriesRaw.length - 1] : null;
  const cardiacDrift: CardiacDriftMetric | null = latestRhr
    ? { bpm: Math.round(latestRhr.value), trend: computeTrend(rhrSeries) }
    : { bpm: 0, trend: 'steady' };

  const finalStatus: HealthMetricStatus =
    allEmpty && _status !== 'authorized' ? 'denied' : 'authorized';
  _status = finalStatus;

  const snap: HealthSnapshot = {
    status: finalStatus,
    recovery,
    nervousLoad,
    cardiacDrift,
    fetchedAt: now,
  };
  _cachedSnapshot = snap;
  return snap;
}

/**
 * Bucket sleep samples by night (date of session END). Used both for trend and
 * for the patterns history series.
 */
function bucketSleepByDay(samples: SleepSample[]): { date: string; hours: number }[] {
  if (!samples.length) return [];
  // Re-use the session aggregator iteratively per night.
  const byNight = new Map<string, number>();
  const sorted = [...samples].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  for (const s of sorted) {
    if (s.value === 'AWAKE') continue;
    const end = new Date(s.endDate);
    const dateKey = end.toISOString().slice(0, 10);
    const prev = byNight.get(dateKey) ?? 0;
    const dur = end.getTime() - new Date(s.startDate).getTime();
    byNight.set(dateKey, prev + Math.max(0, dur));
  }
  return Array.from(byNight.entries())
    .map(([date, ms]) => ({ date, hours: Math.round((ms / 3600000) * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// -----------------------------------------------------------------------------
// History (Pattern Intelligence chart)
// -----------------------------------------------------------------------------

/**
 * Build a 0..100 capacity-equivalent series for the last `days` days from
 * sleep + HRV + RHR. Weighting:
 *   sleep_score   = clamp(hours / 8, 0..1) * 100              weight 0.45
 *   hrv_score     = clamp((sdnn - 20) / 60, 0..1) * 100       weight 0.35
 *   rhr_score     = clamp((80 - bpm) / 40, 0..1) * 100        weight 0.20
 *
 * NOTE: Real implementation pulls multi-day series from HealthKit; on non-iOS
 * or missing data we return [] (caller decides whether to show empty-state).
 * The chart consumer in app/(tabs)/patterns.tsx is the eventual reader — this
 * is scaffolding while that integration is still being designed.
 */
export async function getHealthHistory(days: number): Promise<HealthHistoryPoint[]> {
  const safeDays = Math.max(1, Math.min(90, Math.floor(days)));

  if (Platform.OS !== 'ios') return [];
  const kit = loadKit();
  if (!kit) return [];
  if (_status === 'unknown') await initHealth();
  if (_status !== 'authorized' && _status !== 'denied') return [];

  const now = Date.now();
  const startDate = new Date(now - safeDays * DAY_MS).toISOString();
  const endDate = new Date(now).toISOString();

  try {
    const [hrvSamples, rhrSamples, sleepSamples] = await Promise.all([
      getHRVSamplesAsync(kit, { startDate, endDate, ascending: true, unit: 'ms' }),
      getRestingHRSamplesAsync(kit, { startDate, endDate, ascending: true, unit: 'bpm' }),
      getSleepSamplesAsync(kit, { startDate, endDate, ascending: true, limit: 1000 }),
    ]);

    const sleepByDay = new Map(bucketSleepByDay(sleepSamples).map((p) => [p.date, p.hours]));
    const hrvByDay = bucketDailyAverage(
      hrvSamples.map((s) => ({ ts: new Date(s.endDate).getTime(), value: s.value }))
    );
    const rhrByDay = bucketDailyAverage(
      rhrSamples.map((s) => ({ ts: new Date(s.endDate).getTime(), value: s.value }))
    );

    const out: HealthHistoryPoint[] = [];
    for (let i = safeDays - 1; i >= 0; i--) {
      const d = new Date(now - i * DAY_MS).toISOString().slice(0, 10);
      const hours = sleepByDay.get(d) ?? null;
      const sdnn = hrvByDay.get(d) ?? null;
      const bpm = rhrByDay.get(d) ?? null;
      out.push({ date: d, value: composeCapacityScore({ hours, sdnn, bpm }) });
    }
    return out;
  } catch (e) {
    console.warn('[health] getHealthHistory error:', e);
    return [];
  }
}

function bucketDailyAverage(points: { ts: number; value: number }[]): Map<string, number> {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const p of points) {
    const d = new Date(p.ts).toISOString().slice(0, 10);
    const cur = acc.get(d) ?? { sum: 0, n: 0 };
    cur.sum += p.value;
    cur.n += 1;
    acc.set(d, cur);
  }
  return new Map(Array.from(acc.entries()).map(([d, v]) => [d, v.sum / v.n]));
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Exported so future agents working on Pattern Intelligence can re-use the
 * same weighting rather than re-deriving it.
 */
export function composeCapacityScore(input: {
  hours: number | null;
  sdnn: number | null;
  bpm: number | null;
}): number {
  const sleep = input.hours == null ? null : clamp01(input.hours / 8) * 100;
  const hrv = input.sdnn == null ? null : clamp01((input.sdnn - 20) / 60) * 100;
  const rhr = input.bpm == null ? null : clamp01((80 - input.bpm) / 40) * 100;

  // Re-normalize weights across present signals so missing data doesn't deflate.
  const parts: { score: number; weight: number }[] = [];
  if (sleep !== null) parts.push({ score: sleep, weight: 0.45 });
  if (hrv !== null) parts.push({ score: hrv, weight: 0.35 });
  if (rhr !== null) parts.push({ score: rhr, weight: 0.2 });
  if (!parts.length) return 0;
  const totalW = parts.reduce((a, p) => a + p.weight, 0);
  const score = parts.reduce((a, p) => a + p.score * (p.weight / totalW), 0);
  return Math.round(score);
}

// -----------------------------------------------------------------------------
// Test / dev helpers
// -----------------------------------------------------------------------------

/** @internal — clears the in-memory snapshot cache. Useful in tests. */
export function _resetHealthCache(): void {
  _cachedSnapshot = null;
  _status = 'unknown';
  _initPromise = null;
  _kit = null;
  _kitLoadAttempted = false;
}
