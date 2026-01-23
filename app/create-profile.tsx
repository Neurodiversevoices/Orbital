/**
 * Create Profile Screen
 *
 * Account setup for new users - username creation required before app access.
 * Stores profile data in Supabase.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, CheckCircle } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { useAuth } from '../lib/supabase';
import { createMyProfile } from '../lib/db/profiles';

// =============================================================================
// VALIDATION
// =============================================================================

const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const USERNAME_REGEX = /^[a-z0-9_]+$/;

function validateUsername(value: string): string | null {
  if (value.length < USERNAME_MIN) {
    return `Username must be at least ${USERNAME_MIN} characters`;
  }
  if (value.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MAX} characters or less`;
  }
  if (!USERNAME_REGEX.test(value)) {
    return 'Username can only contain lowercase letters, numbers, and underscores';
  }
  return null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function CreateProfileScreen() {
  const router = useRouter();
  const auth = useAuth();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedUsername = username.toLowerCase().trim();
  const validationError = normalizedUsername ? validateUsername(normalizedUsername) : null;
  const canSubmit = normalizedUsername.length >= USERNAME_MIN && !validationError;

  const handleUsernameChange = useCallback((text: string) => {
    // Auto-lowercase and remove invalid characters as user types
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    const userId = auth.user?.id;
    if (!userId) {
      setError('Not authenticated. Please sign in again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createMyProfile({
        userId,
        username: normalizedUsername,
        displayName: displayName.trim() || undefined,
      });

      // Navigate to home
      router.replace('/(tabs)');
    } catch (err: any) {
      // Check for unique constraint violation
      if (err?.code === '23505' || err?.message?.includes('duplicate') || err?.message?.includes('unique')) {
        setError('That username is taken.');
      } else {
        setError(err?.message || 'Failed to create profile. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, isSubmitting, auth.user?.id, normalizedUsername, displayName, router]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <User size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>Account Setup</Text>
            <Text style={styles.subtitle}>
              Create your username to get started
            </Text>
          </View>

          {/* Username Input */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Username *</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder="your_username"
              placeholderTextColor="rgba(255,255,255,0.3)"
              maxLength={USERNAME_MAX}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              returnKeyType="next"
              editable={!isSubmitting}
            />
            {validationError && !error && (
              <Text style={styles.validationHint}>{validationError}</Text>
            )}
            {!validationError && normalizedUsername.length >= USERNAME_MIN && (
              <View style={styles.validRow}>
                <CheckCircle size={14} color="#4CAF50" />
                <Text style={styles.validText}>Username available format</Text>
              </View>
            )}
            <Text style={styles.inputHint}>
              3-20 characters, lowercase letters, numbers, underscores only
            </Text>
          </View>

          {/* Display Name Input (Optional) */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Display Name (optional)</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your Name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="done"
              editable={!isSubmitting}
            />
            <Text style={styles.inputHint}>
              How you appear to others (can be changed later)
            </Text>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Save Button */}
          <Pressable
            style={[
              styles.saveButton,
              (!canSubmit || isSubmitting) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text
                style={[
                  styles.saveText,
                  !canSubmit && styles.saveTextDisabled,
                ]}
              >
                Save
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,229,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputError: {
    borderColor: '#F44336',
  },
  inputHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.xs,
  },
  validationHint: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: spacing.xs,
  },
  validRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  validText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  errorContainer: {
    backgroundColor: 'rgba(244,67,54,0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.3)',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  saveTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
});
