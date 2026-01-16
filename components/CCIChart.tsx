/**
 * @deprecated This component is DEPRECATED.
 *
 * Use `CCI90DayChart` from `components/CCI90DayChart.tsx` instead.
 *
 * The unified chart module ensures pixel-identical rendering between
 * Individual CCI (1 series) and Circle CCI (5 series).
 *
 * MIGRATION:
 * - Import `CircleCCIChart` or `IndividualCCIChart` from './CCI90DayChart'
 * - Convert legacy 1-3 scale data to 0-100 using `convertLegacyCapacityData`
 *
 * This file will be removed in a future release.
 *
 * ---
 * CCIChart — Shared Clinical Capacity Indicator Chart Component (LEGACY)
 *
 * Used for both Individual CCI and Circle CCI (aggregate view).
 * Visual requirements:
 * - Smooth bezier curves
 * - Gradient bands (Resourced/Stretched/Sentinel)
 * - Capacity-colored dots at key data points
 * - Matching legend for all views
 *
 * NOT diagnostic. NOT symptom scoring. Complements clinical judgment.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Rect,
  Line,
  Text as SvgText,
  Circle as SvgCircle,
} from 'react-native-svg';

// =============================================================================
// TYPES
// =============================================================================

export type CCITimeRange = '7d' | '30d' | '90d' | '6m' | '1y' | '3y' | '5y' | '10y';

export interface CCIChartProps {
  /** Capacity values (1 = depleted, 3 = resourced) */
  data: number[];
  /** Time range for display */
  timeRange?: CCITimeRange;
  /** Container width for responsive sizing */
  width?: number;
  /** Chart height multiplier (default 0.4 of width) */
  heightRatio?: number;
  /** Show legend below chart */
  showLegend?: boolean;
  /** Show footer disclaimer */
  showDisclaimer?: boolean;
  /** Chart title (optional) */
  title?: string;
  /** Label for the data (e.g., "Individual", "Circle Aggregate") */
  dataLabel?: string;
}

// =============================================================================
// CAPACITY COLOR SYSTEM
// =============================================================================

export function getCapacityColor(value: number): string {
  if (value >= 2.5) return '#00D7FF'; // Cyan - Resourced
  if (value >= 2.0) return '#10B981'; // Green - Good
  if (value >= 1.5) return '#E8A830'; // Yellow - Stretched
  return '#F44336'; // Red - Depleted/Sentinel
}

export function getCapacityLabel(value: number): string {
  if (value >= 2.5) return 'Resourced';
  if (value >= 2.0) return 'Good';
  if (value >= 1.5) return 'Stretched';
  return 'Sentinel';
}

// =============================================================================
// TIME RANGE UTILITIES
// =============================================================================

interface TimeRangeConfig {
  days: number;
  labels: string[];
  keyPointCount: number;
}

function getTimeRangeConfig(timeRange: CCITimeRange): TimeRangeConfig {
  switch (timeRange) {
    case '7d':
      return { days: 7, labels: ['Day 1', '', '', '', '', '', 'Today'], keyPointCount: 3 };
    case '30d':
      return { days: 30, labels: ['Week 1', 'Week 2', 'Week 3', 'Today'], keyPointCount: 4 };
    case '90d':
      return { days: 90, labels: ['Oct', 'Nov', 'Dec', 'Today'], keyPointCount: 4 };
    case '6m':
      return { days: 180, labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Today'], keyPointCount: 6 };
    case '1y':
      return { days: 365, labels: ['Q1', 'Q2', 'Q3', 'Q4'], keyPointCount: 4 };
    case '3y':
      return { days: 365 * 3, labels: ['Y1', 'Y2', 'Y3'], keyPointCount: 4 };
    case '5y':
      return { days: 365 * 5, labels: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'], keyPointCount: 5 };
    case '10y':
      return { days: 365 * 10, labels: ['Y1', 'Y3', 'Y5', 'Y7', 'Y10'], keyPointCount: 5 };
    default:
      return { days: 90, labels: ['Oct', 'Nov', 'Dec', 'Today'], keyPointCount: 4 };
  }
}

// =============================================================================
// CHART COMPONENT
// =============================================================================

export function CCIChart({
  data,
  timeRange = '90d',
  width: containerWidth,
  heightRatio = 0.4,
  showLegend = true,
  showDisclaimer = true,
  title,
  dataLabel,
}: CCIChartProps) {
  const config = getTimeRangeConfig(timeRange);

  // Responsive dimensions using viewBox
  const viewBoxWidth = 500;
  const viewBoxHeight = 200;
  const padding = { top: 15, right: 70, bottom: 30, left: 5 };
  const graphWidth = viewBoxWidth - padding.left - padding.right;
  const graphHeight = viewBoxHeight - padding.top - padding.bottom;

  // Band heights (Resourced top, Stretched middle, Sentinel bottom)
  const bandHeight = graphHeight / 3;

  // Scale for data points
  const dataPoints = data.length || config.days;
  const xScale = graphWidth / Math.max(dataPoints - 1, 1);

  // Convert capacity value (1-3) to Y coordinate
  const valueToY = (value: number) => {
    const normalized = (value - 1) / 2; // 0 to 1
    return padding.top + graphHeight - (normalized * graphHeight);
  };

  // Generate smooth bezier curve path
  const generateSmoothPath = (values: number[]) => {
    if (values.length < 2) return '';

    const points = values.map((value, index) => ({
      x: padding.left + index * xScale,
      y: valueToY(value),
    }));

    let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const tension = 0.3;

      const cp1x = prev.x + (curr.x - prev.x) * tension;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * tension;
      const cp2y = curr.y;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }

    return path;
  };

  // Get key points for capacity-colored dots
  const getKeyPoints = (values: number[]) => {
    if (values.length === 0) return [];

    const count = config.keyPointCount;
    const indices: number[] = [];

    for (let i = 0; i < count; i++) {
      const idx = Math.floor((values.length - 1) * (i / (count - 1)));
      indices.push(idx);
    }

    return indices.map(i => ({
      x: padding.left + i * xScale,
      y: valueToY(values[i]),
      value: values[i],
      color: getCapacityColor(values[i]),
    }));
  };

  // Calculate X-axis label positions
  const labelPositions = config.labels.map((_, i) => {
    const pos = (graphWidth / (config.labels.length - 1)) * i;
    return padding.left + pos;
  });

  const keyPoints = getKeyPoints(data);
  const chartHeight = containerWidth ? containerWidth * heightRatio : 180;

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      <Svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background bands */}
        <Rect
          x={padding.left}
          y={padding.top}
          width={graphWidth}
          height={bandHeight}
          fill="rgba(0, 215, 255, 0.08)"
        />
        <Rect
          x={padding.left}
          y={padding.top + bandHeight}
          width={graphWidth}
          height={bandHeight}
          fill="rgba(232, 168, 48, 0.08)"
        />
        <Rect
          x={padding.left}
          y={padding.top + bandHeight * 2}
          width={graphWidth}
          height={bandHeight}
          fill="rgba(244, 67, 54, 0.08)"
        />

        {/* Grid lines */}
        <Line
          x1={padding.left}
          y1={padding.top + bandHeight}
          x2={padding.left + graphWidth}
          y2={padding.top + bandHeight}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />
        <Line
          x1={padding.left}
          y1={padding.top + bandHeight * 2}
          x2={padding.left + graphWidth}
          y2={padding.top + bandHeight * 2}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />

        {/* Capacity trend line - smooth bezier curve */}
        {data.length > 0 && (
          <Path
            d={generateSmoothPath(data)}
            stroke="rgba(255,255,255,0.8)"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Capacity-colored dots at key data points */}
        {keyPoints.map((point, idx) => (
          <SvgCircle
            key={`dot-${idx}`}
            cx={point.x}
            cy={point.y}
            r={6}
            fill={point.color}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={1}
          />
        ))}

        {/* Y-axis labels */}
        <SvgText
          x={padding.left + graphWidth + 8}
          y={padding.top + bandHeight / 2 + 4}
          fill="#00D7FF"
          fontSize={11}
          fontWeight="500"
        >
          Resourced
        </SvgText>
        <SvgText
          x={padding.left + graphWidth + 8}
          y={padding.top + bandHeight * 1.5 + 4}
          fill="#E8A830"
          fontSize={11}
          fontWeight="500"
        >
          Stretched
        </SvgText>
        <SvgText
          x={padding.left + graphWidth + 8}
          y={padding.top + bandHeight * 2.5 + 4}
          fill="#F44336"
          fontSize={11}
          fontWeight="500"
        >
          Sentinel
        </SvgText>

        {/* X-axis labels */}
        {config.labels.map((label, i) => (
          <SvgText
            key={`xlabel-${i}`}
            x={labelPositions[i]}
            y={viewBoxHeight - 8}
            fill="rgba(255,255,255,0.5)"
            fontSize={10}
            textAnchor={i === 0 ? 'start' : i === config.labels.length - 1 ? 'end' : 'middle'}
          >
            {label}
          </SvgText>
        ))}
      </Svg>

      {/* Legend */}
      {showLegend && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#00D7FF' }]} />
            <Text style={styles.legendText}>Resourced</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#E8A830' }]} />
            <Text style={styles.legendText}>Stretched</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Sentinel</Text>
          </View>
        </View>
      )}

      {/* Disclaimer footer */}
      {showDisclaimer && (
        <Text style={styles.disclaimer}>
          Not diagnostic. Not symptom scoring. Complements clinical judgment.
        </Text>
      )}
    </View>
  );
}

// =============================================================================
// AGGREGATE UTILITIES FOR CIRCLE CCI
// =============================================================================

/**
 * Calculate aggregate capacity from multiple members' data
 * Uses mean of values at each time point
 */
export function calculateAggregateCapacity(memberData: number[][]): number[] {
  if (memberData.length === 0) return [];

  const maxLength = Math.max(...memberData.map(d => d.length));
  const aggregate: number[] = [];

  for (let i = 0; i < maxLength; i++) {
    const values = memberData
      .map(d => d[i])
      .filter(v => v !== undefined);

    if (values.length > 0) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      aggregate.push(mean);
    }
  }

  return aggregate;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  disclaimer: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default CCIChart;
