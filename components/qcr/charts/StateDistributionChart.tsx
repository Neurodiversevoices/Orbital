/**
 * State Distribution Chart
 *
 * Horizontal bar chart showing distribution of capacity states.
 * Clinical styling - institutional grade.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import {
  StateDistributionData,
  ChartDimensions,
  DEFAULT_CHART_DIMENSIONS,
  CHART_COLORS,
  CHART_TITLE_STYLE,
} from './types';

interface StateDistributionChartProps {
  data: StateDistributionData[];
  dimensions?: Partial<ChartDimensions>;
  title?: string;
  totalObservations?: number;
}

const STATE_LABELS: Record<string, string> = {
  resourced: 'Resourced',
  stretched: 'Stretched',
  depleted: 'Depleted',
};

const STATE_COLORS: Record<string, string> = {
  resourced: CHART_COLORS.resourced,
  stretched: CHART_COLORS.stretched,
  depleted: CHART_COLORS.depleted,
};

export function StateDistributionChart({
  data,
  dimensions: customDimensions,
  title = 'Capacity State Distribution',
  totalObservations,
}: StateDistributionChartProps) {
  const dims: ChartDimensions = {
    ...DEFAULT_CHART_DIMENSIONS,
    height: 140,
    paddingLeft: 70,
    ...customDimensions,
  };
  const { width, height, paddingLeft, paddingRight, paddingTop, paddingBottom } = dims;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Bar dimensions
  const barHeight = 20;
  const barGap = 12;
  const totalBarsHeight = data.length * barHeight + (data.length - 1) * barGap;
  const startY = paddingTop + (chartHeight - totalBarsHeight) / 2;

  // Sort by state order: resourced, stretched, depleted
  const sortOrder = ['resourced', 'stretched', 'depleted'];
  const sortedData = [...data].sort((a, b) => sortOrder.indexOf(a.state) - sortOrder.indexOf(b.state));

  const total = totalObservations || sortedData.reduce((sum, d) => sum + d.count, 0);

  if (sortedData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.emptyChart, { width, height }]}>
          <Text style={styles.emptyText}>No distribution data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Svg width={width} height={height}>
        {/* Background track */}
        {sortedData.map((d, i) => {
          const y = startY + i * (barHeight + barGap);
          return (
            <Rect
              key={`track-${d.state}`}
              x={paddingLeft}
              y={y}
              width={chartWidth}
              height={barHeight}
              fill="rgba(255,255,255,0.03)"
              rx={4}
            />
          );
        })}

        {/* Data bars */}
        {sortedData.map((d, i) => {
          const y = startY + i * (barHeight + barGap);
          const barW = (d.percentage / 100) * chartWidth;

          return (
            <G key={d.state}>
              {/* State label */}
              <SvgText
                x={paddingLeft - 8}
                y={y + barHeight / 2 + 4}
                fontSize={11}
                fill={CHART_COLORS.axisLabel}
                textAnchor="end"
              >
                {STATE_LABELS[d.state]}
              </SvgText>

              {/* Bar */}
              <Rect
                x={paddingLeft}
                y={y}
                width={Math.max(barW, 4)}
                height={barHeight}
                fill={STATE_COLORS[d.state]}
                rx={4}
              />

              {/* Percentage label */}
              <SvgText
                x={paddingLeft + Math.max(barW, 4) + 8}
                y={y + barHeight / 2 + 4}
                fontSize={11}
                fill="rgba(255,255,255,0.7)"
                fontWeight="500"
              >
                {d.percentage}%
              </SvgText>

              {/* Count label */}
              <SvgText
                x={paddingLeft + Math.max(barW, 4) + 48}
                y={y + barHeight / 2 + 4}
                fontSize={9}
                fill="rgba(255,255,255,0.35)"
              >
                (n={d.count})
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Total observations footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Total observations: {total}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    ...CHART_TITLE_STYLE,
    marginBottom: 8,
  },
  emptyChart: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  footer: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
});
