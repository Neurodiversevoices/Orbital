/**
 * Orbital App Mode Hook
 *
 * Manages the user-facing mode selector with 7 modes:
 * - Personal, Caregiver/Family, Employer/ERG, School District,
 *   University, Healthcare, Demo/Sandbox
 *
 * Non-negotiables:
 * - Pattern history is NEVER deleted (soft delete + de-identification)
 * - No raw text sent to analytics
 * - Mode switches preserve user data
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  AppMode,
  AppModeSettings,
  AppModeConfig,
  APP_MODE_CONFIGS,
} from '../../types';
import { getAppModeSettings, saveAppModeSettings, switchAppMode } from '../storage';

// Type cast helper since storage uses local types to avoid circular deps
const castSettings = (settings: any): AppModeSettings => settings as AppModeSettings;

interface AppModeContextType {
  /** Current app mode */
  currentMode: AppMode;
  /** Current mode configuration */
  modeConfig: AppModeConfig;
  /** Full settings object */
  settings: AppModeSettings;
  /** Loading state */
  isLoading: boolean;
  /** Switch to a new mode */
  setMode: (mode: AppMode, orgDetails?: { orgCode: string; orgName: string }) => Promise<void>;
  /** Whether current mode requires org code */
  requiresOrgCode: boolean;
  /** Whether user has joined an org */
  hasJoinedOrg: boolean;
  /** Org name if joined */
  orgName: string | null;
  /** Org code if joined */
  orgCode: string | null;
  /** Leave current org */
  leaveOrg: () => Promise<void>;
  /** Refresh settings from storage */
  refresh: () => Promise<void>;
}

const AppModeContext = createContext<AppModeContextType | null>(null);

interface AppModeProviderProps {
  children: ReactNode;
}

export function AppModeProvider({ children }: AppModeProviderProps) {
  const [settings, setSettings] = useState<AppModeSettings>({
    currentMode: 'personal',
    orgCode: null,
    orgName: null,
    joinedAt: null,
    previousMode: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await getAppModeSettings();
      setSettings(castSettings(loaded));
    } catch (error) {
      console.error('[AppMode] Failed to load settings:', error);
    }
    setIsLoading(false);
  };

  const setMode = useCallback(async (
    mode: AppMode,
    orgDetails?: { orgCode: string; orgName: string }
  ) => {
    try {
      const newSettings = await switchAppMode(mode as any, orgDetails);
      setSettings(castSettings(newSettings));
    } catch (error) {
      console.error('[AppMode] Failed to switch mode:', error);
    }
  }, []);

  const leaveOrg = useCallback(async () => {
    try {
      const newSettings: AppModeSettings = {
        ...settings,
        currentMode: 'personal',
        orgCode: null,
        orgName: null,
        joinedAt: null,
        previousMode: settings.currentMode,
      };
      await saveAppModeSettings(newSettings as any);
      setSettings(newSettings);
    } catch (error) {
      console.error('[AppMode] Failed to leave org:', error);
    }
  }, [settings]);

  const refresh = useCallback(async () => {
    await loadSettings();
  }, []);

  const modeConfig = APP_MODE_CONFIGS[settings.currentMode];
  const requiresOrgCode = modeConfig.requiresOrgCode;
  const hasJoinedOrg = requiresOrgCode && settings.orgCode !== null;

  return (
    <AppModeContext.Provider
      value={{
        currentMode: settings.currentMode,
        modeConfig,
        settings,
        isLoading,
        setMode,
        requiresOrgCode,
        hasJoinedOrg,
        orgName: settings.orgName,
        orgCode: settings.orgCode,
        leaveOrg,
        refresh,
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode(): AppModeContextType {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
}
