/**
 * Reset Password Screen
 *
 * Handles the deep link callback from Supabase password reset emails.
 * When the user taps the reset link in their email, Supabase redirects to
 * orbital://reset-password with a recovery session. This screen lets them
 * enter a new password.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuth, validatePassword, getSupabase } from '../lib/supabase';

const BG = '#01020A';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const auth = useAuth();
  const params = useLocalSearchParams<{
    token?: string;
    token_hash?: string;
    access_token?: string;
    refresh_token?: string;
    type?: string;
    email?: string;
  }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Recovery-session state. We only allow the password form once the deep-link
  // token has produced a valid recovery session (or one already exists).
  // Followup #9: guard against /reset-password being navigated to without a
  // valid recovery token.
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const validate = async () => {
      try {
        const supabase = getSupabase();

        // 1) If a recovery session already exists (e.g. detectSessionInUrl
        //    on web), accept it.
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (!cancelled) {
            setTokenValid(true);
            setVerifying(false);
          }
          return;
        }

        // 2) Modern Supabase recovery links carry token_hash in the query.
        const tokenHash = params.token_hash || params.token;
        if (tokenHash) {
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            type: 'recovery',
            token_hash: String(tokenHash),
          } as Parameters<typeof supabase.auth.verifyOtp>[0]);
          if (!cancelled) {
            if (verifyErr) {
              setTokenValid(false);
              setError('This password reset link is invalid or has expired.');
            } else {
              setTokenValid(true);
            }
            setVerifying(false);
          }
          return;
        }

        // 3) Legacy hash-fragment style (access_token + refresh_token).
        if (params.access_token && params.refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token: String(params.access_token),
            refresh_token: String(params.refresh_token),
          });
          if (!cancelled) {
            if (setErr) {
              setTokenValid(false);
              setError('This password reset link is invalid or has expired.');
            } else {
              setTokenValid(true);
            }
            setVerifying(false);
          }
          return;
        }

        // 4) No token, no session — block the form.
        if (!cancelled) {
          setTokenValid(false);
          setError('This password reset link is invalid or has expired.');
          setVerifying(false);
        }
      } catch {
        if (!cancelled) {
          setTokenValid(false);
          setError('Could not verify reset link. Please request a new one.');
          setVerifying(false);
        }
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [params.token, params.token_hash, params.access_token, params.refresh_token]);

  const passwordValidation = validatePassword(password);

  const handleUpdatePassword = async () => {
    setError(null);

    if (!password) {
      setError('Please enter a new password');
      return;
    }

    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    const result = await auth.updatePassword(password);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || 'Could not update password');
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Password Updated</Text>
          <Text style={styles.subtitle}>
            Your password has been changed successfully.
          </Text>
          <Pressable
            style={styles.btn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.btnText}>Continue to Orbital</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (verifying) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={[styles.subtitle, { marginTop: 16 }]}>
            Verifying reset link…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tokenValid) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Link Expired</Text>
          <Text style={styles.subtitle}>
            {error || 'This password reset link is invalid or has expired.'}
          </Text>
          <Pressable
            style={styles.btn}
            onPress={() => router.replace('/auth')}
          >
            <Text style={styles.btnText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.center}>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>Enter your new password below.</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="New password"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
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

            {password.length > 0 ? (
              <Text style={styles.strengthText}>
                {'Strength: '}
                <Text style={styles.strengthValue}>{passwordValidation.strength}</Text>
                {passwordValidation.errors.length > 0
                  ? `  —  ${passwordValidation.errors[0]}`
                  : ''}
              </Text>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              editable={!isSubmitting}
            />

            <Pressable
              style={[styles.btn, isSubmitting && styles.btnDisabled]}
              onPress={handleUpdatePassword}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.btnText}>Update Password</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.backLink}
              onPress={() => router.replace('/auth')}
              disabled={isSubmitting}
            >
              <Text style={styles.backLinkText}>← Back to sign in</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
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
  errorBanner: {
    width: '100%',
    backgroundColor: 'rgba(255,82,82,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,82,82,0.30)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    color: '#FF5252',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  btnText: {
    fontFamily: 'DMSans_600SemiBold',
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.55,
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
