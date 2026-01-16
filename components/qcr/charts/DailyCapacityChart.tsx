/**
 * Daily Capacity Index Chart
 *
 * Time-series visualization of daily capacity over the quarter.
 * Clinical styling - no gamification.
 *
 * DOCTRINE: State-First Rendering
 * Use isLoading prop to show skeleton until data is resolved.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Text as SvgText, G, Rect } from 'react-native-svg';
import {
  DailyCapacityPoint,
  ChartDimensions,
  DEFAULT_CHART_DIMENSIONS,
  CHART_COLORS,
  CHART_TITLE_STYLE,
} from './types';
import { ChartSkeleton } from './ChartSkeleton';

interface DailyCapacityChartProps {
  data: DailyCapacityPoint[];
  dimensions?: Partial<ChartDimensions>;
  title?: string;
  showTrendLine?: boolean;
  /** Show loading skeleton while data is being fetched */
  isLoading?: boolean;
}

export function DailyCapacityChart({
  data,
  dimensions: customDimensions,
  title = 'Daily Capacity Index',
  showTrendLine = true,
  isLoading = false,
}: DailyCapacityChartProps) {
  const dims: ChartDimensions = { ...DEFAULT_CHART_DIMENSIONS, ...customDimensions };

  // DOCTRINE: State-First Rendering - show skeleton until data resolved
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <ChartSkeleton dimensions={dims} variant="line" />
      </View>
    );
  }
  const { width, height, paddingLeft, paddingRight, paddingTop, paddingBottom } = dims;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Sort data by date
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  // Calculate scales
  const xScale = useMemo(() => {
    if (sortedData.length === 0) return { min: 0, max: 1, range: 1 };
    const min = sortedData[0].date.getTime();
    const max = sortedData[sortedData.length - 1].date.getTime();
    return { min, max, range: max - min || 1 };
  }, [sortedData]);

  // Y scale is always 0-100 for capacity index
  const yMin = 0;
  const yMax = 100;
  const yRange = yMax - yMin;

  // Convert data point to SVG coordinates
  const toSvgX = (date: Date) => {
    const ratio = (date.getTime() - xScale.min) / xScale.range;
    return paddingLeft + ratio * chartWidth;
  };

  const toSvgY = (value: number) => {
    const ratio = (value - yMin) / yRange;
    return paddingTop + chartHeight - ratio * chartHeight;
  };

  // Generate path for capacity line
  const capacityPath = useMemo(() => {
    if (sortedData.length === 0) return '';
    const points = sortedData.map((d, i) => {
      const x = toSvgX(d.date);
      const y = toSvgY(d.capacityIndex);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    return points.join(' ');
  }, [sortedData, chartWidth, chartHeight]);

  // Generate area fill path
  const areaPath = useMemo(() => {
    if (sortedData.length === 0) return '';
    const linePath = sortedData.map((d, i) => {
      const x = toSvgX(d.date);
      const y = toSvgY(d.capacityIndex);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    const firstX = toSvgX(sortedData[0].date);
    const lastX = toSvgX(sortedData[sortedData.length - 1].date);
    const bottomY = toSvgY(0);
    return `${linePath.join(' ')} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [sortedData, chartWidth, chartHeight]);

  // Calculate linear trend line
  const trendLine = useMemo(() => {
    if (!showTrendLine || sortedData.length < 2) return null;

    // Simple linear regression
    const n = sortedData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    sortedData.forEach((d, i) => {
      sumX += i;
      sumY += d.capacityIndex;
      sumXY += i * d.capacityIndex;
      sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const startY = intercept;
    const endY = slope * (n - 1) + intercept;

    return {
      x1: toSvgX(sortedData[0].date),
      y1: toSvgY(Math.max(0, Math.min(100, startY))),
      x2: toSvgX(sortedData[sortedData.length - 1].date),
      y2: toSvgY(Math.max(0, Math.min(100, endY))),
    };
  }, [sortedData, showTrendLine, chartWidth, chartHeight]);

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100];

  // X-axis labels (show ~4 date markers)
  const xLabels = useMemo(() => {
    if (sortedData.length === 0) return [];
    const labels: { date: Date; x: number }[] = [];
    const step = Math.max(1, Math.floor(sortedData.length / 4));

    for (let i = 0; i < sortedData.length; i += step) {
      labels.push({
        date: sortedData[i].date,
        x: toSvgX(sortedData[i].date),
      });
    }
    // Always include last point
    if (labels.length > 0 && labels[labels.length - 1].date !== sortedData[sortedData.length - 1].date) {
      labels.push({
        date: sortedData[sortedData.length - 1].date,
        x: toSvgX(sortedData[sortedData.length - 1].date),
      });
    }
    return labels;
  }, [sortedData, chartWidth]);

  const formatDate = (date: Date) => {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

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
            {formatDate(label.date)}
          </SvgText>
        ))}

        {/* Area fill */}
        <Path d={areaPath} fill={CHART_COLORS.areaFill} />

        {/* Capacity line */}
        <Path
          d={capacityPath}
          stroke={CHART_COLORS.primary}
          strokeWidth={1.5}
          fill="none"
        />

        {/* Trend line */}
        {trendLine && (
          <Line
            x1={trendLine.x1}
            y1={trendLine.y1}
            x2={trendLine.x2}
            y2={trendLine.y2}
            stroke={CHART_COLORS.trend}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        )}
      </Svg>

      {/* Axis labels */}
      <View style={styles.axisLabelContainer}>
        <Text style={styles.yAxisLabel}>Capacity Index</Text>
        <Text style={styles.xAxisLabel}>Observation Period</Text>
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
  axisLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 4,
  },
  yAxisLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
  xAxisLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.3,
  },
});
