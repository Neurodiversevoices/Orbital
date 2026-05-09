/**
 * AnimatedNumber — smooth-counts to a target value with ease-out cubic.
 *
 * Premium feel for KPI displays · capacity numbers · streaks · days-tracked.
 * Counts up on mount and on value change.
 */

import { Text, TextStyle, StyleProp } from 'react-native';
import {
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { useEffect, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  decimals?: number;
  style?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber = ({
  value,
  duration = 800,
  format,
  decimals = 0,
  style,
  prefix = '',
  suffix = '',
}: Props) => {
  const animValue = useSharedValue(value);
  const [display, setDisplay] = useState<string>(
    format ? format(value) : `${prefix}${value.toFixed(decimals)}${suffix}`
  );

  useEffect(() => {
    animValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, animValue]);

  useAnimatedReaction(
    () => animValue.value,
    (current: number) => {
      const text = format
        ? format(current)
        : `${prefix}${current.toFixed(decimals)}${suffix}`;
      runOnJS(setDisplay)(text);
    }
  );

  return <Text style={style}>{display}</Text>;
};

export const PercentNumber = (props: Omit<Props, 'format' | 'suffix'>) => (
  <AnimatedNumber {...props} suffix="%" decimals={0} />
);

export const StreakNumber = (props: Omit<Props, 'format'>) => (
  <AnimatedNumber {...props} suffix=" days" decimals={0} />
);
