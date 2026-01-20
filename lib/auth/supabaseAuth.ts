/**
 * Supabase Auth Service
 *
 * Handles user authentication via Supabase Auth.
 * Supports magic link (email) and OAuth providers.
 *
 * The authenticated user's UUID is used as the entitlements key,
 * enabling cross-device sync and restore.
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

let supabaseClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL || '';
}

function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
}

/**
 * Get or create the Supabase client
 * Uses AsyncStorage for session persistence on React Native
 */
export function getSupabase(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error('Supabase not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  return supabaseClient;
}

// =============================================================================
// AUTH STATE
// =============================================================================

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Get authenticated user ID (UUID)
 * Returns null if not authenticated
 */
export async function getAuthUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

/**
 * Get authenticated user email
 */
export async function getAuthUserEmail(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.email || null;
}

// =============================================================================
// MAGIC LINK AUTH
// =============================================================================

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

/**
 * Send magic link to email
 * User clicks link to sign in (no password required)
 */
export async function sendMagicLink(email: string): Promise<AuthResult> {
  const supabase = getSupabase();

  // Get redirect URL based on environment
  const redirectTo = Platform.OS === 'web'
    ? `${window.location.origin}/auth/callback`
    : undefined; // Deep link for native (not supported in web-only mode)

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    console.error('[auth] Magic link error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Verify OTP code (for magic link callback)
 */
export async function verifyOtp(email: string, token: string): Promise<AuthResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    console.error('[auth] OTP verification error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user ?? undefined };
}

// =============================================================================
// OAUTH AUTH
// =============================================================================

/**
 * Sign in with OAuth provider
 * Opens popup/redirect to provider's login page
 */
export async function signInWithOAuth(
  provider: 'google' | 'apple' | 'github'
): Promise<AuthResult> {
  const supabase = getSupabase();

  const redirectTo = Platform.OS === 'web'
    ? `${window.location.origin}/auth/callback`
    : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error('[auth] OAuth error:', error);
    return { success: false, error: error.message };
  }

  // OAuth redirects away, so success here means redirect initiated
  return { success: true };
}

// =============================================================================
// SIGN OUT
// =============================================================================

/**
 * Sign out current user
 */
export async function signOut(): Promise<AuthResult> {
  const supabase = getSupabase();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[auth] Sign out error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =============================================================================
// AUTH STATE LISTENER
// =============================================================================

export type AuthStateChangeCallback = (
  event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED',
  session: Session | null
) => void;

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export function onAuthStateChange(callback: AuthStateChangeCallback): () => void {
  const supabase = getSupabase();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event as any, session);
  });

  return () => {
    subscription.unsubscribe();
  };
}

// =============================================================================
// SESSION REFRESH
// =============================================================================

/**
 * Refresh the current session
 * Call this when you need fresh tokens
 */
export async function refreshSession(): Promise<Session | null> {
  const supabase = getSupabase();
  const { data: { session }, error } = await supabase.auth.refreshSession();

  if (error) {
    console.error('[auth] Session refresh error:', error);
    return null;
  }

  return session;
}

/**
 * Get access token for API calls
 * Returns null if not authenticated
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token || null;
}
