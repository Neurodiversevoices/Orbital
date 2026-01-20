/**
 * Checkout Success Page
 *
 * Handles return from Stripe Checkout.
 * Verifies the session and displays success/error state.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, AlertCircle, Home } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../../theme';
import { verifyCheckoutSession, isDemoMode } from '../../lib/payments';
import { syncEntitlements } from '../../lib/entitlements/serverEntitlements';

type VerificationState = 'loading' | 'success' | 'error';

export default function CheckoutSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ session_id?: string }>();
  const [state, setState] = useState<VerificationState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifySession();
  }, []);

  const verifySession = async () => {
    const sessionId = params.session_id;

    // In demo mode, skip verification
    if (isDemoMode()) {
      setState('success');
      return;
    }

    if (!sessionId) {
      setError('No session ID provided');
      setState('error');
      return;
    }

    try {
      const result = await verifyCheckoutSession(sessionId);

      if (result.success) {
        // Sync entitlements to ensure local cache is updated
        await syncEntitlements();
        setState('success');
      } else {
        setError(result.error || 'Verification failed');
        setState('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setState('error');
    }
  };

  const handleGoHome = () => {
    router.replace('/');
  };

  const handleRetry = () => {
    setState('loading');
    setError(null);
    verifySession();
  };

  // Loading state
  if (state === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text style={styles.loadingText}>Verifying your purchase...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
            <View style={styles.iconContainerError}>
              <AlertCircle size={48} color="#FF3B30" />
            </View>
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.helpText}>
              If you were charged, your purchase is still valid.
              Please try restoring your purchases or contact support.
            </Text>
            <View style={styles.buttonRow}>
              <Pressable style={styles.secondaryButton} onPress={handleRetry}>
                <Text style={styles.secondaryButtonText}>Retry</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleGoHome}>
                <Text style={styles.primaryButtonText}>Go Home</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
          <View style={styles.iconContainerSuccess}>
            <Check size={48} color="#4CAF50" />
          </View>
          <Text style={styles.title}>Purchase Complete!</Text>
          <Text style={styles.subtitle}>
            Your subscription is now active. Thank you for your purchase.
          </Text>
          {isDemoMode() && (
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeText}>
                DEMO MODE – This was a simulated purchase.
              </Text>
            </View>
          )}
          <Pressable style={styles.primaryButton} onPress={handleGoHome}>
            <Home size={20} color="#000" />
            <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
          </Pressable>
        </Animated.View>
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
    padding: spacing.lg,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainerSuccess: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76,175,80,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainerError: {
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#00E5FF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  demoNotice: {
    backgroundColor: 'rgba(255,152,0,0.1)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  demoNoticeText: {
    fontSize: 12,
    color: '#FF9800',
    textAlign: 'center',
    fontWeight: '600',
  },
});
