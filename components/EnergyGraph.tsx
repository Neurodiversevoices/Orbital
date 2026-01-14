import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  G,
  Line,
  Circle,
  Text as SvgText,
  Rect,
} from 'react-native-svg';
import { CapacityLog, CapacityState } from '../types';
import { colors, spacing } from '../theme';
import { TimeRange, getTimeRangeMs } from './TimeRangeTabs';

const GRAPH_HEIGHT = 200;
const GRAPH_PADDING_TOP = 32;
const GRAPH_PADDING_BOTTOM = 32;
const GRAPH_PADDING_H = 16;
const GRAPH_PADDING_LEFT = 40; // Extra space for zone labels

const stateColors: Record<CapacityState, string> = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
};

// Convert state to Y value (0 = top, 1 = bottom)
const stateToValue = (state: CapacityState): number => {
  switch (state) {
    case 'resourced': return 0;
    case 'stretched': return 0.5;
    case 'depleted': return 1;
  }
};

interface CapacityGraphProps {
  logs: CapacityLog[];
  width: number;
  timeRange: TimeRange;
  /** Optional: override start date for calendar sync */
  startDate?: Date;
  /** Optional: override end date for calendar sync */
  endDate?: Date;
}

// Get aggregation bucket size based on time range
const getBucketSize = (range: TimeRange): number => {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  switch (range) {
    case '7d': return 6 * hour;       // 6-hour buckets
    case '30d': return day;           // Daily buckets
    case '90d': return 3 * day;       // 3-day buckets
    case '6m': return 7 * day;        // Weekly buckets
    case '1y': return 14 * day;       // Bi-weekly buckets
    case '10y': return 60 * day;      // Bi-monthly buckets
    default: return day;              // Fallback to daily
  }
};

// Format date labels based on time range
const formatDateLabel = (date: Date, range: TimeRange): string => {
  if (range === '7d') {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else if (range === '30d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (range === '90d') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (range === '6m') {
    return date.toLocaleDateString('en-US', { month: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
};

// Get number of date labels based on time range
const getDateLabelCount = (range: TimeRange): number => {
  switch (range) {
    case '7d': return 7;
    case '30d': return 5;
    case '90d': return 4;
    case '6m': return 4;
    case '1y': return 5;
    case '10y': return 5;
    default: return 4;
  }
};

export function EnergyGraph({ logs, width, timeRange, startDate, endDate }: CapacityGraphProps) {
  const graphWidth = width - GRAPH_PADDING_LEFT - GRAPH_PADDING_H;
  const graphHeight = GRAPH_HEIGHT - GRAPH_PADDING_TOP - GRAPH_PADDING_BOTTOM;

  const { points, pathData, dateLabels } = useMemo(() => {
    // Use custom date range if provided (for calendar sync), otherwise use timeRange from now
    const now = Date.now();
    const useCustomRange = startDate && endDate;
    const rangeMs = useCustomRange
      ? (endDate.getTime() - startDate.getTime())
      : getTimeRangeMs(timeRange);
    const startTime = useCustomRange ? startDate.getTime() : (now - rangeMs);
    const endTime = useCustomRange ? endDate.getTime() : now;
    const bucketSize = getBucketSize(timeRange);

    // Filter logs within time range
    const filteredLogs = logs.filter((log) =>
      log.timestamp >= startTime && log.timestamp < endTime
    );

    // Generate date labels
    const labelCount = getDateLabelCount(timeRange);
    const labels = [];
    for (let i = 0; i < labelCount; i++) {
      const labelTime = startTime + (i / (labelCount - 1)) * rangeMs;
      const x = GRAPH_PADDING_LEFT + (i / (labelCount - 1)) * graphWidth;
      labels.push({
        x,
        label: formatDateLabel(new Date(labelTime), timeRange),
      });
    }

    if (filteredLogs.length === 0) {
      return { points: [], pathData: '', dateLabels: labels };
    }

    // Aggregate logs into buckets (average value per bucket)
    const buckets: Map<number, { sum: number; count: number }> = new Map();

    filteredLogs.forEach((log) => {
      const bucketIndex = Math.floor((log.timestamp - startTime) / bucketSize);
      const value = stateToValue(log.state);

      if (buckets.has(bucketIndex)) {
        const bucket = buckets.get(bucketIndex)!;
        bucket.sum += value;
        bucket.count += 1;
      } else {
        buckets.set(bucketIndex, { sum: value, count: 1 });
      }
    });

    // Convert buckets to points
    const numBuckets = Math.ceil(rangeMs / bucketSize);
    const pts: { x: number; y: number; value: number }[] = [];

    // Sort bucket indices
    const sortedIndices = Array.from(buckets.keys()).sort((a, b) => a - b);

    sortedIndices.forEach((bucketIndex) => {
      const bucket = buckets.get(bucketIndex)!;
      const avgValue = bucket.sum / bucket.count;
      const x = GRAPH_PADDING_LEFT + (bucketIndex / numBuckets) * graphWidth;
      const y = GRAPH_PADDING_TOP + avgValue * graphHeight;
      pts.push({ x, y, value: avgValue });
    });

    // Create smooth bezier curve path
    let path = '';
    if (pts.length > 1) {
      path = `M ${pts[0].x} ${pts[0].y}`;

      for (let i = 0; i < pts.length - 1; i++) {
        const current = pts[i];
        const next = pts[i + 1];
        // Smooth bezier curve
        const cp1x = current.x + (next.x - current.x) * 0.4;
        const cp2x = current.x + (next.x - current.x) * 0.6;
        path += ` C ${cp1x} ${current.y}, ${cp2x} ${next.y}, ${next.x} ${next.y}`;
      }
    } else if (pts.length === 1) {
      // Single point - draw a small horizontal line
      path = `M ${pts[0].x - 10} ${pts[0].y} L ${pts[0].x + 10} ${pts[0].y}`;
    }

    return { points: pts, pathData: path, dateLabels: labels };
  }, [logs, graphWidth, graphHeight, timeRange, startDate, endDate]);

  const hasData = points.length > 0;

  // Get color based on Y value (0 = resourced/cyan, 0.5 = stretched/amber, 1 = depleted/red)
  const getColorForValue = (value: number): string => {
    if (value <= 0.25) return stateColors.resourced;
    if (value >= 0.75) return stateColors.depleted;
    return stateColors.stretched;
  };

  return (
    <View style={styles.container}>
      <Svg width={width} height={GRAPH_HEIGHT}>
        <Defs>
          {/* Vertical gradient for line color */}
          <LinearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#00E5FF" />
            <Stop offset="50%" stopColor="#E8A830" />
            <Stop offset="100%" stopColor="#F44336" />
          </LinearGradient>

          {/* Subtle area fill */}
          <LinearGradient id="areaFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#00E5FF" stopOpacity="0.15" />
            <Stop offset="50%" stopColor="#E8A830" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#F44336" stopOpacity="0.15" />
          </LinearGradient>
        </Defs>

        {/* Clean zone backgrounds */}
        <Rect
          x={GRAPH_PADDING_LEFT}
          y={GRAPH_PADDING_TOP}
          width={graphWidth}
          height={graphHeight / 3}
          fill="#00E5FF"
          opacity={0.04}
        />
        <Rect
          x={GRAPH_PADDING_LEFT}
          y={GRAPH_PADDING_TOP + graphHeight / 3}
          width={graphWidth}
          height={graphHeight / 3}
          fill="#E8A830"
          opacity={0.03}
        />
        <Rect
          x={GRAPH_PADDING_LEFT}
          y={GRAPH_PADDING_TOP + (graphHeight * 2) / 3}
          width={graphWidth}
          height={graphHeight / 3}
          fill="#F44336"
          opacity={0.04}
        />

        {/* Zone divider lines */}
        <Line
          x1={GRAPH_PADDING_LEFT}
          y1={GRAPH_PADDING_TOP + graphHeight / 3}
          x2={width - GRAPH_PADDING_H}
          y2={GRAPH_PADDING_TOP + graphHeight / 3}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <Line
          x1={GRAPH_PADDING_LEFT}
          y1={GRAPH_PADDING_TOP + (graphHeight * 2) / 3}
          x2={width - GRAPH_PADDING_H}
          y2={GRAPH_PADDING_TOP + (graphHeight * 2) / 3}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Top and bottom border */}
        <Line
          x1={GRAPH_PADDING_LEFT}
          y1={GRAPH_PADDING_TOP}
          x2={width - GRAPH_PADDING_H}
          y2={GRAPH_PADDING_TOP}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
        <Line
          x1={GRAPH_PADDING_LEFT}
          y1={GRAPH_PADDING_TOP + graphHeight}
          x2={width - GRAPH_PADDING_H}
          y2={GRAPH_PADDING_TOP + graphHeight}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />

        {/* Left axis line */}
        <Line
          x1={GRAPH_PADDING_LEFT}
          y1={GRAPH_PADDING_TOP}
          x2={GRAPH_PADDING_LEFT}
          y2={GRAPH_PADDING_TOP + graphHeight}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={1}
        />

        {/* Zone labels on left */}
        <Circle cx={14} cy={GRAPH_PADDING_TOP + graphHeight / 6} r={4} fill="#00E5FF" opacity={0.8} />
        <Circle cx={14} cy={GRAPH_PADDING_TOP + graphHeight / 2} r={4} fill="#E8A830" opacity={0.8} />
        <Circle cx={14} cy={GRAPH_PADDING_TOP + (graphHeight * 5) / 6} r={4} fill="#F44336" opacity={0.8} />

        {/* Empty state */}
        {!hasData && (
          <G>
            <Path
              d={`M ${GRAPH_PADDING_LEFT} ${GRAPH_PADDING_TOP + graphHeight / 2}
                  L ${width - GRAPH_PADDING_H} ${GRAPH_PADDING_TOP + graphHeight / 2}`}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
              strokeDasharray="8 8"
            />
            <SvgText
              x={width / 2}
              y={GRAPH_PADDING_TOP + graphHeight / 2 - 10}
              fontSize={11}
              fill="rgba(255,255,255,0.3)"
              textAnchor="middle"
            >
              No data for this period
            </SvgText>
          </G>
        )}

        {/* Area fill under curve */}
        {pathData && (
          <Path
            d={`${pathData} L ${points[points.length - 1]?.x || 0} ${GRAPH_PADDING_TOP + graphHeight} L ${points[0]?.x || 0} ${GRAPH_PADDING_TOP + graphHeight} Z`}
            fill="url(#areaFill)"
          />
        )}

        {/* Main data line - thicker for visibility */}
        {pathData && (
          <Path
            d={pathData}
            stroke="url(#lineGradient)"
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points - only show if not too many */}
        {points.length <= 50 && points.map((point, index) => (
          <G key={index}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={4}
              fill={getColorForValue(point.value)}
            />
            <Circle
              cx={point.x}
              cy={point.y}
              r={2}
              fill="white"
              opacity={0.9}
            />
          </G>
        ))}

        {/* Date labels */}
        {dateLabels.map((label, index) => (
          <SvgText
            key={index}
            x={label.x}
            y={GRAPH_HEIGHT - 12}
            fontSize={10}
            fill="rgba(255,255,255,0.5)"
            textAnchor="middle"
          >
            {label.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
});
