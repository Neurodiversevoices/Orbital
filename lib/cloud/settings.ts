/**
 * Cloud Settings Storage
 *
 * Manages device ID and sync timestamps.
 *
 * IMPORTANT: Cloud sync is AUTOMATIC when authenticated.
 * There is no opt-in/opt-out. Authentication = cloud is system of record.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CloudSettings, DEFAULT_CLOUD_SETTINGS } from './types';

// =============================================================================
// STORAGE KEY
// =============================================================================

const CLOUD_SETTINGS_KEY = '@orbital:cloud_settings';

// =============================================================================
// DEVICE ID
// =============================================================================

/**
 * Generate a unique device ID.
 */
function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
}

// =============================================================================
// SETTINGS OPERATIONS
// =============================================================================

/**
 * Load cloud settings from storage.
 */
export async function loadCloudSettings(): Promise<CloudSettings> {
  try {
    const json = await AsyncStorage.getItem(CLOUD_SETTINGS_KEY);
    if (!json) {
      // Initialize with new device ID
      const settings: CloudSettings = {
        ...DEFAULT_CLOUD_SETTINGS,
        deviceId: generateDeviceId(),
      };
      await saveCloudSettings(settings);
      return settings;
    }

    const stored = JSON.parse(json);

    // Ensure device ID exists
    if (!stored.deviceId) {
      stored.deviceId = generateDeviceId();
      await saveCloudSettings(stored);
    }

    return {
      ...DEFAULT_CLOUD_SETTINGS,
      ...stored,
    };
  } catch (error) {
    if (__DEV__) console.error('[CloudSettings] Failed to load:', error);
    return {
      ...DEFAULT_CLOUD_SETTINGS,
      deviceId: generateDeviceId(),
    };
  }
}

/**
 * Save cloud settings to storage.
 */
export async function saveCloudSettings(settings: CloudSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(CLOUD_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    if (__DEV__) console.error('[CloudSettings] Failed to save:', error);
    throw error;
  }
}

/**
 * @deprecated Cloud sync is always enabled when authenticated.
 * Kept for backwards compatibility during migration.
 */
export async function enableCloudBackup(): Promise<void> {
  // No-op: cloud sync is automatic when authenticated
}

/**
 * @deprecated Cloud sync cannot be disabled. Authentication = cloud sync.
 * Kept for backwards compatibility during migration.
 */
export async function disableCloudBackup(): Promise<void> {
  // No-op: cloud sync is automatic when authenticated
}

/**
 * Cloud backup is ALWAYS enabled when authenticated.
 * There is no user opt-in/opt-out.
 */
export async function isCloudBackupEnabled(): Promise<boolean> {
  // Always true - cloud is the system of record
  return true;
}

/**
 * Get device ID.
 */
export async function getDeviceId(): Promise<string> {
  const settings = await loadCloudSettings();
  return settings.deviceId;
}

/**
 * Update last push timestamp.
 */
export async function updateLastPush(): Promise<void> {
  const settings = await loadCloudSettings();
  settings.lastPushAt = new Date().toISOString();
  await saveCloudSettings(settings);
}

/**
 * Update last pull timestamp.
 */
export async function updateLastPull(): Promise<void> {
  const settings = await loadCloudSettings();
  settings.lastPullAt = new Date().toISOString();
  await saveCloudSettings(settings);
}

/**
 * Get last pull timestamp.
 */
export async function getLastPullTime(): Promise<Date | null> {
  const settings = await loadCloudSettings();
  return settings.lastPullAt ? new Date(settings.lastPullAt) : null;
}
