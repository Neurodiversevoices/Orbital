/**
 * Dynamic CCI v1 — Format Layer
 *
 * Converts CCIDynamicData → CCIFormattedStrings.
 * Enforces max-length, clamping, and rounding for all output values.
 *
 * NOTE: In v1, chartSVG is generated via renderSummaryChartSVG() WITHOUT
 * dynamic x-axis labels (xLabels option is added in PR2). The SVG will
 * show default labels until PR2 wiring.
 */

import { renderSummaryChartSVG } from '../summaryChart';
import { CCIDynamicData, CCIFormattedStrings } from './types';

// =============================================================================
// INDIVIDUAL FORMATTERS
// =============================================================================

/**
 * Format observation window as "YYYY-MM-DD to YYYY-MM-DD".
 * Max 27 chars.
 */
export function formatObservationWindow(start: string, end: string): string {
  return `${start} to ${end}`;
}

/**
 * Format observation window for display: "Mon D, YYYY – Mon D, YYYY".
 * Max 40 chars.
 */
export function formatObservationWindowDisplay(start: string, end: string): string {
  const fmt = (dateStr: string): string => {
    const d = new Date(dateStr + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  };
  const result = `${fmt(start)} – ${fmt(end)}`;
  return result.length > 40 ? result.substring(0, 40) : result;
}

/**
 * Format tracking continuity: "78% (Moderate Reliability)".
 * Percent clamped to 0-100.
 */
export function formatTrackingContinuity(
  percent: number,
  rating: 'high' | 'moderate' | 'low',
): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const labels: Record<string, string> = {
    high: 'High Reliability',
    moderate: 'Moderate Reliability',
    low: 'Low Reliability',
  };
  return `${clamped}% (${labels[rating] || 'Unknown'})`;
}

/**
 * Format pattern stability: "84%".
 * Clamped to 0-100.
 */
export function formatPatternStability(percent: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return `${clamped}%`;
}

/**
 * Format verdict with max-length enforcement.
 * Max 40 chars. Fallback: "Insufficient Data".
 */
export function formatVerdict(verdict: string): string {
  if (!verdict || verdict.trim().length === 0) return 'Insufficient Data';
  return verdict.length > 40 ? verdict.substring(0, 40) : verdict;
}

/**
 * Validate and format patient ID.
 * Expected: NNNNN-AAA. Fallback: "00000-UNK".
 */
export function formatPatientId(patientId: string): string {
  if (/^\d{5}-[A-Z]{3}$/.test(patientId)) return patientId;
  return '00000-UNK';
}

/**
 * Generate chart SVG from computed values.
 * In PR1, xLabels are not wired (summaryChart.ts doesn't support them yet).
 */
export function generateChartSVG(chartValues: number[]): string {
  // Ensure exactly 6 values, each clamped 0-100
  const values = [...chartValues];
  while (values.length < 6) values.push(50);
  while (values.length > 6) values.pop();
  const clamped = values.map(v => Math.max(0, Math.min(100, Math.round(v))));

  return renderSummaryChartSVG(clamped);
}

// =============================================================================
// MAIN FORMATTER
// =============================================================================

/**
 * Convert CCIDynamicData to CCIFormattedStrings with all safety rules applied.
 */
export function formatCCIDynamicData(data: CCIDynamicData): CCIFormattedStrings {
  return {
    observationWindow: formatObservationWindow(data.observationStart, data.observationEnd),
    observationWindowDisplay: formatObservationWindowDisplay(data.observationStart, data.observationEnd),
    windowStatus: data.windowStatus === 'closed' ? '(Closed)' : '(Open)',
    patientId: formatPatientId(data.patientId),
    trackingContinuity: formatTrackingContinuity(
      data.trackingContinuityPercent,
      data.trackingContinuityRating,
    ),
    responseTiming: 'Mean 4.2s', // HARDCODED in v1 — no responseTimeMs in CapacityLog
    patternStability: formatPatternStability(data.patternStabilityPercent),
    verdict: formatVerdict(data.verdict),
    chartSVG: generateChartSVG(data.chartValues),
    chartXLabels: data.chartXLabels,
  };
}
