/**
 * Auth Callback Page
 *
 * Handles the redirect from magic link / OAuth.
 * Supabase Auth automatically handles the token exchange.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, AlertCircle } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { getSupabase, getCurrentUser } from '../../lib/auth';
import { syncEntitlements } from '../../lib/entitlements/serverEntitlements';

type CallbackState = 'processing' | 'success' | 'error';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Supabase handles the token exchange automatically from URL hash
      // We just need to wait for it and verify
      const supabase = getSupabase();

      // Get the session (Supabase extracts tokens from URL automatically)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[auth/callback] Session error:', sessionError);
        setError(sessionError.message);
        setState('error');
        return;
      }

      if (!session) {
        // No session yet - might need to wait or handle hash
        const { data: { session: urlSession }, error: urlError } =
          await supabase.auth.getSession();

        if (urlError || !urlSession) {
          setError('Authentication failed. Please try again.');
          setState('error');
          return;
        }
      }

      // Verify we have a user
      const user = await getCurrentUser();
      if (!user) {
        setError('Failed to get user information');
        setState('error');
        return;
      }

      console.log('[auth/callback] Authenticated as:', user.id);

      // Sync entitlements for this user
      try {
        await syncEntitlements();
      } catch (syncError) {
        console.warn('[auth/callback] Entitlement sync warning:', syncError);
        // Don't fail auth if sync fails - user can sync later
      }

      setState('success');

      // Redirect to home after brief delay
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch (err) {
      console.error('[auth/callback] Error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setState('error');
    }
  };

  if (state === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text style={styles.loadingText}>Signing you in...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.errorIcon}>
            <AlertCircle size={48} color="#FF3B30" />
          </View>
          <Text style={styles.title}>Sign In Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text
            style={styles.linkText}
            onPress={() => router.replace('/auth/login')}
          >
            Try again
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successIcon}>
          <Check size={48} color="#4CAF50" />
        </View>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>You're now signed in</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76,175,80,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,59,48,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  linkText: {
    fontSize: 14,
    color: '#00E5FF',
  },
});
