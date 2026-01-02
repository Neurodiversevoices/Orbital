import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Eye, ListTodo, Users } from 'lucide-react-native';
import { Category } from '../types';
import { colors, spacing } from '../theme';
import { useLocale } from '../lib/hooks/useLocale';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CategorySelectorProps {
  selected: Category | null;
  onSelect: (category: Category) => void;
  accentColor?: string;
}

const categoryIcons: Record<Category, React.ComponentType<any>> = {
  sensory: Eye,
  demand: ListTodo,
  social: Users,
};

const categoryOrder: Category[] = ['sensory', 'demand', 'social'];

function CategoryButton({
  category,
  label,
  isSelected,
  onPress,
  accentColor,
}: {
  category: Category;
  label: string;
  isSelected: boolean;
  onPress: () => void;
  accentColor: string;
}) {
  const scale = useSharedValue(1);
  const Icon = categoryIcons[category];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: isSelected ? `${accentColor}15` : 'rgba(255,255,255,0.03)',
    borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.1)',
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.categoryButton, animatedStyle]}
    >
      <Icon
        size={24}
        color={isSelected ? accentColor : 'rgba(255,255,255,0.4)'}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      <Text
        style={[
          styles.categoryLabel,
          { color: isSelected ? accentColor : 'rgba(255,255,255,0.5)' },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export function CategorySelector({
  selected,
  onSelect,
  accentColor = colors.good,
}: CategorySelectorProps) {
  const { t } = useLocale();

  return (
    <View style={styles.container}>
      {categoryOrder.map((category) => (
        <CategoryButton
          key={category}
          category={category}
          label={t.categories[category]}
          isSelected={selected === category}
          onPress={() => onSelect(category)}
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
    gap: spacing.md,
  },
  categoryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 90,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
});
