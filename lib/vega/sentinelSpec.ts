/**
 * Vega-Lite Sentinel Chart Specification
 *
 * STATE FIRST. DATA SECOND.
 *
 * VISUAL HIERARCHY:
 * 1. ALERT WINDOW (rect) — dominates chart, contains the breach
 * 2. Volatility line — single thick line, no scatter points
 * 3. Baseline — dashed reference
 * 4. Annotation — single neutral label
 *
 * NON-NEGOTIABLE:
 * - ZERO scatter points
 * - Y-axis LOCKED 0–100 forever
 * - Alert window DOMINATES line curvature
 * - SVG renderer, actions off, tooltips off
 */

import { VolatilityDataPoint } from '../sentinel/types';

// =============================================================================
// TYPES
// =============================================================================

export interface VegaDataPoint {
  day: number;
  label: string;
  value: number;
  triggered: boolean;
}

export interface SentinelChartData {
  points: VegaDataPoint[];
  triggerDay: number | null;
  triggerAnnotation: string | null;
  baseline: number;
  cohortLabel: string;
  sampleSize: number;
}

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const COLORS = {
  // Background
  bgDark: '#0a1628',
  bgMid: '#0f1e32',

  // Alert window — DOMINANT visual element
  alertWindow: 'rgba(180, 140, 100, 0.15)',
  alertBorder: 'rgba(180, 140, 100, 0.4)',

  // Baseline bands — passive context only
  bandLow: 'rgba(120, 160, 130, 0.03)',
  bandModerate: 'rgba(160, 150, 120, 0.03)',
  bandHigh: 'rgba(160, 130, 130, 0.03)',

  // Line — single color, no gradient theatrics
  line: 'rgba(180, 170, 150, 0.7)',

  // Baseline reference
  baseline: 'rgba(255, 255, 255, 0.15)',

  // Text
  textPrimary: 'rgba(255, 255, 255, 0.75)',
  textSecondary: 'rgba(255, 255, 255, 0.45)',
  textMuted: 'rgba(255, 255, 255, 0.25)',

  // Grid
  gridLine: 'rgba(255, 255, 255, 0.03)',

  // Annotation
  annotationText: 'rgba(255, 255, 255, 0.45)',
};

// =============================================================================
// THRESHOLDS (LOCKED FOREVER)
// =============================================================================

export const THRESHOLDS = {
  yMin: 0,
  yMax: 100,
  low: 33,
  moderate: 66,
  baseline: 50,
  trigger: 60,
};

// =============================================================================
// SPEC GENERATOR
// =============================================================================

/**
 * Convert VolatilityDataPoint[] to VegaDataPoint[]
 */
export function convertToVegaData(points: VolatilityDataPoint[]): VegaDataPoint[] {
  return points.map((p) => ({
    day: p.dayOffset,
    label: p.dayOffset === 0 ? 'NOW' : `${p.dayOffset}`,
    value: p.value,
    triggered: p.exceedsBaseline,
  }));
}

/**
 * Generate the Vega-Lite specification for Sentinel chart
 *
 * NON-NEGOTIABLE:
 * - ZERO scatter points
 * - Alert window DOMINATES
 * - Y-axis LOCKED 0–100
 */
export function generateSentinelSpec(data: SentinelChartData): object {
  const { points, triggerDay, triggerAnnotation, baseline } = data;

  const minDay = Math.min(...points.map((p) => p.day));
  const maxDay = 0;

  // Find alert window bounds (days where triggered)
  const triggeredDays = points.filter((p) => p.triggered).map((p) => p.day);
  const alertStart = triggeredDays.length > 0 ? Math.min(...triggeredDays) : null;
  const alertEnd = triggeredDays.length > 0 ? Math.max(...triggeredDays) : null;

  // Alert window data — DOMINANT visual element
  const alertWindowData =
    alertStart !== null && alertEnd !== null
      ? [{ x: alertStart, x2: alertEnd, y: THRESHOLDS.trigger, y2: THRESHOLDS.yMax }]
      : [];

  // Annotation data
  const annotationData =
    triggerDay !== null && triggerAnnotation
      ? [{ day: triggerDay, text: triggerAnnotation, value: 75 }]
      : [];

  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 160,
    padding: { left: 40, right: 60, top: 24, bottom: 32 },
    background: COLORS.bgDark,
    config: {
      view: { stroke: null },
      axis: {
        labelColor: COLORS.textMuted,
        titleColor: COLORS.textMuted,
        gridColor: COLORS.gridLine,
        domainColor: 'transparent',
        tickColor: 'transparent',
        labelFont: 'system-ui, -apple-system, sans-serif',
        titleFont: 'system-ui, -apple-system, sans-serif',
        labelFontSize: 8,
        titleFontSize: 8,
      },
      legend: { disable: true },
      title: {
        color: COLORS.textSecondary,
        font: 'system-ui, -apple-system, sans-serif',
        fontSize: 9,
        fontWeight: 400,
      },
    },
    title: {
      text: 'VOLATILITY CONDITION RELATIVE TO BASELINE',
      anchor: 'start',
      offset: 6,
    },
    layer: [
      // Layer 1: Background bands — passive context
      {
        data: {
          values: [
            { y: 0, y2: THRESHOLDS.low, color: COLORS.bandLow },
            { y: THRESHOLDS.low, y2: THRESHOLDS.moderate, color: COLORS.bandModerate },
            { y: THRESHOLDS.moderate, y2: THRESHOLDS.yMax, color: COLORS.bandHigh },
          ],
        },
        mark: { type: 'rect', opacity: 1 },
        encoding: {
          y: { field: 'y', type: 'quantitative', scale: { domain: [THRESHOLDS.yMin, THRESHOLDS.yMax] } },
          y2: { field: 'y2' },
          color: { field: 'color', type: 'nominal', scale: null },
        },
      },
      // Layer 2: ALERT WINDOW — DOMINANT visual (before line)
      ...(alertWindowData.length > 0
        ? [
            {
              data: { values: alertWindowData },
              mark: {
                type: 'rect',
                opacity: 1,
                stroke: COLORS.alertBorder,
                strokeWidth: 1,
              },
              encoding: {
                x: { field: 'x', type: 'quantitative', scale: { domain: [minDay, maxDay] } },
                x2: { field: 'x2' },
                y: { field: 'y', type: 'quantitative' },
                y2: { field: 'y2' },
                color: { value: COLORS.alertWindow },
              },
            },
          ]
        : []),
      // Layer 3: Baseline reference line
      {
        data: { values: [{ baseline }] },
        mark: {
          type: 'rule',
          strokeDash: [4, 4],
          strokeWidth: 1,
          opacity: 0.5,
        },
        encoding: {
          y: { field: 'baseline', type: 'quantitative' },
          color: { value: COLORS.baseline },
        },
      },
      // Layer 4: Volatility line — ONE thick line, NO points
      {
        data: { values: points },
        mark: {
          type: 'line',
          interpolate: 'monotone',
          strokeWidth: 2.5,
          strokeCap: 'round',
        },
        encoding: {
          x: {
            field: 'day',
            type: 'quantitative',
            scale: { domain: [minDay, maxDay] },
            axis: {
              title: null,
              format: 'd',
              tickCount: 7,
              labelExpr: "datum.value === 0 ? 'NOW' : datum.value",
            },
          },
          y: {
            field: 'value',
            type: 'quantitative',
            scale: { domain: [THRESHOLDS.yMin, THRESHOLDS.yMax] },
            axis: { title: null, tickCount: 5 },
          },
          color: { value: COLORS.line },
        },
      },
      // Layer 5: Annotation — single neutral label
      ...(annotationData.length > 0
        ? [
            {
              data: { values: annotationData },
              mark: {
                type: 'text',
                align: 'left',
                baseline: 'bottom',
                dx: 4,
                dy: -4,
                fontSize: 8,
                fontWeight: 400,
              },
              encoding: {
                x: { field: 'day', type: 'quantitative' },
                y: { field: 'value', type: 'quantitative' },
                text: { field: 'text' },
                color: { value: COLORS.annotationText },
              },
            },
          ]
        : []),
    ],
  };

  return spec;
}

/**
 * Generate spec (alias for compatibility)
 */
export function generateSentinelSpecMinimal(data: SentinelChartData): object {
  return generateSentinelSpec(data);
}
