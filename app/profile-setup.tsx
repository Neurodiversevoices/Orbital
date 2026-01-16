/**
 * Profile Setup Screen
 *
 * First-time setup for B2C users after login.
 * Allows selecting an avatar and setting display name.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { User, ArrowRight, Sparkles } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { AvatarPicker } from '../components/AvatarPicker';
import { useIdentity } from '../lib/profile';
import { type AvatarOption, getAvatarUrl } from '../lib/avatars';
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
  const { updateName, updateAvatar } = useIdentity();

  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canContinue = displayName.trim().length >= 2;

  const handleContinue = async () => {
    if (!canContinue || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Save display name
      await updateName(displayName.trim());

      // Save avatar if selected
      if (selectedAvatar) {
        await updateAvatar(selectedAvatar.url, 'preset');
      }

      // Mark setup complete
      await markProfileSetupComplete();

      // Navigate to home
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Profile setup error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    // Mark setup complete even if skipped
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
              Choose an avatar and display name for your Orbital experience
            </Text>
          </Animated.View>

          {/* Selected Avatar Preview */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.previewSection}
          >
            <View style={styles.avatarPreview}>
              {selectedAvatar ? (
                <Image
                  source={{ uri: selectedAvatar.url }}
                  style={styles.previewImage}
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <User size={40} color="rgba(255,255,255,0.3)" />
                </View>
              )}
            </View>
            <Text style={styles.previewName}>
              {displayName.trim() || 'Your Name'}
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
            <Text style={styles.inputHint}>
              This is how you'll appear in Circles
            </Text>
          </Animated.View>

          {/* Avatar Picker */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={styles.pickerSection}
          >
            <Text style={styles.label}>Choose Your Avatar</Text>
            <AvatarPicker
              selectedId={selectedAvatar?.id ?? null}
              onSelect={setSelectedAvatar}
              maxHeight={300}
            />
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
    marginBottom: spacing.xl,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  previewImage: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  previewPlaceholder: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
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
  inputHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.xs,
  },
  pickerSection: {
    marginBottom: spacing.lg,
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
