/**
 * useExperiments Hook
 *
 * React hook for experiment mode functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Experiment,
  ExperimentSuggestion,
  ExperimentResult,
  EXPERIMENT_CONSTANTS,
} from '../experiments/types';
import {
  getExperiments,
  getActiveExperiment,
  createExperiment,
  concludeExperiment,
  abandonExperiment,
  recordExperimentDay,
  linkSignalToExperiment,
  shouldPromptFollowup,
  declinePattern,
  setLastPromptDate,
} from '../experiments/storage';
import { getSuggestion } from '../experiments/suggestions';
import { analyzeExperiment } from '../experiments/analysis';
import { CapacityLog } from '../../types';

interface UseExperimentsReturn {
  experiments: Experiment[];
  activeExperiment: Experiment | null;
  currentSuggestion: ExperimentSuggestion | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  startExperiment: (hypothesis: string, suggestion: ExperimentSuggestion, durationWeeks?: number) => Promise<Experiment>;
  endExperiment: () => Promise<void>;
  abandonCurrentExperiment: () => Promise<void>;
  recordFollowup: (followed: 'yes' | 'no' | 'skipped', signalId?: string, capacityValue?: number) => Promise<void>;
  declineSuggestion: () => Promise<void>;
  getResults: (experimentId: string) => Promise<ExperimentResult | null>;
  checkForSuggestion: (logs: CapacityLog[]) => Promise<void>;
  needsFollowupToday: () => Promise<boolean>;
  linkSignal: (signalId: string) => Promise<void>;
}

export function useExperiments(): UseExperimentsReturn {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [activeExperiment, setActiveExperiment] = useState<Experiment | null>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState<ExperimentSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await getExperiments();
      const active = await getActiveExperiment();
      setExperiments(all);
      setActiveExperiment(active);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startExperiment = useCallback(async (
    hypothesis: string,
    suggestion: ExperimentSuggestion,
    durationWeeks: number = EXPERIMENT_CONSTANTS.DEFAULT_DURATION_WEEKS
  ): Promise<Experiment> => {
    const experiment = await createExperiment({
      hypothesis,
      triggerPattern: suggestion.patternType,
      triggerDescription: suggestion.patternDescription,
      durationWeeks,
    });
    setCurrentSuggestion(null);
    await refresh();
    return experiment;
  }, [refresh]);

  const endExperiment = useCallback(async () => {
    if (activeExperiment) {
      await concludeExperiment(activeExperiment.id);
      await refresh();
    }
  }, [activeExperiment, refresh]);

  const abandonCurrentExperiment = useCallback(async () => {
    if (activeExperiment) {
      await abandonExperiment(activeExperiment.id);
      await refresh();
    }
  }, [activeExperiment, refresh]);

  const recordFollowup = useCallback(async (
    followed: 'yes' | 'no' | 'skipped',
    signalId?: string,
    capacityValue?: number
  ) => {
    if (!activeExperiment) return;
    const today = new Date().toISOString().split('T')[0];
    await recordExperimentDay(activeExperiment.id, today, followed, signalId, capacityValue);
    await refresh();
  }, [activeExperiment, refresh]);

  const declineSuggestion = useCallback(async () => {
    if (currentSuggestion) {
      await declinePattern(currentSuggestion.patternType);
      await setLastPromptDate(new Date().toISOString().split('T')[0]);
      setCurrentSuggestion(null);
    }
  }, [currentSuggestion]);

  const getResults = useCallback(async (experimentId: string): Promise<ExperimentResult | null> => {
    const experiment = experiments.find(e => e.id === experimentId);
    if (!experiment) return null;
    return analyzeExperiment(experiment);
  }, [experiments]);

  const checkForSuggestion = useCallback(async (logs: CapacityLog[]) => {
    if (activeExperiment) {
      setCurrentSuggestion(null);
      return;
    }
    const suggestion = await getSuggestion(logs);
    setCurrentSuggestion(suggestion);
  }, [activeExperiment]);

  const needsFollowupToday = useCallback(async (): Promise<boolean> => {
    if (!activeExperiment) return false;
    const today = new Date().toISOString().split('T')[0];
    return shouldPromptFollowup(activeExperiment.id, today);
  }, [activeExperiment]);

  const linkSignal = useCallback(async (signalId: string) => {
    if (activeExperiment) {
      await linkSignalToExperiment(activeExperiment.id, signalId);
    }
  }, [activeExperiment]);

  return {
    experiments,
    activeExperiment,
    currentSuggestion,
    isLoading,
    refresh,
    startExperiment,
    endExperiment,
    abandonCurrentExperiment,
    recordFollowup,
    declineSuggestion,
    getResults,
    checkForSuggestion,
    needsFollowupToday,
    linkSignal,
  };
}
