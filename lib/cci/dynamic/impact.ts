/**
 * CCI Functional Impact Mapper
 *
 * Maps computed CCI metrics to clinical-adjacent severity labels.
 * Deterministic mapping — no ML, no LLM, no randomness.
 *
 * Severity levels: LOW | MODERATE | ELEVATED | HIGH | CRITICAL
 *
 * Pure functions. No side effects. No async. No DOM.
 */

import { CCIDynamicData } from './types';
import { CCIProjectionResult } from './projection';

// =============================================================================
// TYPES
// =============================================================================

export type SeverityLevel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface FunctionalImpactItem {
  /** Impact domain label */
  domain: string;
  /** Severity level */
  severity: SeverityLevel;
  /** Short descriptor for the severity */
  descriptor: string;
}

export interface CCIFunctionalImpact {
  /** All impact assessments */
  items: FunctionalImpactItem[];
  /** Intervention targets ordered by priority */
  interventionTargets: InterventionTarget[];
  /** Observed strengths */
  strengths: string[];
  /** Recent patterns (short descriptors) */
  recentPatterns: string[];
}

export interface InterventionTarget {
  /** Priority rank (1 = highest) */
  priority: number;
  /** Target label */
  label: string;
  /** Brief rationale */
  rationale: string;
}

// =============================================================================
// SEVERITY COLORS (for HTML rendering)
// =============================================================================

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  LOW: '#00E5FF',
  MODERATE: '#A8D8EA',
  ELEVATED: '#E8A830',
  HIGH: '#FF6B35',
  CRITICAL: '#F44336',
};

// =============================================================================
// IMPACT MAPPERS
// =============================================================================

/**
 * Work Performance: based on depleted% and trend direction.
 */
function assessWorkPerformance(
  depletedPercent: number,
  trendRate: number | null,
): FunctionalImpactItem {
  let severity: SeverityLevel;
  let descriptor: string;

  if (depletedPercent >= 50) {
    severity = trendRate !== null && trendRate < -3 ? 'CRITICAL' : 'HIGH';
    descriptor = severity === 'CRITICAL'
      ? 'Sustained functional reduction with accelerating decline'
      : 'Sustained functional reduction observed';
  } else if (depletedPercent >= 30) {
    severity = 'ELEVATED';
    descriptor = 'Intermittent functional reduction patterns';
  } else if (depletedPercent >= 15) {
    severity = 'MODERATE';
    descriptor = 'Occasional capacity-related functional shifts';
  } else {
    severity = 'LOW';
    descriptor = 'Functional capacity within sustainable range';
  }

  return { domain: 'Work Performance', severity, descriptor };
}

/**
 * Overload Risk: based on projection weeks-to-critical.
 */
function assessOverloadRisk(
  projection: CCIProjectionResult | null,
  depletedPercent: number,
): FunctionalImpactItem {
  let severity: SeverityLevel;
  let descriptor: string;

  if (projection && projection.weeksToCritical !== null) {
    if (projection.weeksToCritical < 4) {
      severity = 'CRITICAL';
      descriptor = `Projected critical threshold within ${projection.weeksToCritical} weeks`;
    } else if (projection.weeksToCritical < 8) {
      severity = 'HIGH';
      descriptor = `Projected capacity reduction within ${projection.weeksToCritical} weeks`;
    } else {
      severity = 'ELEVATED';
      descriptor = 'Declining trajectory warrants monitoring';
    }
  } else if (depletedPercent >= 40) {
    severity = 'ELEVATED';
    descriptor = 'Elevated depletion frequency without clear trajectory';
  } else if (depletedPercent >= 20) {
    severity = 'MODERATE';
    descriptor = 'Moderate depletion frequency within expected range';
  } else {
    severity = 'LOW';
    descriptor = 'No significant overload indicators';
  }

  return { domain: 'Overload Risk', severity, descriptor };
}

/**
 * Recovery Capacity: based on distribution shape.
 * High resourced% = good recovery. High depleted% = poor recovery.
 */
function assessRecoveryCapacity(
  resourcedPercent: number,
  stabilityPercent: number,
): FunctionalImpactItem {
  let severity: SeverityLevel;
  let descriptor: string;

  if (resourcedPercent >= 50 && stabilityPercent >= 60) {
    severity = 'LOW';
    descriptor = 'Consistent recovery patterns observed';
  } else if (resourcedPercent >= 35) {
    severity = 'MODERATE';
    descriptor = 'Partial recovery patterns with some variability';
  } else if (resourcedPercent >= 20) {
    severity = 'ELEVATED';
    descriptor = 'Limited recovery windows identified';
  } else if (stabilityPercent < 40) {
    severity = 'HIGH';
    descriptor = 'Minimal recovery periods with high instability';
  } else {
    severity = 'HIGH';
    descriptor = 'Reduced recovery capacity observed';
  }

  return { domain: 'Recovery Capacity', severity, descriptor };
}

/**
 * Social Functioning: based on social driver correlation.
 * Uses the ratio of social-tagged entries to total entries.
 */
function assessSocialFunctioning(
  socialDriverPercent: number,
  depletedPercent: number,
): FunctionalImpactItem {
  let severity: SeverityLevel;
  let descriptor: string;

  // Combined score: social load frequency + overall depletion
  const combinedScore = socialDriverPercent * 0.6 + depletedPercent * 0.4;

  if (combinedScore >= 45) {
    severity = 'HIGH';
    descriptor = 'Elevated social load with capacity impact';
  } else if (combinedScore >= 30) {
    severity = 'ELEVATED';
    descriptor = 'Social demands contributing to load patterns';
  } else if (combinedScore >= 15) {
    severity = 'MODERATE';
    descriptor = 'Social factors present in load profile';
  } else {
    severity = 'LOW';
    descriptor = 'Social functioning within reported norms';
  }

  return { domain: 'Social Functioning', severity, descriptor };
}

// =============================================================================
// INTERVENTION TARGETS
// =============================================================================

function deriveInterventionTargets(
  items: FunctionalImpactItem[],
  topDriver: string | null,
  projection: CCIProjectionResult | null,
): InterventionTarget[] {
  const targets: InterventionTarget[] = [];
  let priority = 1;

  // Sort items by severity (CRITICAL first)
  const severityOrder: Record<SeverityLevel, number> = {
    CRITICAL: 5,
    HIGH: 4,
    ELEVATED: 3,
    MODERATE: 2,
    LOW: 1,
  };

  const sorted = [...items].sort(
    (a, b) => severityOrder[b.severity] - severityOrder[a.severity],
  );

  // Top severity domain becomes #1 target
  if (sorted[0] && severityOrder[sorted[0].severity] >= 3) {
    targets.push({
      priority: priority++,
      label: sorted[0].domain,
      rationale: sorted[0].descriptor,
    });
  }

  // If projection shows overload, add trajectory monitoring
  if (projection && projection.hasOverloadRisk) {
    targets.push({
      priority: priority++,
      label: 'Trajectory Monitoring',
      rationale: `Current rate: ${projection.trendRate} pts/week`,
    });
  }

  // Top driver as target
  if (topDriver) {
    targets.push({
      priority: priority++,
      label: `${topDriver} Load Management`,
      rationale: `Most frequently reported load factor`,
    });
  }

  // Recovery if elevated or higher
  const recoveryItem = items.find(i => i.domain === 'Recovery Capacity');
  if (recoveryItem && severityOrder[recoveryItem.severity] >= 3) {
    targets.push({
      priority: priority++,
      label: 'Recovery Window Expansion',
      rationale: recoveryItem.descriptor,
    });
  }

  return targets.slice(0, 4); // Max 4 targets
}

// =============================================================================
// STRENGTHS & PATTERNS
// =============================================================================

function deriveStrengths(data: CCIDynamicData): string[] {
  const strengths: string[] = [];
  const { resourced, total } = data.overallDistribution;
  const rPct = total > 0 ? (resourced / total) * 100 : 0;

  if (data.trackingContinuityPercent >= 70) {
    strengths.push('Consistent engagement with self-monitoring');
  }
  if (rPct >= 40) {
    strengths.push('Sustained periods of resourced capacity');
  }
  if (data.patternStabilityPercent >= 70) {
    strengths.push('Stable capacity patterns over time');
  }
  if (data.daysWithEntries >= 60) {
    strengths.push('Extended longitudinal record available');
  }
  if (rPct >= 25 && data.overallDistribution.depleted / total < 0.2) {
    strengths.push('Limited depletion episodes');
  }

  return strengths.slice(0, 4); // Max 4 strengths
}

function deriveRecentPatterns(
  data: CCIDynamicData,
  projection: CCIProjectionResult | null,
): string[] {
  const patterns: string[] = [];

  // Stability descriptor
  if (data.patternStabilityPercent >= 75) {
    patterns.push('Stable day-to-day patterns');
  } else if (data.patternStabilityPercent < 45) {
    patterns.push('High day-to-day variability');
  } else {
    patterns.push('Moderate pattern variability');
  }

  // Distribution descriptor
  const { resourced, depleted, total } = data.overallDistribution;
  if (total > 0) {
    const dPct = (depleted / total) * 100;
    if (dPct >= 30) {
      patterns.push('Recurrent capacity reduction');
    } else if (dPct >= 15) {
      patterns.push('Occasional capacity dips');
    }

    const rPct = (resourced / total) * 100;
    if (rPct >= 50) {
      patterns.push('Predominantly resourced periods');
    }
  }

  // Projection pattern
  if (projection && projection.hasOverloadRisk) {
    patterns.push('Declining capacity trajectory');
  }

  return patterns.slice(0, 4);
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Map computed CCI metrics to functional impact assessment.
 *
 * @param data Computed CCI dynamic data
 * @param projection Projection result (null if no declining trend)
 * @param driverStats Optional driver correlation percentages
 */
export function mapFunctionalImpact(
  data: CCIDynamicData,
  projection: CCIProjectionResult | null,
  driverStats?: { sensory: number; demand: number; social: number },
): CCIFunctionalImpact {
  const { resourced, depleted, total } = data.overallDistribution;
  const depletedPercent = total > 0 ? (depleted / total) * 100 : 0;
  const resourcedPercent = total > 0 ? (resourced / total) * 100 : 0;
  const socialPercent = driverStats?.social ?? 0;

  const trendRate = projection?.trendRate ?? null;

  // Compute impact items
  const items: FunctionalImpactItem[] = [
    assessWorkPerformance(depletedPercent, trendRate),
    assessOverloadRisk(projection, depletedPercent),
    assessRecoveryCapacity(resourcedPercent, data.patternStabilityPercent),
    assessSocialFunctioning(socialPercent, depletedPercent),
  ];

  // Determine top driver label
  let topDriver: string | null = null;
  if (driverStats) {
    const max = Math.max(driverStats.sensory, driverStats.demand, driverStats.social);
    if (max > 0) {
      if (driverStats.sensory === max) topDriver = 'Sensory';
      else if (driverStats.demand === max) topDriver = 'Demand';
      else topDriver = 'Social';
    }
  }

  const interventionTargets = deriveInterventionTargets(items, topDriver, projection);
  const strengths = deriveStrengths(data);
  const recentPatterns = deriveRecentPatterns(data, projection);

  return { items, interventionTargets, strengths, recentPatterns };
}
