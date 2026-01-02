import React from 'react';
import { View, StyleSheet, TextInput, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { colors, spacing } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NoteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  accentColor?: string;
  canSave?: boolean;
}

export function NoteInput({
  value,
  onChangeText,
  onSave,
  accentColor = colors.good,
  canSave = false,
}: NoteInputProps) {
  const scale = useSharedValue(1);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: canSave ? `${accentColor}20` : 'rgba(255,255,255,0.05)',
    borderColor: canSave ? accentColor : 'rgba(255,255,255,0.1)',
  }));

  const handlePressIn = () => {
    if (canSave) scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Add details (optional)"
        placeholderTextColor="rgba(255,255,255,0.25)"
        multiline
        maxLength={200}
      />
      <AnimatedPressable
        onPress={canSave ? onSave : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.saveButton, buttonStyle]}
      >
        <Check
          size={24}
          color={canSave ? accentColor : 'rgba(255,255,255,0.3)'}
          strokeWidth={2.5}
        />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    minHeight: 44,
    maxHeight: 80,
  },
  saveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
