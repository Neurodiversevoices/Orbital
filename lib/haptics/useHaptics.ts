/**
 * useHaptics — unified semantic haptic feedback hook.
 *
 * Wraps expo-haptics with intent-based methods (press / success / error /
 * tick / heavy) so callers don't have to pick the right ImpactFeedbackStyle
 * or NotificationFeedbackType at every site.
 *
 * Web is a no-op (haptics aren't available in browsers). Any platform-level
 * haptics failure is swallowed — feedback is non-essential UX polish and must
 * never crash the surface that triggered it.
 */

import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isWeb = Platform.OS === 'web';

function safeFire(fn: () => Promise<unknown> | unknown): void {
  if (isWeb) return;
  try {
    const result = fn();
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      (result as Promise<unknown>).catch(() => { /* swallow — haptics are best-effort */ });
    }
  } catch {
    /* swallow — haptics are best-effort */
  }
}

export interface HapticsApi {
  /** Light tap on button press / interactive element. */
  press: () => void;
  /** Success notification (confirmed action, signed in, saved). */
  success: () => void;
  /** Error notification (failed submit, validation rejection). */
  error: () => void;
  /** Selection tick — subtle, used for state transitions. */
  tick: () => void;
  /** Heavy impact for emphatic moments (rare). */
  heavy: () => void;
}

export function useHaptics(): HapticsApi {
  const press = useCallback(() => {
    safeFire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  }, []);

  const success = useCallback(() => {
    safeFire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }, []);

  const error = useCallback(() => {
    safeFire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  }, []);

  const tick = useCallback(() => {
    safeFire(() => Haptics.selectionAsync());
  }, []);

  const heavy = useCallback(() => {
    safeFire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  }, []);

  return useMemo(
    () => ({ press, success, error, tick, heavy }),
    [press, success, error, tick, heavy],
  );
}

export default useHaptics;
