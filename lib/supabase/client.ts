/**
 * Orbital Supabase Client
 *
 * Singleton Supabase client with:
 * - Expo-compatible auth storage
 * - Offline-first architecture support
 * - Graceful degradation when offline
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Database } from './types';
import { secureStorage } from './secureStorage';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Supabase project credentials
// Replace with actual values from Supabase dashboard
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// Storage key for auth persistence
const STORAGE_KEY = 'orbital_supabase_auth';

// =============================================================================
// AUTH STORAGE
// =============================================================================

// Auth tokens are persisted via the SecureStore-backed adapter
// (lib/supabase/secureStorage.ts). On native this maps to iOS Keychain /
// Android Keystore (AES-256). On web it falls back to localStorage,
// which matches the prior behavior. The adapter performs a one-time
// transparent migration of any pre-existing AsyncStorage token on the
// first read after install — existing logged-in users keep their session.
//
// See docs/IOS_AUDIT_PRIVACY_2026-05-09.md §F1 — Phase 5 Keychain migration.

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

let supabaseClient: SupabaseClient<Database> | null = null;

/**
 * Get or create the Supabase client singleton.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Check if properly configured
  if (SUPABASE_URL.includes('YOUR_PROJECT') || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
    if (__DEV__) console.warn('[Supabase] Not configured - cloud features disabled');
  }

  supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: secureStorage,
      storageKey: STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
    global: {
      headers: {
        'x-client-info': 'orbital-app',
      },
    },
  });

  return supabaseClient;
}

/**
 * Check if Supabase is properly configured.
 */
export function isSupabaseConfigured(): boolean {
  return !SUPABASE_URL.includes('YOUR_PROJECT') && SUPABASE_ANON_KEY !== 'YOUR_ANON_KEY';
}

/**
 * Check if we have network connectivity and Supabase is reachable.
 */
export async function isSupabaseReachable(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const supabase = getSupabase();
    // Simple health check - get session (doesn't require auth)
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export const supabase = getSupabase();
export type { SupabaseClient };
