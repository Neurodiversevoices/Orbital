/**
 * Dynamic CCI v1 — Governance Copy Scan
 *
 * Test-time assertion that CCI dynamic output contains no prohibited language.
 * Sources:
 * - governance/PHASE_SEMANTICS.ts → Phase 3 prohibitedLanguage
 * - governance/PROHIBITED_FEATURES.md → Categories D and I
 */

import { CCIFormattedStrings } from './types';

/**
 * Words and phrases prohibited in any CCI dynamic output string.
 * Case-insensitive matching.
 */
export const PROHIBITED_IN_CCI: readonly string[] = [
  // From Phase 3 prohibited language
  'improving',
  'declining',
  'you should',
  'this means',
  'this indicates',
  'consider',
  'good',
  'bad',
  'healthy',
  'unhealthy',
  'normal',
  'abnormal',
  'diagnosis',
  'treatment',
  'intervention',
  'recommendation',

  // From Prohibited Features Category D (Scoring/Quantification)
  'wellness score',
  'health score',
  'daily grade',
  'weekly grade',
  'progress percentage',

  // From Prohibited Features Category I (Explanation/Interpretation)
  'why are you',
  'suggested reason',
  'symptom',

  // From store listing / regulatory compliance
  'mental health',
  'therapy',
  'clinical assessment',
  'cure',
  'AI-powered',
  'AI analysis',
];

/**
 * Check a single string for prohibited words.
 * Returns array of found violations (empty = compliant).
 */
export function findProhibitedWords(text: string): string[] {
  const lower = text.toLowerCase();
  return PROHIBITED_IN_CCI.filter(word => lower.includes(word.toLowerCase()));
}

/**
 * Assert that all formatted strings in a CCIFormattedStrings object
 * are free of prohibited language.
 *
 * Throws if any violation found.
 * Intended for use in unit tests, NOT at runtime.
 */
export function assertGovernanceCompliance(strings: CCIFormattedStrings): void {
  const fields: Array<[string, string]> = [
    ['observationWindow', strings.observationWindow],
    ['observationWindowDisplay', strings.observationWindowDisplay],
    ['windowStatus', strings.windowStatus],
    ['patientId', strings.patientId],
    ['trackingContinuity', strings.trackingContinuity],
    ['responseTiming', strings.responseTiming],
    ['patternStability', strings.patternStability],
    ['verdict', strings.verdict],
  ];

  const violations: string[] = [];

  for (const [fieldName, value] of fields) {
    const found = findProhibitedWords(value);
    if (found.length > 0) {
      violations.push(`${fieldName}: contains prohibited word(s): ${found.join(', ')}`);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `CCI Governance Violation:\n${violations.join('\n')}`
    );
  }
}

/**
 * All possible verdict strings from the deterministic lookup table.
 * Used for exhaustive governance testing.
 */
export const ALL_VERDICT_STRINGS: readonly string[] = [
  'Interpretable Capacity Trends',
  'Partial Capacity Trends',
  'Variable Capacity Patterns',
  'Partial Capacity Patterns',
  'Highly Variable Capacity',
  'Insufficient Stability',
  'Insufficient Observation',
  'Insufficient Data',
];
