/**
 * CCISummaryChart — React Native Summary Chart Component
 *
 * Renders the 6-point summary chart visual style using react-native-svg.
 * This component uses the SAME rendering logic as lib/cci/summaryChart.ts
 * to ensure pixel-identical output between app and artifact.
 *
 * Visual Style:
 * - 6 downsampled data points
 * - Smooth Bezier curves with area fill
 * - Multi-layer node markers
 * - H/M/L zone indicators
 * - Oct/Nov/Dec x-axis labels
 * - Dark background with colored zones
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Rect,
  Line,
  Path,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';

import {
  SUMMARY_CHART,
  CAPACITY_COLORS,
  downsampleTo6Points,
  getCapacityColor,
} from '../lib/cci/summaryChart';

// =============================================================================
// TYPES
// =============================================================================

export interface CCISummaryChartProps {
  /** Capacity values (90 days, 0-100 scale) */
  values: number[];
  /** Container width for responsive sizing */
  width?: number;
  /** Optional unique ID for gradients (needed if multiple charts) */
  chartId?: string;
}

// =============================================================================
// CHART CONSTANTS
// =============================================================================

const { width: CHART_WIDTH, height: CHART_HEIGHT, padding, bandHeight, graphHeight } = SUMMARY_CHART;

/** X positions for 6 data points */
const DATA_POINT_X = [40, 80, 128, 188, 248, 300];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert 0-100 value to Y coordinate.
 */
function valueToY(value: number): number {
  const normalized = value / 100;
  return padding.top + graphHeight - (normalized * graphHeight);
}

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  color: string;
}

/**
 * Convert values to chart points.
 */
function valuesToPoints(values: number[]): ChartPoint[] {
  return values.map((value, i) => ({
    x: DATA_POINT_X[i],
    y: valueToY(value),
    value,
    color: getCapacityColor(value),
  }));
}

/**
 * Generate Bezier curve path.
 */
function generateBezierPath(points: ChartPoint[]): string {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const dx = p2.x - p1.x;
    const cp1x = p1.x + dx * 0.3;
    const cp1y = p1.y + (p2.y - p0.y) * 0.15;
    const cp2x = p2.x - dx * 0.3;
    const cp2y = p2.y - (p3.y - p1.y) * 0.15;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y.toFixed(1)}`;
  }

  return path;
}

/**
 * Generate area fill path.
 */
function generateAreaPath(points: ChartPoint[]): string {
  const linePath = generateBezierPath(points);
  if (!linePath) return '';

  const bottomY = padding.top + graphHeight;
  return `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CCISummaryChart({
  values,
  width: containerWidth,
  chartId = 'summary',
}: CCISummaryChartProps) {
  // Downsample to 6 points
  const downsampled = downsampleTo6Points(values, 6);
  const points = valuesToPoints(downsampled);

  // Generate paths
  const curvePath = generateBezierPath(points);
  const areaPath = generateAreaPath(points);

  // Calculate display dimensions
  const aspectRatio = CHART_WIDTH / CHART_HEIGHT;
  const displayWidth = containerWidth ?? CHART_WIDTH;
  const displayHeight = displayWidth / aspectRatio;

  return (
    <View style={styles.container}>
      <Svg
        width={displayWidth}
        height={displayHeight}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Gradient definitions */}
        <Defs>
          <LinearGradient id={`${chartId}AreaGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={CAPACITY_COLORS.resourced} stopOpacity={0.20} />
            <Stop offset="50%" stopColor={CAPACITY_COLORS.stretched} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={CAPACITY_COLORS.depleted} stopOpacity={0.20} />
          </LinearGradient>
          <LinearGradient id={`${chartId}LineGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={CAPACITY_COLORS.resourced} />
            <Stop offset="50%" stopColor={CAPACITY_COLORS.stretched} />
            <Stop offset="100%" stopColor={CAPACITY_COLORS.depleted} />
          </LinearGradient>
        </Defs>

        {/* Zone backgrounds */}
        <Rect
          x={padding.left}
          y={padding.top}
          width={280}
          height={bandHeight}
          fill={CAPACITY_COLORS.resourced}
          fillOpacity={0.06}
        />
        <Rect
          x={padding.left}
          y={padding.top + bandHeight}
          width={280}
          height={bandHeight}
          fill={CAPACITY_COLORS.stretched}
          fillOpacity={0.04}
        />
        <Rect
          x={padding.left}
          y={padding.top + bandHeight * 2}
          width={280}
          height={bandHeight}
          fill={CAPACITY_COLORS.depleted}
          fillOpacity={0.06}
        />

        {/* Zone divider lines (dashed) */}
        <Line
          x1={padding.left}
          y1={padding.top + bandHeight}
          x2={312}
          y2={padding.top + bandHeight}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
          strokeDasharray="3,3"
        />
        <Line
          x1={padding.left}
          y1={padding.top + bandHeight * 2}
          x2={312}
          y2={padding.top + bandHeight * 2}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
          strokeDasharray="3,3"
        />

        {/* Borders */}
        <Line x1={padding.left} y1={padding.top} x2={312} y2={padding.top} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        <Line x1={padding.left} y1={padding.top + graphHeight} x2={312} y2={padding.top + graphHeight} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + graphHeight} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

        {/* H/M/L zone indicators (left side) */}
        <Circle cx={16} cy={padding.top + bandHeight / 2} r={4} fill={CAPACITY_COLORS.resourced} fillOpacity={0.9} />
        <Circle cx={16} cy={padding.top + bandHeight * 1.5} r={4} fill={CAPACITY_COLORS.stretched} fillOpacity={0.9} />
        <Circle cx={16} cy={padding.top + bandHeight * 2.5} r={4} fill={CAPACITY_COLORS.depleted} fillOpacity={0.9} />

        {/* H/M/L labels */}
        <SvgText x={6} y={padding.top + bandHeight / 2 + 3} fontSize={7} fill={CAPACITY_COLORS.resourced} fontWeight="600">H</SvgText>
        <SvgText x={6} y={padding.top + bandHeight * 1.5 + 3} fontSize={7} fill={CAPACITY_COLORS.stretched} fontWeight="600">M</SvgText>
        <SvgText x={6} y={padding.top + bandHeight * 2.5 + 3} fontSize={7} fill={CAPACITY_COLORS.depleted} fontWeight="600">L</SvgText>

        {/* Area fill under curve */}
        <Path d={areaPath} fill={`url(#${chartId}AreaGrad)`} />

        {/* Under-stroke (dark shadow) */}
        <Path
          d={curvePath}
          stroke={CAPACITY_COLORS.background}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Main gradient stroke */}
        <Path
          d={curvePath}
          stroke={`url(#${chartId}LineGrad)`}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data point nodes (multi-layer) */}
        <G>
          {points.map((point, idx) => (
            <G key={`node-${idx}`}>
              <Circle cx={point.x} cy={point.y} r={5} fill={CAPACITY_COLORS.background} />
              <Circle cx={point.x} cy={point.y} r={3.5} fill={point.color} />
              <Circle cx={point.x} cy={point.y} r={1.5} fill="white" fillOpacity={0.9} />
            </G>
          ))}
        </G>

        {/* X-axis labels */}
        <SvgText x={70} y={132} fontSize={9} fill="rgba(255,255,255,0.6)" fontWeight="500" textAnchor="middle">Oct</SvgText>
        <SvgText x={170} y={132} fontSize={9} fill="rgba(255,255,255,0.6)" fontWeight="500" textAnchor="middle">Nov</SvgText>
        <SvgText x={270} y={132} fontSize={9} fill="rgba(255,255,255,0.6)" fontWeight="500" textAnchor="middle">Dec</SvgText>
      </Svg>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: CAPACITY_COLORS.background,
    borderRadius: 4,
  },
});

export default CCISummaryChart;
