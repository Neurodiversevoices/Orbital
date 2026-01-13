/**
 * Sentinel Chart Component
 *
 * SVG-based volatility chart for Sentinel demo.
 * Matches the reference image layout: title bar, axes labels, baseline bands, trigger callout.
 *
 * GOVERNANCE:
 * - Chart is generated, not static
 * - Cohort selection changes underlying series
 * - Demo-only: no real data displayed
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Line,
  Rect,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import { VolatilityDataPoint, SystemState } from '../lib/sentinel/types';
import { colors, spacing, borderRadius } from '../theme';

// =============================================================================
// TYPES
// =============================================================================

interface SentinelChartProps {
  /** Data points to display */
  points: VolatilityDataPoint[];
  /** Baseline threshold */
  baseline: number;
  /** Upper warning band */
  upperBand: number;
  /** System state for styling */
  systemState: SystemState;
  /** Consecutive days above baseline */
  consecutiveDays: number;
  /** Chart title */
  title?: string;
  /** Chart height */
  height?: number;
  /** Accent color */
  accentColor?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const CHART_PADDING = { top: 20, right: 65, bottom: 40, left: 45 };
const DEFAULT_HEIGHT = 220;

// Colors matching reference design (assets/sentinel-demo.png)
const COLORS = {
  // Background
  bgDark: '#0a1628',
  bgMid: '#0f1e32',
  bgPanel: 'rgba(10, 22, 40, 0.85)',
  bgPanelBorder: 'rgba(255, 255, 255, 0.08)',
  // Gradient colors (green → amber → red)
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  // Text
  white: '#ffffff',
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  textDim: 'rgba(255, 255, 255, 0.35)',
  // Chart elements
  baseline: 'rgba(255, 255, 255, 0.3)',
  grid: 'rgba(255, 255, 255, 0.06)',
  trigger: '#f59e0b',
  critical: '#ef4444',
  cyanAccent: 'rgba(34, 211, 238, 0.7)',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create SVG path from data points
 */
function createPath(
  points: VolatilityDataPoint[],
  width: number,
  height: number,
  chartHeight: number
): string {
  if (points.length === 0) return '';

  const xScale = width / (points.length - 1);
  const yScale = chartHeight / 100;

  const pathParts = points.map((point, index) => {
    const x = index * xScale;
    const y = chartHeight - point.value * yScale;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  return pathParts.join(' ');
}

/**
 * Create area fill path
 */
function createAreaPath(
  points: VolatilityDataPoint[],
  width: number,
  height: number,
  chartHeight: number
): string {
  if (points.length === 0) return '';

  const linePath = createPath(points, width, height, chartHeight);
  const xScale = width / (points.length - 1);

  // Close the path by going to bottom right, bottom left, and back to start
  return `${linePath} L ${(points.length - 1) * xScale} ${chartHeight} L 0 ${chartHeight} Z`;
}

/**
 * Format day offset as label
 */
function formatDayLabel(dayOffset: number): string {
  if (dayOffset === 0) return 'Today';
  return `${dayOffset}d`;
}

/**
 * Get system state description for bottom panel
 */
function getStateDescription(state: SystemState, consecutiveDays: number): string {
  switch (state) {
    case 'critical':
      return 'Critical volatility threshold exceeded';
    case 'sustained_volatility':
      return 'Sustained volatility detected';
    case 'elevated':
      return 'Elevated activity observed';
    default:
      return 'Within normal parameters';
  }
}

/**
 * Get assessment bullet points based on state
 */
function getAssessmentBullets(state: SystemState): string[] {
  switch (state) {
    case 'critical':
    case 'sustained_volatility':
      return [
        'Sustained deviation from historical baseline',
        'Increased probability of downstream disruption',
        'Signal is aggregate and non-identifying',
      ];
    case 'elevated':
      return [
        'Activity above typical range',
        'Monitoring for sustained patterns',
        'Signal is aggregate and non-identifying',
      ];
    default:
      return [
        'Activity within expected range',
        'No action required at this time',
        'Signal is aggregate and non-identifying',
      ];
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SentinelChart({
  points,
  baseline,
  upperBand,
  systemState,
  consecutiveDays,
  title,
  height = DEFAULT_HEIGHT,
  accentColor = COLORS.cyanAccent,
}: SentinelChartProps) {
  const chartWidth = 320; // Will scale with container
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const innerWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right;

  // Compute paths
  const { linePath, areaPath, triggerPath } = useMemo(() => {
    const linePath = createPath(points, innerWidth, height, chartHeight);
    const areaPath = createAreaPath(points, innerWidth, height, chartHeight);

    // Find trigger segments (consecutive points above baseline)
    let triggerPath = '';
    let inTrigger = false;
    const xScale = innerWidth / (points.length - 1);
    const yScale = chartHeight / 100;

    points.forEach((point, index) => {
      const x = index * xScale;
      const y = chartHeight - point.value * yScale;

      if (point.exceedsBaseline) {
        if (!inTrigger) {
          triggerPath += `M ${x.toFixed(1)} ${y.toFixed(1)} `;
          inTrigger = true;
        } else {
          triggerPath += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
        }
      } else {
        inTrigger = false;
      }
    });

    return { linePath, areaPath, triggerPath };
  }, [points, innerWidth, height, chartHeight]);

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100];

  // X-axis labels (show every 3rd day)
  const xLabels = useMemo(() => {
    const labels: { offset: number; label: string }[] = [];
    for (let i = 0; i < points.length; i += 3) {
      labels.push({
        offset: points[i].dayOffset,
        label: formatDayLabel(points[i].dayOffset),
      });
    }
    // Always include "Today"
    if (points.length > 0 && points[points.length - 1].dayOffset === 0) {
      const lastLabel = labels[labels.length - 1];
      if (lastLabel?.offset !== 0) {
        labels.push({ offset: 0, label: 'Today' });
      }
    }
    return labels;
  }, [points]);

  // State-based styling
  const stateColor = useMemo(() => {
    switch (systemState) {
      case 'critical':
        return COLORS.critical;
      case 'sustained_volatility':
        return COLORS.trigger;
      case 'elevated':
        return COLORS.trigger;
      default:
        return accentColor;
    }
  }, [systemState, accentColor]);

  const triggerLabel = useMemo(() => {
    if (systemState === 'sustained_volatility' || systemState === 'critical') {
      return `Sentinel Triggered — Day ${consecutiveDays}`;
    }
    if (systemState === 'elevated') {
      return `Elevated — ${consecutiveDays} days`;
    }
    return null;
  }, [systemState, consecutiveDays]);

  // Panel content
  const stateDescription = getStateDescription(systemState, consecutiveDays);
  const assessmentBullets = getAssessmentBullets(systemState);

  return (
    <View style={styles.container}>
      {/* Title */}
      {title && <Text style={styles.title}>{title}</Text>}

      {/* Trigger callout */}
      {triggerLabel && (
        <View style={[styles.triggerCallout, { borderColor: stateColor }]}>
          <View style={[styles.triggerDot, { backgroundColor: stateColor }]} />
          <Text style={[styles.triggerText, { color: stateColor }]}>{triggerLabel}</Text>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
          <Defs>
            {/* Three-color gradient for area fill (green → amber → red) */}
            <LinearGradient id="areaGradient" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0%" stopColor={COLORS.green} stopOpacity={0.8} />
              <Stop offset="50%" stopColor={COLORS.amber} stopOpacity={0.7} />
              <Stop offset="100%" stopColor={COLORS.red} stopOpacity={0.6} />
            </LinearGradient>

            {/* Line gradient (follows same color scheme) */}
            <LinearGradient id="lineGradient" x1="0" y1="1" x2="0" y2="0">
              <Stop offset="0%" stopColor={COLORS.green} stopOpacity={1} />
              <Stop offset="50%" stopColor={COLORS.amber} stopOpacity={1} />
              <Stop offset="100%" stopColor={COLORS.red} stopOpacity={1} />
            </LinearGradient>
          </Defs>

          <G transform={`translate(${CHART_PADDING.left}, ${CHART_PADDING.top})`}>
            {/* Grid lines */}
            {yLabels.map((value) => {
              const y = chartHeight - (value / 100) * chartHeight;
              return (
                <Line
                  key={`grid-${value}`}
                  x1={0}
                  y1={y}
                  x2={innerWidth}
                  y2={y}
                  stroke={COLORS.grid}
                  strokeWidth={1}
                />
              );
            })}

            {/* Band labels on right side */}
            <SvgText
              x={innerWidth + 8}
              y={chartHeight * 0.15}
              fill={COLORS.textDim}
              fontSize={9}
              textAnchor="start"
            >
              HIGH
            </SvgText>
            <SvgText
              x={innerWidth + 8}
              y={chartHeight * 0.5}
              fill={COLORS.textDim}
              fontSize={9}
              textAnchor="start"
            >
              MODERATE
            </SvgText>
            <SvgText
              x={innerWidth + 8}
              y={chartHeight * 0.85}
              fill={COLORS.textDim}
              fontSize={9}
              textAnchor="start"
            >
              LOW
            </SvgText>

            {/* Baseline */}
            <Line
              x1={0}
              y1={chartHeight - (baseline / 100) * chartHeight}
              x2={innerWidth}
              y2={chartHeight - (baseline / 100) * chartHeight}
              stroke={COLORS.baseline}
              strokeWidth={1.5}
              strokeDasharray="4,4"
            />

            {/* Area fill */}
            <Path d={areaPath} fill="url(#areaGradient)" />

            {/* Main line */}
            <Path
              d={linePath}
              stroke={accentColor}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Trigger line (above baseline) */}
            {triggerPath && (
              <Path
                d={triggerPath}
                stroke={stateColor}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Current value dot */}
            {points.length > 0 && (
              <Circle
                cx={innerWidth}
                cy={chartHeight - (points[points.length - 1].value / 100) * chartHeight}
                r={4}
                fill={points[points.length - 1].exceedsBaseline ? stateColor : accentColor}
              />
            )}

            {/* Y-axis labels */}
            {yLabels.map((value) => {
              const y = chartHeight - (value / 100) * chartHeight;
              return (
                <SvgText
                  key={`y-label-${value}`}
                  x={-8}
                  y={y + 4}
                  fill={COLORS.textMuted}
                  fontSize={10}
                  textAnchor="end"
                >
                  {value}
                </SvgText>
              );
            })}

            {/* X-axis labels */}
            {xLabels.map((item, index) => {
              const pointIndex = points.findIndex((p) => p.dayOffset === item.offset);
              if (pointIndex === -1) return null;
              const x = (pointIndex / (points.length - 1)) * innerWidth;
              return (
                <SvgText
                  key={`x-label-${index}`}
                  x={x}
                  y={chartHeight + 20}
                  fill={COLORS.textMuted}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {item.label}
                </SvgText>
              );
            })}
          </G>

          {/* Y-axis title */}
          <SvgText
            x={12}
            y={height / 2}
            fill={COLORS.textSecondary}
            fontSize={10}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${height / 2})`}
          >
            Volatility Index
          </SvgText>
        </Svg>
      </View>

      {/* Bottom panels */}
      <View style={styles.panelsRow}>
        {/* SYSTEM STATE panel */}
        <View style={styles.panel}>
          <Text style={[styles.panelTitle, { color: stateColor }]}>
            SYSTEM STATE: {stateDescription}
          </Text>
          <Text style={styles.panelSubtext}>
            {consecutiveDays} consecutive days above baseline
          </Text>
        </View>

        {/* ASSESSMENT panel */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>ASSESSMENT</Text>
          {assessmentBullets.map((bullet, idx) => (
            <Text key={idx} style={styles.bulletText}>• {bullet}</Text>
          ))}
        </View>
      </View>

      {/* Footer disclaimer */}
      <Text style={styles.footerDisclaimer}>
        Illustrative aggregate-level capacity intelligence view. No personal data is tracked or collected.
      </Text>
    </View>
  );
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
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: COLORS.bgDark,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.bgPanelBorder,
    overflow: 'hidden',
  },
  triggerCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,152,0,0.1)',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: spacing.sm,
  },
  triggerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  panelsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  panel: {
    flex: 1,
    backgroundColor: COLORS.bgPanel,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: COLORS.bgPanelBorder,
    padding: spacing.md,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  panelSubtext: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  bulletText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  footerDisclaimer: {
    fontSize: 9,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
});

export default SentinelChart;
