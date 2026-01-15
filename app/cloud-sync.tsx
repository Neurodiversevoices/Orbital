/**
 * Cloud Sync Settings Screen
 *
 * Account management and sync status.
 * Cloud sync is automatic when authenticated.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Cloud,
  User,
  Mail,
  Lock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  LogOut,
  UserPlus,
  Wand2,
  Smartphone,
  Clock,
  Shield,
  Key,
  Fingerprint,
  Eye,
  EyeOff,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth, isSupabaseConfigured, validatePassword, MFAFactor, MFAEnrollment } from '../lib/supabase';
import { useCloudSync, getDeviceId } from '../lib/cloud';
import { useBiometric, getBiometricDisplayName } from '../lib/biometric';

type AuthMode = 'signin' | 'signup' | 'magic' | null;

export default function CloudSyncScreen() {
  const router = useRouter();
  const auth = useAuth();
  const cloudSync = useCloudSync();
  const biometric = useBiometric();

  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');

  // MFA state
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([]);
  const [mfaEnrollment, setMfaEnrollment] = useState<MFAEnrollment | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [showMFASetup, setShowMFASetup] = useState(false);

  // Password validation
  const passwordValidation = validatePassword(password);

  const isConfigured = isSupabaseConfigured();

  // Load device ID
  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  // Load MFA factors when authenticated
  useEffect(() => {
    if (auth.isAuthenticated) {
      auth.getMFAFactors().then(({ factors }) => {
        setMfaFactors(factors);
      });
    }
  }, [auth.isAuthenticated]);

  // Handle MFA enrollment
  const handleEnrollMFA = async () => {
    setIsSubmitting(true);
    setMessage(null);
    const { enrollment, error } = await auth.enrollMFA();
    setIsSubmitting(false);
    if (error) {
      setMessage({ type: 'error', text: error });
    } else if (enrollment) {
      setMfaEnrollment(enrollment);
      setShowMFASetup(true);
    }
  };

  // Handle MFA verification
  const handleVerifyMFA = async () => {
    if (!mfaEnrollment || mfaCode.length !== 6) return;
    setIsSubmitting(true);
    setMessage(null);
    const { success, error } = await auth.verifyMFAEnrollment(mfaEnrollment.id, mfaCode);
    setIsSubmitting(false);
    if (success) {
      setMessage({ type: 'success', text: 'Two-factor authentication enabled' });
      setShowMFASetup(false);
      setMfaEnrollment(null);
      setMfaCode('');
      // Refresh factors
      const { factors } = await auth.getMFAFactors();
      setMfaFactors(factors);
    } else {
      setMessage({ type: 'error', text: error || 'Invalid code' });
    }
  };

  // Handle MFA removal
  const handleRemoveMFA = async (factorId: string) => {
    setIsSubmitting(true);
    const { success, error } = await auth.unenrollMFA(factorId);
    setIsSubmitting(false);
    if (success) {
      setMessage({ type: 'success', text: 'Two-factor authentication disabled' });
      setMfaFactors(factors => factors.filter(f => f.id !== factorId));
    } else {
      setMessage({ type: 'error', text: error || 'Failed to remove MFA' });
    }
  };

  // Handle biometric toggle
  const handleBiometricToggle = async () => {
    setIsSubmitting(true);
    setMessage(null);
    if (biometric.settings.enabled) {
      const { success, error } = await biometric.disable();
      if (!success && error !== 'cancelled') {
        setMessage({ type: 'error', text: error || 'Failed to disable biometric' });
      }
    } else {
      const { success, error } = await biometric.enable();
      if (success) {
        setMessage({ type: 'success', text: `${biometric.displayName} enabled` });
      } else if (error !== 'cancelled') {
        setMessage({ type: 'error', text: error || 'Failed to enable biometric' });
      }
    }
    setIsSubmitting(false);
  };

  // Handle auth submission
  const handleAuth = async () => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    let result: { success: boolean; error?: string };

    if (authMode === 'signin') {
      if (!password) {
        setMessage({ type: 'error', text: 'Please enter your password' });
        setIsSubmitting(false);
        return;
      }
      result = await auth.signInWithEmail(email, password);
    } else if (authMode === 'signup') {
      const validation = validatePassword(password);
      if (!validation.isValid) {
        setMessage({ type: 'error', text: validation.errors[0] });
        setIsSubmitting(false);
        return;
      }
      result = await auth.signUpWithEmail(email, password);
      if (result.success) {
        setMessage({ type: 'success', text: 'Check your email to confirm your account' });
        setAuthMode(null);
        setIsSubmitting(false);
        return;
      }
    } else if (authMode === 'magic') {
      result = await auth.signInWithMagicLink(email);
      if (result.success) {
        setMessage({ type: 'success', text: 'Check your email for the magic link' });
        setAuthMode(null);
        setIsSubmitting(false);
        return;
      }
    } else {
      result = { success: false, error: 'Invalid auth mode' };
    }

    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Authentication failed' });
    } else {
      setMessage({ type: 'success', text: 'Signed in successfully' });
      setAuthMode(null);
      setEmail('');
      setPassword('');
    }

    setIsSubmitting(false);
  };

  // Handle sign out
  const handleSignOut = async () => {
    await auth.signOut();
    setMessage({ type: 'success', text: 'Signed out' });
  };

  // Render not configured state
  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.title}>Account</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X color={colors.textPrimary} size={24} />
          </Pressable>
        </View>

        <View style={styles.notConfigured}>
          <Cloud size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.notConfiguredTitle}>Cloud Not Available</Text>
          <Text style={styles.notConfiguredText}>
            Cloud services are not configured in this build.
          </Text>
          <Text style={styles.notConfiguredSubtext}>
            For developers: Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Account</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sync Status - Only shown when signed in */}
        {auth.isAuthenticated && (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.syncCard}>
            <View style={styles.syncCardHeader}>
              <View style={styles.syncIconContainer}>
                <Cloud size={24} color="#00E5FF" />
              </View>
              <View style={styles.syncCardText}>
                <Text style={styles.syncCardTitle}>Cloud Sync Active</Text>
                <Text style={styles.syncCardSubtitle}>
                  Your data syncs automatically across devices
                </Text>
              </View>
            </View>

            <View style={styles.syncStatus}>
              <View style={styles.syncStatusRow}>
                <Clock size={14} color="rgba(255,255,255,0.4)" />
                <Text style={styles.syncStatusText}>
                  Last sync: {cloudSync.status.lastPushAt
                    ? formatRelativeTime(cloudSync.status.lastPushAt)
                    : 'Never'}
                </Text>
              </View>
              {cloudSync.status.pendingCount > 0 && (
                <View style={styles.syncStatusRow}>
                  <RefreshCw size={14} color="#FF9800" />
                  <Text style={[styles.syncStatusText, { color: '#FF9800' }]}>
                    {cloudSync.status.pendingCount} pending
                  </Text>
                </View>
              )}
              {cloudSync.status.failedCount > 0 && (
                <View style={styles.syncStatusRow}>
                  <AlertCircle size={14} color="#FF5252" />
                  <Text style={[styles.syncStatusText, { color: '#FF5252' }]}>
                    {cloudSync.status.failedCount} failed
                  </Text>
                </View>
              )}
              <Pressable
                style={styles.syncNowButton}
                onPress={() => cloudSync.syncNow()}
                disabled={cloudSync.status.isSyncing}
              >
                <RefreshCw
                  size={14}
                  color="#00E5FF"
                  style={cloudSync.status.isSyncing ? { opacity: 0.5 } : undefined}
                />
                <Text style={styles.syncNowText}>
                  {cloudSync.status.isSyncing ? 'Syncing...' : 'Sync Now'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Account Section */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
        </Animated.View>

        {auth.isAuthenticated ? (
          // Signed in state
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={styles.avatarContainer}>
                <User size={24} color="#00E5FF" />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountEmail}>{auth.user?.email || 'Anonymous User'}</Text>
                <Text style={styles.accountId}>ID: {auth.user?.id.slice(0, 8)}...</Text>
              </View>
            </View>

            {/* Device Info */}
            <View style={styles.deviceInfo}>
              <Smartphone size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.deviceText}>Device: {deviceId.slice(0, 16)}...</Text>
            </View>

            <View style={styles.accountActions}>
              <Pressable style={styles.accountAction} onPress={handleSignOut}>
                <LogOut size={18} color="rgba(255,255,255,0.7)" />
                <Text style={styles.accountActionText}>Sign Out</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : authMode ? (
          // Auth form
          <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.authCard}>
            <Text style={styles.authTitle}>
              {authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Magic Link'}
            </Text>

            <View style={styles.inputContainer}>
              <Mail size={18} color="rgba(255,255,255,0.4)" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {authMode !== 'magic' && (
              <>
                <View style={styles.inputContainer}>
                  <Lock size={18} color="rgba(255,255,255,0.4)" />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={18} color="rgba(255,255,255,0.4)" />
                    ) : (
                      <Eye size={18} color="rgba(255,255,255,0.4)" />
                    )}
                  </Pressable>
                </View>

                {/* Password strength indicator for signup */}
                {authMode === 'signup' && password.length > 0 && (
                  <View style={styles.passwordStrength}>
                    <View style={styles.strengthBar}>
                      <View
                        style={[
                          styles.strengthFill,
                          {
                            width: passwordValidation.strength === 'weak' ? '25%' :
                                   passwordValidation.strength === 'fair' ? '50%' :
                                   passwordValidation.strength === 'strong' ? '75%' : '100%',
                            backgroundColor: passwordValidation.strength === 'weak' ? '#F44336' :
                                             passwordValidation.strength === 'fair' ? '#FF9800' :
                                             passwordValidation.strength === 'strong' ? '#4CAF50' : '#00E5FF',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[
                      styles.strengthText,
                      {
                        color: passwordValidation.strength === 'weak' ? '#F44336' :
                               passwordValidation.strength === 'fair' ? '#FF9800' :
                               passwordValidation.strength === 'strong' ? '#4CAF50' : '#00E5FF',
                      }
                    ]}>
                      {passwordValidation.strength.charAt(0).toUpperCase() + passwordValidation.strength.slice(1)}
                    </Text>
                    {!passwordValidation.isValid && (
                      <Text style={styles.passwordHint}>
                        {passwordValidation.errors[0]}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}

            {message && (
              <View style={[styles.messageBox, message.type === 'error' ? styles.errorBox : styles.successBox]}>
                {message.type === 'error' ? (
                  <AlertCircle size={14} color="#FF5252" />
                ) : (
                  <CheckCircle size={14} color="#4CAF50" />
                )}
                <Text style={[styles.messageText, message.type === 'error' ? styles.errorText : styles.successText]}>
                  {message.text}
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.authButton, isSubmitting && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.authButtonText}>
                  {authMode === 'signin' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Send Magic Link'}
                </Text>
              )}
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={() => setAuthMode(null)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        ) : (
          // Sign in options
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            {/* Apple Sign-In - iOS only */}
            {Platform.OS === 'ios' && (
              <Pressable
                style={styles.appleAuthCard}
                onPress={async () => {
                  setIsSubmitting(true);
                  setMessage(null);
                  const result = await auth.signInWithApple();
                  setIsSubmitting(false);
                  if (!result.success && result.error !== 'cancelled') {
                    setMessage({ type: 'error', text: result.error || 'Apple Sign-In failed' });
                  }
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.appleIcon}></Text>
                <View style={styles.authOptionText}>
                  <Text style={styles.appleAuthTitle}>Sign in with Apple</Text>
                  <Text style={styles.appleAuthDesc}>Recommended for iOS</Text>
                </View>
              </Pressable>
            )}

            <Pressable style={styles.authOptionCard} onPress={() => setAuthMode('signin')}>
              <User size={20} color="#00E5FF" />
              <View style={styles.authOptionText}>
                <Text style={styles.authOptionTitle}>Sign In</Text>
                <Text style={styles.authOptionDesc}>Use existing account</Text>
              </View>
            </Pressable>

            <Pressable style={styles.authOptionCard} onPress={() => setAuthMode('signup')}>
              <UserPlus size={20} color="#00E5FF" />
              <View style={styles.authOptionText}>
                <Text style={styles.authOptionTitle}>Create Account</Text>
                <Text style={styles.authOptionDesc}>New to Orbital cloud sync</Text>
              </View>
            </Pressable>

            <Pressable style={styles.authOptionCard} onPress={() => setAuthMode('magic')}>
              <Wand2 size={20} color="#00E5FF" />
              <View style={styles.authOptionText}>
                <Text style={styles.authOptionTitle}>Magic Link</Text>
                <Text style={styles.authOptionDesc}>Passwordless sign in via email</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Security Section - Only shown when authenticated */}
        {auth.isAuthenticated && (
          <>
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
              <Text style={styles.sectionTitle}>Security</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.securityCard}>
              {/* Two-Factor Authentication */}
              <View style={styles.securityItem}>
                <View style={styles.securityItemLeft}>
                  <View style={[styles.securityIconContainer, mfaFactors.length > 0 && styles.securityIconEnabled]}>
                    <Shield size={20} color={mfaFactors.length > 0 ? '#00E5FF' : 'rgba(255,255,255,0.5)'} />
                  </View>
                  <View style={styles.securityItemText}>
                    <Text style={styles.securityItemTitle}>Two-Factor Authentication</Text>
                    <Text style={styles.securityItemDesc}>
                      {mfaFactors.length > 0 ? 'Enabled with authenticator app' : 'Add extra security to your account'}
                    </Text>
                  </View>
                </View>
                {mfaFactors.length > 0 ? (
                  <Pressable
                    style={styles.securityRemoveButton}
                    onPress={() => handleRemoveMFA(mfaFactors[0].id)}
                    disabled={isSubmitting}
                  >
                    <Trash2 size={16} color="#FF5252" />
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.securityEnableButton}
                    onPress={handleEnrollMFA}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.securityEnableText}>Enable</Text>
                    <ChevronRight size={16} color="#00E5FF" />
                  </Pressable>
                )}
              </View>

              {/* MFA Setup Modal */}
              {showMFASetup && mfaEnrollment && (
                <View style={styles.mfaSetup}>
                  <Text style={styles.mfaSetupTitle}>Set Up Authenticator</Text>
                  <Text style={styles.mfaSetupDesc}>
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </Text>

                  {/* QR Code placeholder - in production, render actual QR */}
                  <View style={styles.qrContainer}>
                    <Text style={styles.qrPlaceholder}>QR Code</Text>
                    <Text style={styles.secretCode}>{mfaEnrollment.totp.secret}</Text>
                  </View>

                  <View style={styles.mfaCodeInput}>
                    <Key size={18} color="rgba(255,255,255,0.4)" />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={mfaCode}
                      onChangeText={setMfaCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.mfaButtons}>
                    <Pressable
                      style={styles.mfaCancelButton}
                      onPress={() => {
                        setShowMFASetup(false);
                        setMfaEnrollment(null);
                        setMfaCode('');
                      }}
                    >
                      <Text style={styles.mfaCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.mfaVerifyButton, mfaCode.length !== 6 && styles.mfaVerifyDisabled]}
                      onPress={handleVerifyMFA}
                      disabled={mfaCode.length !== 6 || isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <Text style={styles.mfaVerifyText}>Verify</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Biometric Authentication - Only show if available */}
              {biometric.status.isAvailable && (
                <>
                  <View style={styles.securityDivider} />
                  <View style={styles.securityItem}>
                    <View style={styles.securityItemLeft}>
                      <View style={[styles.securityIconContainer, biometric.settings.enabled && styles.securityIconEnabled]}>
                        <Fingerprint size={20} color={biometric.settings.enabled ? '#00E5FF' : 'rgba(255,255,255,0.5)'} />
                      </View>
                      <View style={styles.securityItemText}>
                        <Text style={styles.securityItemTitle}>{biometric.displayName}</Text>
                        <Text style={styles.securityItemDesc}>
                          {biometric.settings.enabled ? 'Enabled for app unlock' : 'Unlock app with biometrics'}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={[
                        styles.securityToggle,
                        biometric.settings.enabled && styles.securityToggleEnabled,
                      ]}
                      onPress={handleBiometricToggle}
                      disabled={isSubmitting || biometric.isLoading}
                    >
                      <View
                        style={[
                          styles.securityToggleKnob,
                          biometric.settings.enabled && styles.securityToggleKnobEnabled,
                        ]}
                      />
                    </Pressable>
                  </View>
                </>
              )}
            </Animated.View>

            {message && (
              <Animated.View entering={FadeInDown.duration(200)} style={[styles.messageBox, message.type === 'error' ? styles.errorBox : styles.successBox, { marginTop: spacing.md }]}>
                {message.type === 'error' ? (
                  <AlertCircle size={14} color="#FF5252" />
                ) : (
                  <CheckCircle size={14} color="#4CAF50" />
                )}
                <Text style={[styles.messageText, message.type === 'error' ? styles.errorText : styles.successText]}>
                  {message.text}
                </Text>
              </Animated.View>
            )}
          </>
        )}

        {/* Privacy Note */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.privacyNote}>
          <Text style={styles.privacyTitle}>Your Data, Your Control</Text>
          <Text style={styles.privacyText}>
            Your data belongs to you—only you can access it.
            We use row-level security so even our team cannot read your logs.
            You can export or delete your data at any time.
          </Text>
        </Animated.View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
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
  notConfigured: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  notConfiguredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  notConfiguredText: {
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  notConfiguredSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  syncCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.15)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  syncIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,229,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  syncCardText: {
    flex: 1,
  },
  syncCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00E5FF',
  },
  syncCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  syncStatus: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  syncStatusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  syncNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
  },
  syncNowText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#00E5FF',
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.lg,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  accountId: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  deviceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'monospace',
  },
  accountActions: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  accountAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  accountActionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  authCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.lg,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  errorBox: {
    backgroundColor: 'rgba(255,82,82,0.1)',
  },
  successBox: {
    backgroundColor: 'rgba(76,175,80,0.1)',
  },
  messageText: {
    flex: 1,
    fontSize: 12,
  },
  errorText: {
    color: '#FF5252',
  },
  successText: {
    color: '#4CAF50',
  },
  authButton: {
    backgroundColor: '#00E5FF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  authOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  authOptionText: {
    flex: 1,
  },
  authOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  authOptionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  privacyNote: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.sm,
  },
  privacyText: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.4)',
  },
  appleAuthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  appleIcon: {
    fontSize: 24,
    color: '#000000',
  },
  appleAuthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  appleAuthDesc: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
  },
  // Password strength styles
  passwordStrength: {
    marginBottom: spacing.md,
  },
  strengthBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  passwordHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacing.xs,
  },
  // Security section styles
  securityCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  securityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  securityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityIconEnabled: {
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  securityItemText: {
    flex: 1,
  },
  securityItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  securityItemDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  securityEnableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  securityEnableText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#00E5FF',
  },
  securityRemoveButton: {
    padding: spacing.sm,
  },
  securityDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: spacing.md,
  },
  securityToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  securityToggleEnabled: {
    backgroundColor: 'rgba(0,229,255,0.3)',
  },
  securityToggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  securityToggleKnobEnabled: {
    backgroundColor: '#00E5FF',
    alignSelf: 'flex-end',
  },
  // MFA setup styles
  mfaSetup: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  mfaSetupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.sm,
  },
  mfaSetupDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  qrPlaceholder: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: spacing.sm,
  },
  secretCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  mfaCodeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  mfaButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mfaCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mfaCancelText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  mfaVerifyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: '#00E5FF',
  },
  mfaVerifyDisabled: {
    opacity: 0.5,
  },
  mfaVerifyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
});
