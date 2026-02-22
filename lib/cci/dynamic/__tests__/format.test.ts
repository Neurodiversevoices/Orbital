/**
 * Dynamic CCI v1 — Format Layer Unit Tests
 *
 * Tests 14-15 from the verification checklist.
 * Validates format safety rules: clamping, max-length, fallbacks.
 */

import {
  formatTrackingContinuity,
  formatPatternStability,
  formatVerdict,
  formatPatientId,
  formatObservationWindow,
  formatObservationWindowDisplay,
  generateChartSVG,
  formatCCIDynamicData,
} from '../format';
import { CCIDynamicData } from '../types';

// =============================================================================
// TEST 14: Format safety — clamping
// =============================================================================

describe('formatTrackingContinuity', () => {
  it('clamps percent >100 to 100', () => {
    const result = formatTrackingContinuity(150, 'high');
    expect(result).toBe('100% (High Reliability)');
  });

  it('clamps percent <0 to 0', () => {
    const result = formatTrackingContinuity(-10, 'low');
    expect(result).toBe('0% (Low Reliability)');
  });

  it('rounds fractional percent', () => {
    const result = formatTrackingContinuity(78.6, 'moderate');
    expect(result).toBe('79% (Moderate Reliability)');
  });

  it('formats normal values correctly', () => {
    expect(formatTrackingContinuity(85, 'high')).toBe('85% (High Reliability)');
    expect(formatTrackingContinuity(55, 'moderate')).toBe('55% (Moderate Reliability)');
    expect(formatTrackingContinuity(25, 'low')).toBe('25% (Low Reliability)');
  });
});

describe('formatPatternStability', () => {
  it('clamps percent >100 to 100', () => {
    expect(formatPatternStability(150)).toBe('100%');
  });

  it('clamps percent <0 to 0', () => {
    expect(formatPatternStability(-10)).toBe('0%');
  });

  it('rounds fractional percent', () => {
    expect(formatPatternStability(84.3)).toBe('84%');
    expect(formatPatternStability(84.7)).toBe('85%');
  });
});

// =============================================================================
// TEST 15: Format safety — max-length and fallbacks
// =============================================================================

describe('formatVerdict', () => {
  it('truncates verdict at 40 chars', () => {
    const longVerdict = 'A'.repeat(50);
    const result = formatVerdict(longVerdict);
    expect(result).toHaveLength(40);
  });

  it('passes through valid-length verdicts unchanged', () => {
    expect(formatVerdict('Interpretable Capacity Trends'))
      .toBe('Interpretable Capacity Trends');
  });

  it('returns fallback for empty string', () => {
    expect(formatVerdict('')).toBe('Insufficient Data');
  });

  it('returns fallback for whitespace-only string', () => {
    expect(formatVerdict('   ')).toBe('Insufficient Data');
  });
});

describe('formatPatientId', () => {
  it('passes valid NNNNN-AAA format', () => {
    expect(formatPatientId('12345-ABC')).toBe('12345-ABC');
  });

  it('returns fallback for invalid format', () => {
    expect(formatPatientId('invalid')).toBe('00000-UNK');
    expect(formatPatientId('123-AB')).toBe('00000-UNK');
    expect(formatPatientId('')).toBe('00000-UNK');
  });
});

describe('formatObservationWindow', () => {
  it('formats as "YYYY-MM-DD to YYYY-MM-DD"', () => {
    expect(formatObservationWindow('2025-10-01', '2025-12-31'))
      .toBe('2025-10-01 to 2025-12-31');
  });
});

describe('formatObservationWindowDisplay', () => {
  it('formats with month names', () => {
    expect(formatObservationWindowDisplay('2025-10-01', '2025-12-31'))
      .toBe('Oct 1, 2025 – Dec 31, 2025');
  });

  it('stays within 40 chars', () => {
    const result = formatObservationWindowDisplay('2025-10-01', '2025-12-31');
    expect(result.length).toBeLessThanOrEqual(40);
  });
});

describe('generateChartSVG', () => {
  it('produces valid SVG string', () => {
    const svg = generateChartSVG([80, 55, 70, 40, 60, 85]);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 320 140"');
    expect(svg).toContain('</svg>');
  });

  it('pads to 6 values if fewer provided', () => {
    const svg = generateChartSVG([80, 55]);
    expect(svg).toContain('<svg');
  });

  it('clamps values to 0-100', () => {
    // Should not throw with out-of-range values
    const svg = generateChartSVG([150, -10, 200, -50, 300, -100]);
    expect(svg).toContain('<svg');
  });
});

// =============================================================================
// formatCCIDynamicData integration
// =============================================================================

describe('formatCCIDynamicData', () => {
  const mockData: CCIDynamicData = {
    observationStart: '2025-10-01',
    observationEnd: '2025-12-31',
    windowStatus: 'closed',
    patientId: '48291-KMR',
    totalDaysInWindow: 92,
    daysWithEntries: 78,
    trackingContinuityPercent: 85,
    trackingContinuityRating: 'high',
    patternStabilityPercent: 92,
    volatilityRaw: 8.5,
    verdict: 'Interpretable Capacity Trends',
    chartValues: [80, 55, 70, 40, 60, 85],
    chartXLabels: ['Oct', 'Nov', 'Dec'],
    monthlyBreakdown: [],
    overallDistribution: { resourced: 50, stretched: 20, depleted: 8, total: 78 },
    totalSignals: 90,
  };

  it('returns all required fields', () => {
    const result = formatCCIDynamicData(mockData);
    expect(result.observationWindow).toBe('2025-10-01 to 2025-12-31');
    expect(result.observationWindowDisplay).toBe('Oct 1, 2025 – Dec 31, 2025');
    expect(result.windowStatus).toBe('(Closed)');
    expect(result.patientId).toBe('48291-KMR');
    expect(result.trackingContinuity).toBe('85% (High Reliability)');
    expect(result.responseTiming).toBe('Mean 4.2s');
    expect(result.patternStability).toBe('92%');
    expect(result.verdict).toBe('Interpretable Capacity Trends');
    expect(result.chartSVG).toContain('<svg');
    expect(result.chartXLabels).toEqual(['Oct', 'Nov', 'Dec']);
  });

  it('hardcodes responseTiming to Mean 4.2s in v1', () => {
    const result = formatCCIDynamicData(mockData);
    expect(result.responseTiming).toBe('Mean 4.2s');
  });
});
