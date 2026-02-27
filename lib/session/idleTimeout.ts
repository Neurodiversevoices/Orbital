/**
 * Orbital Idle Timeout
 *
 * Automatically sign out users after inactivity.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// CONFIGURATION
// =============================================================================

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 60 * 1000; // Show warning 1 minute before
const LAST_ACTIVITY_KEY = '@orbital:last_activity';

// =============================================================================
// STORAGE
// =============================================================================

export async function getLastActivity(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem(LAST_ACTIVITY_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
  } catch {
    return Date.now();
  }
}

export async function updateLastActivity(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch {
    // Silently fail
  }
}

export async function clearLastActivity(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // Silently fail
  }
}

// =============================================================================
// HOOK
// =============================================================================

export interface IdleTimeoutState {
  isIdle: boolean;
  showWarning: boolean;
  remainingSeconds: number;
}

export interface UseIdleTimeoutOptions {
  enabled: boolean;
  onTimeout: () => void;
  onWarning?: () => void;
  timeoutMs?: number;
  warningBeforeMs?: number;
}

export function useIdleTimeout(options: UseIdleTimeoutOptions): IdleTimeoutState {
  const {
    enabled,
    onTimeout,
    onWarning,
    timeoutMs = IDLE_TIMEOUT_MS,
    warningBeforeMs = WARNING_BEFORE_MS,
  } = options;

  const [state, setState] = useState<IdleTimeoutState>({
    isIdle: false,
    showWarning: false,
    remainingSeconds: Math.floor(timeoutMs / 1000),
  });

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>('active');
  const warningShownRef = useRef(false);

  // Reset activity timer
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    void updateLastActivity(); // intentional fire-and-forget: sync callback cannot be async
    setState({
      isIdle: false,
      showWarning: false,
      remainingSeconds: Math.floor(timeoutMs / 1000),
    });
  }, [timeoutMs]);

  // Check idle status
  const checkIdle = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    const elapsed = now - lastActivityRef.current;
    const remaining = Math.max(0, timeoutMs - elapsed);
    const remainingSeconds = Math.ceil(remaining / 1000);

    // Timeout reached
    if (elapsed >= timeoutMs) {
      setState({ isIdle: true, showWarning: false, remainingSeconds: 0 });
      onTimeout();
      return;
    }

    // Warning threshold reached
    if (remaining <= warningBeforeMs && !warningShownRef.current) {
      warningShownRef.current = true;
      setState(prev => ({ ...prev, showWarning: true, remainingSeconds }));
      onWarning?.();
      return;
    }

    // Update remaining time during warning
    if (warningShownRef.current) {
      setState(prev => ({ ...prev, remainingSeconds }));
    }
  }, [enabled, timeoutMs, warningBeforeMs, onTimeout, onWarning]);

  // Handle app state changes (native) or visibility changes (web)
  useEffect(() => {
    // Web: use document visibility API
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          getLastActivity().then((lastActivity) => {
            const elapsed = Date.now() - lastActivity;
            if (elapsed >= timeoutMs) {
              setState({ isIdle: true, showWarning: false, remainingSeconds: 0 });
              onTimeout();
            } else {
              lastActivityRef.current = lastActivity;
              checkIdle();
            }
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    // Native: use AppState
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (prevState !== 'active' && nextState === 'active') {
        // App came to foreground - check elapsed time
        getLastActivity().then((lastActivity) => {
          const elapsed = Date.now() - lastActivity;
          if (elapsed >= timeoutMs) {
            setState({ isIdle: true, showWarning: false, remainingSeconds: 0 });
            onTimeout();
          } else {
            lastActivityRef.current = lastActivity;
            checkIdle();
          }
        });
      } else if (nextState === 'active') {
        // User is active
        resetActivity();
      }
    });

    return () => subscription.remove();
  }, [timeoutMs, onTimeout, checkIdle, resetActivity]);

  // Start/stop idle check timer
  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Initialize last activity
    resetActivity();

    // Check every second
    timerRef.current = setInterval(checkIdle, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, checkIdle, resetActivity]);

  return state;
}

// =============================================================================
// ACTIVITY TRACKER COMPONENT PROPS
// =============================================================================

export interface IdleTimeoutProviderProps {
  children: React.ReactNode;
  enabled: boolean;
  onTimeout: () => void;
  onWarning?: () => void;
}
