/**
 * Dynamic CCI v1 — Module Entry Point
 */

export { computeCCIDynamicData } from './compute';
export { formatCCIDynamicData } from './format';
export {
  assertGovernanceCompliance,
  findProhibitedWords,
  PROHIBITED_IN_CCI,
  ALL_VERDICT_STRINGS,
} from './governance';
export { computeProjection } from './projection';
export type { CCIProjectionResult } from './projection';
export { generateNarrative } from './narrative';
export type { CCINarrativeInput, CCINarrativeResult } from './narrative';
export { mapFunctionalImpact, SEVERITY_COLORS } from './impact';
export type {
  SeverityLevel,
  FunctionalImpactItem,
  CCIFunctionalImpact,
  InterventionTarget,
} from './impact';
export type {
  CCIDynamicData,
  CCIFormattedStrings,
  CCIComputeConfig,
  CCIMonthlyBreakdown,
} from './types';
