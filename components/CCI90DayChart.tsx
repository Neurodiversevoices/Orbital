/**
 * CCI90DayChart — Unified 90-Day Clinical Capacity Chart
 *
 * SINGLE SOURCE OF TRUTH for all CCI chart rendering.
 *
 * This component renders BOTH:
 * - Individual CCI (1 series)
 * - Circle CCI (5 series)
 *
 * They are PIXEL-IDENTICAL except for the number of lines.
 *
 * DOCTRINE:
 * - Uses locked spec from lib/charts/capacityOverTime90d
 * - No CCI-specific or Circle-specific rendering code
 * - Data input only, no styling configuration
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
  G,
} from 'react-native-svg';

import {
  generateChartProps,
  dayToX,
  valueToY,
  type CCI90DayChartData,
  type CCISeriesData,
  CCI_DAYS,
  CCI_SERIES_COLORS,
  CCI_STATE_COLORS,
} from '../lib/charts';

// =============================================================================
// TYPES
// =============================================================================

export interface CCI90DayChartProps {
  /** Chart data (1 series for Individual, 5 for Circle) */
  data: CCI90DayChartData;
  /** Optional width override (default uses spec width) */
  width?: number;
  /** Show disclaimer footer */
  showDisclaimer?: boolean;
  /** Chart title (optional) */
  title?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CCI90DayChart({
  data,
  width: containerWidth,
  showDisclaimer = true,
  title,
}: CCI90DayChartProps) {
  // DEBUG: Verify component is rendering
  console.log('[CCI90DayChart] Rendering with data:', data?.series?.length, 'series');

  // Generate all chart props from the unified spec
  let props;
  try {
    props = generateChartProps(data);
  } catch (err) {
    console.error('[CCI90DayChart] generateChartProps error:', err);
    return (
      <View style={styles.container}>
        <Text style={{ color: 'red', padding: 20 }}>Chart Error: {String(err)}</Text>
      </View>
    );
  }

  // Calculate aspect ratio for responsive rendering
  const aspectRatio = props.width / props.height;
  const displayWidth = containerWidth ?? props.width;
  const displayHeight = displayWidth / aspectRatio;

  // Scale factor for responsive viewBox
  const viewBox = `0 0 ${props.width} ${props.height}`;

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}

      <Svg
        width={displayWidth}
        height={displayHeight}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <Rect
          x={0}
          y={0}
          width={props.width}
          height={props.height}
          fill={props.colors.background}
        />

        {/* Background bands (Resourced, Stretched, Depleted) */}
        {props.bands.map((band) => (
          <Rect
            key={band.id}
            x={props.padding.left}
            y={band.y}
            width={props.width - props.padding.left - props.padding.right}
            height={band.height}
            fill={band.color}
          />
        ))}

        {/* Horizontal grid lines */}
        {props.gridLines.map((line) => (
          <G key={`grid-${line.value}`}>
            <Line
              x1={props.padding.left}
              y1={line.y}
              x2={props.width - props.padding.right}
              y2={line.y}
              stroke={props.colors.grid}
              strokeWidth={1}
            />
            {/* Y-axis labels */}
            <SvgText
              x={props.padding.left - 8}
              y={line.y + 4}
              fill={props.colors.axisLabel}
              fontSize={11}
              fontWeight="400"
              textAnchor="end"
            >
              {line.label}
            </SvgText>
          </G>
        ))}

        {/* X-axis ticks and labels */}
        {props.xTicks.map((tick) => (
          <G key={`xtick-${tick.day}`}>
            <Line
              x1={tick.x}
              y1={props.height - props.padding.bottom}
              x2={tick.x}
              y2={props.height - props.padding.bottom + 4}
              stroke={props.colors.axis}
              strokeWidth={1}
            />
            <SvgText
              x={tick.x}
              y={props.height - props.padding.bottom + 18}
              fill={props.colors.axisLabel}
              fontSize={11}
              fontWeight="400"
              textAnchor="middle"
            >
              {tick.label}
            </SvgText>
          </G>
        ))}

        {/* Series lines */}
        {props.seriesPaths.map((series) => (
          <Path
            key={`line-${series.id}`}
            d={series.path}
            stroke={series.color}
            strokeWidth={props.lineStyle.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={props.lineStyle.opacity}
          />
        ))}

        {/* Data points (dots at weekly intervals) */}
        {props.series.map((series) =>
          series.values.map((value, dayIndex) => {
            // Only draw dots at weekly intervals to avoid clutter
            if (dayIndex % 7 !== 0 && dayIndex !== series.values.length - 1) {
              return null;
            }

            const x = dayToX(dayIndex);
            const y = valueToY(value);

            return (
              <SvgCircle
                key={`dot-${series.id}-${dayIndex}`}
                cx={x}
                cy={y}
                r={props.lineStyle.dotRadius}
                fill={series.color}
              />
            );
          })
        )}
      </Svg>

      {/* Legend (only for multi-series / Circle CCI) */}
      {props.showLegend && props.series.length > 1 && (
        <View style={styles.legend}>
          {props.series.map((series) => (
            <View key={series.id} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: series.color }]}
              />
              <Text style={styles.legendText}>{series.label}</Text>
            </View>
          ))}
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
// CONVENIENCE WRAPPERS
// =============================================================================

export interface IndividualCCIChartProps {
  /** Capacity values for 90 days (0-100 range) */
  values: number[];
  /** User label (default: "You") */
  label?: string;
  /** Optional width override */
  width?: number;
  /** Show disclaimer */
  showDisclaimer?: boolean;
  /** Title */
  title?: string;
}

/**
 * Individual CCI Chart — 1 series, 90 days
 */
export function IndividualCCIChart({
  values,
  label = 'You',
  width,
  showDisclaimer,
  title,
}: IndividualCCIChartProps) {
  // Validate 90 days of data
  if (values.length !== CCI_DAYS) {
    console.warn(
      `IndividualCCIChart expects ${CCI_DAYS} values, got ${values.length}`
    );
  }

  const data: CCI90DayChartData = {
    series: [
      {
        id: 'individual',
        label,
        color: CCI_STATE_COLORS.resourced,
        values: values.slice(0, CCI_DAYS),
      },
    ],
    showLegend: false,
  };

  return (
    <CCI90DayChart
      data={data}
      width={width}
      showDisclaimer={showDisclaimer}
      title={title}
    />
  );
}

export interface CircleCCIChartProps {
  /** Array of 5 members with their capacity data */
  members: Array<{
    id: string;
    label: string;
    values: number[];
  }>;
  /** Optional width override */
  width?: number;
  /** Show disclaimer */
  showDisclaimer?: boolean;
  /** Title */
  title?: string;
}

/**
 * Circle CCI Chart — 5 series, 90 days
 */
export function CircleCCIChart({
  members,
  width,
  showDisclaimer,
  title,
}: CircleCCIChartProps) {
  // Validate 5 members
  if (members.length !== 5) {
    console.warn(`CircleCCIChart expects 5 members, got ${members.length}`);
  }

  const data: CCI90DayChartData = {
    series: members.slice(0, 5).map((member, index) => ({
      id: member.id,
      label: member.label,
      color: CCI_SERIES_COLORS[index],
      values: member.values.slice(0, CCI_DAYS),
    })),
    showLegend: true,
  };

  return (
    <CCI90DayChart
      data={data}
      width={width}
      showDisclaimer={showDisclaimer}
      title={title}
    />
  );
}

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * Convert legacy 1-3 scale capacity data to 0-100 scale
 */
export function convertLegacyCapacityData(
  legacyValues: number[]
): number[] {
  return legacyValues.map((v) => ((v - 1) / 2) * 100);
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
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
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
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default CCI90DayChart;
