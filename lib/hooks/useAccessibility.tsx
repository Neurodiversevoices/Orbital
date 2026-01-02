/**
 * Orbital Accessibility Hook
 *
 * Provides app-wide accessibility settings with AsyncStorage persistence.
 * Supports visual, motor, cognitive, audio, and data accessibility features.
 *
 * Usage:
 *   const { settings, updateSetting, triggerHaptic, getTheme } = useAccessibility();
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { STORAGE_KEYS } from '../storage';
import {
  AccessibilitySettings,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  ACCESSIBLE_THEMES,
  TEXT_SIZE_MULTIPLIERS,
  BUTTON_SIZE_MULTIPLIERS,
  HapticPattern,
  HapticIntensity,
  UndoAction,
  ColorBlindMode,
} from '../../types';

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => Promise<void>;
  resetSettings: () => Promise<void>;

  // Theme helpers
  getTheme: () => typeof ACCESSIBLE_THEMES.default;
  getTextScale: () => number;
  getButtonScale: () => number;

  // Haptic helpers
  triggerHaptic: (pattern: HapticPattern) => void;

  // Undo stack
  pushUndo: (action: Omit<UndoAction, 'id' | 'timestamp' | 'expiresAt'>) => Promise<string>;
  popUndo: () => Promise<UndoAction | null>;
  peekUndo: () => UndoAction | null;
  clearUndo: () => Promise<void>;

  // Offline queue
  isOnline: boolean;
  queueOfflineAction: (action: unknown) => Promise<void>;
  processOfflineQueue: () => Promise<void>;

  // Loading state
  isLoaded: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

interface AccessibilityProviderProps {
  children: ReactNode;
}

const UNDO_EXPIRY_MS = 30000; // 30 seconds to undo

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY_SETTINGS);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.ACCESSIBILITY);
        if (data) {
          const saved = JSON.parse(data);
          setSettings({ ...DEFAULT_ACCESSIBILITY_SETTINGS, ...saved });
        }

        // Load undo stack
        const undoData = await AsyncStorage.getItem(STORAGE_KEYS.UNDO_STACK);
        if (undoData) {
          const stack: UndoAction[] = JSON.parse(undoData);
          // Filter out expired actions
          const now = Date.now();
          setUndoStack(stack.filter(a => a.expiresAt > now));
        }
      } catch (error) {
        console.error('[Accessibility] Failed to load settings:', error);
      }
      setIsLoaded(true);
    };
    loadSettings();
  }, []);

  // Save settings
  const saveSettings = useCallback(async (newSettings: AccessibilitySettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESSIBILITY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('[Accessibility] Failed to save settings:', error);
    }
  }, []);

  // Update single setting
  const updateSetting = useCallback(async <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Reset all settings
  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
    await saveSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
  }, [saveSettings]);

  // Get current theme based on settings
  const getTheme = useCallback(() => {
    if (settings.highContrast) {
      return ACCESSIBLE_THEMES.highContrast;
    }
    if (settings.colorBlindMode !== 'none') {
      return ACCESSIBLE_THEMES[settings.colorBlindMode as keyof typeof ACCESSIBLE_THEMES] || ACCESSIBLE_THEMES.default;
    }
    return ACCESSIBLE_THEMES.default;
  }, [settings.highContrast, settings.colorBlindMode]);

  // Get text scale multiplier
  const getTextScale = useCallback(() => {
    return TEXT_SIZE_MULTIPLIERS[settings.textSize];
  }, [settings.textSize]);

  // Get button scale multiplier
  const getButtonScale = useCallback(() => {
    if (settings.bigButtonMode) {
      return BUTTON_SIZE_MULTIPLIERS[settings.buttonSize];
    }
    return 1;
  }, [settings.bigButtonMode, settings.buttonSize]);

  // Trigger haptic feedback
  const triggerHaptic = useCallback((pattern: HapticPattern) => {
    if (!settings.hapticFeedback || settings.hapticIntensity === 'off') {
      return;
    }

    const intensityMap: Record<HapticIntensity, number> = {
      off: 0,
      light: 0.3,
      medium: 0.6,
      strong: 1,
    };

    const intensity = intensityMap[settings.hapticIntensity];

    switch (pattern) {
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
      case 'impact':
        if (intensity < 0.5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (intensity < 0.8) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        break;
    }
  }, [settings.hapticFeedback, settings.hapticIntensity]);

  // Undo stack management
  const saveUndoStack = useCallback(async (stack: UndoAction[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UNDO_STACK, JSON.stringify(stack));
    } catch (error) {
      console.error('[Accessibility] Failed to save undo stack:', error);
    }
  }, []);

  const pushUndo = useCallback(async (action: Omit<UndoAction, 'id' | 'timestamp' | 'expiresAt'>) => {
    if (!settings.undoEnabled) return '';

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newAction: UndoAction = {
      ...action,
      id,
      timestamp: Date.now(),
      expiresAt: Date.now() + UNDO_EXPIRY_MS,
    };

    const newStack = [newAction, ...undoStack].slice(0, 10); // Keep max 10
    setUndoStack(newStack);
    await saveUndoStack(newStack);
    return id;
  }, [settings.undoEnabled, undoStack, saveUndoStack]);

  const popUndo = useCallback(async () => {
    if (undoStack.length === 0) return null;

    const [action, ...rest] = undoStack;
    if (action.expiresAt < Date.now()) {
      setUndoStack(rest);
      await saveUndoStack(rest);
      return null;
    }

    setUndoStack(rest);
    await saveUndoStack(rest);
    return action;
  }, [undoStack, saveUndoStack]);

  const peekUndo = useCallback(() => {
    if (undoStack.length === 0) return null;
    const action = undoStack[0];
    if (action.expiresAt < Date.now()) return null;
    return action;
  }, [undoStack]);

  const clearUndo = useCallback(async () => {
    setUndoStack([]);
    await AsyncStorage.removeItem(STORAGE_KEYS.UNDO_STACK);
  }, []);

  // Offline queue management
  const queueOfflineAction = useCallback(async (action: unknown) => {
    if (!settings.offlineMode) return;

    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      const queue = data ? JSON.parse(data) : [];
      queue.push({ action, timestamp: Date.now() });
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('[Accessibility] Failed to queue offline action:', error);
    }
  }, [settings.offlineMode]);

  const processOfflineQueue = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (!data) return;

      const queue = JSON.parse(data);
      // Process queue items here (implementation depends on action types)
      // For now, just clear the queue
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    } catch (error) {
      console.error('[Accessibility] Failed to process offline queue:', error);
    }
  }, []);

  // Don't render until loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSetting,
        resetSettings,
        getTheme,
        getTextScale,
        getButtonScale,
        triggerHaptic,
        pushUndo,
        popUndo,
        peekUndo,
        clearUndo,
        isOnline,
        queueOfflineAction,
        processOfflineQueue,
        isLoaded,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

/**
 * Hook for scaled text styles
 */
export function useScaledText(baseSize: number): number {
  const { getTextScale } = useAccessibility();
  return baseSize * getTextScale();
}

/**
 * Hook for scaled button dimensions
 */
export function useScaledButton(baseSize: number): number {
  const { getButtonScale } = useAccessibility();
  return baseSize * getButtonScale();
}

/**
 * Hook for accessible colors
 */
export function useAccessibleColors() {
  const { getTheme } = useAccessibility();
  return getTheme();
}
