/**
 * HeroSparkline — large header sparkline for patterns tab.
 * Stub introduced for app/(tabs)/patterns.tsx import.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CapacityDailyRecord } from '../../lib/dev/fakeCapacityData';

interface HeroSparklineProps {
  data: CapacityDailyRecord[];
  width?: number;
  height?: number;
}

export function HeroSparkline({ data, width = 320, height = 80 }: HeroSparklineProps): React.ReactElement {
  const safe = Array.isArray(data) ? data : [];
  if (safe.length === 0) {
    return <View style={[styles.empty, { width, height }]} />;
  }
  const scores = safe.map((r) => r.score ?? 0);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(1, max - min);
  const slot = width / Math.max(1, safe.length);
  const barWidth = Math.max(1, slot - 1);
  return (
    <View style={[styles.row, { width, height }]}>
      {scores.map((s, i) => {
        const norm = (s - min) / range;
        const h = Math.max(2, Math.round(norm * height));
        return (
          <View
            key={i}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: h,
                marginRight: i === scores.length - 1 ? 0 : Math.max(0, slot - barWidth),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    backgroundColor: '#A0A0A0',
    borderRadius: 1,
  },
  empty: {
    backgroundColor: 'transparent',
  },
});
