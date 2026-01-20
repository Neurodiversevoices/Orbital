/**
 * useAuth Hook
 *
 * React hook for auth state management.
 * Provides current user, loading state, and auth methods.
 */

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import {
  getCurrentUser,
  getSession,
  sendMagicLink,
  signInWithOAuth,
  signOut as authSignOut,
  onAuthStateChange,
  type AuthResult,
} from './supabaseAuth';

export interface UseAuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface UseAuthActions {
  signInWithEmail: (email: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithApple: () => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  refresh: () => Promise<void>;
}

export type UseAuthReturn = UseAuthState & UseAuthActions;

/**
 * Hook for auth state and actions
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial auth state
  useEffect(() => {
    loadAuthState();

    // Subscribe to auth changes
    const unsubscribe = onAuthStateChange((event, newSession) => {
      console.log('[useAuth] Auth state changed:', event);
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadAuthState = async () => {
    try {
      const [currentUser, currentSession] = await Promise.all([
        getCurrentUser(),
        getSession(),
      ]);
      setUser(currentUser);
      setSession(currentSession);
    } catch (error) {
      console.error('[useAuth] Failed to load auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmail = useCallback(async (email: string): Promise<AuthResult> => {
    return sendMagicLink(email);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    return signInWithOAuth('google');
  }, []);

  const signInWithApple = useCallback(async (): Promise<AuthResult> => {
    return signInWithOAuth('apple');
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const result = await authSignOut();
    if (result.success) {
      setUser(null);
      setSession(null);
    }
    return result;
  }, []);

  const refresh = useCallback(async () => {
    await loadAuthState();
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: user !== null,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
    signOut,
    refresh,
  };
}
