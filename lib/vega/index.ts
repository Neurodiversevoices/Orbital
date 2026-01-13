/**
 * Vega-Lite Chart Specifications
 *
 * Central exports for all Vega-Lite chart specs used in Orbital.
 */

export {
  generateSentinelSpec,
  generateSentinelSpecMinimal,
  convertToVegaData,
  COLORS,
  THRESHOLDS,
} from './sentinelSpec';

export type { VegaDataPoint, SentinelChartData } from './sentinelSpec';
