/**
 * Auth Module
 *
 * Centralized authentication using Supabase Auth.
 * Supports magic link (email) and OAuth providers.
 */

export {
  getSupabase,
  getCurrentUser,
  getSession,
  isAuthenticated,
  getAuthUserId,
  getAuthUserEmail,
  sendMagicLink,
  verifyOtp,
  signInWithOAuth,
  signOut,
  onAuthStateChange,
  refreshSession,
  getAccessToken,
  type AuthResult,
  type AuthStateChangeCallback,
} from './supabaseAuth';

export {
  useAuth,
  type UseAuthState,
  type UseAuthActions,
  type UseAuthReturn,
} from './useAuth';
