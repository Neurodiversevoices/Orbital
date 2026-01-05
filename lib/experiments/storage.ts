/**
 * Experiment Storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Experiment,
  ExperimentDay,
  ExperimentStatus,
  EXPERIMENT_CONSTANTS,
} from './types';

const { STORAGE_KEY, DAYS_KEY, LAST_PROMPT_KEY, DECLINED_PATTERNS_KEY } = EXPERIMENT_CONSTANTS;

function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function getExperiments(): Promise<Experiment[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function getExperiment(id: string): Promise<Experiment | null> {
  const experiments = await getExperiments();
  return experiments.find(e => e.id === id) || null;
}

export async function getActiveExperiment(): Promise<Experiment | null> {
  const experiments = await getExperiments();
  return experiments.find(e => e.status === 'active') || null;
}

export async function createExperiment(data: {
  hypothesis: string;
  triggerPattern: string;
  triggerDescription: string;
  durationWeeks: number;
}): Promise<Experiment> {
  const experiments = await getExperiments();
  const active = experiments.find(e => e.status === 'active');
  if (active) {
    throw new Error('An experiment is already active. Conclude or abandon it first.');
  }
  const experiment: Experiment = {
    id: generateId(),
    hypothesis: data.hypothesis,
    triggerPattern: data.triggerPattern,
    triggerDescription: data.triggerDescription,
    startDate: new Date().toISOString().split('T')[0],
    durationWeeks: data.durationWeeks,
    status: 'active',
    linkedSignalIds: [],
    followedCount: 0,
    notFollowedCount: 0,
    skippedCount: 0,
    createdAt: Date.now(),
  };
  experiments.unshift(experiment);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(experiments));
  return experiment;
}

export async function updateExperiment(id: string, updates: Partial<Experiment>): Promise<Experiment | null> {
  const experiments = await getExperiments();
  const index = experiments.findIndex(e => e.id === id);
  if (index === -1) return null;
  experiments[index] = { ...experiments[index], ...updates };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(experiments));
  return experiments[index];
}

export async function concludeExperiment(id: string): Promise<Experiment | null> {
  return updateExperiment(id, {
    status: 'concluded',
    endDate: new Date().toISOString().split('T')[0],
    concludedAt: Date.now(),
  });
}

export async function abandonExperiment(id: string): Promise<Experiment | null> {
  return updateExperiment(id, {
    status: 'abandoned',
    endDate: new Date().toISOString().split('T')[0],
    concludedAt: Date.now(),
  });
}

export async function linkSignalToExperiment(experimentId: string, signalId: string): Promise<void> {
  const experiment = await getExperiment(experimentId);
  if (!experiment || experiment.status !== 'active') return;
  if (!experiment.linkedSignalIds.includes(signalId)) {
    await updateExperiment(experimentId, {
      linkedSignalIds: [...experiment.linkedSignalIds, signalId],
    });
  }
}

export async function getExperimentDays(experimentId: string): Promise<ExperimentDay[]> {
  const data = await AsyncStorage.getItem(DAYS_KEY);
  const allDays: ExperimentDay[] = data ? JSON.parse(data) : [];
  return allDays.filter(d => d.experimentId === experimentId);
}

export async function recordExperimentDay(
  experimentId: string,
  date: string,
  followed: 'yes' | 'no' | 'skipped',
  signalId?: string,
  capacityValue?: number
): Promise<void> {
  const data = await AsyncStorage.getItem(DAYS_KEY);
  const allDays: ExperimentDay[] = data ? JSON.parse(data) : [];
  const existingIndex = allDays.findIndex(d => d.experimentId === experimentId && d.date === date);
  if (existingIndex >= 0) {
    allDays[existingIndex].followed = followed;
    if (signalId && !allDays[existingIndex].signalIds.includes(signalId)) {
      allDays[existingIndex].signalIds.push(signalId);
    }
    if (capacityValue !== undefined) {
      allDays[existingIndex].capacityValues.push(capacityValue);
    }
  } else {
    allDays.push({
      experimentId,
      date,
      followed,
      signalIds: signalId ? [signalId] : [],
      capacityValues: capacityValue !== undefined ? [capacityValue] : [],
    });
  }
  await AsyncStorage.setItem(DAYS_KEY, JSON.stringify(allDays));
  const experiment = await getExperiment(experimentId);
  if (experiment) {
    const updates: Partial<Experiment> = {};
    if (followed === 'yes') updates.followedCount = experiment.followedCount + 1;
    else if (followed === 'no') updates.notFollowedCount = experiment.notFollowedCount + 1;
    else if (followed === 'skipped') updates.skippedCount = experiment.skippedCount + 1;
    await updateExperiment(experimentId, updates);
  }
}

export async function getLastPromptDate(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_PROMPT_KEY);
}

export async function setLastPromptDate(date: string): Promise<void> {
  await AsyncStorage.setItem(LAST_PROMPT_KEY, date);
}

export async function getDeclinedPatterns(): Promise<{ pattern: string; declinedAt: number }[]> {
  const data = await AsyncStorage.getItem(DECLINED_PATTERNS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function declinePattern(pattern: string): Promise<void> {
  const declined = await getDeclinedPatterns();
  declined.push({ pattern, declinedAt: Date.now() });
  await AsyncStorage.setItem(DECLINED_PATTERNS_KEY, JSON.stringify(declined));
}

export async function isPatternDeclined(pattern: string): Promise<boolean> {
  const declined = await getDeclinedPatterns();
  const cooldownMs = EXPERIMENT_CONSTANTS.COOLDOWN_DAYS_AFTER_DECLINE * 24 * 60 * 60 * 1000;
  const recent = declined.find(d => d.pattern === pattern && Date.now() - d.declinedAt < cooldownMs);
  return !!recent;
}

export async function isExperimentDateActive(experimentId: string, date: string): Promise<boolean> {
  const experiment = await getExperiment(experimentId);
  if (!experiment || experiment.status !== 'active') return false;
  const start = new Date(experiment.startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + experiment.durationWeeks * 7);
  const check = new Date(date);
  return check >= start && check <= end;
}

export async function shouldPromptFollowup(experimentId: string, date: string): Promise<boolean> {
  const days = await getExperimentDays(experimentId);
  const existing = days.find(d => d.date === date);
  return !existing || existing.followed === null;
}
