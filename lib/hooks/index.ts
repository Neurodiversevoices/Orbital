// Core hooks
export { useEnergyLogs } from './useEnergyLogs';
export { useLocale, interpolate } from './useLocale';

// Export hooks
export { useExport } from './useExport';

// Sharing hooks
export { useSharing } from './useSharing';

// Enterprise hooks
export { useInstitutional } from './useInstitutional';
export { useSensoryAlert } from './useSensoryAlert';

// Mode hooks
export { useAppMode, AppModeProvider } from './useAppMode';
export { useDemoMode, DemoModeProvider } from './useDemoMode';

// Pattern & Milestone hooks
export { useMilestones } from './useMilestones';
export type { Milestone, MilestoneId, MilestonesData } from './useMilestones';
export { usePatternLanguage } from './usePatternLanguage';
export type { PatternConcept, PatternStrength, PatternLanguageData } from './usePatternLanguage';

// First-use experience hooks
export { useWhyOrbital } from './useWhyOrbital';

// App tenure tracking (for 30-day tease feature)
export { useAppTenure } from './useAppTenure';
export type { AppTenure } from './useAppTenure';

// Widget sync hooks
export { useWidgetSync, syncWidgetOnLog } from './useWidgetSync';

// Capacity Intelligence hooks
export { useCapacityIntelligence } from './useCapacityIntelligence';
export type { ProFeature } from './useCapacityIntelligence';

// Gap Analysis hooks (re-exported from lib/absence)
export { useGapAnalysis, useGapAnalysisFromSpan } from '../absence';
export type { UseGapAnalysisOptions, UseGapAnalysisReturn } from '../absence';
