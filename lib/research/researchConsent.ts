import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ResearchConsent,
  ResearchConsentScope,
  ResearchConsentStatus,
  ResearchConsentBundle,
} from '../../types';

const RESEARCH_CONSENTS_KEY = '@orbital:research_consents';
const CONSENT_AUDIT_KEY = '@orbital:research_consent_audit';

// Current version of consent language - increment when language changes
const CURRENT_CONSENT_VERSION = '1.0.0';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// ============================================
// CONSENT LANGUAGE (IRB-Ready)
// ============================================

export const RESEARCH_CONSENT_LANGUAGE: Record<ResearchConsentScope, {
  title: string;
  description: string;
  dataUsed: string[];
  retention: string;
  withdrawal: string;
}> = {
  cohort_inclusion: {
    title: 'Research Cohort Participation',
    description: 'Allow your de-identified capacity data to be included in research cohorts. Your data will be combined with others to identify patterns across populations.',
    dataUsed: [
      'De-identified capacity signals',
      'Age band (not exact age)',
      'Region bucket (not location)',
      'Usage context category',
    ],
    retention: 'Data may be retained for up to 7 years for longitudinal research.',
    withdrawal: 'You may withdraw at any time. Previously exported cohort data cannot be recalled.',
  },
  trajectory_export: {
    title: 'Trajectory Analysis',
    description: 'Allow your capacity trajectory data to be exported for research analysis, particularly around life events you have marked.',
    dataUsed: [
      'Normalized capacity values over time',
      'Time windows around intervention markers',
      'Statistical patterns (mean, variance, trend)',
    ],
    retention: 'Trajectory exports are retained for the duration of the study plus 3 years.',
    withdrawal: 'You may withdraw future data contribution at any time.',
  },
  sensor_data: {
    title: 'Environmental Sensor Data',
    description: 'Allow bucketed sensor data (noise levels, activity patterns) to be included in research. No raw sensor data is stored or shared.',
    dataUsed: [
      'Noise level categories (low/moderate/high)',
      'Activity proxy levels',
      'Sleep quality proxies',
      'Time-of-day patterns',
    ],
    retention: 'Sensor proxy data retained for up to 5 years.',
    withdrawal: 'Withdraw at any time to stop future sensor data inclusion.',
  },
  intervention_markers: {
    title: 'Intervention Marker Sharing',
    description: 'Allow intervention markers you create (medication changes, therapy starts, etc.) to be included in research analysis.',
    dataUsed: [
      'Intervention categories (not specific medications)',
      'Timing of interventions',
      'Pre/post capacity patterns',
    ],
    retention: 'Intervention data retained for the duration of study plus 5 years.',
    withdrawal: 'Mark individual markers as private or withdraw all at any time.',
  },
  longitudinal_patterns: {
    title: 'Longitudinal Pattern Analysis',
    description: 'Allow your long-term capacity patterns to be analyzed for research on temporal trends and cyclical patterns.',
    dataUsed: [
      'Weekly and monthly aggregates',
      'Seasonal patterns',
      'Long-term trend direction',
      'Pattern stability metrics',
    ],
    retention: 'Longitudinal data may be retained indefinitely for multi-year studies.',
    withdrawal: 'Withdraw to stop future pattern contributions.',
  },
  deidentified_sharing: {
    title: 'De-Identified Data Sharing',
    description: 'Allow your fully de-identified data to be shared with approved research partners (academic institutions, pharmaceutical companies conducting IRB-approved studies).',
    dataUsed: [
      'All consented data types',
      'Shared only in de-identified form',
      'No direct identifiers ever shared',
    ],
    retention: 'As determined by individual study protocols.',
    withdrawal: 'Withdraw to prevent future data sharing. Cannot recall data already shared.',
  },
};

// ============================================
// CONSENT AUDIT LOG
// ============================================

interface ConsentAuditEntry {
  id: string;
  userId: string;
  scope: ResearchConsentScope;
  action: 'presented' | 'granted' | 'declined' | 'withdrawn' | 'expired' | 'renewed';
  previousStatus?: ResearchConsentStatus;
  newStatus: ResearchConsentStatus;
  performedAt: number;
  consentVersion: string;
  studyId?: string;
  ipHash?: string;
}

async function logConsentAudit(
  userId: string,
  scope: ResearchConsentScope,
  action: ConsentAuditEntry['action'],
  newStatus: ResearchConsentStatus,
  options?: {
    previousStatus?: ResearchConsentStatus;
    studyId?: string;
  }
): Promise<ConsentAuditEntry> {
  const entry: ConsentAuditEntry = {
    id: generateId('rcaud'),
    userId,
    scope,
    action,
    previousStatus: options?.previousStatus,
    newStatus,
    performedAt: Date.now(),
    consentVersion: CURRENT_CONSENT_VERSION,
    studyId: options?.studyId,
  };

  const data = await AsyncStorage.getItem(CONSENT_AUDIT_KEY);
  const log: ConsentAuditEntry[] = data ? JSON.parse(data) : [];
  log.unshift(entry);
  await AsyncStorage.setItem(CONSENT_AUDIT_KEY, JSON.stringify(log));

  return entry;
}

export async function getConsentAuditLog(userId?: string): Promise<ConsentAuditEntry[]> {
  const data = await AsyncStorage.getItem(CONSENT_AUDIT_KEY);
  if (!data) return [];
  const log: ConsentAuditEntry[] = JSON.parse(data);
  if (userId) {
    return log.filter((e) => e.userId === userId);
  }
  return log;
}

// ============================================
// CONSENT MANAGEMENT
// ============================================

async function getAllConsents(): Promise<ResearchConsent[]> {
  const data = await AsyncStorage.getItem(RESEARCH_CONSENTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

async function saveConsents(consents: ResearchConsent[]): Promise<void> {
  await AsyncStorage.setItem(RESEARCH_CONSENTS_KEY, JSON.stringify(consents));
}

export async function getUserConsents(userId: string): Promise<ResearchConsent[]> {
  const consents = await getAllConsents();
  return consents.filter((c) => c.userId === userId);
}

export async function getConsentBundle(userId: string): Promise<ResearchConsentBundle> {
  const consents = await getUserConsents(userId);
  const activeConsents = consents.filter(
    (c) => c.status === 'granted' && (!c.expiresAt || c.expiresAt > Date.now())
  );

  return {
    userId,
    consents,
    lastUpdated: Math.max(...consents.map((c) => c.grantedAt || 0), 0),
    hasActiveResearchParticipation: activeConsents.length > 0,
  };
}

export async function getConsentForScope(
  userId: string,
  scope: ResearchConsentScope
): Promise<ResearchConsent | null> {
  const consents = await getUserConsents(userId);
  return consents.find((c) => c.scope === scope) || null;
}

export async function hasActiveConsent(
  userId: string,
  scope: ResearchConsentScope
): Promise<boolean> {
  const consent = await getConsentForScope(userId, scope);
  if (!consent) return false;
  if (consent.status !== 'granted') return false;
  if (consent.expiresAt && consent.expiresAt < Date.now()) return false;
  return true;
}

export async function hasAllRequiredConsents(
  userId: string,
  requiredScopes: ResearchConsentScope[]
): Promise<{ complete: boolean; missing: ResearchConsentScope[] }> {
  const missing: ResearchConsentScope[] = [];

  for (const scope of requiredScopes) {
    const hasConsent = await hasActiveConsent(userId, scope);
    if (!hasConsent) {
      missing.push(scope);
    }
  }

  return {
    complete: missing.length === 0,
    missing,
  };
}

// ============================================
// CONSENT GRANT/REVOKE
// ============================================

export async function presentConsent(
  userId: string,
  scope: ResearchConsentScope,
  studyId?: string
): Promise<ResearchConsent> {
  const consents = await getAllConsents();
  const existing = consents.find((c) => c.userId === userId && c.scope === scope);

  if (existing) {
    // Already exists, just log the presentation
    await logConsentAudit(userId, scope, 'presented', existing.status, { studyId });
    return existing;
  }

  const consentLanguage = RESEARCH_CONSENT_LANGUAGE[scope];
  const consent: ResearchConsent = {
    id: generateId('rcns'),
    userId,
    scope,
    status: 'pending',
    studyId,
    version: CURRENT_CONSENT_VERSION,
    consentLanguageHash: hashContent(JSON.stringify(consentLanguage)),
    auditRef: generateId('aud'),
  };

  consents.push(consent);
  await saveConsents(consents);

  await logConsentAudit(userId, scope, 'presented', 'pending', { studyId });

  return consent;
}

export async function grantConsent(
  userId: string,
  scope: ResearchConsentScope,
  options?: {
    studyId?: string;
    expiresInDays?: number;
  }
): Promise<ResearchConsent> {
  const consents = await getAllConsents();
  const existing = consents.find((c) => c.userId === userId && c.scope === scope);
  const now = Date.now();

  const consentLanguage = RESEARCH_CONSENT_LANGUAGE[scope];
  const expiresAt = options?.expiresInDays
    ? now + options.expiresInDays * 24 * 60 * 60 * 1000
    : undefined;

  if (existing) {
    const previousStatus = existing.status;
    existing.status = 'granted';
    existing.grantedAt = now;
    existing.expiresAt = expiresAt;
    existing.withdrawnAt = undefined;
    existing.version = CURRENT_CONSENT_VERSION;
    existing.consentLanguageHash = hashContent(JSON.stringify(consentLanguage));
    existing.studyId = options?.studyId || existing.studyId;

    await saveConsents(consents);
    await logConsentAudit(userId, scope, 'granted', 'granted', {
      previousStatus,
      studyId: options?.studyId,
    });

    return existing;
  }

  const consent: ResearchConsent = {
    id: generateId('rcns'),
    userId,
    scope,
    status: 'granted',
    studyId: options?.studyId,
    grantedAt: now,
    expiresAt,
    version: CURRENT_CONSENT_VERSION,
    consentLanguageHash: hashContent(JSON.stringify(consentLanguage)),
    auditRef: generateId('aud'),
  };

  consents.push(consent);
  await saveConsents(consents);

  await logConsentAudit(userId, scope, 'granted', 'granted', { studyId: options?.studyId });

  return consent;
}

export async function declineConsent(
  userId: string,
  scope: ResearchConsentScope
): Promise<ResearchConsent | null> {
  const consents = await getAllConsents();
  const existing = consents.find((c) => c.userId === userId && c.scope === scope);

  if (!existing) {
    // Create a declined record
    const consent: ResearchConsent = {
      id: generateId('rcns'),
      userId,
      scope,
      status: 'declined',
      version: CURRENT_CONSENT_VERSION,
      consentLanguageHash: hashContent(JSON.stringify(RESEARCH_CONSENT_LANGUAGE[scope])),
      auditRef: generateId('aud'),
    };

    consents.push(consent);
    await saveConsents(consents);
    await logConsentAudit(userId, scope, 'declined', 'declined');
    return consent;
  }

  const previousStatus = existing.status;
  existing.status = 'declined';
  await saveConsents(consents);

  await logConsentAudit(userId, scope, 'declined', 'declined', { previousStatus });

  return existing;
}

export async function withdrawConsent(
  userId: string,
  scope: ResearchConsentScope
): Promise<ResearchConsent | null> {
  const consents = await getAllConsents();
  const existing = consents.find((c) => c.userId === userId && c.scope === scope);

  if (!existing) return null;

  const previousStatus = existing.status;
  existing.status = 'withdrawn';
  existing.withdrawnAt = Date.now();

  await saveConsents(consents);

  await logConsentAudit(userId, scope, 'withdrawn', 'withdrawn', { previousStatus });

  return existing;
}

export async function withdrawAllConsents(userId: string): Promise<number> {
  const consents = await getAllConsents();
  let count = 0;

  for (const consent of consents) {
    if (consent.userId === userId && consent.status === 'granted') {
      consent.status = 'withdrawn';
      consent.withdrawnAt = Date.now();
      count++;

      await logConsentAudit(userId, consent.scope, 'withdrawn', 'withdrawn', {
        previousStatus: 'granted',
      });
    }
  }

  await saveConsents(consents);
  return count;
}

// ============================================
// CONSENT VALIDATION
// ============================================

export async function validateConsentForExport(
  userId: string,
  requiredScopes: ResearchConsentScope[]
): Promise<{
  valid: boolean;
  grantedScopes: ResearchConsentScope[];
  missingScopes: ResearchConsentScope[];
  expiredScopes: ResearchConsentScope[];
}> {
  const consents = await getUserConsents(userId);
  const now = Date.now();

  const grantedScopes: ResearchConsentScope[] = [];
  const missingScopes: ResearchConsentScope[] = [];
  const expiredScopes: ResearchConsentScope[] = [];

  for (const scope of requiredScopes) {
    const consent = consents.find((c) => c.scope === scope);

    if (!consent || consent.status === 'not_asked') {
      missingScopes.push(scope);
    } else if (consent.status === 'granted') {
      if (consent.expiresAt && consent.expiresAt < now) {
        expiredScopes.push(scope);
      } else {
        grantedScopes.push(scope);
      }
    } else {
      missingScopes.push(scope);
    }
  }

  return {
    valid: missingScopes.length === 0 && expiredScopes.length === 0,
    grantedScopes,
    missingScopes,
    expiredScopes,
  };
}

// ============================================
// CONSENT EXPIRATION MANAGEMENT
// ============================================

export async function processExpiredConsents(): Promise<number> {
  const consents = await getAllConsents();
  const now = Date.now();
  let expiredCount = 0;

  for (const consent of consents) {
    if (
      consent.status === 'granted' &&
      consent.expiresAt &&
      consent.expiresAt < now
    ) {
      await logConsentAudit(consent.userId, consent.scope, 'expired', 'withdrawn', {
        previousStatus: 'granted',
      });
      consent.status = 'withdrawn';
      consent.withdrawnAt = now;
      expiredCount++;
    }
  }

  if (expiredCount > 0) {
    await saveConsents(consents);
  }

  return expiredCount;
}

// ============================================
// CONSENT SUMMARY
// ============================================

export async function getResearchParticipationSummary(): Promise<{
  totalUsers: number;
  byScope: Record<ResearchConsentScope, { granted: number; declined: number; withdrawn: number }>;
  activeParticipants: number;
}> {
  const consents = await getAllConsents();
  const userIds = new Set(consents.map((c) => c.userId));

  const summary: Record<ResearchConsentScope, { granted: number; declined: number; withdrawn: number }> = {
    cohort_inclusion: { granted: 0, declined: 0, withdrawn: 0 },
    trajectory_export: { granted: 0, declined: 0, withdrawn: 0 },
    sensor_data: { granted: 0, declined: 0, withdrawn: 0 },
    intervention_markers: { granted: 0, declined: 0, withdrawn: 0 },
    longitudinal_patterns: { granted: 0, declined: 0, withdrawn: 0 },
    deidentified_sharing: { granted: 0, declined: 0, withdrawn: 0 },
  };

  const now = Date.now();
  const activeUserIds = new Set<string>();

  for (const consent of consents) {
    if (consent.status === 'granted' && (!consent.expiresAt || consent.expiresAt > now)) {
      summary[consent.scope].granted++;
      activeUserIds.add(consent.userId);
    } else if (consent.status === 'declined') {
      summary[consent.scope].declined++;
    } else if (consent.status === 'withdrawn') {
      summary[consent.scope].withdrawn++;
    }
  }

  return {
    totalUsers: userIds.size,
    byScope: summary,
    activeParticipants: activeUserIds.size,
  };
}

// ============================================
// CONSENT RENEWAL
// ============================================

export async function renewConsent(
  userId: string,
  scope: ResearchConsentScope,
  additionalDays: number
): Promise<ResearchConsent | null> {
  const consents = await getAllConsents();
  const existing = consents.find(
    (c) => c.userId === userId && c.scope === scope && c.status === 'granted'
  );

  if (!existing) return null;

  const now = Date.now();
  const baseDate = existing.expiresAt && existing.expiresAt > now ? existing.expiresAt : now;
  existing.expiresAt = baseDate + additionalDays * 24 * 60 * 60 * 1000;

  await saveConsents(consents);

  await logConsentAudit(userId, scope, 'renewed', 'granted', {
    previousStatus: 'granted',
  });

  return existing;
}
