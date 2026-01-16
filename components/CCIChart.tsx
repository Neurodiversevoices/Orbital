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
 * - Gradient bands (Resourced/Stretched/Depleted)
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
  Defs,
  LinearGradient,
  Stop,
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
  if (value >= 2.0) return '#00D7FF'; // Cyan - Resourced
  if (value >= 1.5) return '#E8A830'; // Amber - Stretched
  return '#F44336'; // Red - Depleted
}

export function getCapacityLabel(value: number): string {
  if (value >= 2.0) return 'Resourced';
  if (value >= 1.5) return 'Stretched';
  return 'Depleted';
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

  // Match artifact dimensions exactly: viewBox="0 0 320 140"
  const viewBoxWidth = 320;
  const viewBoxHeight = 140;
  // Artifact: graph from x=32 to x=312, y=8 to y=116
  const padding = { top: 8, right: 8, bottom: 24, left: 32 };
  const graphWidth = viewBoxWidth - padding.left - padding.right; // 280
  const graphHeight = viewBoxHeight - padding.top - padding.bottom; // 108

  // Band heights (Resourced top, Stretched middle, Depleted bottom)
  const bandHeight = graphHeight / 3; // 36 each

  // Downsample data to 6 representative points (matches artifact)
  // This creates smooth, readable curves instead of dense jagged lines
  const downsampleData = (values: number[], targetPoints: number): number[] => {
    if (values.length <= targetPoints) return values;

    const result: number[] = [];
    const step = (values.length - 1) / (targetPoints - 1);

    for (let i = 0; i < targetPoints; i++) {
      const idx = Math.round(i * step);
      result.push(values[idx]);
    }

    return result;
  };

  // Use 6 points for 90d (matches artifact), scale for other ranges
  const targetPoints = timeRange === '90d' ? 6 : config.keyPointCount;
  const sampledData = downsampleData(data, targetPoints);

  // Convert capacity value (1-3) to Y coordinate
  const valueToY = (value: number) => {
    const normalized = (value - 1) / 2; // 0 to 1
    return padding.top + graphHeight - (normalized * graphHeight);
  };

  // Generate smooth bezier curve path - Catmull-Rom style for natural curves
  const generateSmoothPath = (values: number[]) => {
    if (values.length < 2) return '';

    // Use sampledXScale for proper spacing of downsampled points
    const scale = graphWidth / Math.max(values.length - 1, 1);
    const points = values.map((value, index) => ({
      x: padding.left + index * scale,
      y: valueToY(value),
    }));

    let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

    for (let i = 1; i < points.length; i++) {
      const p0 = points[Math.max(0, i - 2)];
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[Math.min(points.length - 1, i + 1)];

      // Catmull-Rom to Bezier conversion for smooth natural curves
      const tension = 6; // Higher = smoother
      const cp1x = p1.x + (p2.x - p0.x) / tension;
      const cp1y = p1.y + (p2.y - p0.y) / tension;
      const cp2x = p2.x - (p3.x - p1.x) / tension;
      const cp2y = p2.y - (p3.y - p1.y) / tension;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    return path;
  };

  // Get key points for capacity-colored dots - use ALL sampled points
  const getKeyPoints = (values: number[]) => {
    if (values.length === 0) return [];

    const scale = graphWidth / Math.max(values.length - 1, 1);
    return values.map((value, i) => ({
      x: padding.left + i * scale,
      y: valueToY(value),
      value: value,
      color: getCapacityColor(value),
    }));
  };

  // Calculate X-axis label positions
  const labelPositions = config.labels.map((_, i) => {
    const pos = (graphWidth / (config.labels.length - 1)) * i;
    return padding.left + pos;
  });

  // Use sampled data for both curve and key points
  const keyPoints = getKeyPoints(sampledData);
  const chartHeight = containerWidth ? containerWidth * heightRatio : 180;

  // Generate area fill path (closes to bottom)
  const generateAreaPath = (values: number[]) => {
    if (values.length < 2) return '';
    const linePath = generateSmoothPath(values);
    if (!linePath) return '';

    const scale = graphWidth / Math.max(values.length - 1, 1);
    const lastX = padding.left + (values.length - 1) * scale;
    const bottomY = padding.top + graphHeight;
    const firstX = padding.left;

    return `${linePath} L ${lastX.toFixed(1)} ${bottomY.toFixed(1)} L ${firstX.toFixed(1)} ${bottomY.toFixed(1)} Z`;
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      {/* Dark card wrapper - matches Individual CCI artifact */}
      <View style={styles.chartCard}>
        <Svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Gradient definitions */}
          <Defs>
            <LinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#00D7FF" stopOpacity={0.20} />
              <Stop offset="50%" stopColor="#E8A830" stopOpacity={0.12} />
              <Stop offset="100%" stopColor="#F44336" stopOpacity={0.20} />
            </LinearGradient>
            <LinearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#00D7FF" />
              <Stop offset="50%" stopColor="#E8A830" />
              <Stop offset="100%" stopColor="#F44336" />
            </LinearGradient>
          </Defs>

          {/* Background bands */}
          <Rect
            x={padding.left}
            y={padding.top}
            width={graphWidth}
            height={bandHeight}
            fill="#00D7FF"
            fillOpacity={0.06}
          />
          <Rect
            x={padding.left}
            y={padding.top + bandHeight}
            width={graphWidth}
            height={bandHeight}
            fill="#E8A830"
            fillOpacity={0.04}
          />
          <Rect
            x={padding.left}
            y={padding.top + bandHeight * 2}
            width={graphWidth}
            height={bandHeight}
            fill="#F44336"
            fillOpacity={0.06}
          />

          {/* Zone divider lines (dashed) */}
          <Line
            x1={padding.left}
            y1={padding.top + bandHeight}
            x2={padding.left + graphWidth}
            y2={padding.top + bandHeight}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <Line
            x1={padding.left}
            y1={padding.top + bandHeight * 2}
            x2={padding.left + graphWidth}
            y2={padding.top + bandHeight * 2}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
            strokeDasharray="3,3"
          />

          {/* Border lines */}
          <Line x1={padding.left} y1={padding.top} x2={padding.left + graphWidth} y2={padding.top} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <Line x1={padding.left} y1={padding.top + graphHeight} x2={padding.left + graphWidth} y2={padding.top + graphHeight} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
          <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + graphHeight} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />

          {/* Zone indicator circles (left side) - matches artifact: cx=16, cy at band centers */}
          <SvgCircle cx={16} cy={padding.top + bandHeight / 2} r={4} fill="#00D7FF" fillOpacity={0.9} />
          <SvgCircle cx={16} cy={padding.top + bandHeight * 1.5} r={4} fill="#E8A830" fillOpacity={0.9} />
          <SvgCircle cx={16} cy={padding.top + bandHeight * 2.5} r={4} fill="#F44336" fillOpacity={0.9} />

          {/* Zone labels (H/M/L) - matches artifact: x=6 */}
          <SvgText x={6} y={padding.top + bandHeight / 2 + 3} fill="#00D7FF" fontSize={7} fontWeight="600">H</SvgText>
          <SvgText x={6} y={padding.top + bandHeight * 1.5 + 3} fill="#E8A830" fontSize={7} fontWeight="600">M</SvgText>
          <SvgText x={6} y={padding.top + bandHeight * 2.5 + 3} fill="#F44336" fontSize={7} fontWeight="600">L</SvgText>

          {/* Area fill under curve - uses sampledData for smooth curves */}
          {sampledData.length > 0 && (
            <Path
              d={generateAreaPath(sampledData)}
              fill="url(#areaGradient)"
            />
          )}

          {/* Under-stroke (dark shadow) */}
          {sampledData.length > 0 && (
            <Path
              d={generateSmoothPath(sampledData)}
              stroke="#0a0b10"
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Main gradient stroke */}
          {sampledData.length > 0 && (
            <Path
              d={generateSmoothPath(sampledData)}
              stroke="url(#lineGradient)"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Multi-layer data point nodes - matches artifact exactly */}
          {keyPoints.map((point, idx) => (
            <React.Fragment key={`node-${idx}`}>
              {/* Outer dark ring */}
              <SvgCircle cx={point.x} cy={point.y} r={5} fill="#0a0b10" />
              {/* Inner colored core */}
              <SvgCircle cx={point.x} cy={point.y} r={3.5} fill={point.color} />
              {/* White highlight center */}
              <SvgCircle cx={point.x} cy={point.y} r={1.5} fill="white" fillOpacity={0.9} />
            </React.Fragment>
          ))}

          {/* X-axis labels */}
          {config.labels.map((label, i) => (
            <SvgText
              key={`xlabel-${i}`}
              x={labelPositions[i]}
              y={viewBoxHeight - 8}
              fill="rgba(255,255,255,0.6)"
              fontSize={9}
              fontWeight="500"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          ))}
        </Svg>
      </View>

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
            <Text style={styles.legendText}>Depleted</Text>
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
  chartCard: {
    backgroundColor: '#0a0b10',
    borderRadius: 4,
    padding: 8,
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
