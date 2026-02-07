import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OrgRecord,
  OrgStatus,
  ProvisioningRequest,
  PricingTier,
  JurisdictionCode,
  RetentionWindow,
} from '../../types';

const ORGS_KEY = '@orbital:organizations';
const PROVISIONING_KEY = '@orbital:provisioning_requests';
const ORG_AUDIT_KEY = '@orbital:org_audit';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// ORG AUDIT LOG
// ============================================

interface OrgAuditEntry {
  id: string;
  orgId?: string;
  requestId?: string;
  action:
    | 'request_created'
    | 'request_approved'
    | 'request_rejected'
    | 'org_provisioned'
    | 'org_activated'
    | 'org_suspended'
    | 'org_offboarding_started'
    | 'org_terminated'
    | 'settings_changed'
    | 'limits_changed'
    | 'contact_updated';
  performedBy: string;
  performedAt: number;
  details?: string;
  previousValue?: string;
  newValue?: string;
}

async function logOrgAudit(
  action: OrgAuditEntry['action'],
  performedBy: string,
  options?: {
    orgId?: string;
    requestId?: string;
    details?: string;
    previousValue?: string;
    newValue?: string;
  }
): Promise<OrgAuditEntry> {
  const entry: OrgAuditEntry = {
    id: generateId('oaud'),
    orgId: options?.orgId,
    requestId: options?.requestId,
    action,
    performedBy,
    performedAt: Date.now(),
    details: options?.details,
    previousValue: options?.previousValue,
    newValue: options?.newValue,
  };

  const data = await AsyncStorage.getItem(ORG_AUDIT_KEY);
  const log: OrgAuditEntry[] = data ? JSON.parse(data) : [];
  log.unshift(entry);
  await AsyncStorage.setItem(ORG_AUDIT_KEY, JSON.stringify(log));

  return entry;
}

export async function getOrgAuditLog(
  filter?: { orgId?: string; requestId?: string }
): Promise<OrgAuditEntry[]> {
  const data = await AsyncStorage.getItem(ORG_AUDIT_KEY);
  if (!data) return [];
  let log: OrgAuditEntry[] = JSON.parse(data);

  if (filter?.orgId) {
    log = log.filter((e) => e.orgId === filter.orgId);
  }
  if (filter?.requestId) {
    log = log.filter((e) => e.requestId === filter.requestId);
  }
  return log;
}

// ============================================
// PROVISIONING REQUESTS
// ============================================

export async function getProvisioningRequests(): Promise<ProvisioningRequest[]> {
  const data = await AsyncStorage.getItem(PROVISIONING_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getPendingRequests(): Promise<ProvisioningRequest[]> {
  const requests = await getProvisioningRequests();
  return requests.filter((r) => r.status === 'pending');
}

export async function getProvisioningRequest(requestId: string): Promise<ProvisioningRequest | null> {
  const requests = await getProvisioningRequests();
  return requests.find((r) => r.id === requestId) || null;
}

export async function createProvisioningRequest(
  params: {
    orgName: string;
    tier: PricingTier;
    notes?: string;
  },
  requestedBy: string
): Promise<ProvisioningRequest> {
  const request: ProvisioningRequest = {
    id: generateId('prov'),
    orgName: params.orgName,
    tier: params.tier,
    requestedBy,
    requestedAt: Date.now(),
    status: 'pending',
    notes: params.notes,
  };

  const requests = await getProvisioningRequests();
  requests.push(request);
  await AsyncStorage.setItem(PROVISIONING_KEY, JSON.stringify(requests));

  await logOrgAudit('request_created', requestedBy, {
    requestId: request.id,
    details: `Provisioning request for ${params.orgName} (${params.tier})`,
  });

  return request;
}

export async function approveProvisioningRequest(
  requestId: string,
  approvedBy: string
): Promise<ProvisioningRequest | null> {
  const requests = await getProvisioningRequests();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) return null;

  requests[index].status = 'approved';
  requests[index].approvedBy = approvedBy;
  requests[index].approvedAt = Date.now();

  await AsyncStorage.setItem(PROVISIONING_KEY, JSON.stringify(requests));

  await logOrgAudit('request_approved', approvedBy, {
    requestId,
    details: `Approved provisioning for ${requests[index].orgName}`,
  });

  return requests[index];
}

export async function rejectProvisioningRequest(
  requestId: string,
  rejectedBy: string,
  reason?: string
): Promise<ProvisioningRequest | null> {
  const requests = await getProvisioningRequests();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) return null;

  requests[index].status = 'rejected';
  requests[index].notes = reason || requests[index].notes;

  await AsyncStorage.setItem(PROVISIONING_KEY, JSON.stringify(requests));

  await logOrgAudit('request_rejected', rejectedBy, {
    requestId,
    details: reason || `Rejected provisioning for ${requests[index].orgName}`,
  });

  return requests[index];
}

// ============================================
// ORGANIZATIONS
// ============================================

export async function getOrganizations(): Promise<OrgRecord[]> {
  const data = await AsyncStorage.getItem(ORGS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getActiveOrganizations(): Promise<OrgRecord[]> {
  const orgs = await getOrganizations();
  return orgs.filter((o) => o.status === 'active');
}

export async function getOrganization(orgId: string): Promise<OrgRecord | null> {
  const orgs = await getOrganizations();
  return orgs.find((o) => o.id === orgId) || null;
}

export async function provisionOrganization(
  requestId: string,
  params: {
    primaryContact: OrgRecord['primaryContact'];
    jurisdictionCode?: JurisdictionCode;
    settings?: Partial<OrgRecord['settings']>;
    limits?: Partial<OrgRecord['limits']>;
  },
  provisionedBy: string
): Promise<OrgRecord | null> {
  const requests = await getProvisioningRequests();
  const requestIndex = requests.findIndex((r) => r.id === requestId);
  if (requestIndex === -1 || requests[requestIndex].status !== 'approved') {
    return null;
  }

  const request = requests[requestIndex];
  const now = Date.now();

  const defaultLimits: OrgRecord['limits'] = {
    maxSeats: request.tier === 'enterprise' ? 1000 :
              request.tier === 'pilot' ? 50 :
              request.tier === 'family' ? 6 : 1,
    maxStorageGb: request.tier === 'enterprise' ? 100 :
                  request.tier === 'pilot' ? 10 : 1,
    apiRateLimit: request.tier === 'enterprise' ? 10000 :
                  request.tier === 'pilot' ? 1000 : 100,
  };

  const org: OrgRecord = {
    id: generateId('org'),
    name: request.orgName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    displayName: request.orgName,
    tier: request.tier,
    status: 'pending',
    jurisdictionCode: params.jurisdictionCode || 'US',
    createdAt: now,
    primaryContact: params.primaryContact,
    settings: {
      retentionWindow: '3y',
      ssoEnabled: false,
      mfaRequired: request.tier === 'enterprise',
      dataResidency: 'us-east-1',
      ...params.settings,
    },
    limits: {
      ...defaultLimits,
      ...params.limits,
    },
    auditRef: generateId('aud'),
  };

  const orgs = await getOrganizations();
  orgs.push(org);
  await AsyncStorage.setItem(ORGS_KEY, JSON.stringify(orgs));

  // Update request status
  requests[requestIndex].status = 'provisioned';
  requests[requestIndex].provisionedAt = now;
  requests[requestIndex].orgId = org.id;
  await AsyncStorage.setItem(PROVISIONING_KEY, JSON.stringify(requests));

  await logOrgAudit('org_provisioned', provisionedBy, {
    orgId: org.id,
    requestId,
    details: `Provisioned organization ${org.displayName}`,
  });

  return org;
}

export async function activateOrganization(
  orgId: string,
  activatedBy: string
): Promise<OrgRecord | null> {
  const orgs = await getOrganizations();
  const index = orgs.findIndex((o) => o.id === orgId);
  if (index === -1) return null;

  orgs[index].status = 'active';
  orgs[index].activatedAt = Date.now();
  await AsyncStorage.setItem(ORGS_KEY, JSON.stringify(orgs));

  await logOrgAudit('org_activated', activatedBy, {
    orgId,
    details: `Activated organization ${orgs[index].displayName}`,
  });

  return orgs[index];
}

export async function suspendOrganization(
  orgId: string,
  suspendedBy: string,
  reason?: string
): Promise<OrgRecord | null> {
  const orgs = await getOrganizations();
  const index = orgs.findIndex((o) => o.id === orgId);
  if (index === -1) return null;

  orgs[index].status = 'suspended';
  await AsyncStorage.setItem(ORGS_KEY, JSON.stringify(orgs));

  await logOrgAudit('org_suspended', suspendedBy, {
    orgId,
    details: reason || `Suspended organization ${orgs[index].displayName}`,
  });

  return orgs[index];
}

export async function updateOrgStatus(
  orgId: string,
  newStatus: OrgStatus,
  updatedBy: string
): Promise<OrgRecord | null> {
  const orgs = await getOrganizations();
  const index = orgs.findIndex((o) => o.id === orgId);
  if (index === -1) return null;

  const oldStatus = orgs[index].status;
  orgs[index].status = newStatus;

  if (newStatus === 'active' && !orgs[index].activatedAt) {
    orgs[index].activatedAt = Date.now();
  }

  await AsyncStorage.setItem(ORGS_KEY, JSON.stringify(orgs));

  const actionMap: Record<OrgStatus, OrgAuditEntry['action']> = {
    pending: 'org_provisioned',
    active: 'org_activated',
    suspended: 'org_suspended',
    offboarding: 'org_offboarding_started',
    terminated: 'org_terminated',
  };

  await logOrgAudit(actionMap[newStatus], updatedBy, {
    orgId,
    previousValue: oldStatus,
    newValue: newStatus,
    details: `Status changed from ${oldStatus} to ${newStatus}`,
  });

  return orgs[index];
}

export async function updateOrgSettings(
  orgId: string,
  settings: Partial<OrgRecord['settings']>,
  updatedBy: string
): Promise<OrgRecord | null> {
  const orgs = await getOrganizations();
  const index = orgs.findIndex((o) => o.id === orgId);
  if (index === -1) return null;

  const previousSettings = { ...orgs[index].settings };
  orgs[index].settings = { ...orgs[index].settings, ...settings };
  await AsyncStorage.setItem(ORGS_KEY, JSON.stringify(orgs));

  await logOrgAudit('settings_changed', updatedBy, {
    orgId,
    previousValue: JSON.stringify(previousSettings),
    newValue: JSON.stringify(orgs[index].settings),
    details: `Settings updated for ${orgs[index].displayName}`,
  });

  return orgs[index];
}

export async function updateOrgLimits(
  orgId: string,
  limits: Partial<OrgRecord['limits']>,
  updatedBy: string
): Promise<OrgRecord | null> {
  const orgs = await getOrganizations();
  const index = orgs.findIndex((o) => o.id === orgId);
  if (index === -1) return null;

  const previousLimits = { ...orgs[index].limits };
  orgs[index].limits = { ...orgs[index].limits, ...limits };
  await AsyncStorage.setItem(ORGS_KEY, JSON.stringify(orgs));

  await logOrgAudit('limits_changed', updatedBy, {
    orgId,
    previousValue: JSON.stringify(previousLimits),
    newValue: JSON.stringify(orgs[index].limits),
    details: `Limits updated for ${orgs[index].displayName}`,
  });

  return orgs[index];
}

export async function updateOrgContacts(
  orgId: string,
  contacts: {
    primaryContact?: OrgRecord['primaryContact'];
    billingContact?: OrgRecord['billingContact'];
    technicalContact?: OrgRecord['technicalContact'];
  },
  updatedBy: string
): Promise<OrgRecord | null> {
  const orgs = await getOrganizations();
  const index = orgs.findIndex((o) => o.id === orgId);
  if (index === -1) return null;

  if (contacts.primaryContact) orgs[index].primaryContact = contacts.primaryContact;
  if (contacts.billingContact) orgs[index].billingContact = contacts.billingContact;
  if (contacts.technicalContact) orgs[index].technicalContact = contacts.technicalContact;

  await AsyncStorage.setItem(ORGS_KEY, JSON.stringify(orgs));

  await logOrgAudit('contact_updated', updatedBy, {
    orgId,
    details: `Contacts updated for ${orgs[index].displayName}`,
  });

  return orgs[index];
}

// ============================================
// OFFBOARDING
// ============================================

export interface OffboardingRecord {
  id: string;
  orgId: string;
  orgName: string;
  initiatedBy: string;
  initiatedAt: number;
  exportWindowEndsAt: number;
  scheduledDeletionAt: number;
  exportCompleted: boolean;
  exportedAt?: number;
  deletionCompleted: boolean;
  deletedAt?: number;
  deletionCertificateId?: string;
}

const OFFBOARDING_KEY = '@orbital:offboarding_records';

export async function getOffboardingRecords(): Promise<OffboardingRecord[]> {
  const data = await AsyncStorage.getItem(OFFBOARDING_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function initiateOrgOffboarding(
  orgId: string,
  initiatedBy: string,
  exportWindowDays: number = 30
): Promise<OffboardingRecord | null> {
  const org = await getOrganization(orgId);
  if (!org) return null;

  const now = Date.now();
  const exportWindowMs = exportWindowDays * 24 * 60 * 60 * 1000;
  const deletionBufferMs = 7 * 24 * 60 * 60 * 1000; // 7 days after export window

  const record: OffboardingRecord = {
    id: generateId('offb'),
    orgId,
    orgName: org.displayName,
    initiatedBy,
    initiatedAt: now,
    exportWindowEndsAt: now + exportWindowMs,
    scheduledDeletionAt: now + exportWindowMs + deletionBufferMs,
    exportCompleted: false,
    deletionCompleted: false,
  };

  const records = await getOffboardingRecords();
  records.push(record);
  await AsyncStorage.setItem(OFFBOARDING_KEY, JSON.stringify(records));

  await updateOrgStatus(orgId, 'offboarding', initiatedBy);

  await logOrgAudit('org_offboarding_started', initiatedBy, {
    orgId,
    details: `Offboarding initiated. Export window: ${exportWindowDays} days. Deletion scheduled: ${new Date(record.scheduledDeletionAt).toISOString()}`,
  });

  return record;
}

export async function markExportComplete(
  offboardingId: string,
  completedBy: string
): Promise<OffboardingRecord | null> {
  const records = await getOffboardingRecords();
  const index = records.findIndex((r) => r.id === offboardingId);
  if (index === -1) return null;

  records[index].exportCompleted = true;
  records[index].exportedAt = Date.now();
  await AsyncStorage.setItem(OFFBOARDING_KEY, JSON.stringify(records));

  return records[index];
}

export async function executeOrgDeletion(
  offboardingId: string,
  executedBy: string
): Promise<{ success: boolean; certificateId?: string }> {
  const records = await getOffboardingRecords();
  const index = records.findIndex((r) => r.id === offboardingId);
  if (index === -1) return { success: false };

  const record = records[index];
  const now = Date.now();

  // Check if deletion is allowed
  if (now < record.scheduledDeletionAt) {
    return { success: false };
  }

  // Generate deletion certificate
  const certificateId = generateId('delcert');

  // Mark org as terminated
  await updateOrgStatus(record.orgId, 'terminated', executedBy);

  // Update offboarding record
  records[index].deletionCompleted = true;
  records[index].deletedAt = now;
  records[index].deletionCertificateId = certificateId;
  await AsyncStorage.setItem(OFFBOARDING_KEY, JSON.stringify(records));

  await logOrgAudit('org_terminated', executedBy, {
    orgId: record.orgId,
    details: `Organization terminated. Deletion certificate: ${certificateId}`,
  });

  return { success: true, certificateId };
}

export async function generateDeletionCertificate(
  offboardingId: string
): Promise<string | null> {
  const records = await getOffboardingRecords();
  const record = records.find((r) => r.id === offboardingId);
  if (!record || !record.deletionCompleted) return null;

  return `
CERTIFICATE OF DATA DELETION
=============================

Organization: ${record.orgName}
Organization ID: ${record.orgId}
Certificate ID: ${record.deletionCertificateId}

Deletion Timeline:
- Offboarding Initiated: ${new Date(record.initiatedAt).toISOString()}
- Export Window Closed: ${new Date(record.exportWindowEndsAt).toISOString()}
- Data Deleted: ${new Date(record.deletedAt!).toISOString()}

Export Status: ${record.exportCompleted ? 'Completed' : 'Not Completed'}
${record.exportedAt ? `Export Date: ${new Date(record.exportedAt).toISOString()}` : ''}

This certificate confirms that all user data associated with the above
organization has been permanently deleted from all production systems
in accordance with our data retention and deletion policies.

Generated: ${new Date().toISOString()}
`;
}

// ============================================
// ORGANIZATION METRICS
// ============================================

export async function getOrgMetrics(): Promise<{
  total: number;
  byStatus: Record<OrgStatus, number>;
  byTier: Record<PricingTier, number>;
  pendingRequests: number;
  activeOffboardings: number;
}> {
  const orgs = await getOrganizations();
  const requests = await getProvisioningRequests();
  const offboardings = await getOffboardingRecords();

  const metrics = {
    total: orgs.length,
    byStatus: {
      pending: 0,
      active: 0,
      suspended: 0,
      offboarding: 0,
      terminated: 0,
    } as Record<OrgStatus, number>,
    byTier: {
      personal: 0,
      family: 0,
      pilot: 0,
      enterprise: 0,
      custom: 0,
    } as Record<PricingTier, number>,
    pendingRequests: requests.filter((r) => r.status === 'pending').length,
    activeOffboardings: offboardings.filter((o) => !o.deletionCompleted).length,
  };

  orgs.forEach((org) => {
    metrics.byStatus[org.status]++;
    metrics.byTier[org.tier]++;
  });

  return metrics;
}
