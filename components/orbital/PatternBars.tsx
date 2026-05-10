// PatternBars — Build 132 trend visualization.
// Vertical bars colored by zone (red below baseline, amber neutral, teal above).
// Replaces the v1 HeroSparkline with the design-ref pulse-bar look.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

interface DataPoint {
  date: string;
  capacity_score: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
  /** baseline below which bars render in the overloaded zone */
  lowThreshold?: number;
  /** baseline above which bars render in the ready zone */
  highThreshold?: number;
}

const W = 340;

function colorForScore(score: number, lo: number, hi: number): string {
  if (score < lo) return '#E5484D';
  if (score < hi) return '#F5B547';
  return '#5DD9D4';
}

export function PatternBars({ data, height = 220, lowThreshold = 40, highThreshold = 70 }: Props) {
  const bars = useMemo(() => {
    if (!data.length) return [];
    const max = Math.max(...data.map(d => d.capacity_score), 100);
    const barCount = data.length;
    const totalGap = (barCount - 1) * 4;
    const barW = Math.max(2.5, (W - 32 - totalGap) / barCount);
    const innerH = height - 56; // leave room for bottom ticks + labels
    return data.map((d, i) => {
      const h = Math.max(4, (d.capacity_score / max) * innerH);
      return {
        key: `${d.date}-${i}`,
        x: 16 + i * (barW + 4),
        y: innerH + 16 - h,
        width: barW,
        height: h,
        score: d.capacity_score,
        color: colorForScore(d.capacity_score, lowThreshold, highThreshold),
      };
    });
  }, [data, height, lowThreshold, highThreshold]);

  return (
    <View style={[s.wrap, { height }]}>
      <View style={s.yLabels}>
        <Text style={[s.yLabel, { color: '#5DD9D4' }]}>High</Text>
        <Text style={s.yLabel}>Normal</Text>
        <Text style={[s.yLabel, { color: '#E5484D' }]}>Low</Text>
      </View>

      <Svg width={W} height={height} viewBox={`0 0 ${W} ${height}`}>
        <Defs>
          {bars.map(b => (
            <LinearGradient key={`g-${b.key}`} id={`bar-${b.key}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={b.color} stopOpacity="1" />
              <Stop offset="1" stopColor={b.color} stopOpacity="0.35" />
            </LinearGradient>
          ))}
        </Defs>
        {bars.map(b => (
          <Rect
            key={b.key}
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            rx={1.5}
            ry={1.5}
            fill={`url(#bar-${b.key})`}
          />
        ))}
      </Svg>

      <View style={s.xLabels}>
        <Text style={s.xLabel}>{data.length > 0 ? `${data.length} DAYS AGO` : ''}</Text>
        <Text style={s.xLabel}>TODAY</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center' },
  yLabels: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 28,
    justifyContent: 'space-between',
  },
  yLabel: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 11,
    color: '#9CA3AF',
  },
  xLabels: {
    position: 'absolute',
    bottom: 4,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xLabel: {
    fontFamily: 'SpaceMono-Regular',
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#6B7280',
  },
});
