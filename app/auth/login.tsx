/**
 * Login Screen
 *
 * Magic link (email) authentication with optional OAuth.
 * Required before making purchases to ensure cross-device entitlement sync.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowRight, X, Check, AlertCircle } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../../theme';
import { useAuth } from '../../lib/auth';

type LoginState = 'input' | 'sending' | 'sent' | 'error';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { signInWithEmail, signInWithGoogle, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [state, setState] = useState<LoginState>('input');
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated && params.returnTo) {
      router.replace(params.returnTo as any);
    }
  }, [isAuthenticated, params.returnTo, router]);

  const handleEmailSubmit = useCallback(async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setState('sending');
    setError(null);

    const result = await signInWithEmail(email.trim().toLowerCase());

    if (result.success) {
      setState('sent');
    } else {
      setState('error');
      setError(result.error || 'Failed to send login link');
    }
  }, [email, signInWithEmail]);

  const handleGoogleSignIn = useCallback(async () => {
    const result = await signInWithGoogle();
    if (!result.success) {
      setError(result.error || 'Google sign-in failed');
    }
    // OAuth redirects away on success
  }, [signInWithGoogle]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleRetry = useCallback(() => {
    setState('input');
    setError(null);
  }, []);

  // Success state - link sent
  if (state === 'sent') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.title}>Check Your Email</Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X color={colors.textPrimary} size={24} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
            <View style={styles.successIcon}>
              <Check size={48} color="#4CAF50" />
            </View>
            <Text style={styles.cardTitle}>Magic Link Sent!</Text>
            <Text style={styles.cardDescription}>
              We sent a login link to:
            </Text>
            <Text style={styles.emailHighlight}>{email}</Text>
            <Text style={styles.cardHint}>
              Click the link in your email to sign in.{'\n'}
              The link expires in 1 hour.
            </Text>
          </Animated.View>

          <Pressable style={styles.secondaryButton} onPress={handleRetry}>
            <Text style={styles.secondaryButtonText}>Use a different email</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Main input state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Sign In</Text>
        <Pressable onPress={handleClose} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Why sign in */}
        <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.whyCard}>
          <Text style={styles.whyTitle}>Why sign in?</Text>
          <Text style={styles.whyText}>
            Your account ensures your purchases sync across all your devices.
            Sign in once, access everywhere.
          </Text>
        </Animated.View>

        {/* Email input */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.inputSection}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Mail size={20} color="rgba(255,255,255,0.4)" />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={state === 'input'}
              onSubmitEditing={handleEmailSubmit}
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={14} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryButton, state === 'sending' && styles.buttonDisabled]}
            onPress={handleEmailSubmit}
            disabled={state === 'sending'}
          >
            {state === 'sending' ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Continue with Email</Text>
                <ArrowRight size={20} color="#000" />
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Divider */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </Animated.View>

        {/* OAuth options */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.oauthSection}>
          <Pressable style={styles.oauthButton} onPress={handleGoogleSignIn}>
            <Text style={styles.oauthButtonText}>Continue with Google</Text>
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  whyCard: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  whyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00E5FF',
    marginBottom: spacing.xs,
  },
  whyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#00E5FF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  oauthSection: {
    gap: spacing.sm,
  },
  oauthButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  oauthButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: spacing.xl,
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: spacing.sm,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.xs,
  },
  emailHighlight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00E5FF',
    marginBottom: spacing.lg,
  },
  cardHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
