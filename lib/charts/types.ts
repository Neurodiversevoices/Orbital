/**
 * Shared Chart Types & Constants
 *
 * SINGLE SOURCE OF TRUTH for all CCI chart specifications.
 * Both Individual CCI and Circle CCI use these exact values.
 *
 * DOCTRINE: No visual divergence allowed between chart types.
 * The only difference is the number of series (1 vs 5).
 */

// =============================================================================
// LOCKED DIMENSIONS (IMMUTABLE)
// =============================================================================

export const CCI_CHART_DIMENSIONS = {
  width: 720,
  height: 280,
  padding: {
    top: 24,
    right: 24,
    bottom: 40,
    left: 48,
  },
} as const;

// =============================================================================
// LOCKED TIME RANGE
// =============================================================================

export const CCI_DAYS = 90 as const;

// =============================================================================
// LOCKED COLOR PALETTE
// =============================================================================

/**
 * Capacity state colors (used for bands and single-series Individual CCI)
 */
export const CCI_STATE_COLORS = {
  resourced: '#00E5FF',
  stretched: '#E8A830',
  depleted: '#F44336',
} as const;

/**
 * Background band colors (semi-transparent for chart zones)
 */
export const CCI_BAND_COLORS = {
  resourced: 'rgba(0, 229, 255, 0.08)',
  stretched: 'rgba(232, 168, 48, 0.08)',
  depleted: 'rgba(244, 67, 54, 0.08)',
} as const;

/**
 * Chart chrome colors (axes, grid, labels)
 */
export const CCI_CHROME_COLORS = {
  grid: 'rgba(255, 255, 255, 0.08)',
  axis: 'rgba(255, 255, 255, 0.4)',
  axisLabel: 'rgba(255, 255, 255, 0.6)',
  legendText: 'rgba(255, 255, 255, 0.8)',
  background: '#0A0A0F',
} as const;

/**
 * Multi-series colors for Circle CCI (exactly 5 distinct colors)
 * Used when rendering multiple members on the same chart.
 */
export const CCI_SERIES_COLORS = [
  '#00E5FF', // Series 1: Cyan (primary)
  '#7C4DFF', // Series 2: Purple
  '#FF6B6B', // Series 3: Coral
  '#4ECDC4', // Series 4: Teal
  '#FFE66D', // Series 5: Yellow
] as const;

// =============================================================================
// LOCKED LINE STYLE
// =============================================================================

export const CCI_LINE_STYLE = {
  strokeWidth: 2,
  dotRadius: 3,
  dotRadiusHover: 5,
  opacity: 1.0,
  interpolation: 'monotoneX' as const, // Smooth curves
} as const;

// =============================================================================
// LOCKED AXIS CONFIGURATION
// =============================================================================

export const CCI_Y_AXIS = {
  min: 0,
  max: 100,
  ticks: [0, 33, 66, 100],
  labels: ['0%', '33%', '66%', '100%'],
  thresholds: {
    depleted: { min: 0, max: 33 },
    stretched: { min: 33, max: 66 },
    resourced: { min: 66, max: 100 },
  },
} as const;

export const CCI_X_AXIS = {
  ticks: [1, 30, 60, 90],
  labels: ['Day 1', 'Day 30', 'Day 60', 'Day 90'],
} as const;

// =============================================================================
// LOCKED LEGEND CONFIGURATION
// =============================================================================

export const CCI_LEGEND = {
  position: 'bottom' as const,
  orientation: 'horizontal' as const,
  itemSpacing: 24,
  dotSize: 8,
  fontSize: 12,
  fontWeight: '500' as const,
} as const;

// =============================================================================
// DATA TYPES
// =============================================================================

/**
 * A single data series for the CCI chart.
 *
 * Individual CCI: 1 series (the user)
 * Circle CCI: exactly 5 series (the circle members)
 */
export interface CCISeriesData {
  /** Unique identifier for this series */
  id: string;
  /** Display label (e.g., member name or "You") */
  label: string;
  /** Line color (from CCI_SERIES_COLORS or CCI_STATE_COLORS) */
  color: string;
  /** Capacity values for each of the 90 days (0-100 range) */
  values: number[];
}

/**
 * Complete data input for the CCI 90-day chart.
 * This is the ONLY input the chart accepts — no styling configuration.
 */
export interface CCI90DayChartData {
  /** Array of series (1 for Individual, 5 for Circle) */
  series: CCISeriesData[];
  /** Optional title override */
  title?: string;
  /** Whether to show the legend (default: true for Circle, false for Individual) */
  showLegend?: boolean;
}

/**
 * Validation: Individual CCI must have exactly 1 series
 */
export function isIndividualCCIData(data: CCI90DayChartData): boolean {
  return data.series.length === 1;
}

/**
 * Validation: Circle CCI must have exactly 5 series
 */
export function isCircleCCIData(data: CCI90DayChartData): boolean {
  return data.series.length === 5;
}

/**
 * Validation: Each series must have exactly 90 values
 */
export function validateCCIData(data: CCI90DayChartData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (data.series.length === 0) {
    errors.push('At least one series is required');
  }

  if (data.series.length > 5) {
    errors.push(`Maximum 5 series allowed, got ${data.series.length}`);
  }

  for (const series of data.series) {
    if (series.values.length !== CCI_DAYS) {
      errors.push(
        `Series "${series.label}" has ${series.values.length} values, expected ${CCI_DAYS}`
      );
    }

    const outOfRange = series.values.filter(
      (v) => v < CCI_Y_AXIS.min || v > CCI_Y_AXIS.max
    );
    if (outOfRange.length > 0) {
      errors.push(
        `Series "${series.label}" has ${outOfRange.length} values outside 0-100 range`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// SVG EXPORT TYPES
// =============================================================================

export interface CCISVGExportOptions {
  /** Output format */
  format: 'svg' | 'png';
  /** Scale factor for PNG export (default: 2 for retina) */
  scale?: number;
  /** Whether to include background (default: true) */
  includeBackground?: boolean;
}

// =============================================================================
// COMPUTED HELPERS
// =============================================================================

/**
 * Get the inner chart dimensions (excluding padding)
 */
export function getInnerDimensions() {
  const { width, height, padding } = CCI_CHART_DIMENSIONS;
  return {
    width: width - padding.left - padding.right,
    height: height - padding.top - padding.bottom,
  };
}

/**
 * Convert a day index (0-89) to x coordinate
 */
export function dayToX(dayIndex: number): number {
  const inner = getInnerDimensions();
  const { padding } = CCI_CHART_DIMENSIONS;
  return padding.left + (dayIndex / (CCI_DAYS - 1)) * inner.width;
}

/**
 * Convert a capacity value (0-100) to y coordinate
 */
export function valueToY(value: number): number {
  const inner = getInnerDimensions();
  const { padding } = CCI_CHART_DIMENSIONS;
  // Y is inverted: 100 at top, 0 at bottom
  const normalized = (value - CCI_Y_AXIS.min) / (CCI_Y_AXIS.max - CCI_Y_AXIS.min);
  return padding.top + inner.height * (1 - normalized);
}

/**
 * Get the color for a series based on its index
 */
export function getSeriesColor(index: number): string {
  return CCI_SERIES_COLORS[index % CCI_SERIES_COLORS.length];
}

/**
 * Determine which capacity state a value falls into
 */
export function getCapacityState(
  value: number
): 'resourced' | 'stretched' | 'depleted' {
  if (value >= CCI_Y_AXIS.thresholds.resourced.min) return 'resourced';
  if (value >= CCI_Y_AXIS.thresholds.stretched.min) return 'stretched';
  return 'depleted';
}
