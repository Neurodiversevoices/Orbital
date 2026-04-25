// Rule 2.1: View+Text only. Rule 2.2: no CSS shorthand.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Insight } from '../../lib/capacity/types';

interface Props {
  insight: Insight;
}

export function SignalCard({ insight }: Props) {
  return (
    <View style={styles.card} testID="signal-card" accessibilityRole="text">
      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.recommendation}>{insight.recommendation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(45,212,191,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.18)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 0,
  },
  title: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#2DD4BF',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  recommendation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 21,
  },
});
