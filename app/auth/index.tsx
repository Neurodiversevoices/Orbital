/**
 * Auth Gate Screen
 *
 * Required entry point for all users. No skip, no guest mode, no exceptions.
 * Displays the Orbital orb, tagline, and sign-in/sign-up options.
 * On successful authentication, migrates any pre-auth local logs silently
 * in the background before navigating to the main app.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { GlassOrb } from '../../components/GlassOrb';
import { useAuth, validatePassword, isSupabaseConfigured } from '../../lib/supabase';
import { getLogs } from '../../lib/storage';
import { enqueueLog } from '../../lib/cloud/outbox';
import { pushToCloud, localToCloudUpsert } from '../../lib/cloud/syncEngine';
import { getDeviceId } from '../../lib/cloud';

// =============================================================================
// LOCAL LOG MIGRATION
// Runs in background after first authentication.
// Enqueues all pre-auth local logs into the outbox and triggers a push.
// Demo logs are automatically blocked by the outbox engine.
// Pattern history is local-only and has no Supabase table — not migrated.
// =============================================================================

async function migrateLocalLogs(): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    const logs = await getLogs();
    for (const log of logs) {
      await enqueueLog(log.id, localToCloudUpsert(log, deviceId));
    }
    // Best-effort push — does not block navigation
    pushToCloud().catch(() => {});
  } catch (e) {
    if (__DEV__) console.error('[Auth] Local log migration failed:', e);
  }
}

// =============================================================================
// SCREEN
// =============================================================================

type AuthMode = 'signup' | 'signin' | null;

export default function AuthScreen() {
  const router = useRouter();
  const auth = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const passwordValidation = validatePassword(password);
  const isConfigured = isSupabaseConfigured();

  // Called after any successful sign-in (not sign-up, which may need email confirmation).
  // Starts local log migration in background, then navigates immediately.
  const onSuccess = useCallback(() => {
    migrateLocalLogs(); // fire-and-forget
    router.replace('/(tabs)');
  }, [router]);

  const resetForm = () => {
    setError(null);
    setSuccessMsg(null);
    setPassword('');
  };

  // ── Email / password ──────────────────────────────────────────────────────

  const handleEmailAuth = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (authMode === 'signup') {
      if (!passwordValidation.isValid) {
        setError(passwordValidation.errors[0]);
        setIsSubmitting(false);
        return;
      }
      const result = await auth.signUpWithEmail(email, password);
      setIsSubmitting(false);
      if (result.success) {
        // Enroll in welcome sequence — fire-and-forget, never blocks the UI
        const apiBase = process.env.EXPO_PUBLIC_API_URL || 'https://orbitalhealth.app';
        const rawName = email.split('@')[0].split(/[._-]/)[0] ?? '';
        const firstName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        fetch(`${apiBase}/api/welcome-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim(), first_name: firstName }),
        }).catch(() => {});

        // If Supabase has email confirmation enabled, user is not yet authenticated.
        // If confirmation is disabled, AuthGate will redirect automatically via
        // onAuthStateChange. Either way, prompt them to confirm/sign in.
        setSuccessMsg('Account created! Check your email to confirm, then sign in.');
        setAuthMode('signin');
        setPassword('');
      } else {
        setError(result.error || 'Sign up failed');
      }
    } else {
      if (!password) {
        setError('Please enter your password');
        setIsSubmitting(false);
        return;
      }
      const result = await auth.signInWithEmail(email, password);
      setIsSubmitting(false);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Sign in failed');
      }
    }
  };

  // ── Apple (iOS only) ──────────────────────────────────────────────────────

  const handleApple = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await auth.signInWithApple();
    setIsSubmitting(false);
    if (result.success) {
      onSuccess();
    } else if (result.error) {
      setError(result.error);
    }
  };

  // ── Google (web / Android) ────────────────────────────────────────────────

  const handleGoogle = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await auth.signInWithGoogle();
    setIsSubmitting(false);
    if (result.success) {
      onSuccess();
    } else if (result.error) {
      setError(result.error);
    }
  };

  // ── Not configured fallback ───────────────────────────────────────────────

  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.configErrorText}>
            Cloud authentication is not configured.{'\n'}
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Orbital orb — display only, no interaction on auth screen */}
          <View style={styles.orbWrapper}>
            <View style={styles.orbScale}>
              <GlassOrb state={null} />
            </View>
          </View>

          {/* Header */}
          <Text style={styles.appName}>Orbital</Text>
          <Text style={styles.tagline}>Your capacity. Documented.</Text>

          {/* Feedback banners */}
          {error ? (
            <View style={[styles.banner, styles.errorBanner]}>
              <Text style={styles.bannerErrorText}>{error}</Text>
            </View>
          ) : null}
          {successMsg ? (
            <View style={[styles.banner, styles.successBanner]}>
              <Text style={styles.bannerSuccessText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* Auth entry — either action buttons or email form */}
          {authMode === null ? (
            <View style={styles.buttonStack}>
              {Platform.OS === 'ios' ? (
                <Pressable
                  style={[styles.btn, styles.appleBtn]}
                  onPress={handleApple}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.appleBtnText}>Sign in with Apple</Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.btn, styles.googleBtn]}
                  onPress={handleGoogle}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.googleBtnText}>Sign in with Google</Text>
                  )}
                </Pressable>
              )}

              <Pressable
                style={[styles.btn, styles.primaryBtn]}
                onPress={() => { setAuthMode('signin'); resetForm(); }}
                disabled={isSubmitting}
              >
                <Text style={styles.primaryBtnText}>Sign in with email</Text>
              </Pressable>

              <Pressable
                style={[styles.btn, styles.secondaryBtn]}
                onPress={() => { setAuthMode('signup'); resetForm(); }}
                disabled={isSubmitting}
              >
                <Text style={styles.secondaryBtnText}>Create account</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.formTitle}>
                {authMode === 'signup' ? 'Create your account' : 'Sign in'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!isSubmitting}
              />

              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                  editable={!isSubmitting}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword
                    ? <EyeOff size={18} color="rgba(255,255,255,0.45)" />
                    : <Eye size={18} color="rgba(255,255,255,0.45)" />
                  }
                </Pressable>
              </View>

              {authMode === 'signup' && password.length > 0 ? (
                <Text style={styles.strengthText}>
                  {'Strength: '}
                  <Text style={styles.strengthValue}>{passwordValidation.strength}</Text>
                  {passwordValidation.errors.length > 0
                    ? `  —  ${passwordValidation.errors[0]}`
                    : ''}
                </Text>
              ) : null}

              <Pressable
                style={[styles.btn, styles.primaryBtn, isSubmitting && styles.btnDisabled]}
                onPress={handleEmailAuth}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {authMode === 'signup' ? 'Create account' : 'Sign in'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.backLink}
                onPress={() => { setAuthMode(null); resetForm(); }}
                disabled={isSubmitting}
              >
                <Text style={styles.backLinkText}>← Back</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  configErrorText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Orb ────────────────────────────────────────────────────────────────────
  orbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  orbScale: {
    transform: [{ scale: 0.65 }],
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  appName: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: -spacing.lg, // pull up under the scaled-down orb
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.xl,
    letterSpacing: 0.2,
  },

  // ── Banners ────────────────────────────────────────────────────────────────
  banner: {
    width: '100%',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,82,82,0.10)',
    borderColor: 'rgba(255,82,82,0.30)',
  },
  successBanner: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderColor: 'rgba(0,229,255,0.28)',
  },
  bannerErrorText: {
    color: '#FF5252',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bannerSuccessText: {
    color: '#00E5FF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Buttons ────────────────────────────────────────────────────────────────
  buttonStack: {
    width: '100%',
  },
  btn: {
    width: '100%',
    minHeight: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  appleBtn: {
    backgroundColor: '#ffffff',
  },
  appleBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  googleBtn: {
    backgroundColor: '#4285F4',
  },
  googleBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#00D1FF',
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  secondaryBtnText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16,
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.55,
  },

  // ── Email form ─────────────────────────────────────────────────────────────
  form: {
    width: '100%',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: borderRadius.md,
    color: '#FFFFFF',
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  passwordRow: {
    width: '100%',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  passwordInput: {
    paddingRight: 52,
    marginBottom: 0,
  },
  eyeBtn: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  strengthText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: spacing.md,
  },
  strengthValue: {
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'capitalize',
  },
  backLink: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  backLinkText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
});
