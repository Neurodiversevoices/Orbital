// Rule 2.1: View+Text only. Rule 2.2: no CSS shorthand. Rule 2.11: no em-dash, no empty placeholder.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  label: string;
  value: string | null;
  trend: 'up' | 'down' | 'flat' | null;
  baselineDay: number;
  baselineTarget: number;
}

const TREND_CHARS: Record<'up' | 'down' | 'flat', string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

export function MetricCard({ label, value, trend, baselineDay, baselineTarget }: Props) {
  const displayValue = value !== null
    ? value
    : `calibrating · day ${baselineDay} of ${baselineTarget}`;
  const isCalibrating = value === null;

  return (
    <View
      style={styles.card}
      testID={`metric-card-${label.toLowerCase()}`}
      accessibilityLabel={`${label}: ${displayValue}`}
    >
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={[styles.value, isCalibrating && styles.valueDim]} numberOfLines={2}>
        {displayValue}
      </Text>
      {trend !== null && !isCalibrating && (
        <Text style={[styles.trend, trend === 'up' && styles.trendUp, trend === 'down' && styles.trendDown]}>
          {TREND_CHARS[trend]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'flex-start',
    minHeight: 76,
  },
  label: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#7A8593',
    marginBottom: 6,
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.90)',
    fontWeight: '500',
    lineHeight: 20,
  },
  valueDim: {
    fontSize: 11,
    color: '#7A8593',
    fontWeight: '400',
  },
  trend: {
    fontSize: 14,
    marginTop: 4,
    color: '#7A8593',
  },
  trendUp: {
    color: '#2DD4BF',
  },
  trendDown: {
    color: '#DC2626',
  },
});
