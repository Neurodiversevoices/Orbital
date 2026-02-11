import { useState, useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import {
  SensoryAlertConfig,
  SensoryAlertEvent,
} from '../../types';
import {
  startSensoryMonitoring,
  stopSensoryMonitoring,
  isMonitoring as checkIsMonitoring,
  getCurrentLevel,
  getSensoryConfig,
  saveSensoryConfig,
  getSensoryEvents,
  acknowledgeSensoryEvent,
  configureQuietHours,
} from '../sensory';

interface UseSensoryAlertReturn {
  config: SensoryAlertConfig | null;
  events: SensoryAlertEvent[];
  isMonitoring: boolean;
  currentNoiseLevel: number;
  unacknowledgedCount: number;
  isLoading: boolean;
  startMonitoring: () => Promise<boolean>;
  stopMonitoring: () => Promise<void>;
  updateConfig: (updates: Partial<SensoryAlertConfig>) => Promise<void>;
  setQuietHours: (start: string, end: string) => Promise<void>;
  acknowledgeEvent: (eventId: string) => Promise<void>;
  acknowledgeAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSensoryAlert(): UseSensoryAlertReturn {
  const [config, setConfig] = useState<SensoryAlertConfig | null>(null);
  const [events, setEvents] = useState<SensoryAlertEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentNoiseLevel, setCurrentNoiseLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [cfg, evts] = await Promise.all([
        getSensoryConfig(),
        getSensoryEvents(),
      ]);
      setConfig(cfg);
      setEvents(evts);
      setIsMonitoring(checkIsMonitoring());
    } catch (error) {
      Sentry.captureException(error, { tags: { hook: 'useSensoryAlert' } });
      if (__DEV__) console.error('[Orbital Sensory] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update current noise level periodically when monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setCurrentNoiseLevel(getCurrentLevel());
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const startMonitoring = useCallback(async (): Promise<boolean> => {
    const success = await startSensoryMonitoring();
    setIsMonitoring(success);
    return success;
  }, []);

  const stopMonitoring = useCallback(async (): Promise<void> => {
    await stopSensoryMonitoring();
    setIsMonitoring(false);
    setCurrentNoiseLevel(0);
  }, []);

  const updateConfig = useCallback(async (updates: Partial<SensoryAlertConfig>) => {
    await saveSensoryConfig(updates);
    await loadData();
  }, [loadData]);

  const setQuietHours = useCallback(async (start: string, end: string) => {
    await configureQuietHours(start, end);
    await loadData();
  }, [loadData]);

  const acknowledgeEvent = useCallback(async (eventId: string) => {
    await acknowledgeSensoryEvent(eventId);
    await loadData();
  }, [loadData]);

  const acknowledgeAll = useCallback(async () => {
    const unacknowledged = events.filter((e) => !e.acknowledged);
    for (const event of unacknowledged) {
      await acknowledgeSensoryEvent(event.id);
    }
    await loadData();
  }, [events, loadData]);

  const unacknowledgedCount = events.filter((e) => !e.acknowledged).length;

  return {
    config,
    events,
    isMonitoring,
    currentNoiseLevel,
    unacknowledgedCount,
    isLoading,
    startMonitoring,
    stopMonitoring,
    updateConfig,
    setQuietHours,
    acknowledgeEvent,
    acknowledgeAll,
    refresh: loadData,
  };
}
