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
// Lazy-load AppleAuthentication only on iOS (crashes on web)
const AppleAuthentication = Platform.OS === 'ios'
  ? require('expo-apple-authentication')
  : null;
import { getSupabase, isSupabaseConfigured } from './client';

// =============================================================================
// PASSWORD VALIDATION
// =============================================================================

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'strong' | 'excellent';
}

/**
 * Validate password complexity requirements.
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('At least 12 characters required');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter required');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter required');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('At least one number required');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('At least one special character required');
  }

  // Calculate strength
  let strength: PasswordValidation['strength'] = 'weak';
  const checks = [
    password.length >= 12,
    password.length >= 16,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    password.length >= 20,
  ];
  const passed = checks.filter(Boolean).length;

  if (passed >= 7) strength = 'excellent';
  else if (passed >= 5) strength = 'strong';
  else if (passed >= 3) strength = 'fair';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

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

export interface MFAFactor {
  id: string;
  type: 'totp';
  status: 'verified' | 'unverified';
  createdAt: string;
}

export interface MFAEnrollment {
  id: string;
  type: 'totp';
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export interface AuthActions {
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string; mfaRequired?: boolean }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithApple: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  // MFA actions
  getMFAFactors: () => Promise<{ factors: MFAFactor[]; error?: string }>;
  enrollMFA: () => Promise<{ enrollment: MFAEnrollment | null; error?: string }>;
  verifyMFAEnrollment: (factorId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  verifyMFAChallenge: (factorId: string, code: string) => Promise<{ success: boolean; error?: string }>;
  unenrollMFA: (factorId: string) => Promise<{ success: boolean; error?: string }>;
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

  // Sign in with Google (Web only - uses OAuth redirect)
  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync not configured' };
    }

    if (Platform.OS !== 'web') {
      return { success: false, error: 'Google Sign-In via OAuth redirect is only available on web' };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const supabase = getSupabase();

      // Get the current origin for redirect (works on Vercel production and localhost)
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : 'https://orbital-jet.vercel.app/auth/callback';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setState(prev => ({ ...prev, isLoading: false, error: error.message }));
        return { success: false, error: error.message };
      }

      // OAuth redirect will happen - don't update state as page will navigate
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Google Sign-In failed';
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

  // Get enrolled MFA factors
  const getMFAFactors = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return { factors: [], error: 'Cloud sync not configured' };
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) {
        return { factors: [], error: error.message };
      }

      const factors: MFAFactor[] = (data.totp || []).map((f) => ({
        id: f.id,
        type: 'totp' as const,
        status: f.status === 'verified' ? 'verified' : 'unverified',
        createdAt: f.created_at,
      }));

      return { factors };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to get MFA factors';
      return { factors: [], error: message };
    }
  }, []);

  // Enroll in MFA (TOTP)
  const enrollMFA = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return { enrollment: null, error: 'Cloud sync not configured' };
    }

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Orbital',
        friendlyName: 'Orbital Authenticator',
      });

      if (error) {
        return { enrollment: null, error: error.message };
      }

      const enrollment: MFAEnrollment = {
        id: data.id,
        type: 'totp',
        totp: {
          qr_code: data.totp.qr_code,
          secret: data.totp.secret,
          uri: data.totp.uri,
        },
      };

      return { enrollment };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'MFA enrollment failed';
      return { enrollment: null, error: message };
    }
  }, []);

  // Verify MFA enrollment with TOTP code
  const verifyMFAEnrollment = useCallback(async (factorId: string, code: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync not configured' };
    }

    try {
      const supabase = getSupabase();

      // First create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        return { success: false, error: challengeError.message };
      }

      // Then verify it
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        return { success: false, error: verifyError.message };
      }

      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'MFA verification failed';
      return { success: false, error: message };
    }
  }, []);

  // Verify MFA challenge during sign-in
  const verifyMFAChallenge = useCallback(async (factorId: string, code: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync not configured' };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const supabase = getSupabase();

      // Create a challenge for the factor
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) {
        setState(prev => ({ ...prev, isLoading: false, error: challengeError.message }));
        return { success: false, error: challengeError.message };
      }

      // Verify the challenge with the TOTP code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) {
        setState(prev => ({ ...prev, isLoading: false, error: verifyError.message }));
        return { success: false, error: verifyError.message };
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'MFA challenge verification failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      return { success: false, error: message };
    }
  }, []);

  // Unenroll from MFA
  const unenrollMFA = useCallback(async (factorId: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud sync not configured' };
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'MFA unenrollment failed';
      return { success: false, error: message };
    }
  }, []);

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithMagicLink,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    updatePassword,
    deleteAccount,
    getMFAFactors,
    enrollMFA,
    verifyMFAEnrollment,
    verifyMFAChallenge,
    unenrollMFA,
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
