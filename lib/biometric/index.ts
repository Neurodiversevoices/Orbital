/**
 * Orbital Biometric Authentication
 *
 * Provides Face ID, Touch ID, and fingerprint authentication
 * for app unlock and sensitive operations.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Sentry from '@sentry/react-native';

// =============================================================================
// TYPES
// =============================================================================

export type BiometricType = 'facial' | 'fingerprint' | 'iris' | 'none';

export interface BiometricStatus {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: BiometricType;
  securityLevel: 'strong' | 'weak' | 'none';
}

export interface BiometricSettings {
  enabled: boolean;
  enabledAt: string | null;
  requireOnLaunch: boolean;
  requireForSensitiveActions: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = 'orbital_biometric_settings';

const DEFAULT_SETTINGS: BiometricSettings = {
  enabled: false,
  enabledAt: null,
  requireOnLaunch: true,
  requireForSensitiveActions: true,
};

// =============================================================================
// STATUS FUNCTIONS
// =============================================================================

/**
 * Check if biometric authentication is available on this device.
 */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  try {
    // Check if device supports biometrics
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return {
        isAvailable: false,
        isEnrolled: false,
        biometricType: 'none',
        securityLevel: 'none',
      };
    }

    // Check if biometrics are enrolled
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    // Get supported authentication types
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    // Determine biometric type
    let biometricType: BiometricType = 'none';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'facial';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    // Get security level
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    let securityLevel: BiometricStatus['securityLevel'] = 'none';
    if (level === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG) {
      securityLevel = 'strong';
    } else if (level === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK) {
      securityLevel = 'weak';
    }

    return {
      isAvailable: true,
      isEnrolled: enrolled,
      biometricType,
      securityLevel,
    };
  } catch {
    return {
      isAvailable: false,
      isEnrolled: false,
      biometricType: 'none',
      securityLevel: 'none',
    };
  }
}

/**
 * Get a user-friendly name for the biometric type.
 */
export function getBiometricDisplayName(type: BiometricType): string {
  switch (type) {
    case 'facial':
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
    case 'fingerprint':
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    case 'iris':
      return 'Iris Scan';
    default:
      return 'Biometric';
  }
}

// =============================================================================
// SETTINGS FUNCTIONS
// =============================================================================

/**
 * Load biometric settings from storage.
 */
export async function loadBiometricSettings(): Promise<BiometricSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save biometric settings to storage.
 */
export async function saveBiometricSettings(settings: BiometricSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silently fail - biometric is optional
  }
}

/**
 * Enable biometric authentication.
 * Requires successful biometric verification to enable.
 */
export async function enableBiometric(): Promise<{ success: boolean; error?: string }> {
  const status = await getBiometricStatus();

  if (!status.isAvailable) {
    return { success: false, error: 'Biometric authentication not available on this device' };
  }

  if (!status.isEnrolled) {
    return { success: false, error: 'No biometric data enrolled. Please set up biometrics in device settings.' };
  }

  // Authenticate to enable
  const result = await authenticate('Verify your identity to enable biometric unlock');
  if (!result.success) {
    return result;
  }

  // Save settings
  const settings: BiometricSettings = {
    enabled: true,
    enabledAt: new Date().toISOString(),
    requireOnLaunch: true,
    requireForSensitiveActions: true,
  };

  await saveBiometricSettings(settings);
  return { success: true };
}

/**
 * Disable biometric authentication.
 */
export async function disableBiometric(): Promise<{ success: boolean; error?: string }> {
  const settings = await loadBiometricSettings();

  if (!settings.enabled) {
    return { success: true }; // Already disabled
  }

  // Require biometric verification to disable
  const result = await authenticate('Verify your identity to disable biometric unlock');
  if (!result.success) {
    return result;
  }

  const newSettings: BiometricSettings = {
    ...DEFAULT_SETTINGS,
    enabled: false,
    enabledAt: null,
  };

  await saveBiometricSettings(newSettings);
  return { success: true };
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

/**
 * Authenticate using biometrics.
 */
export async function authenticate(
  promptMessage: string = 'Authenticate to continue'
): Promise<{ success: boolean; error?: string }> {
  try {
    const status = await getBiometricStatus();

    if (!status.isAvailable || !status.isEnrolled) {
      return { success: false, error: 'Biometric authentication not available' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow passcode fallback
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      return { success: true };
    }

    // Handle different error types
    if (result.error === 'user_cancel') {
      return { success: false, error: 'cancelled' };
    }

    if (result.error === 'user_fallback') {
      return { success: false, error: 'fallback' };
    }

    if (result.error === 'lockout') {
      return { success: false, error: 'Too many failed attempts. Please try again later.' };
    }

    return { success: false, error: result.error || 'Authentication failed' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Authentication failed';
    return { success: false, error: message };
  }
}

/**
 * Check if biometric is required on app launch.
 */
export async function shouldRequireBiometricOnLaunch(): Promise<boolean> {
  const settings = await loadBiometricSettings();
  if (!settings.enabled || !settings.requireOnLaunch) {
    return false;
  }

  const status = await getBiometricStatus();
  return status.isAvailable && status.isEnrolled;
}

/**
 * Check if biometric is required for sensitive actions.
 */
export async function shouldRequireBiometricForSensitiveAction(): Promise<boolean> {
  const settings = await loadBiometricSettings();
  if (!settings.enabled || !settings.requireForSensitiveActions) {
    return false;
  }

  const status = await getBiometricStatus();
  return status.isAvailable && status.isEnrolled;
}

/**
 * Verify biometric for sensitive actions.
 * Returns success immediately if biometric is not required.
 */
export async function verifyForSensitiveAction(
  action: string = 'this action'
): Promise<{ success: boolean; error?: string }> {
  const shouldVerify = await shouldRequireBiometricForSensitiveAction();

  if (!shouldVerify) {
    return { success: true };
  }

  return authenticate(`Authenticate to ${action}`);
}

// =============================================================================
// HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export interface UseBiometricResult {
  status: BiometricStatus;
  settings: BiometricSettings;
  isLoading: boolean;
  displayName: string;
  enable: () => Promise<{ success: boolean; error?: string }>;
  disable: () => Promise<{ success: boolean; error?: string }>;
  authenticate: (prompt?: string) => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing biometric authentication.
 */
export function useBiometric(): UseBiometricResult {
  const [status, setStatus] = useState<BiometricStatus>({
    isAvailable: false,
    isEnrolled: false,
    biometricType: 'none',
    securityLevel: 'none',
  });
  const [settings, setSettings] = useState<BiometricSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [newStatus, newSettings] = await Promise.all([
        getBiometricStatus(),
        loadBiometricSettings(),
      ]);
      setStatus(newStatus);
      setSettings(newSettings);
    } catch (error) {
      Sentry.captureException(error, { tags: { hook: 'useBiometric', op: 'refresh' } });
      if (__DEV__) console.error('[Biometric] Refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    const result = await enableBiometric();
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  const disable = useCallback(async () => {
    const result = await disableBiometric();
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  const authFn = useCallback(async (prompt?: string) => {
    return authenticate(prompt);
  }, []);

  return {
    status,
    settings,
    isLoading,
    displayName: getBiometricDisplayName(status.biometricType),
    enable,
    disable,
    authenticate: authFn,
    refresh,
  };
}
