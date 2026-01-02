import React from 'react';
import { View, StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { colors, spacing } from '../../theme';
import { ShareDuration } from '../../lib/sharing';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ShareDurationPickerProps {
  selected: ShareDuration;
  onSelect: (duration: ShareDuration) => void;
  labels: Record<ShareDuration, string>;
}

const DURATIONS: ShareDuration[] = [7, 14, 30, 90];

export function ShareDurationPicker({
  selected,
  onSelect,
  labels,
}: ShareDurationPickerProps) {
  return (
    <View style={styles.container}>
      {DURATIONS.map((duration) => (
        <DurationOption
          key={duration}
          duration={duration}
          label={labels[duration]}
          isSelected={selected === duration}
          onPress={() => onSelect(duration)}
        />
      ))}
    </View>
  );
}

function DurationOption({
  duration,
  label,
  isSelected,
  onPress,
}: {
  duration: ShareDuration;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: isSelected ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.03)',
    borderColor: isSelected ? '#00E5FF' : 'rgba(255,255,255,0.1)',
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
      style={[styles.option, animatedStyle]}
    >
      <Text
        style={[
          styles.optionText,
          { color: isSelected ? '#00E5FF' : 'rgba(255,255,255,0.5)' },
        ]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
