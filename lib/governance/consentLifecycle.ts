import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ConsentRecord,
  ConsentBundle,
  ConsentScope,
  ConsentStatus,
} from '../../types';
import { logImmutableAuditEntry } from './immutableAuditLog';

const CONSENT_KEY = '@orbital:consent_bundle';
const CONSENT_VERSION = '1.0.0';

function generateConsentId(): string {
  return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function getConsentBundle(): Promise<ConsentBundle | null> {
  const data = await AsyncStorage.getItem(CONSENT_KEY);
  if (!data) return null;
  return JSON.parse(data);
}

async function saveConsentBundle(bundle: ConsentBundle): Promise<void> {
  await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(bundle));
}

export async function grantConsent(
  userId: string,
  scope: ConsentScope,
  options?: {
    expiresAt?: number;
    conditions?: string;
  }
): Promise<ConsentRecord> {
  const now = Date.now();
  const auditEntry = await logImmutableAuditEntry('consent_granted', {
    actorType: 'user',
    actorRef: userId,
    action: `Consent granted for scope: ${scope}`,
    scope,
  });

  const consent: ConsentRecord = {
    id: generateConsentId(),
    scope,
    status: 'granted',
    grantedAt: now,
    expiresAt: options?.expiresAt,
    version: CONSENT_VERSION,
    conditions: options?.conditions,
    auditRef: auditEntry.id,
  };

  let bundle = await getConsentBundle();
  if (!bundle) {
    bundle = {
      userId,
      consents: [],
      lastReviewedAt: now,
    };
  }

  // Revoke any existing consent for same scope
  bundle.consents = bundle.consents.map((c) =>
    c.scope === scope && c.status === 'granted'
      ? { ...c, status: 'modified' as ConsentStatus, modifiedAt: now }
      : c
  );

  bundle.consents.push(consent);
  bundle.lastReviewedAt = now;

  await saveConsentBundle(bundle);
  return consent;
}

export async function modifyConsent(
  userId: string,
  consentId: string,
  updates: {
    expiresAt?: number;
    conditions?: string;
  }
): Promise<ConsentRecord | null> {
  const bundle = await getConsentBundle();
  if (!bundle) return null;

  const consentIndex = bundle.consents.findIndex((c) => c.id === consentId);
  if (consentIndex === -1) return null;

  const now = Date.now();
  const existing = bundle.consents[consentIndex];

  await logImmutableAuditEntry('consent_modified', {
    actorType: 'user',
    actorRef: userId,
    action: `Consent modified for scope: ${existing.scope}`,
    targetRef: consentId,
    scope: existing.scope,
  });

  const modified: ConsentRecord = {
    ...existing,
    status: 'modified',
    modifiedAt: now,
    expiresAt: updates.expiresAt ?? existing.expiresAt,
    conditions: updates.conditions ?? existing.conditions,
  };

  bundle.consents[consentIndex] = modified;
  bundle.lastReviewedAt = now;

  await saveConsentBundle(bundle);
  return modified;
}

export async function revokeConsent(
  userId: string,
  consentId: string
): Promise<ConsentRecord | null> {
  const bundle = await getConsentBundle();
  if (!bundle) return null;

  const consentIndex = bundle.consents.findIndex((c) => c.id === consentId);
  if (consentIndex === -1) return null;

  const now = Date.now();
  const existing = bundle.consents[consentIndex];

  await logImmutableAuditEntry('consent_revoked', {
    actorType: 'user',
    actorRef: userId,
    action: `Consent revoked for scope: ${existing.scope}`,
    targetRef: consentId,
    scope: existing.scope,
  });

  const revoked: ConsentRecord = {
    ...existing,
    status: 'revoked',
    revokedAt: now,
  };

  bundle.consents[consentIndex] = revoked;
  bundle.lastReviewedAt = now;

  await saveConsentBundle(bundle);
  return revoked;
}

export async function revokeAllConsents(userId: string): Promise<number> {
  const bundle = await getConsentBundle();
  if (!bundle) return 0;

  const now = Date.now();
  let revokedCount = 0;

  bundle.consents = bundle.consents.map((c) => {
    if (c.status === 'granted') {
      revokedCount++;
      return { ...c, status: 'revoked' as ConsentStatus, revokedAt: now };
    }
    return c;
  });

  if (revokedCount > 0) {
    await logImmutableAuditEntry('consent_revoked', {
      actorType: 'user',
      actorRef: userId,
      action: `All consents revoked (${revokedCount} total)`,
      metadata: { revokedCount },
    });

    bundle.lastReviewedAt = now;
    await saveConsentBundle(bundle);
  }

  return revokedCount;
}

export async function checkConsentStatus(scope: ConsentScope): Promise<{
  hasConsent: boolean;
  consent?: ConsentRecord;
  isExpired: boolean;
}> {
  const bundle = await getConsentBundle();
  if (!bundle) return { hasConsent: false, isExpired: false };

  const consent = bundle.consents.find(
    (c) => c.scope === scope && c.status === 'granted'
  );

  if (!consent) return { hasConsent: false, isExpired: false };

  const isExpired = consent.expiresAt ? consent.expiresAt < Date.now() : false;

  return {
    hasConsent: !isExpired,
    consent,
    isExpired,
  };
}

export async function getActiveConsents(): Promise<ConsentRecord[]> {
  const bundle = await getConsentBundle();
  if (!bundle) return [];

  const now = Date.now();
  return bundle.consents.filter(
    (c) => c.status === 'granted' && (!c.expiresAt || c.expiresAt > now)
  );
}

export async function getConsentHistory(scope?: ConsentScope): Promise<ConsentRecord[]> {
  const bundle = await getConsentBundle();
  if (!bundle) return [];

  if (scope) {
    return bundle.consents.filter((c) => c.scope === scope);
  }
  return bundle.consents;
}

export async function processExpiredConsents(): Promise<number> {
  const bundle = await getConsentBundle();
  if (!bundle) return 0;

  const now = Date.now();
  let expiredCount = 0;

  bundle.consents = bundle.consents.map((c) => {
    if (c.status === 'granted' && c.expiresAt && c.expiresAt < now) {
      expiredCount++;
      return { ...c, status: 'expired' as ConsentStatus };
    }
    return c;
  });

  if (expiredCount > 0) {
    await logImmutableAuditEntry('consent_modified', {
      actorType: 'system',
      actorRef: 'system',
      action: `Expired consents processed (${expiredCount} total)`,
      metadata: { expiredCount },
    });

    await saveConsentBundle(bundle);
  }

  return expiredCount;
}

export async function scheduleConsentReview(daysFromNow: number = 365): Promise<void> {
  const bundle = await getConsentBundle();
  if (!bundle) return;

  bundle.nextReviewDue = Date.now() + daysFromNow * 24 * 60 * 60 * 1000;
  await saveConsentBundle(bundle);
}

export async function isConsentReviewDue(): Promise<boolean> {
  const bundle = await getConsentBundle();
  if (!bundle || !bundle.nextReviewDue) return false;
  return Date.now() >= bundle.nextReviewDue;
}

export const REQUIRED_CONSENTS: ConsentScope[] = [
  'data_collection',
  'data_processing',
];

export async function hasRequiredConsents(): Promise<{
  complete: boolean;
  missing: ConsentScope[];
}> {
  const active = await getActiveConsents();
  const activeScopes = new Set(active.map((c) => c.scope));

  const missing = REQUIRED_CONSENTS.filter((scope) => !activeScopes.has(scope));

  return {
    complete: missing.length === 0,
    missing,
  };
}
