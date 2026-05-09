/**
 * PatternCard — discriminated card variants for the patterns tab.
 * Stub introduced for app/(tabs)/patterns.tsx import.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CapacityDailyRecord } from '../../lib/dev/fakeCapacityData';

export type PatternCardProps =
  | { type: 'monday'; data: CapacityDailyRecord[] }
  | { type: 'sleep'; data: CapacityDailyRecord[] }
  | { type: 'trending'; data: CapacityDailyRecord[]; data30d: CapacityDailyRecord[]; prevData30d: CapacityDailyRecord[] }
  | { type: 'seasonal'; data: CapacityDailyRecord[] };

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function weekdayAvg(data: CapacityDailyRecord[], weekday: number): number {
  const filtered = data.filter((r) => new Date(r.date).getUTCDay() === weekday);
  return avg(filtered.map((r) => r.score ?? 0));
}

export function PatternCard(props: PatternCardProps): React.ReactElement {
  switch (props.type) {
    case 'monday': {
      const score = Math.round(weekdayAvg(props.data, 1));
      return (
        <View style={styles.card}>
          <Text style={styles.title}>Monday pattern</Text>
          <Text style={styles.value}>{score}</Text>
          <Text style={styles.caption}>avg capacity score on Mondays</Text>
        </View>
      );
    }
    case 'sleep': {
      const sleep = Math.round(avg(props.data.map((r) => r.sleep_hours ?? 0)) * 10) / 10;
      return (
        <View style={styles.card}>
          <Text style={styles.title}>Sleep average</Text>
          <Text style={styles.value}>{sleep}h</Text>
          <Text style={styles.caption}>across selected window</Text>
        </View>
      );
    }
    case 'trending': {
      const cur = avg(props.data30d.map((r) => r.score ?? 0));
      const prev = avg(props.prevData30d.map((r) => r.score ?? 0));
      const delta = Math.round((cur - prev) * 10) / 10;
      const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
      return (
        <View style={styles.card}>
          <Text style={styles.title}>30d trend</Text>
          <Text style={styles.value}>{arrow} {Math.abs(delta)}</Text>
          <Text style={styles.caption}>vs prior 30 days</Text>
        </View>
      );
    }
    case 'seasonal': {
      const months = new Set(props.data.map((r) => r.date.slice(0, 7))).size;
      return (
        <View style={styles.card}>
          <Text style={styles.title}>Seasonal coverage</Text>
          <Text style={styles.value}>{months}</Text>
          <Text style={styles.caption}>months of data</Text>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    marginVertical: 6,
  },
  title: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 4,
  },
  caption: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
});
