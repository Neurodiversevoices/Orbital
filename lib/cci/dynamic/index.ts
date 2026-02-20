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
export type {
  CCIDynamicData,
  CCIFormattedStrings,
  CCIComputeConfig,
  CCIMonthlyBreakdown,
} from './types';
