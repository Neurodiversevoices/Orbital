// Apple Health Service — read-only, iOS-only, graceful fallback everywhere else.
// Requires react-native-health package and NSHealthShareUsageDescription in app.json.
import { Platform } from 'react-native';
import type { HealthInputs } from '../capacity/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AppleHealthKit: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HKConstants: any = null;

try {
  if (Platform.OS === 'ios') {
    // react-native-health is an optional peer — degrade gracefully if not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('react-native-health');
    AppleHealthKit = m.default || m;
    HKConstants = AppleHealthKit?.Constants;
  }
} catch {
  AppleHealthKit = null;
}

export function isHealthAvailable(): boolean {
  return Platform.OS === 'ios' && !!AppleHealthKit;
}

const READ_PERMS = () => {
  if (!HKConstants?.Permissions) return null;
  const P = HKConstants.Permissions;
  return {
    permissions: {
      read: [
        P.StepCount, P.SleepAnalysis, P.RestingHeartRate, P.HeartRate,
        P.HeartRateVariability, P.MindfulSession, P.Workout,
      ].filter(Boolean),
      write: [],
    },
  };
};

export function requestHealthPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isHealthAvailable()) return resolve(false);
    const opts = READ_PERMS();
    if (!opts) return resolve(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    AppleHealthKit.initHealthKit(opts, (err: any) => resolve(!err));
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const oneCall = <T,>(fn: any, opts: any): Promise<T | null> =>
  new Promise((res) => {
    try { fn(opts, (err: unknown, result: T) => err ? res(null) : res(result)); }
    catch { res(null); }
  });

export async function readHealthInputs(): Promise<HealthInputs> {
  if (!isHealthAvailable()) return {};
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const opts = { startDate: start.toISOString(), endDate: now.toISOString() };

  const [steps, rhr, hrv, sleep, mindful, workout] = await Promise.all([
    oneCall<{ value: number }>(AppleHealthKit.getStepCount, opts),
    oneCall<{ value: number }>(AppleHealthKit.getRestingHeartRate, opts),
    oneCall<Array<{ value: number }>>(AppleHealthKit.getHeartRateVariabilitySamples, opts),
    oneCall<Array<{ startDate: string; endDate: string; value: string }>>(AppleHealthKit.getSleepSamples, opts),
    oneCall<Array<{ value: number }>>(AppleHealthKit.getMindfulSession, opts),
    oneCall<Array<{ duration: number }>>(AppleHealthKit.getSamples, { ...opts, type: 'Workout' }),
  ]);

  const sleepMinutes = (sleep ?? []).reduce((acc, s) => {
    if (!s.startDate || !s.endDate) return acc;
    return acc + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
  }, 0);
  const hrvAvg = hrv && hrv.length ? hrv.reduce((a, x) => a + (x.value || 0), 0) / hrv.length : undefined;
  const mindfulMinutes = (mindful ?? []).length;
  const workoutMinutes = (workout ?? []).reduce((a, w) => a + (w.duration || 0), 0);

  return {
    steps: steps?.value,
    restingHeartRate: rhr?.value,
    hrv: hrvAvg,
    sleepMinutes: Math.round(sleepMinutes),
    mindfulMinutes,
    workoutMinutes: Math.round(workoutMinutes),
    capturedAt: now.toISOString(),
  };
}
