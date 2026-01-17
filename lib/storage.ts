import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CapacityLog,
  CapacityState,
  ShareRecipient,
  ShareConfig,
  AuditEntry,
  AuditAction,
  OrbitalPreferences,
  InstitutionalConfig,
  InstitutionalTier,
  InstitutionalFeature,
  INSTITUTIONAL_FEATURE_SETS,
  VaultedCapacityLog,
  HistoryVaultMetadata,
  SensoryAlertConfig,
  SensoryAlertEvent,
  DELETION_DISCLOSURE,
  TermsAcceptance,
  TermsAcceptanceRecord,
  CURRENT_TERMS_VERSION,
} from '../types';
import {
  onCapacityLogSaved,
  onCapacityLogDeleted,
  onAllLogsCleared,
} from './patternHistory';
import { syncWidgetOnLog } from './hooks/useWidgetSync';

// Centralized storage keys
export const STORAGE_KEYS = {
  LOGS: '@orbital:logs',
  LOCALE: '@orbital:locale',
  PREFERENCES: '@orbital:preferences',
  RECIPIENTS: '@orbital:recipients',
  SHARES: '@orbital:shares',
  AUDIT_LOG: '@orbital:audit',
  // Enterprise features
  INSTITUTIONAL_CONFIG: '@orbital:institutional',
  HISTORY_VAULT: '@orbital:vault',
  VAULT_METADATA: '@orbital:vault_meta',
  SENSORY_CONFIG: '@orbital:sensory_config',
  SENSORY_EVENTS: '@orbital:sensory_events',
  // Accessibility
  ACCESSIBILITY: '@orbital:accessibility',
  UNDO_STACK: '@orbital:undo_stack',
  OFFLINE_QUEUE: '@orbital:offline_queue',
  // Demo Mode
  DEMO_MODE_ENABLED: '@orbital:demo_mode',
  DEMO_LOGS: '@orbital:demo_logs',
  DEMO_RECIPIENTS: '@orbital:demo_recipients',
  DEMO_SHARES: '@orbital:demo_shares',
  DEMO_AUDIT: '@orbital:demo_audit',
  REAL_DATA_BACKUP: '@orbital:real_backup',
  // Terms of Service
  TERMS_ACCEPTANCE: '@orbital:terms_acceptance',
  // Team Mode
  TEAM_MODE_SETTINGS: '@orbital:team_mode',
  TEAM_CONFIGS: '@orbital:team_configs',
  // School Zone Mode
  SCHOOL_ZONE_SETTINGS: '@orbital:school_zone',
  SCHOOL_ZONE_CONFIGS: '@orbital:school_configs',
  // App Mode (user-facing modes dropdown)
  APP_MODE_SETTINGS: '@orbital:app_mode',
  // App Tenure tracking (for 30-day tease feature)
  FIRST_APP_OPEN: '@orbital:first_app_open',
} as const;

const LOGS_KEY = STORAGE_KEYS.LOGS;

// Migrate old state names to new ones
function migrateState(state: string): CapacityState {
  switch (state) {
    case 'good': return 'resourced';
    case 'strained': return 'stretched';
    case 'low': return 'depleted';
    default: return state as CapacityState;
  }
}

export async function savelog(log: CapacityLog): Promise<void> {
  const logs = await getLogs();
  logs.unshift(log); // Add to beginning (newest first)
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));

  // Write to pattern history for permanent retention
  await onCapacityLogSaved(log);

  // Sync widget with latest capacity state
  syncWidgetOnLog(log.state);
}

export async function getLogs(): Promise<CapacityLog[]> {
  const data = await AsyncStorage.getItem(LOGS_KEY);
  if (!data) return [];
  const logs = JSON.parse(data) as CapacityLog[];
  // Migrate any old state names
  return logs.map(log => ({
    ...log,
    state: migrateState(log.state),
  }));
}

export async function deleteLog(id: string): Promise<void> {
  const logs = await getLogs();
  const filtered = logs.filter((log) => log.id !== id);
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(filtered));

  // Soft-delete in pattern history (retains de-identified record)
  // IMPORTANT: Pattern history is NOT hard-deleted
  await onCapacityLogDeleted(id);
}

export async function clearAllLogs(): Promise<void> {
  await AsyncStorage.removeItem(LOGS_KEY);

  // Soft-delete all pattern history for this user
  // IMPORTANT: Pattern history is retained in de-identified form
  await onAllLogsCleared();
}

// Re-export deletion disclosure for UI use
export { DELETION_DISCLOSURE };

export async function getLogsByDateRange(
  startDate: number,
  endDate: number
): Promise<CapacityLog[]> {
  const logs = await getLogs();
  return logs.filter(
    (log) => log.timestamp >= startDate && log.timestamp <= endDate
  );
}

export async function getLogsByTag(tag: string): Promise<CapacityLog[]> {
  const logs = await getLogs();
  return logs.filter((log) => log.tags.includes(tag as any));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// PREFERENCES
// ============================================

const DEFAULT_PREFERENCES: OrbitalPreferences = {
  locale: 'en',
  orbitalMode: 'personal',
  sharingEnabled: false,
};

export async function getPreferences(): Promise<OrbitalPreferences> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
  if (!data) return DEFAULT_PREFERENCES;
  return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
}

export async function savePreferences(prefs: Partial<OrbitalPreferences>): Promise<void> {
  const current = await getPreferences();
  const updated = { ...current, ...prefs };
  await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
}

// ============================================
// SHARE RECIPIENTS
// ============================================

export async function getRecipients(): Promise<ShareRecipient[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.RECIPIENTS);
  if (!data) return [];
  return JSON.parse(data);
}

export async function saveRecipient(recipient: ShareRecipient): Promise<void> {
  const recipients = await getRecipients();
  recipients.push(recipient);
  await AsyncStorage.setItem(STORAGE_KEYS.RECIPIENTS, JSON.stringify(recipients));
}

export async function deleteRecipient(id: string): Promise<void> {
  const recipients = await getRecipients();
  const filtered = recipients.filter((r) => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.RECIPIENTS, JSON.stringify(filtered));
}

// ============================================
// SHARE CONFIGS
// ============================================

export async function getShares(): Promise<ShareConfig[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SHARES);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getActiveShares(): Promise<ShareConfig[]> {
  const shares = await getShares();
  const now = Date.now();
  return shares.filter((s) => s.isActive && s.expiresAt > now);
}

export async function saveShare(share: ShareConfig): Promise<void> {
  const shares = await getShares();
  shares.push(share);
  await AsyncStorage.setItem(STORAGE_KEYS.SHARES, JSON.stringify(shares));
}

export async function revokeShare(id: string): Promise<void> {
  const shares = await getShares();
  const updated = shares.map((s) =>
    s.id === id ? { ...s, isActive: false } : s
  );
  await AsyncStorage.setItem(STORAGE_KEYS.SHARES, JSON.stringify(updated));
}

export async function getShareByToken(token: string): Promise<ShareConfig | null> {
  const shares = await getShares();
  return shares.find((s) => s.accessToken === token && s.isActive) || null;
}

// ============================================
// AUDIT LOG
// ============================================

const MAX_AUDIT_ENTRIES = 50;

export async function getAuditLog(): Promise<AuditEntry[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
  if (!data) return [];
  return JSON.parse(data);
}

export async function logAuditEntry(
  action: AuditAction,
  details?: { recipientId?: string; recipientName?: string; details?: string }
): Promise<void> {
  const log = await getAuditLog();
  const entry: AuditEntry = {
    id: generateId(),
    action,
    timestamp: Date.now(),
    ...details,
  };
  log.unshift(entry);
  // Keep only last N entries
  const trimmed = log.slice(0, MAX_AUDIT_ENTRIES);
  await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(trimmed));
}

export async function clearAuditLog(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.AUDIT_LOG);
}

// ============================================
// ACCESS TOKEN GENERATION
// ============================================

export function generateAccessToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================
// INSTITUTIONAL MODE CONFIGURATION
// ============================================

const DEFAULT_INSTITUTIONAL_CONFIG: InstitutionalConfig = {
  tier: 'personal',
  enabledFeatures: [],
  dataRetentionYears: 1,
  complianceMode: false,
  auditRequired: false,
  reportingEnabled: false,
};

export async function getInstitutionalConfig(): Promise<InstitutionalConfig> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.INSTITUTIONAL_CONFIG);
  if (!data) return DEFAULT_INSTITUTIONAL_CONFIG;
  return { ...DEFAULT_INSTITUTIONAL_CONFIG, ...JSON.parse(data) };
}

export async function saveInstitutionalConfig(config: Partial<InstitutionalConfig>): Promise<void> {
  const current = await getInstitutionalConfig();
  const updated = { ...current, ...config };
  await AsyncStorage.setItem(STORAGE_KEYS.INSTITUTIONAL_CONFIG, JSON.stringify(updated));
}

/**
 * GOVERNANCE: Institutional tier activation is BLOCKED in-app.
 *
 * - 'personal' and 'family' tiers: Can be activated through normal flows
 * - 'pilot' and 'enterprise' tiers: BLOCKED - Requires sales engagement
 *
 * For institutional access, users must contact Orbital sales.
 * This function will return the current config unchanged for blocked tiers.
 */
export async function activateInstitutionalTier(
  tier: InstitutionalTier,
  orgDetails?: { orgId: string; orgName: string; licenseExpiresAt?: number }
): Promise<InstitutionalConfig> {
  // GOVERNANCE BLOCK: Institutional tiers cannot be self-activated
  const BLOCKED_TIERS: InstitutionalTier[] = ['pilot', 'enterprise'];
  if (BLOCKED_TIERS.includes(tier)) {
    if (__DEV__) {
      console.warn(
        `[GOVERNANCE] Institutional tier "${tier}" cannot be activated in-app. Contact Orbital sales.`
      );
    }
    // Return current config unchanged - do not activate
    return getInstitutionalConfig();
  }

  const features = INSTITUTIONAL_FEATURE_SETS[tier];
  const config: InstitutionalConfig = {
    tier,
    enabledFeatures: features,
    dataRetentionYears: tier === 'enterprise' ? 5 : tier === 'pilot' ? 2 : 1,
    complianceMode: tier === 'enterprise',
    auditRequired: tier === 'enterprise' || tier === 'pilot',
    reportingEnabled: tier !== 'personal',
    activatedAt: Date.now(),
    ...orgDetails,
  };
  await saveInstitutionalConfig(config);
  await logAuditEntry('export_generated', {
    details: `Tier activated: ${tier}`,
  });
  return config;
}

export function hasFeature(config: InstitutionalConfig, feature: InstitutionalFeature): boolean {
  return config.enabledFeatures.includes(feature);
}

export function isEnterpriseMode(config: InstitutionalConfig): boolean {
  return config.tier === 'enterprise' || config.tier === 'pilot';
}

// ============================================
// HISTORY VAULT (Long-Horizon Retention)
// ============================================

export async function getVaultMetadata(): Promise<HistoryVaultMetadata | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.VAULT_METADATA);
  if (!data) return null;
  return JSON.parse(data);
}

export async function getVaultedLogs(yearMonth?: string): Promise<VaultedCapacityLog[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY_VAULT);
  if (!data) return [];
  const logs: VaultedCapacityLog[] = JSON.parse(data);
  if (yearMonth) {
    return logs.filter((log) => log._yearMonth === yearMonth);
  }
  return logs;
}

export async function vaultLog(log: CapacityLog): Promise<VaultedCapacityLog> {
  const yearMonth = new Date(log.timestamp).toISOString().slice(0, 7);
  const vaulted: VaultedCapacityLog = {
    id: log.id,
    state: log.state,
    timestamp: log.timestamp,
    category: log.category,
    _vaultedAt: Date.now(),
    _yearMonth: yearMonth,
  };

  const existing = await getVaultedLogs();
  existing.push(vaulted);
  await AsyncStorage.setItem(STORAGE_KEYS.HISTORY_VAULT, JSON.stringify(existing));

  // Update metadata
  await updateVaultMetadata(existing);

  return vaulted;
}

export async function vaultOldLogs(olderThanDays: number = 365): Promise<number> {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const logs = await getLogs();
  const toVault = logs.filter((log) => log.timestamp < cutoff);

  if (toVault.length === 0) return 0;

  // Vault each log
  for (const log of toVault) {
    await vaultLog(log);
  }

  // Remove vaulted logs from active storage
  const remaining = logs.filter((log) => log.timestamp >= cutoff);
  await AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(remaining));

  return toVault.length;
}

async function updateVaultMetadata(logs: VaultedCapacityLog[]): Promise<void> {
  if (logs.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEYS.VAULT_METADATA);
    return;
  }

  const timestamps = logs.map((l) => l.timestamp);
  const yearMonthCounts: Record<string, number> = {};
  logs.forEach((log) => {
    yearMonthCounts[log._yearMonth] = (yearMonthCounts[log._yearMonth] || 0) + 1;
  });

  const metadata: HistoryVaultMetadata = {
    earliestEntry: Math.min(...timestamps),
    latestEntry: Math.max(...timestamps),
    totalEntries: logs.length,
    yearMonthCounts,
  };

  await AsyncStorage.setItem(STORAGE_KEYS.VAULT_METADATA, JSON.stringify(metadata));
}

export async function getFullHistoryRange(): Promise<{ start: number; end: number; totalLogs: number }> {
  const activeLogs = await getLogs();
  const vaultMeta = await getVaultMetadata();

  const activeTimestamps = activeLogs.map((l) => l.timestamp);
  const minActive = activeTimestamps.length > 0 ? Math.min(...activeTimestamps) : Date.now();
  const maxActive = activeTimestamps.length > 0 ? Math.max(...activeTimestamps) : Date.now();

  return {
    start: vaultMeta ? Math.min(vaultMeta.earliestEntry, minActive) : minActive,
    end: Math.max(vaultMeta?.latestEntry || 0, maxActive),
    totalLogs: activeLogs.length + (vaultMeta?.totalEntries || 0),
  };
}

// ============================================
// SENSORY ALERTS
// ============================================

const DEFAULT_SENSORY_CONFIG: SensoryAlertConfig = {
  enabled: false,
  noiseThresholdDb: 70,
  sustainedNoiseMinutes: 15,
  alertCooldownMinutes: 60,
};

export async function getSensoryConfig(): Promise<SensoryAlertConfig> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SENSORY_CONFIG);
  if (!data) return DEFAULT_SENSORY_CONFIG;
  return { ...DEFAULT_SENSORY_CONFIG, ...JSON.parse(data) };
}

export async function saveSensoryConfig(config: Partial<SensoryAlertConfig>): Promise<void> {
  const current = await getSensoryConfig();
  const updated = { ...current, ...config };
  await AsyncStorage.setItem(STORAGE_KEYS.SENSORY_CONFIG, JSON.stringify(updated));
}

export async function getSensoryEvents(limit: number = 50): Promise<SensoryAlertEvent[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SENSORY_EVENTS);
  if (!data) return [];
  const events: SensoryAlertEvent[] = JSON.parse(data);
  return events.slice(0, limit);
}

export async function logSensoryEvent(event: Omit<SensoryAlertEvent, 'id'>): Promise<SensoryAlertEvent> {
  const events = await getSensoryEvents(100);
  const newEvent: SensoryAlertEvent = {
    ...event,
    id: generateId(),
  };
  events.unshift(newEvent);
  // Keep last 100 events
  const trimmed = events.slice(0, 100);
  await AsyncStorage.setItem(STORAGE_KEYS.SENSORY_EVENTS, JSON.stringify(trimmed));
  return newEvent;
}

export async function acknowledgeSensoryEvent(eventId: string): Promise<void> {
  const events = await getSensoryEvents(100);
  const updated = events.map((e) =>
    e.id === eventId ? { ...e, acknowledged: true } : e
  );
  await AsyncStorage.setItem(STORAGE_KEYS.SENSORY_EVENTS, JSON.stringify(updated));
}

// ============================================
// TERMS OF SERVICE ACCEPTANCE
// ============================================

export async function getTermsAcceptanceRecord(): Promise<TermsAcceptanceRecord | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.TERMS_ACCEPTANCE);
  if (!data) return null;
  return JSON.parse(data);
}

export async function hasAcceptedCurrentTerms(): Promise<boolean> {
  const record = await getTermsAcceptanceRecord();
  if (!record) return false;
  return record.acceptances.some(a => a.version === CURRENT_TERMS_VERSION);
}

export async function recordTermsAcceptance(
  method: 'explicit_click' | 'continued_use'
): Promise<TermsAcceptanceRecord> {
  const existing = await getTermsAcceptanceRecord();

  const acceptance: TermsAcceptance = {
    version: CURRENT_TERMS_VERSION,
    acceptedAt: Date.now(),
    method,
  };

  const record: TermsAcceptanceRecord = {
    currentVersion: CURRENT_TERMS_VERSION,
    acceptances: existing?.acceptances || [],
    lastPromptedAt: Date.now(),
  };

  // Add new acceptance if not already accepted this version
  if (!record.acceptances.some(a => a.version === CURRENT_TERMS_VERSION)) {
    record.acceptances.push(acceptance);
  }

  await AsyncStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTANCE, JSON.stringify(record));

  // Also log to audit trail
  await logAuditEntry('export_generated', {
    details: `Terms of Service v${CURRENT_TERMS_VERSION} accepted via ${method}`,
  });

  return record;
}

export async function updateTermsPromptedAt(): Promise<void> {
  const existing = await getTermsAcceptanceRecord();
  const record: TermsAcceptanceRecord = {
    currentVersion: CURRENT_TERMS_VERSION,
    acceptances: existing?.acceptances || [],
    lastPromptedAt: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTANCE, JSON.stringify(record));
}

// ============================================
// TEAM MODE STORAGE
// ============================================

import type {
  TeamModeSettings,
  TeamConfig,
  SchoolZoneModeSettings,
  SchoolZoneConfig,
} from '../types';

const DEFAULT_TEAM_MODE_SETTINGS: TeamModeSettings = {
  enabled: false,
  currentTeamId: null,
  teams: [],
  lastSyncAt: null,
};

export async function getTeamModeSettings(): Promise<TeamModeSettings> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.TEAM_MODE_SETTINGS);
  if (!data) return DEFAULT_TEAM_MODE_SETTINGS;
  return { ...DEFAULT_TEAM_MODE_SETTINGS, ...JSON.parse(data) };
}

export async function saveTeamModeSettings(settings: Partial<TeamModeSettings>): Promise<void> {
  const current = await getTeamModeSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(STORAGE_KEYS.TEAM_MODE_SETTINGS, JSON.stringify(updated));
}

export async function getTeamConfigs(): Promise<TeamConfig[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.TEAM_CONFIGS);
  if (!data) return [];
  return JSON.parse(data);
}

export async function saveTeamConfig(config: TeamConfig): Promise<void> {
  const configs = await getTeamConfigs();
  const existingIndex = configs.findIndex(c => c.id === config.id);
  if (existingIndex >= 0) {
    configs[existingIndex] = config;
  } else {
    configs.push(config);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.TEAM_CONFIGS, JSON.stringify(configs));
}

export async function joinTeamByCode(teamCode: string, teamName: string): Promise<TeamConfig> {
  const teamId = `team_${teamCode.toLowerCase().replace(/\s/g, '_')}_${Date.now()}`;
  const config: TeamConfig = {
    id: teamId,
    name: teamName || `Team ${teamCode}`,
    teamCode: teamCode.toUpperCase(),
    createdAt: Date.now(),
    minParticipants: 10,
    isActive: true,
  };
  await saveTeamConfig(config);

  // Update settings
  const settings = await getTeamModeSettings();
  settings.enabled = true;
  settings.currentTeamId = teamId;
  settings.teams.push({
    teamId,
    joinedAt: Date.now(),
    isActive: true,
  });
  await saveTeamModeSettings(settings);

  return config;
}

export async function leaveTeam(teamId: string): Promise<void> {
  const settings = await getTeamModeSettings();
  settings.teams = settings.teams.map(t =>
    t.teamId === teamId ? { ...t, isActive: false } : t
  );
  if (settings.currentTeamId === teamId) {
    settings.currentTeamId = null;
    settings.enabled = settings.teams.some(t => t.isActive);
  }
  await saveTeamModeSettings(settings);
}

// ============================================
// SCHOOL ZONE MODE STORAGE
// ============================================

const DEFAULT_SCHOOL_ZONE_SETTINGS: SchoolZoneModeSettings = {
  enabled: false,
  role: null,
  currentSchoolZoneId: null,
  memberships: [],
  lastSummaryGeneratedAt: null,
};

export async function getSchoolZoneModeSettings(): Promise<SchoolZoneModeSettings> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SCHOOL_ZONE_SETTINGS);
  if (!data) return DEFAULT_SCHOOL_ZONE_SETTINGS;
  return { ...DEFAULT_SCHOOL_ZONE_SETTINGS, ...JSON.parse(data) };
}

export async function saveSchoolZoneModeSettings(settings: Partial<SchoolZoneModeSettings>): Promise<void> {
  const current = await getSchoolZoneModeSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(STORAGE_KEYS.SCHOOL_ZONE_SETTINGS, JSON.stringify(updated));
}

export async function getSchoolZoneConfigs(): Promise<SchoolZoneConfig[]> {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.SCHOOL_ZONE_CONFIGS);
  if (!data) return [];
  return JSON.parse(data);
}

export async function saveSchoolZoneConfig(config: SchoolZoneConfig): Promise<void> {
  const configs = await getSchoolZoneConfigs();
  const existingIndex = configs.findIndex(c => c.id === config.id);
  if (existingIndex >= 0) {
    configs[existingIndex] = config;
  } else {
    configs.push(config);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.SCHOOL_ZONE_CONFIGS, JSON.stringify(configs));
}

export async function joinSchoolZone(
  schoolCode: string,
  schoolName: string,
  role: 'student' | 'caregiver' | 'educator'
): Promise<SchoolZoneConfig> {
  const schoolZoneId = `school_${schoolCode.toLowerCase().replace(/\s/g, '_')}_${Date.now()}`;
  const config: SchoolZoneConfig = {
    id: schoolZoneId,
    name: schoolName || `School ${schoolCode}`,
    schoolCode: schoolCode.toUpperCase(),
    createdAt: Date.now(),
    minStudents: 10,
  };
  await saveSchoolZoneConfig(config);

  // Update settings
  const settings = await getSchoolZoneModeSettings();
  settings.enabled = true;
  settings.role = role;
  settings.currentSchoolZoneId = schoolZoneId;
  settings.memberships.push({
    schoolZoneId,
    role,
    joinedAt: Date.now(),
    isActive: true,
  });
  await saveSchoolZoneModeSettings(settings);

  return config;
}

export async function leaveSchoolZone(schoolZoneId: string): Promise<void> {
  const settings = await getSchoolZoneModeSettings();
  settings.memberships = settings.memberships.map(m =>
    m.schoolZoneId === schoolZoneId ? { ...m, isActive: false } : m
  );
  if (settings.currentSchoolZoneId === schoolZoneId) {
    settings.currentSchoolZoneId = null;
    settings.enabled = settings.memberships.some(m => m.isActive);
  }
  await saveSchoolZoneModeSettings(settings);
}

// ============================================
// APP MODE STORAGE
// ============================================

// AppMode type defined inline to avoid circular dependency with types/index.ts
type AppModeLocal = 'personal' | 'caregiver' | 'employer' | 'school_district' | 'university' | 'healthcare' | 'demo';

interface AppModeSettingsLocal {
  currentMode: AppModeLocal;
  orgCode: string | null;
  orgName: string | null;
  joinedAt: number | null;
  previousMode: AppModeLocal | null;
}

export async function getAppModeSettings(): Promise<AppModeSettingsLocal> {
  const defaultSettings: AppModeSettingsLocal = {
    currentMode: 'personal',
    orgCode: null,
    orgName: null,
    joinedAt: null,
    previousMode: null,
  };
  const data = await AsyncStorage.getItem(STORAGE_KEYS.APP_MODE_SETTINGS);
  if (!data) return defaultSettings;
  return { ...defaultSettings, ...JSON.parse(data) };
}

export async function saveAppModeSettings(settings: Partial<AppModeSettingsLocal>): Promise<void> {
  const current = await getAppModeSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(STORAGE_KEYS.APP_MODE_SETTINGS, JSON.stringify(updated));
}

export async function switchAppMode(
  newMode: AppModeLocal,
  orgDetails?: { orgCode: string; orgName: string }
): Promise<AppModeSettingsLocal> {
  const current = await getAppModeSettings();
  const settings: AppModeSettingsLocal = {
    currentMode: newMode,
    orgCode: orgDetails?.orgCode || null,
    orgName: orgDetails?.orgName || null,
    joinedAt: orgDetails ? Date.now() : null,
    previousMode: current.currentMode,
  };
  await saveAppModeSettings(settings);
  return settings;
}
