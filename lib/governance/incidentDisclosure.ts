import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  IncidentDisclosure,
  DisclosureAcknowledgement,
  DisclosureType,
  IncidentSeverity,
} from '../../types';
import { logImmutableAuditEntry } from './immutableAuditLog';

const DISCLOSURES_KEY = '@orbital:incident_disclosures';
const ACKNOWLEDGEMENTS_KEY = '@orbital:disclosure_acknowledgements';

function generateDisclosureId(): string {
  return `disclosure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// DISCLOSURE MANAGEMENT
// ============================================

export async function getDisclosures(): Promise<IncidentDisclosure[]> {
  const data = await AsyncStorage.getItem(DISCLOSURES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getActiveDisclosures(): Promise<IncidentDisclosure[]> {
  const disclosures = await getDisclosures();
  return disclosures.filter((d) => !d.resolvedAt);
}

export async function getPendingAcknowledgements(userId: string): Promise<IncidentDisclosure[]> {
  const disclosures = await getActiveDisclosures();
  const acknowledgements = await getAcknowledgements();

  const acknowledgedIds = new Set(
    acknowledgements
      .filter((a) => a.acknowledgedBy === userId)
      .map((a) => a.disclosureId)
  );

  return disclosures.filter(
    (d) => d.acknowledgementRequired && !acknowledgedIds.has(d.id)
  );
}

export async function createDisclosure(
  params: {
    type: DisclosureType;
    severity: IncidentSeverity;
    title: string;
    description: string;
    affectedScopes: string[];
    effectiveAt?: number;
    acknowledgementRequired?: boolean;
  },
  createdBy: string
): Promise<IncidentDisclosure> {
  const now = Date.now();

  const disclosure: IncidentDisclosure = {
    id: generateDisclosureId(),
    type: params.type,
    severity: params.severity,
    title: params.title,
    description: params.description,
    affectedScopes: params.affectedScopes,
    disclosedAt: now,
    effectiveAt: params.effectiveAt,
    version: '1.0',
    acknowledgementRequired: params.acknowledgementRequired ?? params.severity !== 'informational',
  };

  const disclosures = await getDisclosures();
  disclosures.unshift(disclosure);
  await AsyncStorage.setItem(DISCLOSURES_KEY, JSON.stringify(disclosures));

  await logImmutableAuditEntry('admin_action', {
    actorType: 'admin',
    actorRef: createdBy,
    action: `Disclosure created: ${params.type} - ${params.title}`,
    targetRef: disclosure.id,
    metadata: {
      type: params.type,
      severity: params.severity,
      acknowledgementRequired: disclosure.acknowledgementRequired,
    },
  });

  return disclosure;
}

export async function updateDisclosure(
  disclosureId: string,
  updates: Partial<Pick<IncidentDisclosure, 'description' | 'affectedScopes' | 'resolvedAt'>>,
  updatedBy: string
): Promise<IncidentDisclosure | null> {
  const disclosures = await getDisclosures();
  const index = disclosures.findIndex((d) => d.id === disclosureId);

  if (index === -1) return null;

  const oldVersion = disclosures[index].version;
  const [major, minor] = oldVersion.split('.').map(Number);

  disclosures[index] = {
    ...disclosures[index],
    ...updates,
    version: `${major}.${minor + 1}`,
  };

  await AsyncStorage.setItem(DISCLOSURES_KEY, JSON.stringify(disclosures));

  await logImmutableAuditEntry('admin_action', {
    actorType: 'admin',
    actorRef: updatedBy,
    action: `Disclosure updated: ${disclosures[index].title}`,
    targetRef: disclosureId,
    metadata: { newVersion: disclosures[index].version },
  });

  return disclosures[index];
}

export async function resolveDisclosure(
  disclosureId: string,
  resolvedBy: string
): Promise<IncidentDisclosure | null> {
  return updateDisclosure(
    disclosureId,
    { resolvedAt: Date.now() },
    resolvedBy
  );
}

// ============================================
// ACKNOWLEDGEMENT MANAGEMENT
// ============================================

export async function getAcknowledgements(): Promise<DisclosureAcknowledgement[]> {
  const data = await AsyncStorage.getItem(ACKNOWLEDGEMENTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function acknowledgeDisclosure(
  disclosureId: string,
  userId: string
): Promise<DisclosureAcknowledgement> {
  const disclosures = await getDisclosures();
  const disclosure = disclosures.find((d) => d.id === disclosureId);

  if (!disclosure) {
    throw new Error(`Disclosure not found: ${disclosureId}`);
  }

  const auditEntry = await logImmutableAuditEntry('policy_accepted', {
    actorType: 'user',
    actorRef: userId,
    action: `Disclosure acknowledged: ${disclosure.title}`,
    targetRef: disclosureId,
    metadata: {
      type: disclosure.type,
      severity: disclosure.severity,
      version: disclosure.version,
    },
  });

  const acknowledgement: DisclosureAcknowledgement = {
    disclosureId,
    acknowledgedBy: userId,
    acknowledgedAt: Date.now(),
    auditRef: auditEntry.id,
  };

  const acknowledgements = await getAcknowledgements();
  acknowledgements.push(acknowledgement);
  await AsyncStorage.setItem(ACKNOWLEDGEMENTS_KEY, JSON.stringify(acknowledgements));

  return acknowledgement;
}

export async function hasAcknowledgedDisclosure(
  disclosureId: string,
  userId: string
): Promise<boolean> {
  const acknowledgements = await getAcknowledgements();
  return acknowledgements.some(
    (a) => a.disclosureId === disclosureId && a.acknowledgedBy === userId
  );
}

// ============================================
// DISCLOSURE QUERIES
// ============================================

export async function getDisclosuresByType(type: DisclosureType): Promise<IncidentDisclosure[]> {
  const disclosures = await getDisclosures();
  return disclosures.filter((d) => d.type === type);
}

export async function getDisclosuresBySeverity(severity: IncidentSeverity): Promise<IncidentDisclosure[]> {
  const disclosures = await getDisclosures();
  return disclosures.filter((d) => d.severity === severity);
}

export async function getRecentDisclosures(days: number = 90): Promise<IncidentDisclosure[]> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const disclosures = await getDisclosures();
  return disclosures.filter((d) => d.disclosedAt >= cutoff);
}

// ============================================
// POLICY VERSION TRACKING
// ============================================

export async function createPolicyChangeDisclosure(
  policyType: string,
  changesSummary: string,
  effectiveAt: number,
  createdBy: string
): Promise<IncidentDisclosure> {
  return createDisclosure(
    {
      type: 'policy_change',
      severity: 'informational',
      title: `Policy Update: ${policyType}`,
      description: changesSummary,
      affectedScopes: [policyType],
      effectiveAt,
      acknowledgementRequired: true,
    },
    createdBy
  );
}

export async function createSecurityIncidentDisclosure(
  title: string,
  description: string,
  severity: IncidentSeverity,
  affectedScopes: string[],
  createdBy: string
): Promise<IncidentDisclosure> {
  return createDisclosure(
    {
      type: 'security_incident',
      severity,
      title,
      description,
      affectedScopes,
      acknowledgementRequired: severity !== 'informational',
    },
    createdBy
  );
}

// ============================================
// COMPLIANCE HELPERS
// ============================================

export async function getAcknowledgementReport(disclosureId: string): Promise<{
  disclosure: IncidentDisclosure | null;
  totalAcknowledgements: number;
  acknowledgements: DisclosureAcknowledgement[];
}> {
  const disclosures = await getDisclosures();
  const disclosure = disclosures.find((d) => d.id === disclosureId) || null;
  const allAcknowledgements = await getAcknowledgements();
  const acknowledgements = allAcknowledgements.filter((a) => a.disclosureId === disclosureId);

  return {
    disclosure,
    totalAcknowledgements: acknowledgements.length,
    acknowledgements,
  };
}

export async function getComplianceStatus(userId: string): Promise<{
  hasPendingAcknowledgements: boolean;
  pendingCount: number;
  criticalPending: boolean;
}> {
  const pending = await getPendingAcknowledgements(userId);
  const criticalPending = pending.some(
    (d) => d.severity === 'critical' || d.severity === 'major'
  );

  return {
    hasPendingAcknowledgements: pending.length > 0,
    pendingCount: pending.length,
    criticalPending,
  };
}
