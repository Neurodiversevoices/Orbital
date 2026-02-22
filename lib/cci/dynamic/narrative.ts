/**
 * CCI Narrative Generator — Template-Based
 *
 * Generates session-ready summary paragraphs from computed CCI data.
 * NOT LLM-powered. Deterministic template expansion only.
 *
 * Must pass governance compliance (no prohibited words).
 * See governance.ts for the full prohibited word list.
 *
 * Pure functions. No side effects. No async. No DOM.
 */

import { CCIDynamicData } from './types';
import { CCIProjectionResult } from './projection';

// =============================================================================
// TYPES
// =============================================================================

export interface CCINarrativeInput {
  /** Current status label: resourced / stretched / depleted dominant */
  status: string;
  /** Pattern stability score 0-100 */
  stabilityScore: number;
  /** Baseline percentage (overall mean capacity) */
  baseline: number;
  /** Trend direction derived from stability and distribution */
  trendDirection: 'stable' | 'variable' | 'shifting';
  /** Top driver category by frequency */
  topDriver: string | null;
  /** Dominant pattern descriptor */
  dominantPattern: string;
  /** Recovery assessment */
  recoveryAssessment: string;
}

export interface CCINarrativeResult {
  /** 3-4 sentence session-ready summary */
  summary: string;
}

// =============================================================================
// STATUS RESOLUTION
// =============================================================================

/**
 * Determine dominant status label from distribution.
 */
export function resolveStatus(distribution: {
  resourced: number;
  stretched: number;
  depleted: number;
  total: number;
}): string {
  const { resourced, stretched, depleted, total } = distribution;
  if (total === 0) return 'undetermined';

  const rPct = resourced / total;
  const sPct = stretched / total;
  const dPct = depleted / total;

  if (rPct >= 0.5) return 'predominantly resourced';
  if (dPct >= 0.4) return 'frequently near capacity limits';
  if (sPct >= 0.5) return 'consistently stretched';
  if (rPct >= 0.3 && sPct >= 0.3) return 'mixed between resourced and stretched';
  return 'variable across states';
}

/**
 * Determine trend direction from stability and volatility.
 */
export function resolveTrendDirection(
  stabilityPercent: number,
  volatilityRaw: number,
): 'stable' | 'variable' | 'shifting' {
  if (stabilityPercent >= 75) return 'stable';
  if (stabilityPercent >= 45) return 'variable';
  return 'shifting';
}

/**
 * Determine dominant pattern descriptor from distribution and stability.
 */
export function resolveDominantPattern(
  distribution: { resourced: number; stretched: number; depleted: number; total: number },
  stabilityPercent: number,
): string {
  const { resourced, stretched, depleted, total } = distribution;
  if (total === 0) return 'insufficient data';

  const rPct = resourced / total;
  const dPct = depleted / total;

  if (stabilityPercent >= 75 && rPct >= 0.5) {
    return 'sustained capacity with consistent patterns';
  }
  if (stabilityPercent >= 75 && dPct >= 0.3) {
    return 'persistent low capacity with limited variability';
  }
  if (stabilityPercent < 45) {
    return 'high day-to-day fluctuation in reported capacity';
  }
  if (dPct >= 0.4) {
    return 'recurrent capacity reduction episodes';
  }
  if (rPct < 0.2 && dPct < 0.2) {
    return 'mid-range capacity with moderate variation';
  }
  return 'mixed capacity patterns across the observation period';
}

/**
 * Determine recovery assessment from distribution shape.
 */
export function resolveRecoveryAssessment(
  distribution: { resourced: number; stretched: number; depleted: number; total: number },
  stabilityPercent: number,
): string {
  const { resourced, depleted, total } = distribution;
  if (total === 0) return 'not assessable';

  const rPct = resourced / total;
  const dPct = depleted / total;

  if (rPct >= 0.5 && dPct < 0.15) {
    return 'appears consistent with available resources for recovery';
  }
  if (rPct >= 0.3 && dPct < 0.3) {
    return 'shows periods of recovery interspersed with elevated load';
  }
  if (dPct >= 0.4 && stabilityPercent < 50) {
    return 'suggests limited recovery windows with sustained load';
  }
  if (dPct >= 0.3) {
    return 'indicates reduced capacity for self-regulation recovery';
  }
  return 'reflects a mixed recovery pattern warranting further observation';
}

// =============================================================================
// TEMPLATE EXPANSION
// =============================================================================

/**
 * Generate the narrative summary from computed data.
 * Returns a 3-4 sentence paragraph suitable for clinical session use.
 *
 * Template structure:
 * 1. Period + status + trend overview
 * 2. Primary pattern + recovery
 * 3. Driver focus (if available)
 * 4. Projection note (if declining)
 */
export function generateNarrative(
  data: CCIDynamicData,
  projection: CCIProjectionResult | null,
  topDriverLabel?: string,
): CCINarrativeResult {
  const status = resolveStatus(data.overallDistribution);
  const trendDirection = resolveTrendDirection(
    data.patternStabilityPercent,
    data.volatilityRaw,
  );
  const dominantPattern = resolveDominantPattern(
    data.overallDistribution,
    data.patternStabilityPercent,
  );
  const recoveryAssessment = resolveRecoveryAssessment(
    data.overallDistribution,
    data.patternStabilityPercent,
  );

  // Sentence 1: Period + status + stability
  const trendLabel = trendDirection === 'stable'
    ? 'a stable'
    : trendDirection === 'variable'
      ? 'a variable'
      : 'a shifting';

  const baseline = computeBaseline(data.overallDistribution);

  const sentence1 = `Over the past ${data.totalDaysInWindow} days, this individual's capacity has been ${status} with ${trendLabel} stability trend (${data.patternStabilityPercent}/100, from ${baseline}% baseline).`;

  // Sentence 2: Pattern + recovery
  const sentence2 = `The primary pattern is ${dominantPattern}, with recovery that ${recoveryAssessment}.`;

  // Sentence 3: Driver focus or general note
  let sentence3: string;
  if (topDriverLabel) {
    sentence3 = `The most frequently reported load factor is ${topDriverLabel}.`;
  } else {
    sentence3 = `No single load factor predominates in the reported data.`;
  }

  // Sentence 4: Projection note (only if declining)
  let sentence4 = '';
  if (projection && projection.hasOverloadRisk && projection.weeksToCritical !== null) {
    sentence4 = ` Current trajectory suggests capacity may reach a critical threshold within approximately ${projection.weeksToCritical} weeks if present patterns continue.`;
  }

  const summary = `${sentence1} ${sentence2} ${sentence3}${sentence4}`;

  return { summary };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Compute baseline percentage from distribution (weighted mean).
 */
function computeBaseline(distribution: {
  resourced: number;
  stretched: number;
  depleted: number;
  total: number;
}): number {
  const { resourced, stretched, depleted, total } = distribution;
  if (total === 0) return 50;
  const weighted = (resourced * 100 + stretched * 50 + depleted * 0) / total;
  return Math.round(weighted);
}
