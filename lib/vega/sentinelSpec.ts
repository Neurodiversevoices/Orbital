/**
 * Vega-Lite Sentinel Chart Specification
 *
 * Generates Vega-Lite specs for Sentinel volatility charts.
 * Matches the executive briefing visual language from the reference design.
 *
 * DESIGN AUTHORITY: assets/sentinel-demo.png
 *
 * VISUAL REQUIREMENTS:
 * - Baseline bands (LOW / MODERATE / HIGH) as layered rects
 * - Area + line overlay with smooth interpolation
 * - Trigger region highlighting
 * - Anchored annotation for trigger day
 * - Executive/clinical aesthetic (no cartoon colors)
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
// COLOR PALETTE (Executive/Clinical)
// =============================================================================

export const COLORS = {
  // Background
  bgDark: '#0a1628',
  bgMid: '#0f1e32',

  // Bands (subtle, not cartoon)
  bandLow: 'rgba(34, 197, 94, 0.12)',      // Green - very subtle
  bandModerate: 'rgba(245, 158, 11, 0.12)', // Amber - very subtle
  bandHigh: 'rgba(239, 68, 68, 0.12)',      // Red - very subtle

  // Band borders (even more subtle)
  bandBorderLow: 'rgba(34, 197, 94, 0.25)',
  bandBorderMod: 'rgba(245, 158, 11, 0.25)',
  bandBorderHigh: 'rgba(239, 68, 68, 0.25)',

  // Line/Area gradient stops
  lineNormal: '#22c55e',      // Green
  lineElevated: '#f59e0b',    // Amber
  lineTriggered: '#ef4444',   // Red

  // Area fill
  areaGradientStart: 'rgba(34, 197, 94, 0.4)',
  areaGradientEnd: 'rgba(239, 68, 68, 0.1)',

  // Text
  textPrimary: 'rgba(255, 255, 255, 0.9)',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textMuted: 'rgba(255, 255, 255, 0.4)',

  // Grid
  gridLine: 'rgba(255, 255, 255, 0.06)',

  // Annotation
  annotationBg: 'rgba(245, 158, 11, 0.15)',
  annotationBorder: '#f59e0b',
  annotationText: '#f59e0b',
};

// =============================================================================
// THRESHOLDS
// =============================================================================

export const THRESHOLDS = {
  low: 33,
  moderate: 66,
  high: 100,
  baseline: 50,
};

// =============================================================================
// SPEC GENERATOR
// =============================================================================

/**
 * Convert VolatilityDataPoint[] to VegaDataPoint[]
 */
export function convertToVegaData(points: VolatilityDataPoint[]): VegaDataPoint[] {
  return points.map((p, idx) => ({
    day: p.dayOffset,
    label: p.dayOffset === 0 ? 'NOW' : `${p.dayOffset}`,
    value: p.value,
    triggered: p.exceedsBaseline,
  }));
}

/**
 * Generate the Vega-Lite specification for a Sentinel chart
 */
export function generateSentinelSpec(data: SentinelChartData): object {
  const { points, triggerDay, triggerAnnotation, baseline, cohortLabel, sampleSize } = data;

  // Find min/max days for domain
  const minDay = Math.min(...points.map((p) => p.day));
  const maxDay = 0; // NOW

  // Band data for background rectangles
  const bandData = [
    { band: 'LOW', y: 0, y2: THRESHOLDS.low, color: COLORS.bandLow, order: 1 },
    { band: 'MODERATE', y: THRESHOLDS.low, y2: THRESHOLDS.moderate, color: COLORS.bandModerate, order: 2 },
    { band: 'HIGH', y: THRESHOLDS.moderate, y2: THRESHOLDS.high, color: COLORS.bandHigh, order: 3 },
  ];

  // Trigger annotation data
  const annotationData =
    triggerDay !== null && triggerAnnotation
      ? [
          {
            day: triggerDay,
            text: triggerAnnotation,
            value: points.find((p) => p.day === triggerDay)?.value || 70,
          },
        ]
      : [];

  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: 'container',
    height: 220,
    padding: { left: 50, right: 80, top: 40, bottom: 40 },
    background: COLORS.bgDark,
    config: {
      view: { stroke: null },
      axis: {
        labelColor: COLORS.textMuted,
        titleColor: COLORS.textSecondary,
        gridColor: COLORS.gridLine,
        domainColor: COLORS.gridLine,
        tickColor: COLORS.gridLine,
        labelFont: 'system-ui, -apple-system, sans-serif',
        titleFont: 'system-ui, -apple-system, sans-serif',
        labelFontSize: 10,
        titleFontSize: 11,
      },
      legend: { disable: true },
      title: {
        color: COLORS.textPrimary,
        font: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
        fontWeight: 600,
      },
    },
    title: {
      text: 'VOLATILITY TREND VS BASELINE',
      anchor: 'start',
      offset: 10,
    },
    layer: [
      // Layer 1: Background bands
      {
        data: { values: bandData },
        mark: { type: 'rect', opacity: 1 },
        encoding: {
          y: { field: 'y', type: 'quantitative', scale: { domain: [0, 100] } },
          y2: { field: 'y2' },
          color: { field: 'color', type: 'nominal', scale: null },
        },
      },
      // Layer 2: Band labels on right
      {
        data: {
          values: [
            { label: 'HIGH', y: 83 },
            { label: 'MODERATE', y: 50 },
            { label: 'LOW', y: 17 },
          ],
        },
        mark: {
          type: 'text',
          align: 'left',
          dx: 5,
          fontSize: 9,
          fontWeight: 500,
          opacity: 0.5,
        },
        encoding: {
          x: { value: 'width' },
          y: { field: 'y', type: 'quantitative' },
          text: { field: 'label' },
          color: { value: COLORS.textMuted },
        },
      },
      // Layer 3: Baseline reference line
      {
        data: { values: [{ baseline }] },
        mark: {
          type: 'rule',
          strokeDash: [4, 4],
          strokeWidth: 1,
          opacity: 0.4,
        },
        encoding: {
          y: { field: 'baseline', type: 'quantitative' },
          color: { value: COLORS.textSecondary },
        },
      },
      // Layer 4: Area fill under line
      {
        data: { values: points },
        mark: {
          type: 'area',
          interpolate: 'monotone',
          line: false,
          opacity: 0.3,
        },
        encoding: {
          x: {
            field: 'day',
            type: 'quantitative',
            scale: { domain: [minDay, maxDay] },
            axis: {
              title: null,
              format: 'd',
              tickCount: 8,
              labelExpr: "datum.value === 0 ? 'NOW' : datum.value",
            },
          },
          y: {
            field: 'value',
            type: 'quantitative',
            scale: { domain: [0, 100] },
            axis: { title: 'Volatility Index', titleAngle: -90, titlePadding: 35 },
          },
          color: {
            field: 'value',
            type: 'quantitative',
            scale: {
              domain: [0, 33, 66, 100],
              range: [COLORS.lineNormal, COLORS.lineNormal, COLORS.lineElevated, COLORS.lineTriggered],
            },
          },
        },
      },
      // Layer 5: Main line
      {
        data: { values: points },
        mark: {
          type: 'line',
          interpolate: 'monotone',
          strokeWidth: 2,
          strokeCap: 'round',
        },
        encoding: {
          x: { field: 'day', type: 'quantitative' },
          y: { field: 'value', type: 'quantitative' },
          color: {
            field: 'value',
            type: 'quantitative',
            scale: {
              domain: [0, 33, 66, 100],
              range: [COLORS.lineNormal, COLORS.lineNormal, COLORS.lineElevated, COLORS.lineTriggered],
            },
          },
        },
      },
      // Layer 6: Current value point
      {
        data: { values: points.filter((p) => p.day === 0) },
        mark: {
          type: 'circle',
          size: 50,
          opacity: 1,
        },
        encoding: {
          x: { field: 'day', type: 'quantitative' },
          y: { field: 'value', type: 'quantitative' },
          color: {
            field: 'value',
            type: 'quantitative',
            scale: {
              domain: [0, 33, 66, 100],
              range: [COLORS.lineNormal, COLORS.lineNormal, COLORS.lineElevated, COLORS.lineTriggered],
            },
          },
        },
      },
      // Layer 7: Trigger annotation (if triggered)
      ...(annotationData.length > 0
        ? [
            {
              data: { values: annotationData },
              mark: {
                type: 'text',
                align: 'left',
                baseline: 'bottom',
                dx: 8,
                dy: -8,
                fontSize: 11,
                fontWeight: 600,
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
 * Generate a simplified spec for embedding (smaller bundle)
 */
export function generateSentinelSpecMinimal(data: SentinelChartData): object {
  return generateSentinelSpec(data);
}
