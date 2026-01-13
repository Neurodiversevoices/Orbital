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

  // Bands — PASSIVE, contextual only (executive briefing style)
  bandLow: 'rgba(120, 160, 130, 0.04)',       // Muted sage - barely visible
  bandModerate: 'rgba(180, 160, 120, 0.04)',  // Muted tan - barely visible
  bandHigh: 'rgba(160, 120, 120, 0.04)',      // Muted rose - barely visible

  // Line/Area gradient stops — DESATURATED for institutional feel
  lineNormal: '#6b9080',      // Muted sage green
  lineElevated: '#b8a078',    // Muted tan/amber
  lineTriggered: '#a08080',   // Muted rose (NOT alarming red)

  // Text — quiet authority
  textPrimary: 'rgba(255, 255, 255, 0.75)',
  textSecondary: 'rgba(255, 255, 255, 0.50)',
  textMuted: 'rgba(255, 255, 255, 0.30)',

  // Grid — barely perceptible
  gridLine: 'rgba(255, 255, 255, 0.04)',

  // Annotation — neutral, not attention-grabbing
  annotationText: 'rgba(255, 255, 255, 0.50)',
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
        titleColor: COLORS.textMuted,
        gridColor: COLORS.gridLine,
        domainColor: 'transparent',
        tickColor: 'transparent',
        labelFont: 'system-ui, -apple-system, sans-serif',
        titleFont: 'system-ui, -apple-system, sans-serif',
        labelFontSize: 9,
        titleFontSize: 9,
      },
      legend: { disable: true },
      title: {
        color: COLORS.textSecondary,
        font: 'system-ui, -apple-system, sans-serif',
        fontSize: 10,
        fontWeight: 400,
        letterSpacing: '0.5px',
      },
    },
    title: {
      text: 'Volatility Trend vs Baseline',
      anchor: 'start',
      offset: 8,
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
      // Layer 2: Band labels on right — very subtle
      {
        data: {
          values: [
            { label: 'High', y: 83 },
            { label: 'Moderate', y: 50 },
            { label: 'Low', y: 17 },
          ],
        },
        mark: {
          type: 'text',
          align: 'left',
          dx: 5,
          fontSize: 8,
          fontWeight: 400,
          opacity: 0.25,
        },
        encoding: {
          x: { value: 'width' },
          y: { field: 'y', type: 'quantitative' },
          text: { field: 'label' },
          color: { value: COLORS.textMuted },
        },
      },
      // Layer 3: Baseline reference line — subtle
      {
        data: { values: [{ baseline }] },
        mark: {
          type: 'rule',
          strokeDash: [3, 3],
          strokeWidth: 0.5,
          opacity: 0.2,
        },
        encoding: {
          y: { field: 'baseline', type: 'quantitative' },
          color: { value: COLORS.textMuted },
        },
      },
      // Layer 4: Area fill under line — soft, secondary
      {
        data: { values: points },
        mark: {
          type: 'area',
          interpolate: 'monotone',
          line: false,
          opacity: 0.08,
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
      // Layer 5: Main line — primary signal, restrained
      {
        data: { values: points },
        mark: {
          type: 'line',
          interpolate: 'monotone',
          strokeWidth: 1.5,
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
      // Layer 6: Trigger annotation (if triggered) — neutral, quiet
      ...(annotationData.length > 0
        ? [
            {
              data: { values: annotationData },
              mark: {
                type: 'text',
                align: 'left',
                baseline: 'bottom',
                dx: 6,
                dy: -6,
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
 * Generate a simplified spec for embedding (smaller bundle)
 */
export function generateSentinelSpecMinimal(data: SentinelChartData): object {
  return generateSentinelSpec(data);
}
