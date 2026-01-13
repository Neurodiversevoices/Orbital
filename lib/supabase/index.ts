/**
 * Orbital Supabase Module
 *
 * Cloud backend integration with:
 * - Authentication (email, magic link, anonymous)
 * - Capacity log sync (offline-first)
 * - Data export/delete (GDPR compliance)
 *
 * Usage:
 *   import { useAuth, useCapacitySync, isSupabaseConfigured } from '@/lib/supabase';
 *
 *   // Auth
 *   const { user, signInWithEmail, signOut } = useAuth();
 *
 *   // Sync
 *   const { logs, addLog, syncStatus } = useCapacitySync();
 */

// Client
export { getSupabase, supabase, isSupabaseConfigured, isSupabaseReachable } from './client';

// Auth
export { useAuth, getCurrentUserId, isAuthenticated } from './auth';
export type { AuthState, AuthActions, AuthContext } from './auth';

// Sync
export { useCapacitySync, exportUserData, deleteUserData } from './sync';
export type { CapacitySyncContext } from './sync';

// Cloud-First Patterns
export { useCloudPatterns } from './useCloudPatterns';
export type { CloudPatternsContext } from './useCloudPatterns';

// Types
export * from './types';
