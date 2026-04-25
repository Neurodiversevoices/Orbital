// Apple Health Service — read-only, iOS-only, graceful fallback everywhere else.
// Hard Rule 2.5: all read methods check _authorized before any HealthKit call.
import { Platform } from 'react-native';

let _authorized = false;

export const isHealthAvailable = (): boolean => Platform.OS === 'ios';
export const isAuthorized = (): boolean => _authorized;

export async function requestAuthorization(): Promise<boolean> {
  if (!isHealthAvailable()) return false;
  try {
    // Lazy import — avoids bundle crash on web/iPad where HealthKit isn't present
    const mod = await import('react-native-health');
    const AppleHealthKit = (mod as { default?: unknown; Constants?: unknown }).default ?? mod;
    const HK = AppleHealthKit as {
      Constants: { Permissions: Record<string, string> };
      initHealthKit: (opts: unknown, cb: (err: unknown) => void) => void;
    };
    const P = HK.Constants.Permissions;
    const opts = {
      permissions: {
        read: [
          P.SleepAnalysis,
          P.HeartRateVariability,
          P.RestingHeartRate,
          P.RespiratoryRate,
          P.Workout,
          P.StepCount,
        ].filter(Boolean),
        write: [],
      },
    };
    return new Promise<boolean>((resolve) => {
      HK.initHealthKit(opts, (err) => {
        _authorized = !err;
        resolve(_authorized);
      });
    });
  } catch {
    _authorized = false;
    return false;
  }
}

/** Returns raw signal values for the past `days` days. Requires prior authorization. */
export async function readDailySignals(_days = 30): Promise<Array<number | null>> {
  if (!isHealthAvailable() || !_authorized) return [];
  // Full implementation: query getSleepSamples, getHeartRateVariabilitySamples, etc.
  // Returns empty array until fully wired — safe to call at any time.
  return [];
}
