import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PartnershipRequest,
  PartnershipAgreement,
  PartnershipType,
  PartnershipStatus,
  CohortCriteria,
  RWEExportFormat,
} from '../../types';

const PARTNERSHIP_REQUESTS_KEY = '@orbital:partnership_requests';
const PARTNERSHIP_AGREEMENTS_KEY = '@orbital:partnership_agreements';
const PARTNERSHIP_AUDIT_KEY = '@orbital:partnership_audit';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// PARTNERSHIP AUDIT LOG
// ============================================

interface PartnershipAuditEntry {
  id: string;
  requestId?: string;
  agreementId?: string;
  action:
    | 'request_submitted'
    | 'request_reviewed'
    | 'request_approved'
    | 'request_rejected'
    | 'agreement_created'
    | 'agreement_signed'
    | 'agreement_activated'
    | 'agreement_paused'
    | 'agreement_terminated'
    | 'data_accessed'
    | 'audit_conducted';
  performedBy: string;
  performedAt: number;
  details?: string;
}

async function logPartnershipAudit(
  action: PartnershipAuditEntry['action'],
  performedBy: string,
  options?: {
    requestId?: string;
    agreementId?: string;
    details?: string;
  }
): Promise<PartnershipAuditEntry> {
  const entry: PartnershipAuditEntry = {
    id: generateId('paud'),
    requestId: options?.requestId,
    agreementId: options?.agreementId,
    action,
    performedBy,
    performedAt: Date.now(),
    details: options?.details,
  };

  const data = await AsyncStorage.getItem(PARTNERSHIP_AUDIT_KEY);
  const log: PartnershipAuditEntry[] = data ? JSON.parse(data) : [];
  log.unshift(entry);
  await AsyncStorage.setItem(PARTNERSHIP_AUDIT_KEY, JSON.stringify(log));

  return entry;
}

export async function getPartnershipAuditLog(
  filter?: { requestId?: string; agreementId?: string }
): Promise<PartnershipAuditEntry[]> {
  const data = await AsyncStorage.getItem(PARTNERSHIP_AUDIT_KEY);
  if (!data) return [];
  let log: PartnershipAuditEntry[] = JSON.parse(data);

  if (filter?.requestId) {
    log = log.filter((e) => e.requestId === filter.requestId);
  }
  if (filter?.agreementId) {
    log = log.filter((e) => e.agreementId === filter.agreementId);
  }

  return log;
}

// ============================================
// PARTNERSHIP REQUESTS
// ============================================

export async function getPartnershipRequests(): Promise<PartnershipRequest[]> {
  const data = await AsyncStorage.getItem(PARTNERSHIP_REQUESTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getPartnershipRequest(requestId: string): Promise<PartnershipRequest | null> {
  const requests = await getPartnershipRequests();
  return requests.find((r) => r.id === requestId) || null;
}

export async function getPendingRequests(): Promise<PartnershipRequest[]> {
  const requests = await getPartnershipRequests();
  return requests.filter((r) => r.status === 'inquiry' || r.status === 'negotiating');
}

export async function submitPartnershipRequest(
  params: Omit<PartnershipRequest, 'id' | 'status' | 'submittedAt'>
): Promise<PartnershipRequest> {
  const request: PartnershipRequest = {
    id: generateId('preq'),
    ...params,
    status: 'inquiry',
    submittedAt: Date.now(),
  };

  const requests = await getPartnershipRequests();
  requests.push(request);
  await AsyncStorage.setItem(PARTNERSHIP_REQUESTS_KEY, JSON.stringify(requests));

  await logPartnershipAudit('request_submitted', params.contactEmail, {
    requestId: request.id,
    details: `Partnership request from ${params.companyName}`,
  });

  return request;
}

export async function updateRequestStatus(
  requestId: string,
  status: PartnershipStatus,
  reviewedBy: string,
  notes?: string
): Promise<PartnershipRequest | null> {
  const requests = await getPartnershipRequests();
  const index = requests.findIndex((r) => r.id === requestId);
  if (index === -1) return null;

  requests[index].status = status;
  requests[index].reviewedAt = Date.now();
  requests[index].reviewedBy = reviewedBy;
  if (notes) requests[index].notes = notes;

  await AsyncStorage.setItem(PARTNERSHIP_REQUESTS_KEY, JSON.stringify(requests));

  const action = status === 'negotiating' ? 'request_reviewed' :
                 status === 'legal_review' ? 'request_approved' :
                 'request_rejected';

  await logPartnershipAudit(action, reviewedBy, {
    requestId,
    details: `Status updated to ${status}`,
  });

  return requests[index];
}

// ============================================
// PARTNERSHIP AGREEMENTS
// ============================================

export async function getPartnershipAgreements(): Promise<PartnershipAgreement[]> {
  const data = await AsyncStorage.getItem(PARTNERSHIP_AGREEMENTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getPartnershipAgreement(agreementId: string): Promise<PartnershipAgreement | null> {
  const agreements = await getPartnershipAgreements();
  return agreements.find((a) => a.id === agreementId) || null;
}

export async function getActiveAgreements(): Promise<PartnershipAgreement[]> {
  const agreements = await getPartnershipAgreements();
  const now = Date.now();
  return agreements.filter(
    (a) => a.status === 'active' && a.expirationDate > now
  );
}

export async function getAgreementsByPartner(partnerId: string): Promise<PartnershipAgreement[]> {
  const agreements = await getPartnershipAgreements();
  return agreements.filter((a) => a.partnerId === partnerId);
}

export async function createPartnershipAgreement(
  requestId: string,
  params: {
    partnerId: string;
    partnerName: string;
    effectiveDate: number;
    expirationDate: number;
    dataAccessScope: PartnershipAgreement['dataAccessScope'];
    governanceTerms: PartnershipAgreement['governanceTerms'];
    financialTerms: PartnershipAgreement['financialTerms'];
    contractDocumentHash: string;
  },
  createdBy: string
): Promise<PartnershipAgreement> {
  const request = await getPartnershipRequest(requestId);
  if (!request) throw new Error('Request not found');

  const agreement: PartnershipAgreement = {
    id: generateId('pagr'),
    requestId,
    partnerId: params.partnerId,
    partnerName: params.partnerName,
    partnershipType: request.partnershipType,
    status: 'negotiating',
    effectiveDate: params.effectiveDate,
    expirationDate: params.expirationDate,
    dataAccessScope: params.dataAccessScope,
    governanceTerms: params.governanceTerms,
    financialTerms: params.financialTerms,
    contractDocumentHash: params.contractDocumentHash,
    signedAt: 0,
    signedBy: '',
    auditLog: [{ action: 'created', performedBy: createdBy, performedAt: Date.now() }],
  };

  const agreements = await getPartnershipAgreements();
  agreements.push(agreement);
  await AsyncStorage.setItem(PARTNERSHIP_AGREEMENTS_KEY, JSON.stringify(agreements));

  await logPartnershipAudit('agreement_created', createdBy, {
    requestId,
    agreementId: agreement.id,
    details: `Agreement created for ${params.partnerName}`,
  });

  return agreement;
}

export async function signAgreement(
  agreementId: string,
  signedBy: string
): Promise<PartnershipAgreement | null> {
  const agreements = await getPartnershipAgreements();
  const index = agreements.findIndex((a) => a.id === agreementId);
  if (index === -1) return null;

  agreements[index].status = 'legal_review';
  agreements[index].signedAt = Date.now();
  agreements[index].signedBy = signedBy;
  agreements[index].auditLog.push({
    action: 'signed',
    performedBy: signedBy,
    performedAt: Date.now(),
  });

  await AsyncStorage.setItem(PARTNERSHIP_AGREEMENTS_KEY, JSON.stringify(agreements));

  await logPartnershipAudit('agreement_signed', signedBy, {
    agreementId,
    details: `Agreement signed`,
  });

  return agreements[index];
}

export async function activateAgreement(
  agreementId: string,
  activatedBy: string
): Promise<PartnershipAgreement | null> {
  const agreements = await getPartnershipAgreements();
  const index = agreements.findIndex((a) => a.id === agreementId);
  if (index === -1) return null;

  agreements[index].status = 'active';
  agreements[index].auditLog.push({
    action: 'activated',
    performedBy: activatedBy,
    performedAt: Date.now(),
  });

  await AsyncStorage.setItem(PARTNERSHIP_AGREEMENTS_KEY, JSON.stringify(agreements));

  // Update the original request status
  await updateRequestStatus(agreements[index].requestId, 'active', activatedBy);

  await logPartnershipAudit('agreement_activated', activatedBy, {
    agreementId,
    details: `Agreement activated`,
  });

  return agreements[index];
}

export async function pauseAgreement(
  agreementId: string,
  pausedBy: string,
  reason?: string
): Promise<PartnershipAgreement | null> {
  const agreements = await getPartnershipAgreements();
  const index = agreements.findIndex((a) => a.id === agreementId);
  if (index === -1) return null;

  agreements[index].status = 'paused';
  agreements[index].auditLog.push({
    action: `paused: ${reason || 'No reason provided'}`,
    performedBy: pausedBy,
    performedAt: Date.now(),
  });

  await AsyncStorage.setItem(PARTNERSHIP_AGREEMENTS_KEY, JSON.stringify(agreements));

  await logPartnershipAudit('agreement_paused', pausedBy, {
    agreementId,
    details: reason || 'Agreement paused',
  });

  return agreements[index];
}

export async function terminateAgreement(
  agreementId: string,
  terminatedBy: string,
  reason: string
): Promise<PartnershipAgreement | null> {
  const agreements = await getPartnershipAgreements();
  const index = agreements.findIndex((a) => a.id === agreementId);
  if (index === -1) return null;

  agreements[index].status = 'terminated';
  agreements[index].auditLog.push({
    action: `terminated: ${reason}`,
    performedBy: terminatedBy,
    performedAt: Date.now(),
  });

  await AsyncStorage.setItem(PARTNERSHIP_AGREEMENTS_KEY, JSON.stringify(agreements));

  await logPartnershipAudit('agreement_terminated', terminatedBy, {
    agreementId,
    details: reason,
  });

  return agreements[index];
}

// ============================================
// DATA ACCESS TRACKING
// ============================================

export async function recordDataAccess(
  agreementId: string,
  accessedBy: string,
  details: string
): Promise<void> {
  const agreements = await getPartnershipAgreements();
  const index = agreements.findIndex((a) => a.id === agreementId);
  if (index === -1) return;

  agreements[index].auditLog.push({
    action: `data_access: ${details}`,
    performedBy: accessedBy,
    performedAt: Date.now(),
  });

  await AsyncStorage.setItem(PARTNERSHIP_AGREEMENTS_KEY, JSON.stringify(agreements));

  await logPartnershipAudit('data_accessed', accessedBy, {
    agreementId,
    details,
  });
}

export async function recordAuditConducted(
  agreementId: string,
  auditedBy: string,
  findings: string
): Promise<void> {
  const agreements = await getPartnershipAgreements();
  const index = agreements.findIndex((a) => a.id === agreementId);
  if (index === -1) return;

  agreements[index].auditLog.push({
    action: `audit: ${findings}`,
    performedBy: auditedBy,
    performedAt: Date.now(),
  });

  await AsyncStorage.setItem(PARTNERSHIP_AGREEMENTS_KEY, JSON.stringify(agreements));

  await logPartnershipAudit('audit_conducted', auditedBy, {
    agreementId,
    details: findings,
  });
}

// ============================================
// PARTNERSHIP SUMMARY
// ============================================

export async function getPartnershipSummary(): Promise<{
  requests: {
    total: number;
    byStatus: Record<PartnershipStatus, number>;
    byType: Record<PartnershipType, number>;
  };
  agreements: {
    total: number;
    active: number;
    totalValue: number;
    expiringIn90Days: number;
  };
}> {
  const requests = await getPartnershipRequests();
  const agreements = await getPartnershipAgreements();
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;

  const requestsByStatus: Record<PartnershipStatus, number> = {
    inquiry: 0, negotiating: 0, legal_review: 0, active: 0, paused: 0, terminated: 0,
  };
  const requestsByType: Record<PartnershipType, number> = {
    data_access: 0, study_collaboration: 0, platform_integration: 0, validation_study: 0,
  };

  for (const request of requests) {
    requestsByStatus[request.status]++;
    requestsByType[request.partnershipType]++;
  }

  let totalValue = 0;
  let expiringIn90Days = 0;
  const activeAgreements = agreements.filter((a) => a.status === 'active');

  for (const agreement of activeAgreements) {
    if (agreement.financialTerms.amount) {
      totalValue += agreement.financialTerms.amount;
    }
    if (agreement.expirationDate - now <= ninetyDays) {
      expiringIn90Days++;
    }
  }

  return {
    requests: {
      total: requests.length,
      byStatus: requestsByStatus,
      byType: requestsByType,
    },
    agreements: {
      total: agreements.length,
      active: activeAgreements.length,
      totalValue,
      expiringIn90Days,
    },
  };
}

// ============================================
// AGREEMENT GOVERNANCE CHECK
// ============================================

export async function validateDataAccess(
  agreementId: string,
  requestedData: string[],
  requestedFormat: RWEExportFormat
): Promise<{
  allowed: boolean;
  deniedElements: string[];
  deniedFormat: boolean;
  agreementStatus: PartnershipStatus;
}> {
  const agreement = await getPartnershipAgreement(agreementId);

  if (!agreement) {
    return {
      allowed: false,
      deniedElements: requestedData,
      deniedFormat: true,
      agreementStatus: 'terminated',
    };
  }

  if (agreement.status !== 'active') {
    return {
      allowed: false,
      deniedElements: requestedData,
      deniedFormat: true,
      agreementStatus: agreement.status,
    };
  }

  const now = Date.now();
  if (now < agreement.effectiveDate || now > agreement.expirationDate) {
    return {
      allowed: false,
      deniedElements: requestedData,
      deniedFormat: true,
      agreementStatus: agreement.status,
    };
  }

  const allowedElements = new Set(agreement.dataAccessScope.dataElements);
  const allowedFormats = new Set(agreement.dataAccessScope.exportFormats);

  const deniedElements = requestedData.filter((d) => !allowedElements.has(d));
  const deniedFormat = !allowedFormats.has(requestedFormat);

  return {
    allowed: deniedElements.length === 0 && !deniedFormat,
    deniedElements,
    deniedFormat,
    agreementStatus: agreement.status,
  };
}
