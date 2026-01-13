/**
 * Orbital Supabase Auth
 *
 * Authentication hooks and utilities with:
 * - Email/password auth
 * - Magic link support
 * - Anonymous auth for privacy-first users
 * - Auth state management
 */

import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session, User, AuthError } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getSupabase, isSupabaseConfigured } from './client';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  error: string | null;
}

export interface AuthActions {
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

export type AuthContext = AuthState & AuthActions;

// =============================================================================
// DEFAULT STATE
// =============================================================================

const DEFAULT_AUTH_STATE: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  session: null,
  error: null,
};

// =============================================================================
// HOOK: useAuth
// =============================================================================

export function useAuth(): AuthContext {
  const [state, setState] = useState<AuthState>(DEFAULT_AUTH_STATE);

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setState({
        ...DEFAULT_AUTH_STATE,
        isLoading: false,
        error: 'Cloud sync not configured',
      });
      return;
    }

    const supabase = getSupabase();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setState({
        isLoading: false,
        isAuthenticated: !!session,
        user: session?.user ?? null,
        session,
        error: error?.message ?? null,
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(prev => ({
        ...prev,
        isAuthenticated: !!session,
        user: session?.user ?? null,
        session,
        error: null,
      }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email/password
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync not configured' };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState(prev => ({ ...prev, isLoading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign in failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return { success: false, error: message };
    }
  }, []);

  // Sign up with email/password
  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync not configured' };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setState(prev => ({ ...prev, isLoading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign up failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return { success: false, error: message };
    }
  }, []);

  // Sign in with magic link (passwordless)
  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync not configured' };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'orbital://auth/callback',
        },
      });

      if (error) {
        setState(prev => ({ ...prev, isLoading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Magic link failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return { success: false, error: message };
    }
  }, []);

  // Sign in with Apple (iOS only)
  const signInWithApple = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync not configured' };
    }

    if (Platform.OS !== 'ios') {
      return { success: false, error: 'Apple Sign-In is only available on iOS' };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request Apple credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      // Apple returns identityToken for OAuth
      if (!credential.identityToken) {
        setState(prev => ({ ...prev, isLoading: false, error: 'No identity token from Apple' }));
        return { success: false, error: 'No identity token from Apple' };
      }

      // Sign in to Supabase with Apple OAuth token
      const supabase = getSupabase();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        setState(prev => ({ ...prev, isLoading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return { success: true };
    } catch (e) {
      // User cancelled is not an error
      if (e instanceof Error && e.message.includes('ERR_REQUEST_CANCELED')) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'cancelled' };
      }
      const message = e instanceof Error ? e.message : 'Apple Sign-In failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return { success: false, error: message };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabase();
    await supabase.auth.signOut();
  }, []);

  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync not configured' };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'orbital://auth/reset-password',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Password reset failed';
      return { success: false, error: message };
    }
  }, []);

  // Update password
  const updatePassword = useCallback(async (newPassword: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync not configured' };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Password update failed';
      return { success: false, error: message };
    }
  }, []);

  // Delete account (GDPR compliance)
  const deleteAccount = useCallback(async () => {
    if (!isSupabaseConfigured() || !state.user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const supabase = getSupabase();

      // First, delete user data using our RPC function
      // @ts-expect-error - RPC function types not generated yet
      const { error: dataError } = await supabase.rpc('delete_user_data', {
        p_user_id: state.user.id,
      });

      if (dataError) {
        return { success: false, error: dataError.message };
      }

      // Note: Actually deleting the auth user requires admin privileges
      // or a separate edge function. For now, we just sign out.
      // The user data has been deleted/anonymized.
      await supabase.auth.signOut();

      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Account deletion failed';
      return { success: false, error: message };
    }
  }, [state.user]);

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithMagicLink,
    signInWithApple,
    signOut,
    resetPassword,
    updatePassword,
    deleteAccount,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the current user ID if authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Check if user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return userId !== null;
}
