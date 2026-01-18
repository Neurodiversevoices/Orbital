/**
 * Profile Setup Screen
 *
 * First-time setup for users after login, before tutorial.
 * Collects minimal profile + sets privacy/consent defaults.
 *
 * SCOPE (minimal):
 * - Display Name (required)
 * - Derived Initials (auto, read-only)
 * - Optional Accent Color (6 presets)
 * - Consent toggles for Circles and Bundles (defaults OFF)
 *
 * TARGET: 60 seconds max to complete
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Sparkles, ArrowRight, Users, Shield } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { InitialsAvatar } from '../components/InitialsAvatar';
import {
  useIdentity,
  getInitials,
  getAvatarColor,
  ACCENT_COLOR_PRESETS,
} from '../lib/profile';
import { saveConsentDefaults, DEFAULT_CONSENT } from '../lib/profile/consent';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// CONSTANTS
// =============================================================================

const SETUP_COMPLETE_KEY = '@orbital:profile_setup_complete';

export async function isProfileSetupComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SETUP_COMPLETE_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markProfileSetupComplete(): Promise<void> {
  await AsyncStorage.setItem(SETUP_COMPLETE_KEY, 'true');
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { updateName, updateAccentColor } = useIdentity();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [selectedColorHex, setSelectedColorHex] = useState<string | null>(null);
  const [circleNameSharing, setCircleNameSharing] = useState(false);
  const [bundleCoachVisibility, setBundleCoachVisibility] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived values
  const initials = useMemo(
    () => getInitials(displayName.trim() || null, null),
    [displayName]
  );
  const avatarColor = useMemo(
    () => selectedColorHex || getAvatarColor(displayName.trim() || null),
    [displayName, selectedColorHex]
  );

  const canContinue = displayName.trim().length >= 2;

  const handleContinue = async () => {
    if (!canContinue || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Save display name
      await updateName(displayName.trim());

      // Save accent color if selected
      if (selectedColorHex) {
        await updateAccentColor(selectedColorHex);
      }

      // Save consent defaults
      await saveConsentDefaults({
        ...DEFAULT_CONSENT,
        circleNameSharing,
        bundleCoachVisibility,
      });

      // Mark setup complete
      await markProfileSetupComplete();

      // Navigate to home (tutorial gate will redirect if needed)
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Profile setup error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // Save default consent (both OFF) even if skipped
    await saveConsentDefaults(DEFAULT_CONSENT);
    // Mark setup complete
    await markProfileSetupComplete();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View style={styles.iconContainer}>
              <Sparkles size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>Set Up Your Profile</Text>
            <Text style={styles.subtitle}>
              Your name and privacy preferences for Orbital
            </Text>
          </Animated.View>

          {/* Initials Preview */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.previewSection}
          >
            <InitialsAvatar
              initials={initials}
              color={avatarColor}
              size={100}
              borderColor={colors.primary}
            />
            <Text style={styles.previewName}>
              {displayName.trim() || 'Your Name'}
            </Text>
            <Text style={styles.previewInitials}>
              Initials: {initials}
            </Text>
          </Animated.View>

          {/* Display Name Input */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.inputSection}
          >
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor="rgba(255,255,255,0.3)"
              maxLength={30}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </Animated.View>

          {/* Accent Color Picker */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(400)}
            style={styles.colorSection}
          >
            <Text style={styles.label}>Accent Color (optional)</Text>
            <View style={styles.colorGrid}>
              {ACCENT_COLOR_PRESETS.map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() =>
                    setSelectedColorHex(
                      selectedColorHex === preset.hex ? null : preset.hex
                    )
                  }
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: preset.hex },
                    selectedColorHex === preset.hex && styles.colorSwatchSelected,
                  ]}
                >
                  {selectedColorHex === preset.hex && (
                    <View style={styles.colorSwatchCheck} />
                  )}
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* Privacy Defaults */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={styles.privacySection}
          >
            <View style={styles.privacyHeader}>
              <Shield size={18} color={colors.primary} />
              <Text style={styles.privacySectionTitle}>Privacy Defaults</Text>
            </View>

            {/* Circle Name Sharing */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <View style={styles.toggleIconWrap}>
                  <Users size={16} color="rgba(255,255,255,0.6)" />
                </View>
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleTitle}>Share my name in Circles</Text>
                  <Text style={styles.toggleDesc}>
                    Others will see your display name
                  </Text>
                </View>
              </View>
              <Switch
                value={circleNameSharing}
                onValueChange={setCircleNameSharing}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Bundle Coach Visibility */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleContent}>
                <View style={styles.toggleIconWrap}>
                  <Users size={16} color="rgba(255,255,255,0.6)" />
                </View>
                <View style={styles.toggleTextWrap}>
                  <Text style={styles.toggleTitle}>Allow coach/admin to see me</Text>
                  <Text style={styles.toggleDesc}>
                    In Bundles you join (name + capacity)
                  </Text>
                </View>
              </View>
              <Switch
                value={bundleCoachVisibility}
                onValueChange={setBundleCoachVisibility}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <Text style={styles.privacyNote}>
              Both default to OFF for privacy. You can change these later in Settings.
            </Text>
          </Animated.View>
        </ScrollView>

        {/* Bottom Actions */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.actions}
        >
          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>

          <Pressable
            style={[
              styles.continueButton,
              !canContinue && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!canContinue || isSubmitting}
          >
            <Text
              style={[
                styles.continueText,
                !canContinue && styles.continueTextDisabled,
              ]}
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Text>
            <ArrowRight
              size={20}
              color={canContinue ? '#000' : 'rgba(255,255,255,0.3)'}
            />
          </Pressable>
        </Animated.View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
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
    maxWidth: 280,
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  previewInitials: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
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
  colorSection: {
    marginBottom: spacing.lg,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  colorSwatchCheck: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#000',
  },
  privacySection: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  privacySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  toggleDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  privacyNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  continueTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
});
