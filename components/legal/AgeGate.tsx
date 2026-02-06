/**
 * Age Gate Component — LEGAL REQUIRED
 *
 * Blocks ALL access until user:
 * 1. Enters year of birth
 * 2. Confirms 13+ attestation checkbox
 *
 * NO EXCEPTIONS. NO DEMO MODE BYPASS.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { Shield, AlertTriangle } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../theme';
import {
  getAgeVerificationStatus,
  submitAgeVerification,
  purgeUnderageLocalState,
  ATTESTATION_TEXT,
  BLOCKED_MESSAGE,
  type AgeVerificationStatus,
} from '../../lib/legal/ageVerification';

// Routes that bypass age gate (App Store compliance pages)
const BYPASS_ROUTES = [
  '/privacy',
  '/support',
];

// =============================================================================
// TYPES
// =============================================================================

interface AgeGateProps {
  children: React.ReactNode;
}

// =============================================================================
// CHECKBOX COMPONENT (Unchecked by default)
// =============================================================================

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
}

function Checkbox({ checked, onToggle, label, disabled }: CheckboxProps) {
  return (
    <Pressable
      style={styles.checkboxRow}
      onPress={onToggle}
      disabled={disabled}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Text style={styles.checkboxMark}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}

// =============================================================================
// BLOCKED SCREEN (Under 13)
// =============================================================================

function BlockedScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.blockedContainer}>
        <AlertTriangle size={64} color="#F44336" />
        <Text style={styles.blockedTitle}>Access Denied</Text>
        <Text style={styles.blockedMessage}>{BLOCKED_MESSAGE}</Text>
        <Text style={styles.blockedNote}>
          If you believe this is an error, please contact support.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// =============================================================================
// AGE GATE FORM
// =============================================================================

interface AgeGateFormProps {
  onVerified: () => void;
  onBlocked: () => void;
}

function AgeGateForm({ onVerified, onBlocked }: AgeGateFormProps) {
  const [yearOfBirth, setYearOfBirth] = useState('');
  const [attestationChecked, setAttestationChecked] = useState(false); // UNCHECKED BY DEFAULT
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);

    const year = parseInt(yearOfBirth, 10);
    if (isNaN(year)) {
      setError('Please enter a valid year.');
      setIsSubmitting(false);
      return;
    }

    const result = await submitAgeVerification(year, attestationChecked);

    if (result.blocked) {
      onBlocked();
    } else if (result.success) {
      onVerified();
    } else {
      setError(result.error || 'Verification failed.');
    }

    setIsSubmitting(false);
  }, [yearOfBirth, attestationChecked, onVerified, onBlocked]);

  const currentYear = new Date().getFullYear();
  const isValidYear = yearOfBirth.length === 4 && !isNaN(parseInt(yearOfBirth, 10));
  const canSubmit = isValidYear && attestationChecked && !isSubmitting;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Shield size={48} color="#00E5FF" />
            <Text style={styles.title}>Age Verification</Text>
            <Text style={styles.subtitle}>
              Orbital requires age verification before you can continue.
            </Text>

            {/* Year of Birth Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Year of Birth</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="number-pad"
                maxLength={4}
                value={yearOfBirth}
                onChangeText={setYearOfBirth}
                editable={!isSubmitting}
              />
              <Text style={styles.inputHint}>
                Enter the year you were born (e.g., {currentYear - 25})
              </Text>
            </View>

            {/* Attestation Checkbox — UNCHECKED BY DEFAULT */}
            <View style={styles.attestationSection}>
              <Checkbox
                checked={attestationChecked}
                onToggle={() => setAttestationChecked(!attestationChecked)}
                label={ATTESTATION_TEXT}
                disabled={isSubmitting}
              />
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <AlertTriangle size={16} color="#F44336" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit Button */}
            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Continue</Text>
              )}
            </Pressable>

            {/* Privacy Note */}
            <Text style={styles.privacyNote}>
              Your year of birth is stored securely and used only for age verification.
              We do not collect your full date of birth.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =============================================================================
// MAIN AGE GATE COMPONENT
// =============================================================================

export function AgeGate({ children }: AgeGateProps) {
  const pathname = usePathname();
  const [status, setStatus] = useState<AgeVerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if current route bypasses age gate (App Store compliance pages)
  const shouldBypass = BYPASS_ROUTES.some(route => pathname.startsWith(route));

  useEffect(() => {
    // Skip check for bypass routes
    if (shouldBypass) {
      setIsLoading(false);
      return;
    }
    checkStatus();
  }, [shouldBypass]);

  const checkStatus = async () => {
    setIsLoading(true);
    const result = await getAgeVerificationStatus();
    setStatus(result);
    setIsLoading(false);
  };

  const handleVerified = () => {
    setStatus({ isVerified: true, isBlocked: false, record: null });
  };

  // PATCH 3: Purge ALL Orbital data BEFORE rendering BlockedScreen
  const handleBlocked = async () => {
    await purgeUnderageLocalState();
    setStatus({ isVerified: false, isBlocked: true, record: null });
  };

  // Bypass routes (App Store compliance) — allow through without verification
  if (shouldBypass) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00E5FF" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Blocked state (under 13)
  if (status?.isBlocked) {
    return <BlockedScreen />;
  }

  // Verified state — show children
  if (status?.isVerified) {
    return <>{children}</>;
  }

  // Not verified — show age gate form
  return <AgeGateForm onVerified={handleVerified} onBlocked={handleBlocked} />;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  inputSection: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 4,
  },
  inputHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  attestationSection: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  checkboxMark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#F44336',
  },
  submitButton: {
    backgroundColor: '#00E5FF',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 2,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  privacyNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },

  // Blocked Screen
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  blockedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F44336',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  blockedMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  blockedNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});

export default AgeGate;
