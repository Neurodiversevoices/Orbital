/**
 * Profile Settings Screen
 *
 * Optional demographic fields for aggregate analytics only.
 * These fields are NEVER visible to other users.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Calendar,
  User,
  Shield,
  ChevronDown,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '../theme';
import {
  useProfile,
  GENDER_OPTIONS,
  GenderChoice,
} from '../lib/profile';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    profile,
    isLoading,
    ageBracket,
    getYearError,
    setYearOfBirth,
    setGender,
  } = useProfile();

  // Local state for form
  const [yearInput, setYearInput] = useState('');
  const [yearError, setYearError] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<GenderChoice | null>(null);
  const [selfDescribedText, setSelfDescribedText] = useState('');
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form from profile
  useEffect(() => {
    if (!isLoading) {
      setYearInput(profile.yearOfBirth?.toString() || '');
      setSelectedGender(profile.genderChoice);
      setSelfDescribedText(profile.genderSelfDescribed || '');
    }
  }, [isLoading, profile]);

  // Handle year input change
  const handleYearChange = (text: string) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setYearInput(cleaned);

    if (cleaned.length === 4) {
      const year = parseInt(cleaned, 10);
      const error = getYearError(year);
      setYearError(error);
    } else if (cleaned.length === 0) {
      setYearError(null);
    } else {
      setYearError(null); // Clear error while typing
    }
  };

  // Save year of birth
  const handleSaveYear = async () => {
    if (yearInput.length === 0) {
      // Clear year
      setIsSaving(true);
      await setYearOfBirth(null);
      setIsSaving(false);
      return;
    }

    const year = parseInt(yearInput, 10);
    const error = getYearError(year);

    if (error) {
      setYearError(error);
      return;
    }

    setIsSaving(true);
    const success = await setYearOfBirth(year);
    setIsSaving(false);

    if (!success) {
      Alert.alert('Error', 'Failed to save year of birth');
    }
  };

  // Handle gender selection
  const handleGenderSelect = async (choice: GenderChoice) => {
    setSelectedGender(choice);
    setShowGenderPicker(false);

    if (choice !== 'self_described') {
      setSelfDescribedText('');
      setIsSaving(true);
      await setGender(choice, null);
      setIsSaving(false);
    }
  };

  // Save self-described gender
  const handleSaveSelfDescribed = async () => {
    if (selectedGender === 'self_described') {
      setIsSaving(true);
      await setGender('self_described', selfDescribedText || null);
      setIsSaving(false);
    }
  };

  const currentGenderLabel = GENDER_OPTIONS.find(
    opt => opt.value === selectedGender
  )?.label || 'Select...';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.title}>Profile</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X color={colors.textPrimary} size={24} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Privacy Notice */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.privacyCard}>
          <Shield size={20} color="#4CAF50" />
          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>Private Information</Text>
            <Text style={styles.privacyText}>
              These optional fields are used only for anonymous aggregate insights.
              They are never shown to other users, Circles, or sponsors.
            </Text>
          </View>
        </Animated.View>

        {/* Year of Birth */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color="rgba(255,255,255,0.6)" />
            <Text style={styles.sectionTitle}>Year of Birth</Text>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.yearInput, yearError && styles.inputError]}
              value={yearInput}
              onChangeText={handleYearChange}
              onBlur={handleSaveYear}
              placeholder="YYYY"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="number-pad"
              maxLength={4}
            />
            {yearInput.length === 4 && !yearError && (
              <View style={styles.bracketBadge}>
                <Text style={styles.bracketText}>
                  {ageBracket ? `${ageBracket} years` : ''}
                </Text>
              </View>
            )}
          </View>

          {yearError && (
            <View style={styles.errorRow}>
              <AlertCircle size={14} color="#FF5252" />
              <Text style={styles.errorText}>{yearError}</Text>
            </View>
          )}

          <Text style={styles.helperText}>
            Used only for anonymous age-range insights. Never shown to others.
          </Text>
        </Animated.View>

        {/* Gender */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={18} color="rgba(255,255,255,0.6)" />
            <Text style={styles.sectionTitle}>Gender</Text>
            <Text style={styles.optionalBadge}>Optional</Text>
          </View>

          <Pressable
            style={styles.genderSelector}
            onPress={() => setShowGenderPicker(!showGenderPicker)}
          >
            <Text style={[
              styles.genderSelectorText,
              !selectedGender && styles.genderSelectorPlaceholder
            ]}>
              {currentGenderLabel}
            </Text>
            <ChevronDown
              size={18}
              color="rgba(255,255,255,0.4)"
              style={{ transform: [{ rotate: showGenderPicker ? '180deg' : '0deg' }] }}
            />
          </Pressable>

          {showGenderPicker && (
            <View style={styles.genderOptions}>
              {GENDER_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.genderOption,
                    selectedGender === option.value && styles.genderOptionSelected
                  ]}
                  onPress={() => handleGenderSelect(option.value)}
                >
                  <Text style={[
                    styles.genderOptionText,
                    selectedGender === option.value && styles.genderOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {selectedGender === option.value && (
                    <Check size={16} color="#00E5FF" />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {selectedGender === 'self_described' && (
            <View style={styles.selfDescribedContainer}>
              <TextInput
                style={styles.selfDescribedInput}
                value={selfDescribedText}
                onChangeText={setSelfDescribedText}
                onBlur={handleSaveSelfDescribed}
                placeholder="How do you describe yourself? (optional)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={100}
              />
              <Text style={styles.selfDescribedNote}>
                This text is stored privately and never displayed or used in analytics.
              </Text>
            </View>
          )}

          <Text style={styles.helperText}>
            Used only for anonymous, thresholded aggregate insights.
          </Text>
        </Animated.View>

        {/* Info Card */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.infoCard}>
          <Text style={styles.infoTitle}>How this data is used</Text>
          <View style={styles.infoItem}>
            <Check size={14} color="#4CAF50" />
            <Text style={styles.infoText}>
              Aggregate analytics only (e.g., "25-30 age group: 60% resourced")
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Check size={14} color="#4CAF50" />
            <Text style={styles.infoText}>
              Minimum 10 users required to show any demographic breakdown
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Check size={14} color="#4CAF50" />
            <Text style={styles.infoText}>
              Included in your personal data export (you own your data)
            </Text>
          </View>
          <View style={styles.infoItem}>
            <X size={14} color="#FF5252" />
            <Text style={styles.infoText}>
              Never visible in Circles, sharing, or to other users
            </Text>
          </View>
        </Animated.View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
  privacyCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.2)',
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: spacing.xs,
  },
  privacyText: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.5)',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  optionalBadge: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  yearInput: {
    width: 100,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  inputError: {
    borderColor: '#FF5252',
  },
  bracketBadge: {
    backgroundColor: 'rgba(0,229,255,0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  bracketText: {
    fontSize: 13,
    color: '#00E5FF',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: '#FF5252',
  },
  helperText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: spacing.sm,
  },
  genderSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    height: 48,
  },
  genderSelectorText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  genderSelectorPlaceholder: {
    color: 'rgba(255,255,255,0.3)',
  },
  genderOptions: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  genderOptionSelected: {
    backgroundColor: 'rgba(0,229,255,0.08)',
  },
  genderOptionText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  genderOptionTextSelected: {
    color: '#00E5FF',
    fontWeight: '500',
  },
  selfDescribedContainer: {
    marginTop: spacing.sm,
  },
  selfDescribedInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },
  selfDescribedNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: spacing.lg,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.5)',
  },
});
