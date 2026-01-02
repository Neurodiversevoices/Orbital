import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import {
  Moon,
  Brain,
  Dumbbell,
  Pill,
  Utensils,
  Users,
  Eye,
  ListTodo,
} from 'lucide-react-native';
import { Tag } from '../types';
import { colors, spacing } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagToggle: (tag: Tag) => void;
  accentColor?: string;
}

const tagIcons: Record<Tag, React.ComponentType<any>> = {
  sensory: Eye,
  demand: ListTodo,
  social: Users,
  sleep: Moon,
  stress: Brain,
  exercise: Dumbbell,
  meds: Pill,
  food: Utensils,
};

const tagOrder: Tag[] = ['sleep', 'stress', 'exercise', 'meds', 'food', 'social'];

function TagButton({
  tag,
  isSelected,
  onPress,
  accentColor,
}: {
  tag: Tag;
  isSelected: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  const scale = useSharedValue(1);
  const Icon = tagIcons[tag];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: isSelected ? `${accentColor}20` : 'transparent',
    borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.15)',
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tagButton, animatedStyle]}
    >
      <Icon
        size={22}
        color={isSelected ? accentColor : 'rgba(255,255,255,0.4)'}
        strokeWidth={isSelected ? 2 : 1.5}
      />
    </AnimatedPressable>
  );
}

export function TagSelector({
  selectedTags,
  onTagToggle,
  accentColor = colors.good,
}: TagSelectorProps) {
  return (
    <View style={styles.container}>
      {tagOrder.map((tag) => (
        <TagButton
          key={tag}
          tag={tag}
          isSelected={selectedTags.includes(tag)}
          onPress={() => onTagToggle(tag)}
          accentColor={accentColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  tagButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
