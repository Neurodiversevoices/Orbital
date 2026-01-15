/**
 * Orbital Session Audit Log
 *
 * Track authentication events for security.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId, getDeviceName, getPlatform } from './deviceRegistry';

// =============================================================================
// TYPES
// =============================================================================

export type SessionAction =
  | 'sign_in'
  | 'sign_out'
  | 'sign_up'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_verified'
  | 'password_changed'
  | 'password_reset_requested'
  | 'session_expired'
  | 'biometric_enabled'
  | 'biometric_disabled';

export interface SessionAuditEntry {
  id: string;
  action: SessionAction;
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android' | 'web';
  timestamp: string;
  metadata?: {
    method?: 'email' | 'magic_link' | 'apple';
    mfaUsed?: boolean;
    reason?: string;
  };
}

// =============================================================================
// STORAGE
// =============================================================================

const AUDIT_LOG_KEY = '@orbital:session_audit_log';
const MAX_ENTRIES = 100;

/**
 * Get all audit entries.
 */
export async function getAuditLog(): Promise<SessionAuditEntry[]> {
  try {
    const json = await AsyncStorage.getItem(AUDIT_LOG_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/**
 * Log an authentication event.
 */
export async function logAuthEvent(
  action: SessionAction,
  metadata?: SessionAuditEntry['metadata']
): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    const entry: SessionAuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      action,
      deviceId,
      deviceName: getDeviceName(),
      platform: getPlatform(),
      timestamp: new Date().toISOString(),
      metadata,
    };

    const log = await getAuditLog();
    log.push(entry);

    // Keep only last MAX_ENTRIES
    const trimmed = log.slice(-MAX_ENTRIES);

    await AsyncStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // Silently fail - audit is best-effort
  }
}

/**
 * Clear audit log.
 */
export async function clearAuditLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUDIT_LOG_KEY);
  } catch {
    // Silently fail
  }
}

// =============================================================================
// CONVENIENCE LOGGERS
// =============================================================================

export async function logSignIn(method: 'email' | 'magic_link' | 'apple', mfaUsed: boolean = false): Promise<void> {
  await logAuthEvent('sign_in', { method, mfaUsed });
}

export async function logSignOut(reason?: string): Promise<void> {
  await logAuthEvent('sign_out', { reason });
}

export async function logSignUp(method: 'email' | 'magic_link' | 'apple'): Promise<void> {
  await logAuthEvent('sign_up', { method });
}

export async function logMFAEnabled(): Promise<void> {
  await logAuthEvent('mfa_enabled');
}

export async function logMFADisabled(): Promise<void> {
  await logAuthEvent('mfa_disabled');
}

export async function logMFAVerified(): Promise<void> {
  await logAuthEvent('mfa_verified');
}

export async function logPasswordChanged(): Promise<void> {
  await logAuthEvent('password_changed');
}

export async function logPasswordResetRequested(): Promise<void> {
  await logAuthEvent('password_reset_requested');
}

export async function logSessionExpired(): Promise<void> {
  await logAuthEvent('session_expired', { reason: 'idle_timeout' });
}

export async function logBiometricEnabled(): Promise<void> {
  await logAuthEvent('biometric_enabled');
}

export async function logBiometricDisabled(): Promise<void> {
  await logAuthEvent('biometric_disabled');
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Get human-readable action description.
 */
export function getActionDescription(action: SessionAction): string {
  switch (action) {
    case 'sign_in': return 'Signed in';
    case 'sign_out': return 'Signed out';
    case 'sign_up': return 'Account created';
    case 'mfa_enabled': return 'Two-factor authentication enabled';
    case 'mfa_disabled': return 'Two-factor authentication disabled';
    case 'mfa_verified': return 'Two-factor code verified';
    case 'password_changed': return 'Password changed';
    case 'password_reset_requested': return 'Password reset requested';
    case 'session_expired': return 'Session expired';
    case 'biometric_enabled': return 'Biometric unlock enabled';
    case 'biometric_disabled': return 'Biometric unlock disabled';
  }
}

/**
 * Get action icon color.
 */
export function getActionColor(action: SessionAction): string {
  switch (action) {
    case 'sign_in':
    case 'sign_up':
    case 'mfa_enabled':
    case 'mfa_verified':
    case 'biometric_enabled':
      return '#4CAF50'; // Green - positive actions
    case 'sign_out':
    case 'session_expired':
      return '#FF9800'; // Orange - neutral/warning
    case 'mfa_disabled':
    case 'biometric_disabled':
      return '#F44336'; // Red - security reduced
    case 'password_changed':
    case 'password_reset_requested':
      return '#00E5FF'; // Cyan - security action
  }
}
