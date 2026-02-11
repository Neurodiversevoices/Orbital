/**
 * Safe Mode System
 *
 * Automatically detects startup crashes and enters Safe Mode.
 * Safe Mode disables gestures, animations, and risky providers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

const SAFE_MODE_KEY = '@orbital:safe_mode';
const CRASH_FLAG_KEY = '@orbital:startup_crash_flag';
const CRASH_COUNT_KEY = '@orbital:startup_crash_count';
const STARTUP_COMPLETE_KEY = '@orbital:startup_complete';

const CRASH_THRESHOLD = 2; // Enter safe mode after 2 consecutive crashes
const STARTUP_TIMEOUT_MS = 10000; // 10 seconds to complete startup

export interface SafeModeState {
  enabled: boolean;
  reason: string | null;
  crashCount: number;
  lastCrashTime: string | null;
}

let safeModeState: SafeModeState = {
  enabled: false,
  reason: null,
  crashCount: 0,
  lastCrashTime: null,
};

let startupTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize Safe Mode detection.
 * Call this BEFORE rendering any components.
 * This is synchronous and sets initial state from memory.
 */
export function initSafeMode(): SafeModeState {
  // Return cached state for synchronous access
  return safeModeState;
}

/**
 * Async initialization - checks storage for crash history.
 * Call this early in app lifecycle.
 */
export async function initSafeModeAsync(): Promise<SafeModeState> {
  try {
    const [crashFlag, crashCountStr, safeModeStr] = await Promise.all([
      AsyncStorage.getItem(CRASH_FLAG_KEY),
      AsyncStorage.getItem(CRASH_COUNT_KEY),
      AsyncStorage.getItem(SAFE_MODE_KEY),
    ]);

    const crashCount = parseInt(crashCountStr || '0', 10);
    const wasStarting = crashFlag === 'true';

    // If app was starting and didn't complete, it crashed
    if (wasStarting) {
      const newCrashCount = crashCount + 1;
      await AsyncStorage.setItem(CRASH_COUNT_KEY, String(newCrashCount));

      safeModeState.crashCount = newCrashCount;
      safeModeState.lastCrashTime = new Date().toISOString();

      if (newCrashCount >= CRASH_THRESHOLD) {
        safeModeState.enabled = true;
        safeModeState.reason = `${newCrashCount} consecutive startup crashes detected`;

        await AsyncStorage.setItem(SAFE_MODE_KEY, JSON.stringify(safeModeState));

        // Log to Sentry
        Sentry.captureMessage('Safe Mode activated due to startup crashes', {
          level: 'warning',
          tags: { safeMode: 'true' },
          extra: { crashCount: newCrashCount },
        });
      }
    }

    // Check if safe mode was previously enabled
    if (safeModeStr) {
      const stored = JSON.parse(safeModeStr);
      if (stored.enabled) {
        safeModeState = stored;
      }
    }

    // Set crash flag - will be cleared on successful startup
    await AsyncStorage.setItem(CRASH_FLAG_KEY, 'true');

    // Set timeout to detect stuck startup
    startupTimer = setTimeout(async () => {
      Sentry.captureMessage('Startup timeout - app may be stuck', {
        level: 'warning',
        tags: { startupTimeout: 'true' },
      });
    }, STARTUP_TIMEOUT_MS);

    return safeModeState;
  } catch (e) {
    // If storage fails, continue without safe mode
    if (__DEV__) console.warn('[SafeMode] Failed to initialize:', e);
    return safeModeState;
  }
}

/**
 * Mark startup as complete.
 * Call this after the app has successfully rendered.
 */
export async function markStartupComplete(): Promise<void> {
  try {
    // Clear the crash flag
    await AsyncStorage.setItem(CRASH_FLAG_KEY, 'false');
    await AsyncStorage.setItem(STARTUP_COMPLETE_KEY, new Date().toISOString());

    // Clear the timer
    if (startupTimer) {
      clearTimeout(startupTimer);
      startupTimer = null;
    }

    // If we're not in safe mode, reset crash count
    if (!safeModeState.enabled) {
      await AsyncStorage.setItem(CRASH_COUNT_KEY, '0');
    }
  } catch (e) {
    if (__DEV__) console.warn('[SafeMode] Failed to mark startup complete:', e);
  }
}

/**
 * Check if safe mode is enabled.
 */
export function isSafeModeEnabled(): boolean {
  return safeModeState.enabled;
}

/**
 * Get the current safe mode state.
 */
export function getSafeModeState(): SafeModeState {
  return { ...safeModeState };
}

/**
 * Manually exit safe mode.
 * Use this after the user confirms they want to try normal mode.
 */
export async function exitSafeMode(): Promise<void> {
  safeModeState = {
    enabled: false,
    reason: null,
    crashCount: 0,
    lastCrashTime: null,
  };

  try {
    await Promise.all([
      AsyncStorage.removeItem(SAFE_MODE_KEY),
      AsyncStorage.setItem(CRASH_COUNT_KEY, '0'),
    ]);
  } catch (error) {
    Sentry.captureException(error, { tags: { feature: 'safe_mode', op: 'exit' } });
  }

  Sentry.captureMessage('Safe Mode manually exited', {
    level: 'info',
    tags: { safeMode: 'false' },
  });
}

/**
 * Force enable safe mode.
 * Use this for testing or when a critical error is detected.
 */
export async function forceSafeMode(reason: string): Promise<void> {
  safeModeState = {
    enabled: true,
    reason,
    crashCount: safeModeState.crashCount,
    lastCrashTime: new Date().toISOString(),
  };

  await AsyncStorage.setItem(SAFE_MODE_KEY, JSON.stringify(safeModeState));

  Sentry.captureMessage(`Safe Mode forced: ${reason}`, {
    level: 'warning',
    tags: { safeMode: 'true', forced: 'true' },
  });
}

/**
 * Get safe mode config for providers.
 * Returns disabled config when in safe mode.
 */
export function getSafeModeConfig() {
  if (safeModeState.enabled) {
    return {
      animations: false,
      gestures: false,
      haptics: false,
      transitions: 'none' as const,
    };
  }

  return {
    animations: true,
    gestures: true,
    haptics: true,
    transitions: 'default' as const,
  };
}
