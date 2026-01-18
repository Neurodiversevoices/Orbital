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

export type AvatarSource = 'initials' | 'preset' | 'upload' | 'gravatar';

export interface UserIdentity {
  displayName: string | null;
  avatarUrl: string | null;
  avatarSource: AvatarSource;
  /** Optional accent color for initials avatar (hex, contrast-safe) */
  accentColor: string | null;
  updatedAt: string | null;
}

export const DEFAULT_IDENTITY: UserIdentity = {
  displayName: null,
  avatarUrl: null,
  avatarSource: 'initials',  // Always initials-only (no image uploads)
  accentColor: null,         // Uses getAvatarColor() fallback if null
  updatedAt: null,
};

// =============================================================================
// ACCENT COLOR PRESETS
// =============================================================================

/**
 * 6 preset accent colors for initials avatars.
 * Chosen for contrast safety on dark UI (#0D0E12) and print (white).
 */
export const ACCENT_COLOR_PRESETS = [
  { id: 'cyan', hex: '#00E5FF', label: 'Cyan' },
  { id: 'purple', hex: '#B388FF', label: 'Purple' },
  { id: 'green', hex: '#69F0AE', label: 'Green' },
  { id: 'orange', hex: '#FFAB40', label: 'Orange' },
  { id: 'pink', hex: '#FF80AB', label: 'Pink' },
  { id: 'blue', hex: '#448AFF', label: 'Blue' },
] as const;

export type AccentColorId = typeof ACCENT_COLOR_PRESETS[number]['id'];

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

export async function updateAccentColor(color: string | null): Promise<void> {
  const identity = await loadIdentity();
  await saveIdentity({
    ...identity,
    accentColor: color,
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
  accentColor: string | null;
  updateName: (name: string | null) => Promise<void>;
  updateAvatar: (url: string | null, source?: AvatarSource) => Promise<void>;
  updateAccentColor: (color: string | null) => Promise<void>;
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

  const handleUpdateAccentColor = useCallback(async (color: string | null) => {
    await updateAccentColor(color);
    await refresh();
  }, [refresh]);

  // Use accentColor if set, otherwise fall back to generated color
  const effectiveAvatarColor = identity.accentColor || getAvatarColor((identity.displayName || email) ?? null);

  return {
    identity,
    isLoading,
    displayName: identity.displayName,
    initials: getInitials(identity.displayName, email ?? null),
    avatarColor: effectiveAvatarColor,
    accentColor: identity.accentColor,
    updateName: handleUpdateName,
    updateAvatar: handleUpdateAvatar,
    updateAccentColor: handleUpdateAccentColor,
    refresh,
  };
}
