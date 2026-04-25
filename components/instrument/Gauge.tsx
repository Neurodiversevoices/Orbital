// Rule 2.1: View+Text only, no HTML elements. Rule 2.2: no CSS shorthand strings.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CapacityState } from '../../lib/capacity/types';

export interface GaugeProps {
  score: number;
  state: CapacityState;
  accent?: string;
  motion?: 'subtle' | 'bold' | 'off';
}

const STATE_COLORS: Record<CapacityState, string> = {
  RESOURCED: '#2DD4BF',
  ELEVATED: '#F59E0B',
  DEPLETED: '#DC2626',
};

export function Gauge({ score, state }: GaugeProps) {
  return (
    <View
      style={styles.root}
      accessibilityRole="text"
      accessibilityLabel={`Capacity ${Math.round(score)}, ${state.toLowerCase()}`}
      testID="gauge-root"
    >
      <Text style={styles.value} testID="gauge-value">
        {Math.round(score)}
      </Text>
      <Text
        style={[styles.state, { color: STATE_COLORS[state] ?? '#7A8593' }]}
        testID="gauge-state"
      >
        {state}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  value: {
    fontSize: 96,
    lineHeight: 100,
    color: '#FFFFFF',
    fontFamily: 'DMSans-Bold',
    includeFontPadding: false,
  },
  state: {
    fontSize: 11,
    letterSpacing: 2.5,
    marginTop: 8,
    textTransform: 'uppercase',
  },
});
