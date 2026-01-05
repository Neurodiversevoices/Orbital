/**
 * Experiment Mode Types
 *
 * Curiosity Engine - hypothesis testing without coaching.
 * User is the scientist. Orbital observes. No judgment.
 */

export type ExperimentStatus = 'active' | 'concluded' | 'abandoned';

export interface Experiment {
  id: string;
  hypothesis: string;
  triggerPattern: string;
  triggerDescription: string;
  startDate: string;
  endDate?: string;
  durationWeeks: number;
  status: ExperimentStatus;
  linkedSignalIds: string[];
  followedCount: number;
  notFollowedCount: number;
  skippedCount: number;
  createdAt: number;
  concludedAt?: number;
}

export interface ExperimentDay {
  experimentId: string;
  date: string;
  followed: 'yes' | 'no' | 'skipped' | null;
  signalIds: string[];
  capacityValues: number[];
}

export interface ExperimentSuggestion {
  id: string;
  patternType: string;
  patternDescription: string;
  question: string;
  hypotheses: string[];
}

export interface ExperimentResult {
  experimentId: string;
  hypothesis: string;
  durationDays: number;
  followedDays: { count: number; avgCapacity: number; distribution: { resourced: number; stretched: number; depleted: number } };
  notFollowedDays: { count: number; avgCapacity: number; distribution: { resourced: number; stretched: number; depleted: number } };
  correlationObserved: boolean;
  correlationDirection: 'positive' | 'negative' | 'neutral';
  summary: string;
}

export interface ExperimentPrompt {
  type: 'suggestion' | 'followup';
  experimentId?: string;
  suggestion?: ExperimentSuggestion;
  date?: string;
}

export const EXPERIMENT_CONSTANTS = {
  MAX_ACTIVE: 1,
  MIN_DURATION_WEEKS: 2,
  MAX_DURATION_WEEKS: 8,
  DEFAULT_DURATION_WEEKS: 4,
  MIN_DAYS_FOR_SUGGESTION: 14,
  COOLDOWN_DAYS_AFTER_DECLINE: 7,
  STORAGE_KEY: '@orbital:experiments',
  DAYS_KEY: '@orbital:experiment_days',
  LAST_PROMPT_KEY: '@orbital:experiment_last_prompt',
  DECLINED_PATTERNS_KEY: '@orbital:experiment_declined',
} as const;

export const OBSERVATIONAL_LANGUAGE = {
  intro: "You noticed a pattern.",
  question: "Would you like to explore this?",
  hypothesis: "What would you like to try?",
  tracking: "Experiment in progress",
  followup: "Did you follow your experiment today?",
  resultIntro: "Here's what was observed:",
  correlation: "Correlation observed. Causation unknown.",
  noCorrelation: "No clear pattern emerged.",
  closing: "What this means is up to you.",
  abandon: "You can stop this experiment anytime.",
  noJudgment: "There are no wrong answers.",
} as const;
