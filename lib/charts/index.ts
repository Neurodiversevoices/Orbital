/**
 * Unified Chart Module
 *
 * SINGLE SOURCE OF TRUTH for all CCI chart rendering.
 *
 * This module consolidates:
 * - Individual CCI (90-day, 1 series)
 * - Circle CCI (90-day, 5 series)
 * - In-app capacity views
 * - PDF export charts
 *
 * All consumers must use this module for CCI charts.
 * No CCI-specific or Circle-specific chart code outside this module.
 */

// =============================================================================
// TYPES
// =============================================================================

export type {
  CCISeriesData,
  CCI90DayChartData,
  CCISVGExportOptions,
} from './types';

export {
  // Validation
  isIndividualCCIData,
  isCircleCCIData,
  validateCCIData,
  // Coordinate helpers
  dayToX,
  valueToY,
  getInnerDimensions,
  getSeriesColor,
  getCapacityState,
} from './types';

// =============================================================================
// CONSTANTS (LOCKED)
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
} from './types';

// =============================================================================
// CHART GENERATION
// =============================================================================

export {
  // Path generation
  generateSeriesPath,
  generateAllSeriesPaths,
  // Background elements
  generateBackgroundBands,
  generateGridLines,
  generateXAxisTicks,
  // Complete SVG export
  renderCCI90DayToSVG,
  // React Native props
  generateChartProps,
  type CCI90DayChartProps,
  // Vega-Lite spec
  generateVegaLiteSpec,
  // Data factories
  createIndividualCCIData,
  createCircleCCIData,
} from './capacityOverTime90d';
