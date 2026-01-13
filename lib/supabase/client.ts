/**
 * Orbital Supabase Client
 *
 * Singleton Supabase client with:
 * - Expo-compatible auth storage
 * - Offline-first architecture support
 * - Graceful degradation when offline
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Database } from './types';

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
// CUSTOM AUTH STORAGE
// =============================================================================

/**
 * Custom storage adapter for Supabase auth that works with Expo/React Native.
 * Uses AsyncStorage for native platforms and localStorage for web.
 */
const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

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
      storage: customStorage,
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
