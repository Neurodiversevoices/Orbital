/**
 * Weekly Mean Capacity Chart
 *
 * Shows weekly aggregated capacity with variance bands.
 * Clinical styling - institutional grade.
 *
 * DOCTRINE: State-First Rendering
 * Use isLoading prop to show skeleton until data is resolved.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Text as SvgText, G, Rect, Circle } from 'react-native-svg';
import {
  WeeklyMeanPoint,
  ChartDimensions,
  DEFAULT_CHART_DIMENSIONS,
  CHART_COLORS,
  CHART_TITLE_STYLE,
} from './types';
import { ChartSkeleton } from './ChartSkeleton';

interface WeeklyMeanChartProps {
  data: WeeklyMeanPoint[];
  dimensions?: Partial<ChartDimensions>;
  title?: string;
  showVarianceBand?: boolean;
  /** Show loading skeleton while data is being fetched */
  isLoading?: boolean;
}

export function WeeklyMeanChart({
  data,
  dimensions: customDimensions,
  title = 'Weekly Mean Capacity',
  showVarianceBand = true,
  isLoading = false,
}: WeeklyMeanChartProps) {
  const dims: ChartDimensions = { ...DEFAULT_CHART_DIMENSIONS, ...customDimensions };

  // DOCTRINE: State-First Rendering - show skeleton until data resolved
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <ChartSkeleton dimensions={dims} variant="bar" />
      </View>
    );
  }

  const { width, height, paddingLeft, paddingRight, paddingTop, paddingBottom } = dims;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Sort data by date
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }, [data]);

  // Y scale is always 0-100
  const yMin = 0;
  const yMax = 100;
  const yRange = yMax - yMin;

  // X positions evenly distributed
  const getXPosition = (index: number) => {
    if (sortedData.length <= 1) return paddingLeft + chartWidth / 2;
    const ratio = index / (sortedData.length - 1);
    return paddingLeft + ratio * chartWidth;
  };

  const toSvgY = (value: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, value));
    const ratio = (clamped - yMin) / yRange;
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  // Generate mean line path
  const meanPath = useMemo(() => {
    if (sortedData.length === 0) return '';
    const points = sortedData.map((d, i) => {
      const x = getXPosition(i);
      const y = toSvgY(d.meanCapacity);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    return points.join(' ');
  }, [sortedData, chartWidth, chartHeight]);

  // Generate variance band path (mean +/- stdDev)
  const variancePath = useMemo(() => {
    if (!showVarianceBand || sortedData.length === 0) return '';

    // Upper bound
    const upperPoints = sortedData.map((d, i) => {
      const x = getXPosition(i);
      const y = toSvgY(d.meanCapacity + d.stdDev);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    // Lower bound (reversed order)
    const lowerPoints = [...sortedData].reverse().map((d, i) => {
      const originalIndex = sortedData.length - 1 - i;
      const x = getXPosition(originalIndex);
      const y = toSvgY(d.meanCapacity - d.stdDev);
      return `L ${x} ${y}`;
    });

    return `${upperPoints.join(' ')} ${lowerPoints.join(' ')} Z`;
  }, [sortedData, showVarianceBand, chartWidth, chartHeight]);

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100];

  // X-axis labels (week numbers or date ranges)
  const xLabels = useMemo(() => {
    return sortedData.map((d, i) => ({
      label: `W${i + 1}`,
      x: getXPosition(i),
    }));
  }, [sortedData, chartWidth]);

  if (sortedData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.emptyChart, { width, height }]}>
          <Text style={styles.emptyText}>Insufficient data for visualization</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Svg width={width} height={height}>
        {/* Background */}
        <Rect x={0} y={0} width={width} height={height} fill="transparent" />

        {/* Grid lines */}
        <G>
          {yLabels.map((value) => (
            <Line
              key={`grid-${value}`}
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
        {yLabels.map((value) => (
          <SvgText
            key={`y-label-${value}`}
            x={paddingLeft - 8}
            y={toSvgY(value) + 4}
            fontSize={9}
            fill={CHART_COLORS.axisLabel}
            textAnchor="end"
          >
            {value}
          </SvgText>
        ))}

        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <SvgText
            key={`x-label-${i}`}
            x={label.x}
            y={height - paddingBottom + 14}
            fontSize={9}
            fill={CHART_COLORS.axisLabel}
            textAnchor="middle"
          >
            {label.label}
          </SvgText>
        ))}

        {/* Variance band */}
        {showVarianceBand && variancePath && (
          <Path d={variancePath} fill="rgba(92, 122, 138, 0.12)" />
        )}

        {/* Mean line */}
        <Path
          d={meanPath}
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          fill="none"
        />

        {/* Data points */}
        {sortedData.map((d, i) => (
          <Circle
            key={`point-${i}`}
            cx={getXPosition(i)}
            cy={toSvgY(d.meanCapacity)}
            r={3}
            fill={CHART_COLORS.primary}
          />
        ))}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: CHART_COLORS.primary }]} />
          <Text style={styles.legendText}>Weekly Mean</Text>
        </View>
        {showVarianceBand && (
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: 'rgba(92, 122, 138, 0.25)' }]} />
            <Text style={styles.legendText}>Variance Band (±1 SD)</Text>
          </View>
        )}
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
  },
});
