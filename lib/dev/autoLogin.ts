/**
 * Dev Auto-Login
 *
 * DEVELOPMENT ONLY — never runs in production builds.
 *
 * When EXPO_PUBLIC_DEV_AUTO_LOGIN=true, automatically signs in with
 * hardcoded dev credentials on app launch. Also auto-completes the
 * age gate so the developer lands directly on the orb screen.
 *
 * Zero taps to get to the capacity logging screen.
 *
 * Usage: Set in .env or app.config.js:
 *   EXPO_PUBLIC_DEV_AUTO_LOGIN=true
 *   EXPO_PUBLIC_DEV_EMAIL=your@email.com
 *   EXPO_PUBLIC_DEV_PASSWORD=YourDevPassword123!
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, isSupabaseConfigured } from '../supabase/client';

// =============================================================================
// CONFIG
// =============================================================================

const DEV_AUTO_LOGIN_ENABLED =
  __DEV__ && process.env.EXPO_PUBLIC_DEV_AUTO_LOGIN === 'true';

const DEV_EMAIL = process.env.EXPO_PUBLIC_DEV_EMAIL || '';
const DEV_PASSWORD = process.env.EXPO_PUBLIC_DEV_PASSWORD || '';

// Age verification storage key (must match lib/legal/ageVerification.ts)
const AGE_VERIFICATION_KEY = '@orbital:age_verification';

// Tutorial storage key (must match lib/hooks/useTutorial.ts)
const TUTORIAL_SEEN_KEY = 'orbital:tutorialSeen:v1';

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Whether dev auto-login is enabled.
 * Only true when __DEV__ AND EXPO_PUBLIC_DEV_AUTO_LOGIN=true.
 */
export function isDevAutoLoginEnabled(): boolean {
  return DEV_AUTO_LOGIN_ENABLED;
}

/**
 * Perform dev auto-login.
 *
 * 1. Auto-completes the age gate (so it doesn't block)
 * 2. Signs in with dev credentials via Supabase
 * 3. Auto-marks tutorial as seen
 *
 * Returns true if auto-login succeeded, false otherwise.
 * Errors are logged but never thrown — fails silently to not block the app.
 */
export async function performDevAutoLogin(): Promise<boolean> {
  if (!DEV_AUTO_LOGIN_ENABLED) return false;

  if (!DEV_EMAIL || !DEV_PASSWORD) {
    console.warn(
      '[DevAutoLogin] EXPO_PUBLIC_DEV_EMAIL and EXPO_PUBLIC_DEV_PASSWORD must be set. ' +
      'Add them to your .env file.'
    );
    return false;
  }

  if (!isSupabaseConfigured()) {
    console.warn('[DevAutoLogin] Supabase not configured — skipping auto-login.');
    return false;
  }

  try {
    // Step 1: Auto-complete age gate
    const existingAge = await AsyncStorage.getItem(AGE_VERIFICATION_KEY);
    if (!existingAge) {
      const ageRecord = {
        year_of_birth: 1990,
        age: 36,
        age_cohort: '35-44',
        attestation_version: '1.0',
        age_verified_at: new Date().toISOString(),
        attestation_text: 'DEV_AUTO_LOGIN bypass',
      };
      await AsyncStorage.setItem(AGE_VERIFICATION_KEY, JSON.stringify(ageRecord));
      console.log('[DevAutoLogin] Age gate auto-completed');
    }

    // Step 2: Auto-mark tutorial as seen
    await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');

    // Step 3: Sign in with Supabase
    const supabase = getSupabase();

    // Check if already signed in
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('[DevAutoLogin] Already signed in as', session.user.email);
      return true;
    }

    // Sign in
    console.log('[DevAutoLogin] Signing in as', DEV_EMAIL, '...');
    const { error } = await supabase.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });

    if (error) {
      console.error('[DevAutoLogin] Sign-in failed:', error.message);
      return false;
    }

    console.log('[DevAutoLogin] ✅ Auto-login successful');
    return true;
  } catch (err) {
    console.error('[DevAutoLogin] Unexpected error:', err);
    return false;
  }
}
