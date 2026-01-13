import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { CapacityState } from '../../types';

let widgetModule: typeof import('../../modules/orbital-widget') | null = null;

if (Platform.OS === 'ios') {
  try {
    widgetModule = require('../../modules/orbital-widget');
  } catch (e) {
    if (__DEV__) console.log('[WidgetSync] Widget module not available');
  }
}

export function useWidgetSync(currentState: CapacityState | null) {
  const lastSyncedState = useRef<CapacityState | null>(null);

  const syncWidget = useCallback((state: CapacityState) => {
    if (!widgetModule || Platform.OS !== 'ios') {
      return;
    }

    if (lastSyncedState.current === state) {
      return;
    }

    try {
      widgetModule.updateWidgetFromCapacityState(state);
      lastSyncedState.current = state;
    } catch (e) {
      if (__DEV__) console.error('[WidgetSync] Failed to update widget:', e);
    }
  }, []);

  useEffect(() => {
    if (currentState) {
      syncWidget(currentState);
    }
  }, [currentState, syncWidget]);

  return {
    syncWidget,
    forceReload: useCallback(() => {
      if (widgetModule && Platform.OS === 'ios') {
        widgetModule.reloadWidget();
      }
    }, []),
  };
}

export function syncWidgetOnLog(state: CapacityState): void {
  if (!widgetModule || Platform.OS !== 'ios') {
    return;
  }

  try {
    widgetModule.updateWidgetFromCapacityState(state);
  } catch (e) {
    if (__DEV__) console.error('[WidgetSync] Failed to sync widget on log:', e);
  }
}
