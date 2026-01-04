import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Local-only draft key - never sent to analytics or logged
const DRAFT_KEY = '@orbital:draft_today_note';
const AUTOSAVE_DEBOUNCE_MS = 500;

interface ComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  accentColor?: string;
  canSubmit?: boolean;
  isSubmitting?: boolean;
  keyboardVisible?: boolean;
}

export function Composer({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Add details...',
  accentColor = colors.accent,
  canSubmit = false,
  isSubmitting = false,
  keyboardVisible = false,
}: ComposerProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const scale = useSharedValue(1);
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await AsyncStorage.getItem(DRAFT_KEY);
        if (draft && !value) {
          onChangeText(draft);
        }
      } catch {
        // Silently fail - drafts are convenience, not critical
      }
    };
    loadDraft();
  }, []);

  // Autosave draft with debounce
  useEffect(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(async () => {
      try {
        if (value.trim()) {
          await AsyncStorage.setItem(DRAFT_KEY, value);
        } else {
          await AsyncStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        // Silently fail - drafts are convenience, not critical
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [value]);

  // Clear draft after successful submit
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    try {
      await AsyncStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore
    }

    onSubmit();
  }, [canSubmit, isSubmitting, onSubmit]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: canSubmit ? `${accentColor}20` : 'rgba(255,255,255,0.05)',
    borderColor: canSubmit ? accentColor : 'rgba(255,255,255,0.1)',
    opacity: isSubmitting ? 0.5 : 1,
  }));

  const handlePressIn = () => {
    if (canSubmit && !isSubmitting) {
      scale.value = withSpring(0.9, { damping: 15 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  // Composer card animation based on keyboard
  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withTiming(keyboardVisible ? 0 : 0, { duration: 200 }),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        cardStyle,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
    >
      <View style={[styles.card, { borderColor: `${accentColor}30` }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { borderColor: `${accentColor}20` }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          maxLength={500}
          textAlignVertical="top"
          returnKeyType="default"
          blurOnSubmit={false}
          autoCorrect
          spellCheck
        />
        <AnimatedPressable
          onPress={handleSubmit}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!canSubmit || isSubmitting}
          style={[styles.submitButton, buttonStyle]}
          accessibilityLabel="Save entry"
          accessibilityRole="button"
        >
          <Check
            size={24}
            color={canSubmit ? accentColor : 'rgba(255,255,255,0.3)'}
            strokeWidth={2.5}
          />
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

// Height of composer for content padding calculation
export const COMPOSER_HEIGHT = 100;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    minHeight: 44,
    maxHeight: 100,
    lineHeight: 20,
  },
  submitButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
});
