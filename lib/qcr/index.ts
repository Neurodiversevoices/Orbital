/**
 * QCR (Quarterly Capacity Report) Module
 *
 * Institutional reporting artifact.
 * Quarterly reporting access.
 * Pricing: $149/quarter (institutional tier)
 */

export * from './types';
export * from './generateQCR';
export * from './useQCR';
export { exportQCRToPdf } from './generateQCRPdf';
export { QCR_DEMO_SNAPSHOT, getDemoQCR } from './demoData';
export {
  generateChartSVG,
  generateQCRChartSVG,
  generateAppStyleChartSVG,
  CHART_COLORS,
  ZONE_FILLS,
} from './chartExport';
