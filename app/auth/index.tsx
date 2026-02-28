/**
 * Auth Gate Screen
 *
 * Required entry point for all users. No skip, no guest mode, no exceptions.
 * Displays the Orbital orb with ambient glow, tagline, and sign-in/sign-up options.
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
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
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
// CONSTANTS
// =============================================================================

const BG = '#01020A';

// =============================================================================
// SCREEN
// =============================================================================

type AuthMode = 'signup' | 'signin' | null;

export default function AuthScreen() {
  const router = useRouter();
  const auth = useAuth();

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    SpaceMono_400Regular,
  });

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

  // ── Forgot password ─────────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email above, then tap forgot password.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const result = await auth.resetPassword(email.trim());
    setIsSubmitting(false);
    if (result.success) {
      setSuccessMsg('Password reset email sent. Check your inbox.');
    } else {
      setError(result.error || 'Could not send reset email');
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

  // ── Loading fonts ────────────────────────────────────────────────────────

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#2DD4BF" size="small" />
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
          {/* ── Top section: ambient glow + title ── */}
          <View style={styles.topSection}>
            {/* Ambient glow — 3 concentric rings, centered at 30% from top */}
            <View style={styles.glowAnchor}>
              <View style={[styles.glowRing, styles.glowOuter]} />
              <View style={[styles.glowRing, styles.glowMid]} />
              <View style={[styles.glowRing, styles.glowInner]} />
            </View>

            {/* Title */}
            <Text style={styles.title}>Orbital</Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>{'· LOG SENSORY INPUT ·'}</Text>
          </View>

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

          {/* ── Bottom section: auth buttons or email form ── */}
          {authMode === null ? (
            <View style={styles.buttonStack}>
              {/* Apple — iOS only */}
              {Platform.OS === 'ios' ? (
                <Pressable
                  style={[styles.btn, styles.appleBtn]}
                  onPress={handleApple}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={styles.appleBtnText}> Sign in with Apple</Text>
                  )}
                </Pressable>
              ) : null}

              {/* Email — always visible */}
              <Pressable
                style={[styles.btn, styles.glassBtn]}
                onPress={() => { setAuthMode('signin'); resetForm(); }}
                disabled={isSubmitting}
              >
                <Text style={styles.glassBtnText}>Sign in with email</Text>
              </Pressable>

              {/* Google — non-iOS only */}
              {Platform.OS !== 'ios' ? (
                <Pressable
                  style={[styles.btn, styles.glassBtn]}
                  onPress={handleGoogle}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="rgba(255,255,255,0.85)" size="small" />
                  ) : (
                    <Text style={styles.glassBtnText}>Sign in with Google</Text>
                  )}
                </Pressable>
              ) : null}

              {/* Create account link */}
              <Pressable
                onPress={() => { setAuthMode('signup'); resetForm(); }}
                disabled={isSubmitting}
                style={styles.createAccountLink}
              >
                <Text style={styles.createAccountText}>New here? Create account</Text>
              </Pressable>

              {/* Forgot password link */}
              <Pressable
                onPress={() => { setAuthMode('signin'); resetForm(); }}
                disabled={isSubmitting}
                style={styles.forgotLinkHome}
              >
                <Text style={styles.forgotLinkHomeText}>Forgot password?</Text>
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

              {authMode === 'signin' ? (
                <Pressable
                  onPress={handleForgotPassword}
                  disabled={isSubmitting}
                  style={styles.forgotLink}
                >
                  <Text style={styles.forgotLinkText}>Forgot password?</Text>
                </Pressable>
              ) : null}

              <Pressable
                style={[styles.btn, styles.appleBtn, isSubmitting && styles.btnDisabled]}
                onPress={handleEmailAuth}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.appleBtnText}>
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
// STYLES — exact values from design spec
// =============================================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  configErrorText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'SpaceMono_400Regular',
  },

  // ── Top section: glow + title + subtitle ────────────────────────────────
  topSection: {
    alignItems: 'center',
    paddingTop: '30%',
  },
  glowAnchor: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 500,
    height: 500,
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    marginTop: -250, // center the 500px glow vertically on the 30% anchor
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 9999,
  },
  glowOuter: {
    width: 500,
    height: 500,
    backgroundColor: 'rgba(45,212,191,0.03)',
  },
  glowMid: {
    width: 400,
    height: 400,
    backgroundColor: 'rgba(45,212,191,0.06)',
  },
  glowInner: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(45,212,191,0.10)',
  },

  // ── Title ───────────────────────────────────────────────────────────────
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 28,
  },

  // ── Subtitle ────────────────────────────────────────────────────────────
  subtitle: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 8,
    textTransform: 'uppercase',
  },

  // ── Banners ─────────────────────────────────────────────────────────────
  banner: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,82,82,0.10)',
    borderColor: 'rgba(255,82,82,0.30)',
  },
  successBanner: {
    backgroundColor: 'rgba(45,212,191,0.08)',
    borderColor: 'rgba(45,212,191,0.28)',
  },
  bannerErrorText: {
    fontFamily: 'DMSans_400Regular',
    color: '#FF5252',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bannerSuccessText: {
    fontFamily: 'DMSans_400Regular',
    color: '#2DD4BF',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Buttons ─────────────────────────────────────────────────────────────
  buttonStack: {
    width: '100%',
    gap: 12,
  },
  btn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleBtn: {
    backgroundColor: '#FFFFFF',
  },
  appleBtnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  glassBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  glassBtnText: {
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    fontWeight: '500',
  },
  btnDisabled: {
    opacity: 0.55,
  },

  // ── Home screen links ───────────────────────────────────────────────────
  createAccountLink: {
    alignItems: 'center',
    marginTop: 24,
  },
  createAccountText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 13,
    color: '#2DD4BF',
  },
  forgotLinkHome: {
    alignItems: 'center',
    marginTop: 14,
  },
  forgotLinkHomeText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },

  // ── Email form ──────────────────────────────────────────────────────────
  form: {
    width: '100%',
  },
  formTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 14,
    color: '#FFFFFF',
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 10,
  },
  passwordRow: {
    width: '100%',
    position: 'relative',
    marginBottom: 10,
  },
  passwordInput: {
    paddingRight: 52,
    marginBottom: 0,
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  strengthText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 16,
  },
  strengthValue: {
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'capitalize',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotLinkText: {
    fontFamily: 'SpaceMono_400Regular',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  backLink: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backLinkText: {
    fontFamily: 'SpaceMono_400Regular',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
});
