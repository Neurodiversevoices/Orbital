/**
 * Orbital Biometric Authentication — MVP stub
 * expo-local-authentication removed for MVP (privacy-api purge, build 124).
 * All functions return "unavailable" so existing callers degrade gracefully.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const STORAGE_KEY = 'orbital_biometric_settings';

const DEFAULT_SETTINGS: BiometricSettings = {
  enabled: false,
  enabledAt: null,
  requireOnLaunch: true,
  requireForSensitiveActions: true,
};

const UNAVAILABLE: BiometricStatus = {
  isAvailable: false,
  isEnrolled: false,
  biometricType: 'none',
  securityLevel: 'none',
};

export async function getBiometricStatus(): Promise<BiometricStatus> {
  return UNAVAILABLE;
}

export function getBiometricDisplayName(_type: BiometricType): string {
  return 'Biometric';
}

export async function loadBiometricSettings(): Promise<BiometricSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function saveBiometricSettings(settings: BiometricSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export async function enableBiometric(): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Biometric authentication not available' };
}

export async function disableBiometric(): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function authenticate(
  _promptMessage = 'Authenticate to continue'
): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Biometric authentication not available' };
}

export async function shouldRequireBiometricOnLaunch(): Promise<boolean> {
  return false;
}

export async function shouldRequireBiometricForSensitiveAction(): Promise<boolean> {
  return false;
}

export async function verifyForSensitiveAction(
  _action = 'this action'
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

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

export function useBiometric(): UseBiometricResult {
  const [settings, setSettings] = useState<BiometricSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setSettings(await loadBiometricSettings());
    setIsLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    status: UNAVAILABLE,
    settings,
    isLoading,
    displayName: 'Biometric',
    enable: enableBiometric,
    disable: disableBiometric,
    authenticate,
    refresh,
  };
}
