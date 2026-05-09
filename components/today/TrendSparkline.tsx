/**
 * TodayTrendSparkline — minimal 7-day capacity sparkline.
 * Stub introduced for app/(tabs)/index.tsx import.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { CapacityDailyRecord } from '../../lib/dev/fakeCapacityData';

interface TodayTrendSparklineProps {
  data: CapacityDailyRecord[];
  width?: number;
  height?: number;
}

export function TodayTrendSparkline({ data, width = 120, height = 32 }: TodayTrendSparklineProps): React.ReactElement {
  const safe = Array.isArray(data) ? data : [];
  if (safe.length === 0) {
    return <View style={[styles.empty, { width, height }]} />;
  }
  const scores = safe.map((r) => r.score ?? 0);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(1, max - min);
  const slot = width / Math.max(1, safe.length);
  const barWidth = Math.max(2, slot - 2);
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
                marginRight: i === scores.length - 1 ? 0 : slot - barWidth,
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
    backgroundColor: '#888',
    borderRadius: 1,
  },
  empty: {
    backgroundColor: 'transparent',
  },
});
