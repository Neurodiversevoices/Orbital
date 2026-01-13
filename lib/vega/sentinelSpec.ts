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
// COLOR PALETTE — BOARDROOM READABLE
// =============================================================================

export const COLORS = {
  // Background
  bgDark: '#0a1628',
  bgMid: '#0f1e32',
  bgPanel: 'rgba(20, 35, 55, 0.85)',

  // Alert window — DOMINANT visual element
  alertWindow: 'rgba(180, 140, 100, 0.18)',
  alertBorder: 'rgba(200, 160, 120, 0.5)',

  // Baseline bands — passive context only
  bandLow: 'rgba(120, 160, 130, 0.04)',
  bandModerate: 'rgba(160, 150, 120, 0.04)',
  bandHigh: 'rgba(160, 130, 130, 0.04)',

  // Line — ONE solid neutral color (no gradients, no color changes)
  lineNeutral: 'rgba(220, 225, 235, 0.85)',

  // Baseline reference
  baseline: 'rgba(255, 255, 255, 0.35)',

  // Text — HIGH CONTRAST for projectors
  textHeading: 'rgba(240, 245, 255, 0.92)',
  textPrimary: 'rgba(230, 238, 250, 0.88)',
  textSecondary: 'rgba(210, 220, 235, 0.78)',
  textMuted: 'rgba(180, 195, 215, 0.60)',

  // Grid — visible but not dominant
  gridLine: 'rgba(255, 255, 255, 0.08)',

  // Axis labels — clearly readable
  axisLabel: 'rgba(200, 210, 230, 0.72)',

  // Annotation
  annotationText: 'rgba(220, 230, 245, 0.70)',
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
 * CLEAN, CALM, DEFENSIBLE.
 *
 * NON-NEGOTIABLE:
 * - ONE solid neutral color line (no gradients, no color changes)
 * - ZERO scatter points / dots
 * - ONE dashed baseline
 * - ONE alert window (subtle, contextual)
 * - Y-axis LOCKED 0–100 forever
 * - SVG renderer, actions off, tooltips off
 */
export function generateSentinelSpec(data: SentinelChartData): object {
  const { points, triggerDay, triggerAnnotation, baseline } = data;

  const minDay = Math.min(...points.map((p) => p.day));
  const maxDay = 0;

  // Find alert window bounds (days where triggered)
  const triggeredDays = points.filter((p) => p.triggered).map((p) => p.day);
  const alertStart = triggeredDays.length > 0 ? Math.min(...triggeredDays) : null;
  const alertEnd = triggeredDays.length > 0 ? Math.max(...triggeredDays) : null;

  // Alert window — ONE rectangular band, subtle fill
  const alertWindowData =
    alertStart !== null && alertEnd !== null
      ? [{ x: alertStart, x2: alertEnd, y: THRESHOLDS.trigger, y2: THRESHOLDS.yMax }]
      : [];

  // Annotation — ONE only: "Sentinel Triggered — Day X"
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
        labelColor: COLORS.axisLabel,
        titleColor: COLORS.textSecondary,
        gridColor: COLORS.gridLine,
        domainColor: 'transparent',
        tickColor: 'transparent',
        labelFont: 'system-ui, -apple-system, sans-serif',
        titleFont: 'system-ui, -apple-system, sans-serif',
        labelFontSize: 10,
        titleFontSize: 10,
      },
      legend: { disable: true },
      title: {
        color: COLORS.textHeading,
        font: 'system-ui, -apple-system, sans-serif',
        fontSize: 11,
        fontWeight: 500,
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
      // Layer 2: ALERT WINDOW — ONE rectangular band, subtle fill
      ...(alertWindowData.length > 0
        ? [
            {
              data: { values: alertWindowData },
              mark: {
                type: 'rect',
                opacity: 0.12,
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
      // Layer 3: ONE dashed baseline line
      {
        data: { values: [{ baseline }] },
        mark: {
          type: 'rule',
          strokeDash: [4, 4],
          strokeWidth: 1.5,
          opacity: 0.5,
        },
        encoding: {
          y: { field: 'baseline', type: 'quantitative' },
          color: { value: COLORS.baseline },
        },
      },
      // Layer 4: ONE solid neutral color line (NO dots, NO color changes)
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
          color: { value: COLORS.lineNeutral },
        },
      },
      // Layer 5: ONE annotation only — "Sentinel Triggered — Day X"
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
                fontSize: 9,
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
