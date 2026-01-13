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

import { VolatilityDataPoint, SentinelRenderMode, RENDER_MODES } from '../sentinel/types';

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
  /** Render mode from SentinelState — controls all visual aspects */
  renderMode: SentinelRenderMode;
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

  // Data-driven line colors (cyan → amber → red)
  lineCyan: 'rgba(34, 211, 238, 0.9)',    // Calm: <= lowThreshold
  lineAmber: 'rgba(245, 180, 60, 0.9)',   // Warning: low < x <= high
  lineRed: 'rgba(248, 113, 113, 0.9)',    // Breach: > highThreshold

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
 * STATE FIRST. RENDER MODE CONTRACT.
 *
 * NON-NEGOTIABLE:
 * - ZERO scatter points (no point marks)
 * - Alert window DOMINATES (controlled by renderMode)
 * - Y-axis LOCKED 0–100 forever
 * - Line color driven by renderMode (pre/post trigger)
 * - SVG renderer, actions off, tooltips off
 */
export function generateSentinelSpec(data: SentinelChartData): object {
  const { points, triggerDay, triggerAnnotation, baseline, renderMode } = data;

  const minDay = Math.min(...points.map((p) => p.day));
  const maxDay = 0;

  // Find alert window bounds (days where triggered)
  const triggeredDays = points.filter((p) => p.triggered).map((p) => p.day);
  const alertStart = triggeredDays.length > 0 ? Math.min(...triggeredDays) : null;
  const alertEnd = triggeredDays.length > 0 ? Math.max(...triggeredDays) : null;

  // Alert window — controlled by renderMode (CALM = no window)
  const showAlertWindow = renderMode.alertWindowPresent && alertStart !== null && alertEnd !== null;
  const alertWindowData = showAlertWindow
    ? [{ x: alertStart, x2: alertEnd, y: THRESHOLDS.trigger, y2: THRESHOLDS.yMax }]
    : [];

  // Annotation — controlled by renderMode.showAnnotation
  const annotationData =
    renderMode.showAnnotation && triggerDay !== null && triggerAnnotation
      ? [{ day: triggerDay, text: triggerAnnotation, value: 75 }]
      : [];

  // Build line layers — STATE-DRIVEN coloring
  // Pre-trigger segments (before triggerDay or all if no trigger)
  // Post-trigger segments (after triggerDay, breach only)
  const lineLayers = buildStateLineLayers(points, minDay, maxDay, triggerDay, renderMode);

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
      // Layer 2: ALERT WINDOW — DOMINANT visual (state-controlled)
      ...(alertWindowData.length > 0
        ? [
            {
              data: { values: alertWindowData },
              mark: {
                type: 'rect',
                opacity: renderMode.alertWindowOpacity,
                stroke: COLORS.alertBorder,
                strokeWidth: 1.5,
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
      // Layer 3: Baseline reference line (always present)
      {
        data: { values: [{ baseline }] },
        mark: {
          type: 'rule',
          strokeDash: [4, 4],
          strokeWidth: 1.5,
          opacity: 0.6,
        },
        encoding: {
          y: { field: 'baseline', type: 'quantitative' },
          color: { value: COLORS.baseline },
        },
      },
      // Layer 4: State-driven line segments (NO POINTS)
      ...lineLayers,
      // Layer 5: Annotation — exactly one, state-controlled
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
                fontWeight: 500,
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
 * Build state-driven line layers
 *
 * For BREACH_CONFIRMED:
 *   - Pre-trigger points: lineColorPre (amber)
 *   - Post-trigger points: lineColorPost (red)
 *
 * For other states:
 *   - All points: lineColorPre (single color)
 */
function buildStateLineLayers(
  points: VegaDataPoint[],
  minDay: number,
  maxDay: number,
  triggerDay: number | null,
  renderMode: SentinelRenderMode
): object[] {
  const baseEncoding = {
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
  };

  const baseMark = {
    type: 'line',
    interpolate: 'monotone',
    strokeWidth: 2.5,
    strokeCap: 'round',
  };

  // If no trigger day or colors are same, render single line
  if (triggerDay === null || renderMode.lineColorPre === renderMode.lineColorPost) {
    return [
      {
        data: { values: points },
        mark: baseMark,
        encoding: {
          ...baseEncoding,
          color: { value: renderMode.lineColorPre },
        },
      },
    ];
  }

  // Split into pre-trigger and post-trigger segments
  const prePoints = points.filter((p) => p.day < triggerDay);
  const postPoints = points.filter((p) => p.day >= triggerDay);

  const layers: object[] = [];

  // Pre-trigger segment (amber)
  if (prePoints.length > 0) {
    layers.push({
      data: { values: prePoints },
      mark: baseMark,
      encoding: {
        x: {
          field: 'day',
          type: 'quantitative',
          scale: { domain: [minDay, maxDay] },
        },
        y: {
          field: 'value',
          type: 'quantitative',
          scale: { domain: [THRESHOLDS.yMin, THRESHOLDS.yMax] },
        },
        color: { value: renderMode.lineColorPre },
      },
    });
  }

  // Post-trigger segment (red)
  if (postPoints.length > 0) {
    layers.push({
      data: { values: postPoints },
      mark: baseMark,
      encoding: {
        ...baseEncoding,
        color: { value: renderMode.lineColorPost },
      },
    });
  }

  return layers;
}

/**
 * Generate spec (alias for compatibility)
 */
export function generateSentinelSpecMinimal(data: SentinelChartData): object {
  return generateSentinelSpec(data);
}
