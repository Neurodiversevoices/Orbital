/**
 * QSB Data Hook
 *
 * Unified hook for accessing all QSB data with scope support.
 * Personal scope uses local signals, Org/Global use demo data (API-ready structure).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  QSBScope,
  QSIData,
  LoadFrictionData,
  RecoveryElasticityData,
  EarlyDriftData,
  InterventionSensitivityData,
  QSBOverviewData,
  QSBResult,
  MIN_COHORT_SIZE,
  InsufficientDataError,
} from './types';
import {
  generateQSIDemo,
  generateLoadFrictionDemo,
  generateRecoveryElasticityDemo,
  generateEarlyDriftDemo,
  generateInterventionSensitivityDemo,
} from './demoData';
import { useEnergyLogs } from '../hooks/useEnergyLogs';

interface UseQSBDataOptions {
  scope: QSBScope;
  orgId?: string;
}

interface UseQSBDataReturn {
  // Individual data fetchers
  qsi: QSBResult<QSIData> | null;
  loadFriction: QSBResult<LoadFrictionData> | null;
  recoveryElasticity: QSBResult<RecoveryElasticityData> | null;
  earlyDrift: QSBResult<EarlyDriftData> | null;
  interventionSensitivity: QSBResult<InterventionSensitivityData> | null;

  // Overview (all combined)
  overview: QSBResult<QSBOverviewData> | null;

  // State
  isLoading: boolean;
  scope: QSBScope;
  setScope: (scope: QSBScope) => void;

  // Refresh
  refresh: () => void;
}

// Minimum signals required for personal scope
const MIN_PERSONAL_SIGNALS = 7;

export function useQSBData(options: UseQSBDataOptions): UseQSBDataReturn {
  const [scope, setScope] = useState<QSBScope>(options.scope);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const { logs } = useEnergyLogs();

  // Check if we have enough personal data
  const hasEnoughPersonalData = useMemo(() => {
    return logs.length >= MIN_PERSONAL_SIGNALS;
  }, [logs.length]);

  // Create insufficient data error
  const createInsufficientError = useCallback((
    type: 'insufficient_cohort' | 'insufficient_signals' | 'no_data',
    required: number,
    actual: number
  ): InsufficientDataError => ({
    type,
    message: type === 'insufficient_cohort'
      ? `Not enough participants. Requires ${required}, but only ${actual} in cohort.`
      : type === 'insufficient_signals'
      ? `Not enough signals. Log at least ${required} capacity signals to see this data.`
      : 'No data available.',
    required,
    actual,
  }), []);

  // Generate QSI data
  const qsi = useMemo((): QSBResult<QSIData> | null => {
    if (scope === 'personal' && !hasEnoughPersonalData) {
      return {
        success: false,
        error: createInsufficientError('insufficient_signals', MIN_PERSONAL_SIGNALS, logs.length),
      };
    }

    // For now, all scopes use demo data
    // Personal scope would compute from logs in production
    return {
      success: true,
      data: generateQSIDemo(scope),
    };
  }, [scope, hasEnoughPersonalData, logs.length, createInsufficientError, refreshKey]);

  // Generate Load Friction data
  const loadFriction = useMemo((): QSBResult<LoadFrictionData> | null => {
    if (scope === 'personal' && !hasEnoughPersonalData) {
      return {
        success: false,
        error: createInsufficientError('insufficient_signals', MIN_PERSONAL_SIGNALS, logs.length),
      };
    }

    return {
      success: true,
      data: generateLoadFrictionDemo(scope),
    };
  }, [scope, hasEnoughPersonalData, logs.length, createInsufficientError, refreshKey]);

  // Generate Recovery Elasticity data
  const recoveryElasticity = useMemo((): QSBResult<RecoveryElasticityData> | null => {
    if (scope === 'personal' && !hasEnoughPersonalData) {
      return {
        success: false,
        error: createInsufficientError('insufficient_signals', MIN_PERSONAL_SIGNALS, logs.length),
      };
    }

    return {
      success: true,
      data: generateRecoveryElasticityDemo(scope),
    };
  }, [scope, hasEnoughPersonalData, logs.length, createInsufficientError, refreshKey]);

  // Generate Early Drift data
  const earlyDrift = useMemo((): QSBResult<EarlyDriftData> | null => {
    if (scope === 'personal' && !hasEnoughPersonalData) {
      return {
        success: false,
        error: createInsufficientError('insufficient_signals', MIN_PERSONAL_SIGNALS, logs.length),
      };
    }

    return {
      success: true,
      data: generateEarlyDriftDemo(scope),
    };
  }, [scope, hasEnoughPersonalData, logs.length, createInsufficientError, refreshKey]);

  // Generate Intervention Sensitivity data
  const interventionSensitivity = useMemo((): QSBResult<InterventionSensitivityData> | null => {
    if (scope === 'personal' && !hasEnoughPersonalData) {
      return {
        success: false,
        error: createInsufficientError('insufficient_signals', MIN_PERSONAL_SIGNALS, logs.length),
      };
    }

    return {
      success: true,
      data: generateInterventionSensitivityDemo(scope),
    };
  }, [scope, hasEnoughPersonalData, logs.length, createInsufficientError, refreshKey]);

  // Generate Overview (all combined)
  const overview = useMemo((): QSBResult<QSBOverviewData> | null => {
    if (scope === 'personal' && !hasEnoughPersonalData) {
      return {
        success: false,
        error: createInsufficientError('insufficient_signals', MIN_PERSONAL_SIGNALS, logs.length),
      };
    }

    return {
      success: true,
      data: {
        qsi: generateQSIDemo(scope),
        loadFriction: generateLoadFrictionDemo(scope),
        recoveryElasticity: generateRecoveryElasticityDemo(scope),
        earlyDrift: generateEarlyDriftDemo(scope),
        interventionSensitivity: generateInterventionSensitivityDemo(scope),
        generatedAt: new Date().toISOString(),
        scope,
        isDemo: true,
      },
    };
  }, [scope, hasEnoughPersonalData, logs.length, createInsufficientError, refreshKey]);

  // Simulate loading state
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [scope, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return {
    qsi,
    loadFriction,
    recoveryElasticity,
    earlyDrift,
    interventionSensitivity,
    overview,
    isLoading,
    scope,
    setScope,
    refresh,
  };
}

// Export individual hooks for each QSB feature
export function useQSI(scope: QSBScope = 'personal') {
  const { qsi, isLoading, setScope, refresh } = useQSBData({ scope });
  return { data: qsi, isLoading, setScope, refresh };
}

export function useLoadFriction(scope: QSBScope = 'personal') {
  const { loadFriction, isLoading, setScope, refresh } = useQSBData({ scope });
  return { data: loadFriction, isLoading, setScope, refresh };
}

export function useRecoveryElasticity(scope: QSBScope = 'personal') {
  const { recoveryElasticity, isLoading, setScope, refresh } = useQSBData({ scope });
  return { data: recoveryElasticity, isLoading, setScope, refresh };
}

export function useEarlyDrift(scope: QSBScope = 'personal') {
  const { earlyDrift, isLoading, setScope, refresh } = useQSBData({ scope });
  return { data: earlyDrift, isLoading, setScope, refresh };
}

export function useInterventionSensitivity(scope: QSBScope = 'personal') {
  const { interventionSensitivity, isLoading, setScope, refresh } = useQSBData({ scope });
  return { data: interventionSensitivity, isLoading, setScope, refresh };
}
