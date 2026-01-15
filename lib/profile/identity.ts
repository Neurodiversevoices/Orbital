/**
 * Orbital User Identity
 *
 * Display name and avatar management.
 * Stored locally by default (privacy-first).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type AvatarSource = 'initials' | 'upload' | 'gravatar';

export interface UserIdentity {
  displayName: string | null;
  avatarUrl: string | null;
  avatarSource: AvatarSource;
  updatedAt: string | null;
}

export const DEFAULT_IDENTITY: UserIdentity = {
  displayName: null,
  avatarUrl: null,
  avatarSource: 'initials',
  updatedAt: null,
};

// =============================================================================
// STORAGE
// =============================================================================

const IDENTITY_STORAGE_KEY = '@orbital:user_identity';

export async function loadIdentity(): Promise<UserIdentity> {
  try {
    const json = await AsyncStorage.getItem(IDENTITY_STORAGE_KEY);
    if (!json) return DEFAULT_IDENTITY;
    return { ...DEFAULT_IDENTITY, ...JSON.parse(json) };
  } catch {
    return DEFAULT_IDENTITY;
  }
}

export async function saveIdentity(identity: UserIdentity): Promise<void> {
  try {
    const toSave: UserIdentity = {
      ...identity,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    if (__DEV__) console.error('[Identity] Failed to save:', error);
    throw error;
  }
}

export async function updateDisplayName(name: string | null): Promise<void> {
  const identity = await loadIdentity();
  await saveIdentity({
    ...identity,
    displayName: name?.trim() || null,
  });
}

export async function updateAvatar(
  url: string | null,
  source: AvatarSource = 'upload'
): Promise<void> {
  const identity = await loadIdentity();
  await saveIdentity({
    ...identity,
    avatarUrl: url,
    avatarSource: source,
  });
}

export async function clearIdentity(): Promise<void> {
  await AsyncStorage.removeItem(IDENTITY_STORAGE_KEY);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get initials from display name or email.
 */
export function getInitials(name: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
}

/**
 * Generate a consistent color from a string.
 */
export function getAvatarColor(seed: string | null): string {
  if (!seed) return '#00E5FF';

  // Simple hash to number
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Map to hue (0-360), keep saturation and lightness fixed
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

// =============================================================================
// HOOK
// =============================================================================

export interface UseIdentityResult {
  identity: UserIdentity;
  isLoading: boolean;
  displayName: string | null;
  initials: string;
  avatarColor: string;
  updateName: (name: string | null) => Promise<void>;
  updateAvatar: (url: string | null, source?: AvatarSource) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useIdentity(email?: string | null): UseIdentityResult {
  const [identity, setIdentity] = useState<UserIdentity>(DEFAULT_IDENTITY);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const loaded = await loadIdentity();
    setIdentity(loaded);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpdateName = useCallback(async (name: string | null) => {
    await updateDisplayName(name);
    await refresh();
  }, [refresh]);

  const handleUpdateAvatar = useCallback(async (url: string | null, source: AvatarSource = 'upload') => {
    await updateAvatar(url, source);
    await refresh();
  }, [refresh]);

  return {
    identity,
    isLoading,
    displayName: identity.displayName,
    initials: getInitials(identity.displayName, email),
    avatarColor: getAvatarColor(identity.displayName || email),
    updateName: handleUpdateName,
    updateAvatar: handleUpdateAvatar,
    refresh,
  };
}
