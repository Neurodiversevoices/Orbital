/**
 * OAuth Callback Handler
 *
 * Handles redirects from OAuth providers (Google, etc.) after authentication.
 * Supabase automatically processes the URL hash/params and establishes the session.
 * This page just shows a loading state while the redirect completes.
 */

import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase/client';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (!isSupabaseConfigured()) {
        console.error('[AuthCallback] Supabase not configured');
        router.replace('/');
        return;
      }

      try {
        const supabase = getSupabase();

        // Supabase client automatically handles the OAuth callback
        // by reading the URL hash/params. We just need to wait for the session.
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthCallback] Error getting session:', error.message);
          router.replace('/');
          return;
        }

        if (session) {
          console.log('[AuthCallback] Session established, redirecting to home');
          router.replace('/');
        } else {
          // No session yet - might still be processing
          // Listen for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              console.log('[AuthCallback] Signed in via auth state change');
              subscription.unsubscribe();
              router.replace('/');
            }
          });

          // Timeout fallback - if no session after 5 seconds, go home anyway
          setTimeout(() => {
            subscription.unsubscribe();
            router.replace('/');
          }, 5000);
        }
      } catch (e) {
        console.error('[AuthCallback] Unexpected error:', e);
        router.replace('/');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00D7FF" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
