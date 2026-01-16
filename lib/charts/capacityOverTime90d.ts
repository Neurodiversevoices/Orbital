/**
 * Unified 90-Day CCI Chart Specification
 *
 * SINGLE SOURCE OF TRUTH for all CCI capacity-over-time charts.
 *
 * This module provides:
 * 1. SVG path generation for React Native / Web rendering
 * 2. Complete SVG string generation for PDF export
 * 3. Vega-Lite spec generation for advanced rendering
 *
 * DOCTRINE:
 * - Individual CCI (1 series) and Circle CCI (5 series) are PIXEL-IDENTICAL
 * - Only the number of lines differs
 * - No CCI-specific or Circle-specific chart code
 * - All styling comes from this spec, not the consumer
 */

import {
  CCI_CHART_DIMENSIONS,
  CCI_DAYS,
  CCI_STATE_COLORS,
  CCI_BAND_COLORS,
  CCI_CHROME_COLORS,
  CCI_LINE_STYLE,
  CCI_Y_AXIS,
  CCI_X_AXIS,
  CCI_LEGEND,
  type CCISeriesData,
  type CCI90DayChartData,
  type CCISVGExportOptions,
  validateCCIData,
  dayToX,
  valueToY,
  getInnerDimensions,
} from './types';

// =============================================================================
// SVG PATH GENERATION
// =============================================================================

/**
 * Generate a smooth SVG path for a series using monotone cubic interpolation.
 * This creates the bezier curves for the capacity line.
 */
export function generateSeriesPath(values: number[]): string {
  if (values.length === 0) return '';

  const points = values.map((value, index) => ({
    x: dayToX(index),
    y: valueToY(value),
  }));

  // Start with moveTo
  let path = `M ${points[0].x} ${points[0].y}`;

  // Use monotone cubic interpolation for smooth curves
  for (let i = 1; i < points.length; i++) {
    const p0 = points[Math.max(0, i - 2)];
    const p1 = points[i - 1];
    const p2 = points[i];
    const p3 = points[Math.min(points.length - 1, i + 1)];

    // Calculate control points for smooth curve
    const tension = 0.3;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

/**
 * Generate SVG paths for all series in the chart data.
 * Returns an array of { path, color, label } for each series.
 */
export function generateAllSeriesPaths(
  data: CCI90DayChartData
): Array<{ path: string; color: string; label: string; id: string }> {
  return data.series.map((series) => ({
    id: series.id,
    label: series.label,
    color: series.color,
    path: generateSeriesPath(series.values),
  }));
}

// =============================================================================
// BACKGROUND BANDS GENERATION
// =============================================================================

/**
 * Generate the three background bands (resourced, stretched, depleted)
 */
export function generateBackgroundBands(): Array<{
  id: string;
  y: number;
  height: number;
  color: string;
}> {
  const { padding } = CCI_CHART_DIMENSIONS;
  const inner = getInnerDimensions();

  const bandHeight = inner.height / 3;

  return [
    {
      id: 'resourced',
      y: padding.top,
      height: bandHeight,
      color: CCI_BAND_COLORS.resourced,
    },
    {
      id: 'stretched',
      y: padding.top + bandHeight,
      height: bandHeight,
      color: CCI_BAND_COLORS.stretched,
    },
    {
      id: 'depleted',
      y: padding.top + bandHeight * 2,
      height: bandHeight,
      color: CCI_BAND_COLORS.depleted,
    },
  ];
}

// =============================================================================
// GRID LINES GENERATION
// =============================================================================

/**
 * Generate horizontal grid lines at threshold boundaries
 */
export function generateGridLines(): Array<{
  y: number;
  label: string;
  value: number;
}> {
  const { padding } = CCI_CHART_DIMENSIONS;
  const inner = getInnerDimensions();

  return CCI_Y_AXIS.ticks.map((value, index) => ({
    y: padding.top + inner.height * (1 - value / 100),
    label: CCI_Y_AXIS.labels[index],
    value,
  }));
}

/**
 * Generate x-axis tick marks
 */
export function generateXAxisTicks(): Array<{
  x: number;
  label: string;
  day: number;
}> {
  return CCI_X_AXIS.ticks.map((day, index) => ({
    x: dayToX(day - 1), // Convert 1-indexed day to 0-indexed
    label: CCI_X_AXIS.labels[index],
    day,
  }));
}

// =============================================================================
// COMPLETE SVG STRING GENERATION (for PDF export)
// =============================================================================

/**
 * Generate a complete SVG string for the CCI chart.
 * This is used for PDF export and must be pixel-identical to the React component.
 */
export function renderCCI90DayToSVG(
  data: CCI90DayChartData,
  options: Partial<CCISVGExportOptions> = {}
): string {
  const { includeBackground = true } = options;
  const { width, height, padding } = CCI_CHART_DIMENSIONS;
  const inner = getInnerDimensions();

  // Validate data
  const validation = validateCCIData(data);
  if (!validation.valid) {
    console.warn('CCI chart data validation failed:', validation.errors);
  }

  const bands = generateBackgroundBands();
  const gridLines = generateGridLines();
  const xTicks = generateXAxisTicks();
  const seriesPaths = generateAllSeriesPaths(data);
  const showLegend = data.showLegend ?? data.series.length > 1;

  // Build SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

  // Background
  if (includeBackground) {
    svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="${CCI_CHROME_COLORS.background}"/>`;
  }

  // Background bands
  for (const band of bands) {
    svg += `<rect x="${padding.left}" y="${band.y}" width="${inner.width}" height="${band.height}" fill="${band.color}"/>`;
  }

  // Horizontal grid lines
  for (const line of gridLines) {
    svg += `<line x1="${padding.left}" y1="${line.y}" x2="${padding.left + inner.width}" y2="${line.y}" stroke="${CCI_CHROME_COLORS.grid}" stroke-width="1"/>`;
    // Y-axis labels
    svg += `<text x="${padding.left - 8}" y="${line.y + 4}" text-anchor="end" fill="${CCI_CHROME_COLORS.axisLabel}" font-size="11" font-family="system-ui, sans-serif">${line.label}</text>`;
  }

  // X-axis ticks and labels
  for (const tick of xTicks) {
    svg += `<line x1="${tick.x}" y1="${padding.top + inner.height}" x2="${tick.x}" y2="${padding.top + inner.height + 4}" stroke="${CCI_CHROME_COLORS.axis}" stroke-width="1"/>`;
    svg += `<text x="${tick.x}" y="${padding.top + inner.height + 20}" text-anchor="middle" fill="${CCI_CHROME_COLORS.axisLabel}" font-size="11" font-family="system-ui, sans-serif">${tick.label}</text>`;
  }

  // Series lines
  for (const series of seriesPaths) {
    svg += `<path d="${series.path}" fill="none" stroke="${series.color}" stroke-width="${CCI_LINE_STYLE.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${CCI_LINE_STYLE.opacity}"/>`;
  }

  // Data points (dots)
  for (const series of data.series) {
    for (let i = 0; i < series.values.length; i++) {
      // Only draw dots at key intervals to avoid clutter
      if (i % 7 === 0 || i === series.values.length - 1) {
        const x = dayToX(i);
        const y = valueToY(series.values[i]);
        svg += `<circle cx="${x}" cy="${y}" r="${CCI_LINE_STYLE.dotRadius}" fill="${series.color}"/>`;
      }
    }
  }

  // Legend (for Circle CCI with multiple series)
  if (showLegend && data.series.length > 1) {
    const legendY = height - 12;
    const totalWidth =
      data.series.length * CCI_LEGEND.itemSpacing +
      data.series.reduce((sum, s) => sum + s.label.length * 7, 0);
    let legendX = (width - totalWidth) / 2;

    for (const series of data.series) {
      // Legend dot
      svg += `<circle cx="${legendX}" cy="${legendY}" r="${CCI_LEGEND.dotSize / 2}" fill="${series.color}"/>`;
      // Legend label
      svg += `<text x="${legendX + CCI_LEGEND.dotSize}" y="${legendY + 4}" fill="${CCI_CHROME_COLORS.legendText}" font-size="${CCI_LEGEND.fontSize}" font-weight="${CCI_LEGEND.fontWeight}" font-family="system-ui, sans-serif">${series.label}</text>`;
      legendX += CCI_LEGEND.itemSpacing + series.label.length * 7;
    }
  }

  svg += '</svg>';

  return svg;
}

// =============================================================================
// REACT NATIVE CHART PROPS GENERATOR
// =============================================================================

/**
 * Generate props for the React Native SVG chart component.
 * This ensures the component uses the exact same values as the SVG export.
 */
export interface CCI90DayChartProps {
  width: number;
  height: number;
  padding: typeof CCI_CHART_DIMENSIONS.padding;
  bands: ReturnType<typeof generateBackgroundBands>;
  gridLines: ReturnType<typeof generateGridLines>;
  xTicks: ReturnType<typeof generateXAxisTicks>;
  seriesPaths: ReturnType<typeof generateAllSeriesPaths>;
  showLegend: boolean;
  colors: {
    background: string;
    grid: string;
    axis: string;
    axisLabel: string;
    legendText: string;
  };
  lineStyle: typeof CCI_LINE_STYLE;
  legend: typeof CCI_LEGEND;
  series: CCISeriesData[];
}

export function generateChartProps(data: CCI90DayChartData): CCI90DayChartProps {
  const validation = validateCCIData(data);
  if (!validation.valid) {
    console.warn('CCI chart data validation failed:', validation.errors);
  }

  return {
    width: CCI_CHART_DIMENSIONS.width,
    height: CCI_CHART_DIMENSIONS.height,
    padding: CCI_CHART_DIMENSIONS.padding,
    bands: generateBackgroundBands(),
    gridLines: generateGridLines(),
    xTicks: generateXAxisTicks(),
    seriesPaths: generateAllSeriesPaths(data),
    showLegend: data.showLegend ?? data.series.length > 1,
    colors: CCI_CHROME_COLORS,
    lineStyle: CCI_LINE_STYLE,
    legend: CCI_LEGEND,
    series: data.series,
  };
}

// =============================================================================
// VEGA-LITE SPEC GENERATION
// =============================================================================

/**
 * Generate a Vega-Lite specification for the CCI chart.
 * Used for web rendering with vega-embed.
 */
export function generateVegaLiteSpec(data: CCI90DayChartData): object {
  // Transform data for Vega-Lite format
  const vegaData: Array<{ day: number; value: number; series: string; color: string }> = [];

  for (const series of data.series) {
    for (let i = 0; i < series.values.length; i++) {
      vegaData.push({
        day: i + 1,
        value: series.values[i],
        series: series.label,
        color: series.color,
      });
    }
  }

  const showLegend = data.showLegend ?? data.series.length > 1;

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width: CCI_CHART_DIMENSIONS.width - CCI_CHART_DIMENSIONS.padding.left - CCI_CHART_DIMENSIONS.padding.right,
    height: CCI_CHART_DIMENSIONS.height - CCI_CHART_DIMENSIONS.padding.top - CCI_CHART_DIMENSIONS.padding.bottom,
    padding: CCI_CHART_DIMENSIONS.padding,
    background: CCI_CHROME_COLORS.background,
    config: {
      axis: {
        labelColor: CCI_CHROME_COLORS.axisLabel,
        titleColor: CCI_CHROME_COLORS.axisLabel,
        gridColor: CCI_CHROME_COLORS.grid,
        domainColor: CCI_CHROME_COLORS.axis,
        tickColor: CCI_CHROME_COLORS.axis,
      },
      legend: {
        labelColor: CCI_CHROME_COLORS.legendText,
        titleColor: CCI_CHROME_COLORS.legendText,
      },
    },
    layer: [
      // Background bands
      {
        data: {
          values: [
            { y: 66, y2: 100, band: 'resourced' },
            { y: 33, y2: 66, band: 'stretched' },
            { y: 0, y2: 33, band: 'depleted' },
          ],
        },
        mark: { type: 'rect', opacity: 0.08 },
        encoding: {
          y: { field: 'y', type: 'quantitative', scale: { domain: [0, 100] } },
          y2: { field: 'y2' },
          color: {
            field: 'band',
            type: 'nominal',
            scale: {
              domain: ['resourced', 'stretched', 'depleted'],
              range: [CCI_STATE_COLORS.resourced, CCI_STATE_COLORS.stretched, CCI_STATE_COLORS.depleted],
            },
            legend: null,
          },
        },
      },
      // Data lines
      {
        data: { values: vegaData },
        mark: {
          type: 'line',
          strokeWidth: CCI_LINE_STYLE.strokeWidth,
          interpolate: CCI_LINE_STYLE.interpolation,
        },
        encoding: {
          x: {
            field: 'day',
            type: 'quantitative',
            scale: { domain: [1, CCI_DAYS] },
            axis: { title: null, values: CCI_X_AXIS.ticks },
          },
          y: {
            field: 'value',
            type: 'quantitative',
            scale: { domain: [CCI_Y_AXIS.min, CCI_Y_AXIS.max] },
            axis: { title: null, values: CCI_Y_AXIS.ticks },
          },
          color: {
            field: 'series',
            type: 'nominal',
            scale: {
              domain: data.series.map((s) => s.label),
              range: data.series.map((s) => s.color),
            },
            legend: showLegend ? { orient: 'bottom', direction: 'horizontal' } : null,
          },
        },
      },
      // Data points
      {
        data: { values: vegaData.filter((_, i) => i % 7 === 0) },
        mark: {
          type: 'point',
          filled: true,
          size: CCI_LINE_STYLE.dotRadius * CCI_LINE_STYLE.dotRadius * Math.PI,
        },
        encoding: {
          x: { field: 'day', type: 'quantitative' },
          y: { field: 'value', type: 'quantitative' },
          color: { field: 'series', type: 'nominal' },
        },
      },
    ],
  };
}

// =============================================================================
// DATA FACTORY HELPERS
// =============================================================================

/**
 * Create Individual CCI data structure (1 series)
 */
export function createIndividualCCIData(
  label: string,
  values: number[],
  color: string = CCI_STATE_COLORS.resourced
): CCI90DayChartData {
  return {
    series: [{ id: 'individual', label, color, values }],
    showLegend: false,
  };
}

/**
 * Create Circle CCI data structure (5 series)
 */
export function createCircleCCIData(
  members: Array<{ id: string; label: string; values: number[] }>
): CCI90DayChartData {
  if (members.length !== 5) {
    console.warn(`Circle CCI expects 5 members, got ${members.length}`);
  }

  return {
    series: members.slice(0, 5).map((member, index) => ({
      id: member.id,
      label: member.label,
      color: CCI_STATE_COLORS.resourced, // All use same color for consistency
      values: member.values,
    })),
    showLegend: true,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  CCI_CHART_DIMENSIONS,
  CCI_DAYS,
  CCI_STATE_COLORS,
  CCI_BAND_COLORS,
  CCI_CHROME_COLORS,
  CCI_SERIES_COLORS,
  CCI_LINE_STYLE,
  CCI_Y_AXIS,
  CCI_X_AXIS,
  CCI_LEGEND,
  validateCCIData,
  dayToX,
  valueToY,
  getInnerDimensions,
} from './types';

export type { CCISeriesData, CCI90DayChartData, CCISVGExportOptions } from './types';
