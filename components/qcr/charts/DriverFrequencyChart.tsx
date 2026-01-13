/**
 * Driver Frequency Chart
 *
 * Bar chart showing frequency distribution of capacity drivers.
 * Clinical styling - no gamification.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import {
  DriverFrequencyData,
  ChartDimensions,
  DEFAULT_CHART_DIMENSIONS,
  CHART_COLORS,
  CHART_TITLE_STYLE,
} from './types';

interface DriverFrequencyChartProps {
  data: DriverFrequencyData[];
  dimensions?: Partial<ChartDimensions>;
  title?: string;
  showStrainRate?: boolean;
}

const DRIVER_LABELS: Record<string, string> = {
  sensory: 'Sensory',
  demand: 'Demand',
  social: 'Social',
};

const DRIVER_COLORS: Record<string, string> = {
  sensory: CHART_COLORS.sensory,
  demand: CHART_COLORS.demand,
  social: CHART_COLORS.social,
};

export function DriverFrequencyChart({
  data,
  dimensions: customDimensions,
  title = 'Driver Frequency Distribution',
  showStrainRate = true,
}: DriverFrequencyChartProps) {
  const dims: ChartDimensions = {
    ...DEFAULT_CHART_DIMENSIONS,
    height: 160,
    ...customDimensions,
  };
  const { width, height, paddingLeft, paddingRight, paddingTop, paddingBottom } = dims;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate max value for scale
  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Bar dimensions
  const barCount = data.length;
  const barGap = 16;
  const barWidth = (chartWidth - (barCount - 1) * barGap) / barCount;

  const toSvgY = (value: number) => {
    const ratio = value / maxCount;
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  // Y-axis grid lines
  const yGridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => Math.round(maxCount * ratio));

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.emptyChart, { width, height }]}>
          <Text style={styles.emptyText}>No driver data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        <G>
          {yGridLines.map((value, i) => (
            <Line
              key={`grid-${i}`}
              x1={paddingLeft}
              y1={toSvgY(value)}
              x2={width - paddingRight}
              y2={toSvgY(value)}
              stroke={CHART_COLORS.grid}
              strokeWidth={1}
            />
          ))}
        </G>

        {/* Y-axis */}
        <Line
          x1={paddingLeft}
          y1={paddingTop}
          x2={paddingLeft}
          y2={height - paddingBottom}
          stroke={CHART_COLORS.axis}
          strokeWidth={1}
        />

        {/* X-axis */}
        <Line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke={CHART_COLORS.axis}
          strokeWidth={1}
        />

        {/* Y-axis labels */}
        {yGridLines.filter((_, i) => i % 2 === 0 || i === yGridLines.length - 1).map((value, i) => (
          <SvgText
            key={`y-label-${i}`}
            x={paddingLeft - 8}
            y={toSvgY(value) + 4}
            fontSize={9}
            fill={CHART_COLORS.axisLabel}
            textAnchor="end"
          >
            {value}
          </SvgText>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const barX = paddingLeft + i * (barWidth + barGap);
          const barHeight = (d.count / maxCount) * chartHeight;
          const barY = height - paddingBottom - barHeight;

          return (
            <G key={d.driver}>
              {/* Bar */}
              <Rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={DRIVER_COLORS[d.driver]}
                rx={2}
              />

              {/* Value label on bar */}
              <SvgText
                x={barX + barWidth / 2}
                y={barY - 6}
                fontSize={10}
                fill="rgba(255,255,255,0.7)"
                textAnchor="middle"
                fontWeight="500"
              >
                {d.count}
              </SvgText>

              {/* Driver label below axis */}
              <SvgText
                x={barX + barWidth / 2}
                y={height - paddingBottom + 14}
                fontSize={10}
                fill={CHART_COLORS.axisLabel}
                textAnchor="middle"
              >
                {DRIVER_LABELS[d.driver]}
              </SvgText>

              {/* Percentage label */}
              <SvgText
                x={barX + barWidth / 2}
                y={height - paddingBottom + 25}
                fontSize={8}
                fill="rgba(255,255,255,0.35)"
                textAnchor="middle"
              >
                ({d.percentage}%)
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Strain rate summary */}
      {showStrainRate && (
        <View style={styles.strainContainer}>
          <Text style={styles.strainTitle}>Associated Strain Rate</Text>
          <View style={styles.strainRow}>
            {data.map(d => (
              <View key={d.driver} style={styles.strainItem}>
                <View style={[styles.strainDot, { backgroundColor: DRIVER_COLORS[d.driver] }]} />
                <Text style={styles.strainLabel}>{DRIVER_LABELS[d.driver]}</Text>
                <Text style={styles.strainValue}>{d.strainRate}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
  strainContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  strainTitle: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  strainRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  strainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  strainDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  strainLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  strainValue: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
});
