/**
 * Dynamic CCI v1 — Governance Compliance Tests
 *
 * Test 16 from the verification checklist.
 * Validates all verdict strings and formatted outputs against prohibited word list.
 */

import {
  assertGovernanceCompliance,
  findProhibitedWords,
  ALL_VERDICT_STRINGS,
  PROHIBITED_IN_CCI,
} from '../governance';
import { CCIFormattedStrings } from '../types';

// =============================================================================
// TEST 16: All verdicts pass governance check
// =============================================================================

describe('Governance — Verdict Strings', () => {
  it('all verdict strings are free of prohibited words', () => {
    for (const verdict of ALL_VERDICT_STRINGS) {
      const violations = findProhibitedWords(verdict);
      expect(violations).toEqual([]);
    }
  });
});

describe('Governance — Prohibited Word Scanner', () => {
  it('detects prohibited words', () => {
    expect(findProhibitedWords('Your capacity is improving')).toContain('improving');
    expect(findProhibitedWords('This indicates a pattern')).toContain('this indicates');
    expect(findProhibitedWords('health score: 85')).toContain('health score');
  });

  it('is case-insensitive', () => {
    expect(findProhibitedWords('IMPROVING TREND')).toContain('improving');
    expect(findProhibitedWords('This Indicates')).toContain('this indicates');
  });

  it('returns empty array for compliant strings', () => {
    expect(findProhibitedWords('Interpretable Capacity Trends')).toEqual([]);
    expect(findProhibitedWords('85% (High Reliability)')).toEqual([]);
    expect(findProhibitedWords('48291-KMR')).toEqual([]);
  });
});

describe('Governance — assertGovernanceCompliance', () => {
  const compliantStrings: CCIFormattedStrings = {
    observationWindow: '2025-10-01 to 2025-12-31',
    observationWindowDisplay: 'Oct 1, 2025 – Dec 31, 2025',
    windowStatus: '(Closed)',
    patientId: '48291-KMR',
    trackingContinuity: '85% (High Reliability)',
    responseTiming: 'Mean 4.2s',
    patternStability: '92%',
    verdict: 'Interpretable Capacity Trends',
    chartSVG: '<svg></svg>',
    chartXLabels: ['Oct', 'Nov', 'Dec'],
  };

  it('passes for compliant strings', () => {
    expect(() => assertGovernanceCompliance(compliantStrings)).not.toThrow();
  });

  it('throws for non-compliant verdict', () => {
    const bad = { ...compliantStrings, verdict: 'Your health is improving' };
    expect(() => assertGovernanceCompliance(bad)).toThrow('Governance Violation');
  });

  it('throws for non-compliant tracking continuity text', () => {
    const bad = { ...compliantStrings, trackingContinuity: 'Good reliability' };
    expect(() => assertGovernanceCompliance(bad)).toThrow('Governance Violation');
  });
});

describe('Governance — Exhaustive Verdict Coverage', () => {
  it('all verdict strings pass assertGovernanceCompliance', () => {
    for (const verdict of ALL_VERDICT_STRINGS) {
      const strings: CCIFormattedStrings = {
        observationWindow: '2025-10-01 to 2025-12-31',
        observationWindowDisplay: 'Oct 1, 2025 – Dec 31, 2025',
        windowStatus: '(Closed)',
        patientId: '00000-UNK',
        trackingContinuity: '0% (Low Reliability)',
        responseTiming: 'Mean 4.2s',
        patternStability: '0%',
        verdict,
        chartSVG: '<svg></svg>',
        chartXLabels: ['Oct', 'Nov', 'Dec'],
      };
      expect(() => assertGovernanceCompliance(strings)).not.toThrow();
    }
  });
});

describe('Governance — Prohibited word list completeness', () => {
  it('contains expected minimum number of prohibited words', () => {
    expect(PROHIBITED_IN_CCI.length).toBeGreaterThanOrEqual(20);
  });

  it('includes critical prohibited words from Phase 3', () => {
    const critical = ['improving', 'declining', 'diagnosis', 'treatment', 'recommendation'];
    for (const word of critical) {
      expect(PROHIBITED_IN_CCI).toContain(word);
    }
  });

  it('includes critical prohibited words from store compliance', () => {
    const critical = ['mental health', 'therapy', 'cure'];
    for (const word of critical) {
      expect(PROHIBITED_IN_CCI).toContain(word);
    }
  });
});
