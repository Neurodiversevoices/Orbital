/**
 * Orbital Device Registry
 *
 * Track devices and sessions for security.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// =============================================================================
// TYPES
// =============================================================================

export interface DeviceSession {
  id: string;
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android' | 'web';
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

// =============================================================================
// STORAGE KEYS
// =============================================================================

const DEVICE_ID_KEY = '@orbital:device_id';
const DEVICE_SESSIONS_KEY = '@orbital:device_sessions';
const CURRENT_SESSION_KEY = '@orbital:current_session';

// =============================================================================
// DEVICE IDENTIFICATION
// =============================================================================

/**
 * Get or create a unique device ID.
 */
export async function getDeviceId(): Promise<string> {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'unknown-device';
  }
}

/**
 * Get a human-readable device name.
 */
export function getDeviceName(): string {
  if (Platform.OS === 'ios') {
    return 'iPhone';
  } else if (Platform.OS === 'android') {
    return 'Android Device';
  } else if (Platform.OS === 'web') {
    // Try to get browser info
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) return 'Chrome Browser';
      if (ua.includes('Safari')) return 'Safari Browser';
      if (ua.includes('Firefox')) return 'Firefox Browser';
      if (ua.includes('Edge')) return 'Edge Browser';
    }
    return 'Web Browser';
  }
  return 'Unknown Device';
}

/**
 * Get the current platform.
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Create a new device session.
 */
export async function createDeviceSession(): Promise<DeviceSession> {
  const deviceId = await getDeviceId();
  const sessionId = Crypto.randomUUID();
  const now = new Date().toISOString();

  const session: DeviceSession = {
    id: sessionId,
    deviceId,
    deviceName: getDeviceName(),
    platform: getPlatform(),
    lastActiveAt: now,
    createdAt: now,
    isCurrent: true,
  };

  // Store current session
  await AsyncStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));

  // Add to session registry
  const sessions = await getDeviceSessions();

  // Mark all other sessions as not current
  const updatedSessions = sessions.map(s => ({ ...s, isCurrent: false }));

  // Add new session
  updatedSessions.push(session);

  // Keep only last 10 sessions
  const trimmedSessions = updatedSessions.slice(-10);

  await AsyncStorage.setItem(DEVICE_SESSIONS_KEY, JSON.stringify(trimmedSessions));

  return session;
}

/**
 * Get current device session.
 */
export async function getCurrentSession(): Promise<DeviceSession | null> {
  try {
    const json = await AsyncStorage.getItem(CURRENT_SESSION_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Update last active time for current session.
 */
export async function updateSessionActivity(): Promise<void> {
  try {
    const session = await getCurrentSession();
    if (!session) return;

    const updated: DeviceSession = {
      ...session,
      lastActiveAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(updated));

    // Also update in session registry
    const sessions = await getDeviceSessions();
    const updatedSessions = sessions.map(s =>
      s.id === session.id ? updated : s
    );
    await AsyncStorage.setItem(DEVICE_SESSIONS_KEY, JSON.stringify(updatedSessions));
  } catch {
    // Silently fail
  }
}

/**
 * Get all device sessions.
 */
export async function getDeviceSessions(): Promise<DeviceSession[]> {
  try {
    const json = await AsyncStorage.getItem(DEVICE_SESSIONS_KEY);
    if (!json) return [];
    return JSON.parse(json);
  } catch {
    return [];
  }
}

/**
 * Remove a device session.
 */
export async function removeDeviceSession(sessionId: string): Promise<void> {
  try {
    const sessions = await getDeviceSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await AsyncStorage.setItem(DEVICE_SESSIONS_KEY, JSON.stringify(filtered));

    // If removing current session, clear it
    const current = await getCurrentSession();
    if (current?.id === sessionId) {
      await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Clear all sessions (logout all devices).
 */
export async function clearAllSessions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DEVICE_SESSIONS_KEY);
    await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
  } catch {
    // Silently fail
  }
}

/**
 * End current session (single device logout).
 */
export async function endCurrentSession(): Promise<void> {
  const current = await getCurrentSession();
  if (current) {
    await removeDeviceSession(current.id);
  }
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format relative time for session display.
 */
export function formatSessionTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Get platform icon name.
 */
export function getPlatformIcon(platform: 'ios' | 'android' | 'web'): string {
  switch (platform) {
    case 'ios': return 'Smartphone';
    case 'android': return 'Smartphone';
    case 'web': return 'Monitor';
  }
}
