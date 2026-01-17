/**
 * CCISummaryChart — React Native Summary Chart Component
 *
 * Renders the 6-point summary chart using lib/cci/summaryChart.ts
 * as the SINGLE SOURCE OF TRUTH.
 *
 * This component uses renderSummaryChartSVG() directly via SvgXml
 * to ensure IDENTICAL output between app and PDF artifact.
 *
 * Visual Style:
 * - 6 downsampled data points
 * - Smooth Bezier curves with area fill
 * - Multi-layer node markers
 * - H/M/L zone indicators
 * - Oct/Nov/Dec x-axis labels
 * - Dark background with colored zones
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';

import {
  SUMMARY_CHART,
  CAPACITY_COLORS,
  renderSummaryChartSVG,
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
// COMPONENT
// =============================================================================

/**
 * CCISummaryChart uses renderSummaryChartSVG() from lib/cci/summaryChart.ts
 * as the single source of truth. This ensures the app preview and PDF artifact
 * render identically.
 */
export function CCISummaryChart({
  values,
  width: containerWidth,
  chartId = 'summary',
}: CCISummaryChartProps) {
  // Generate SVG string using the single source of truth
  const svgString = useMemo(
    () => renderSummaryChartSVG(values, {
      includeGradientDefs: true,
      gradientId: chartId,
    }),
    [values, chartId]
  );

  // Calculate display dimensions
  const { width: CHART_WIDTH, height: CHART_HEIGHT } = SUMMARY_CHART;
  const aspectRatio = CHART_WIDTH / CHART_HEIGHT;
  const displayWidth = containerWidth ?? CHART_WIDTH;
  const displayHeight = displayWidth / aspectRatio;

  return (
    <View style={styles.container}>
      <SvgXml
        xml={svgString}
        width={displayWidth}
        height={displayHeight}
      />
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
