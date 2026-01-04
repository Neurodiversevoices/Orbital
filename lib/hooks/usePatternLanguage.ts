/**
 * User-Facing Pattern Language Hook
 *
 * Computes and returns pattern concepts users can understand:
 * - Stability: How consistent capacity levels are
 * - Volatility: How much capacity fluctuates day-to-day
 * - Recovery Lag: How long it takes to bounce back from depletion
 */

import { useMemo } from 'react';
import { CapacityLog, CapacityState } from '../../types';

export type PatternStrength = 'low' | 'moderate' | 'high';

export interface PatternConcept {
  id: 'stability' | 'volatility' | 'recovery_lag';
  label: string;
  value: PatternStrength;
  score: number; // 0-100
  description: string;
  explanation: string;
  color: string;
  icon: 'anchor' | 'activity' | 'clock';
}

export interface PatternLanguageData {
  patterns: PatternConcept[];
  hasEnoughData: boolean;
  dataMessage: string;
  dominantPattern: PatternConcept | null;
}

const stateToValue = (state: CapacityState): number => {
  switch (state) {
    case 'resourced':
      return 100;
    case 'stretched':
      return 50;
    case 'depleted':
      return 0;
  }
};

/**
 * Calculate stability: consistency of capacity levels
 * High stability = small standard deviation
 */
function calculateStability(logs: CapacityLog[]): { score: number; strength: PatternStrength } {
  if (logs.length < 7) return { score: 0, strength: 'low' };

  const values = logs.map((l) => stateToValue(l.state));
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Lower stdDev = higher stability
  // StdDev range: 0 (perfectly stable) to ~50 (max volatility)
  const score = Math.max(0, Math.min(100, 100 - stdDev * 2));
  const strength: PatternStrength = score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low';

  return { score, strength };
}

/**
 * Calculate volatility: day-to-day fluctuations
 */
function calculateVolatility(logs: CapacityLog[]): { score: number; strength: PatternStrength } {
  if (logs.length < 7) return { score: 0, strength: 'low' };

  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  let totalChange = 0;
  let transitions = 0;

  for (let i = 1; i < sortedLogs.length; i++) {
    const prevValue = stateToValue(sortedLogs[i - 1].state);
    const currValue = stateToValue(sortedLogs[i].state);
    totalChange += Math.abs(currValue - prevValue);
    transitions++;
  }

  if (transitions === 0) return { score: 0, strength: 'low' };

  // Average change per transition
  // Range: 0 (no change) to 100 (always max change)
  const avgChange = totalChange / transitions;
  const score = Math.min(100, avgChange);
  const strength: PatternStrength = score >= 60 ? 'high' : score >= 30 ? 'moderate' : 'low';

  return { score, strength };
}

/**
 * Calculate recovery lag: time to recover from depleted state
 */
function calculateRecoveryLag(logs: CapacityLog[]): { score: number; strength: PatternStrength } {
  if (logs.length < 7) return { score: 0, strength: 'low' };

  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  const recoveryTimes: number[] = [];

  let depletedStartIndex: number | null = null;

  for (let i = 0; i < sortedLogs.length; i++) {
    const log = sortedLogs[i];

    if (log.state === 'depleted' && depletedStartIndex === null) {
      depletedStartIndex = i;
    } else if (log.state !== 'depleted' && depletedStartIndex !== null) {
      // Found recovery - count entries until recovery
      recoveryTimes.push(i - depletedStartIndex);
      depletedStartIndex = null;
    }
  }

  if (recoveryTimes.length === 0) {
    // No depletion episodes = no recovery lag data
    return { score: 0, strength: 'low' };
  }

  const avgRecovery = recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;

  // Score: lower recovery time = lower lag score (which is good)
  // We invert this for the UI: high lag score = slow recovery
  const score = Math.min(100, avgRecovery * 20); // Scale up for visibility
  const strength: PatternStrength = score >= 60 ? 'high' : score >= 30 ? 'moderate' : 'low';

  return { score, strength };
}

export function usePatternLanguage(logs: CapacityLog[]): PatternLanguageData {
  return useMemo(() => {
    const hasEnoughData = logs.length >= 7;

    if (!hasEnoughData) {
      return {
        patterns: [],
        hasEnoughData: false,
        dataMessage: `Log ${7 - logs.length} more signals to see your patterns`,
        dominantPattern: null,
      };
    }

    const stability = calculateStability(logs);
    const volatility = calculateVolatility(logs);
    const recoveryLag = calculateRecoveryLag(logs);

    const patterns: PatternConcept[] = [
      {
        id: 'stability',
        label: 'Stability',
        value: stability.strength,
        score: stability.score,
        description:
          stability.strength === 'high'
            ? 'Your capacity levels are consistent'
            : stability.strength === 'moderate'
            ? 'Your capacity has some variability'
            : 'Your capacity fluctuates significantly',
        explanation:
          'Stability measures how consistent your capacity levels are over time. High stability means your capacity tends to stay at similar levels.',
        color: '#00E5FF',
        icon: 'anchor',
      },
      {
        id: 'volatility',
        label: 'Volatility',
        value: volatility.strength,
        score: volatility.score,
        description:
          volatility.strength === 'high'
            ? 'Frequent shifts between states'
            : volatility.strength === 'moderate'
            ? 'Occasional state changes'
            : 'Gradual, smooth transitions',
        explanation:
          'Volatility measures how often and dramatically your capacity changes from one signal to the next. Lower volatility often indicates more predictable patterns.',
        color: '#FF9800',
        icon: 'activity',
      },
      {
        id: 'recovery_lag',
        label: 'Recovery Lag',
        value: recoveryLag.strength,
        score: recoveryLag.score,
        description:
          recoveryLag.strength === 'high'
            ? 'Recovery takes longer'
            : recoveryLag.strength === 'moderate'
            ? 'Moderate recovery time'
            : 'Quick bounce-back from depletion',
        explanation:
          'Recovery lag measures how long it typically takes you to move out of a depleted state. Understanding this can help you plan recovery time.',
        color: '#9C27B0',
        icon: 'clock',
      },
    ];

    // Find dominant pattern (highest score)
    const dominantPattern = [...patterns].sort((a, b) => b.score - a.score)[0];

    return {
      patterns,
      hasEnoughData: true,
      dataMessage: '',
      dominantPattern: dominantPattern.score > 0 ? dominantPattern : null,
    };
  }, [logs]);
}
