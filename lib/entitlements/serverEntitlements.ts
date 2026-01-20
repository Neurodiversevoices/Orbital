/**
 * Server Entitlements Service
 *
 * Client-side service for fetching and caching durable entitlements from the server.
 * AsyncStorage is used as a local cache, but the server is the source of truth.
 *
 * In demo mode, entitlements are ephemeral (AsyncStorage only).
 * In test/live mode, entitlements are durable (server-side + cached locally).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPaymentMode, isDemoMode, getApiBaseUrl } from '../payments/paymentMode';

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
  ENTITLEMENTS_CACHE: '@orbital:entitlements_cache',
  ENTITLEMENTS_USER_ID: '@orbital:entitlements_user_id',
  LAST_SYNC: '@orbital:entitlements_last_sync',
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface ServerEntitlements {
  entitlements: string[];
  circleId?: string | null;
  bundleId?: string | null;
  updatedAt?: string | null;
  isDemo?: boolean;
}

// =============================================================================
// USER ID MANAGEMENT
// =============================================================================

/**
 * Get or create a stable user ID
 * In a real app, this would come from your auth system
 */
export async function getUserId(): Promise<string> {
  let userId = await AsyncStorage.getItem(STORAGE_KEYS.ENTITLEMENTS_USER_ID);

  if (!userId) {
    // Generate a stable user ID
    userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    await AsyncStorage.setItem(STORAGE_KEYS.ENTITLEMENTS_USER_ID, userId);
  }

  return userId;
}

/**
 * Set user ID (e.g., after auth)
 */
export async function setUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ENTITLEMENTS_USER_ID, userId);
}

// =============================================================================
// SERVER SYNC
// =============================================================================

/**
 * Fetch entitlements from server
 */
export async function fetchServerEntitlements(userId: string): Promise<ServerEntitlements> {
  if (isDemoMode()) {
    // In demo mode, return empty server entitlements
    return {
      entitlements: [],
      isDemo: true,
    };
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/entitlements?user_id=${encodeURIComponent(userId)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch entitlements: ${response.status}`);
  }

  return response.json();
}

/**
 * Sync entitlements from server and update local cache
 * Returns merged entitlements (server + local cache for demo)
 */
export async function syncEntitlements(): Promise<string[]> {
  const userId = await getUserId();

  try {
    const serverData = await fetchServerEntitlements(userId);

    if (serverData.isDemo) {
      // In demo mode, just return local cache
      const cached = await getCachedEntitlements();
      return cached;
    }

    // In test/live mode, server is source of truth
    // Update local cache
    await AsyncStorage.setItem(
      STORAGE_KEYS.ENTITLEMENTS_CACHE,
      JSON.stringify(serverData.entitlements)
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.LAST_SYNC,
      new Date().toISOString()
    );

    return serverData.entitlements;
  } catch (error) {
    console.error('[serverEntitlements] Sync failed:', error);
    // Fall back to cached entitlements
    return getCachedEntitlements();
  }
}

// =============================================================================
// LOCAL CACHE
// =============================================================================

/**
 * Get cached entitlements from AsyncStorage
 */
export async function getCachedEntitlements(): Promise<string[]> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.ENTITLEMENTS_CACHE);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

/**
 * Add entitlement to local cache (for demo mode)
 * In test/live mode, this should only be called after server confirmation
 */
export async function addCachedEntitlement(entitlementId: string): Promise<void> {
  const current = await getCachedEntitlements();
  if (!current.includes(entitlementId)) {
    current.push(entitlementId);
    await AsyncStorage.setItem(STORAGE_KEYS.ENTITLEMENTS_CACHE, JSON.stringify(current));
  }
}

/**
 * Clear cached entitlements (for testing)
 */
export async function clearCachedEntitlements(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ENTITLEMENTS_CACHE,
    STORAGE_KEYS.LAST_SYNC,
  ]);
}

// =============================================================================
// ENTITLEMENT CHECKS
// =============================================================================

/**
 * Check if user has a specific entitlement
 * Uses cached entitlements for performance, call syncEntitlements() periodically
 */
export async function hasServerEntitlement(entitlementId: string): Promise<boolean> {
  const entitlements = await getCachedEntitlements();
  return entitlements.includes(entitlementId);
}

/**
 * Get all current entitlements
 */
export async function getServerEntitlements(): Promise<string[]> {
  return getCachedEntitlements();
}

// =============================================================================
// RESTORE PURCHASES
// =============================================================================

/**
 * Restore purchases by syncing with server
 * Returns true if any entitlements were found
 */
export async function restorePurchases(): Promise<boolean> {
  if (isDemoMode()) {
    // In demo mode, nothing to restore from server
    return false;
  }

  const entitlements = await syncEntitlements();
  return entitlements.length > 0;
}
