import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ContractTemplate,
  SignedContract,
  ContractType,
  ContractStatus,
} from '../../types';

const TEMPLATES_KEY = '@orbital:contract_templates';
const CONTRACTS_KEY = '@orbital:signed_contracts';
const CONTRACT_AUDIT_KEY = '@orbital:contract_audit';

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
// CONTRACT AUDIT LOG
// ============================================

interface ContractAuditEntry {
  id: string;
  contractId?: string;
  templateId?: string;
  action: 'template_created' | 'template_updated' | 'template_deprecated' |
          'contract_created' | 'contract_sent' | 'contract_signed' |
          'contract_activated' | 'contract_terminated' | 'contract_renewed' |
          'pdf_uploaded' | 'pdf_accessed';
  performedBy: string;
  performedAt: number;
  details?: string;
  ipAddress?: string;
}

async function logContractAudit(
  action: ContractAuditEntry['action'],
  performedBy: string,
  options?: {
    contractId?: string;
    templateId?: string;
    details?: string;
  }
): Promise<ContractAuditEntry> {
  const entry: ContractAuditEntry = {
    id: generateId('caud'),
    contractId: options?.contractId,
    templateId: options?.templateId,
    action,
    performedBy,
    performedAt: Date.now(),
    details: options?.details,
  };

  const data = await AsyncStorage.getItem(CONTRACT_AUDIT_KEY);
  const log: ContractAuditEntry[] = data ? JSON.parse(data) : [];
  log.unshift(entry);
  await AsyncStorage.setItem(CONTRACT_AUDIT_KEY, JSON.stringify(log));

  return entry;
}

export async function getContractAuditLog(
  filter?: { contractId?: string; templateId?: string }
): Promise<ContractAuditEntry[]> {
  const data = await AsyncStorage.getItem(CONTRACT_AUDIT_KEY);
  if (!data) return [];
  const log: ContractAuditEntry[] = JSON.parse(data);

  if (filter?.contractId) {
    return log.filter((e) => e.contractId === filter.contractId);
  }
  if (filter?.templateId) {
    return log.filter((e) => e.templateId === filter.templateId);
  }
  return log;
}

// ============================================
// CONTRACT TEMPLATES
// ============================================

export async function getTemplates(): Promise<ContractTemplate[]> {
  const data = await AsyncStorage.getItem(TEMPLATES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getActiveTemplates(): Promise<ContractTemplate[]> {
  const templates = await getTemplates();
  return templates.filter((t) => t.isActive);
}

export async function getTemplatesByType(type: ContractType): Promise<ContractTemplate[]> {
  const templates = await getActiveTemplates();
  return templates.filter((t) => t.type === type);
}

export async function getTemplate(templateId: string): Promise<ContractTemplate | null> {
  const templates = await getTemplates();
  return templates.find((t) => t.id === templateId) || null;
}

export async function createTemplate(
  params: {
    type: ContractType;
    title: string;
    content: string;
    locale?: 'en' | 'es';
  },
  createdBy: string
): Promise<ContractTemplate> {
  const now = Date.now();
  const template: ContractTemplate = {
    id: generateId('tmpl'),
    type: params.type,
    version: '1.0.0',
    title: params.title,
    contentHash: hashContent(params.content),
    createdAt: now,
    lastModifiedAt: now,
    isActive: true,
    locale: params.locale || 'en',
  };

  const templates = await getTemplates();
  templates.push(template);
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));

  await logContractAudit('template_created', createdBy, {
    templateId: template.id,
    details: `Created ${params.type} template: ${params.title}`,
  });

  return template;
}

export async function updateTemplate(
  templateId: string,
  content: string,
  updatedBy: string
): Promise<ContractTemplate | null> {
  const templates = await getTemplates();
  const index = templates.findIndex((t) => t.id === templateId);
  if (index === -1) return null;

  const existing = templates[index];
  const versionParts = existing.version.split('.').map(Number);
  versionParts[1]++; // Increment minor version

  templates[index] = {
    ...existing,
    version: versionParts.join('.'),
    contentHash: hashContent(content),
    lastModifiedAt: Date.now(),
  };

  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));

  await logContractAudit('template_updated', updatedBy, {
    templateId,
    details: `Updated to version ${templates[index].version}`,
  });

  return templates[index];
}

export async function deprecateTemplate(
  templateId: string,
  deprecatedBy: string
): Promise<boolean> {
  const templates = await getTemplates();
  const index = templates.findIndex((t) => t.id === templateId);
  if (index === -1) return false;

  templates[index].isActive = false;
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));

  await logContractAudit('template_deprecated', deprecatedBy, {
    templateId,
    details: `Deprecated template ${templates[index].title}`,
  });

  return true;
}

// ============================================
// SIGNED CONTRACTS (PDF VAULT)
// ============================================

export async function getContracts(): Promise<SignedContract[]> {
  const data = await AsyncStorage.getItem(CONTRACTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getContractsByOrg(orgId: string): Promise<SignedContract[]> {
  const contracts = await getContracts();
  return contracts.filter((c) => c.orgId === orgId);
}

export async function getContractsByStatus(status: ContractStatus): Promise<SignedContract[]> {
  const contracts = await getContracts();
  return contracts.filter((c) => c.status === status);
}

export async function getContract(contractId: string): Promise<SignedContract | null> {
  const contracts = await getContracts();
  return contracts.find((c) => c.id === contractId) || null;
}

export async function createContract(
  params: {
    templateId: string;
    type: ContractType;
    orgId: string;
    orgName: string;
    effectiveDate: number;
    expirationDate?: number;
    autoRenew: boolean;
    renewalTermMonths?: number;
    annualValue: number;
    currency?: 'USD' | 'EUR' | 'GBP';
    counterpartySignatory?: string;
    internalSignatory?: string;
  },
  createdBy: string
): Promise<SignedContract> {
  const contract: SignedContract = {
    id: generateId('cntr'),
    templateId: params.templateId,
    type: params.type,
    orgId: params.orgId,
    orgName: params.orgName,
    status: 'draft',
    effectiveDate: params.effectiveDate,
    expirationDate: params.expirationDate,
    autoRenew: params.autoRenew,
    renewalTermMonths: params.renewalTermMonths,
    annualValue: params.annualValue,
    currency: params.currency || 'USD',
    counterpartySignatory: params.counterpartySignatory,
    internalSignatory: params.internalSignatory,
    auditRef: generateId('aud'),
  };

  const contracts = await getContracts();
  contracts.push(contract);
  await AsyncStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));

  await logContractAudit('contract_created', createdBy, {
    contractId: contract.id,
    templateId: params.templateId,
    details: `Created ${params.type} contract for ${params.orgName}`,
  });

  return contract;
}

export async function updateContractStatus(
  contractId: string,
  newStatus: ContractStatus,
  updatedBy: string,
  options?: { signedPdfHash?: string; signedAt?: number }
): Promise<SignedContract | null> {
  const contracts = await getContracts();
  const index = contracts.findIndex((c) => c.id === contractId);
  if (index === -1) return null;

  const oldStatus = contracts[index].status;
  contracts[index].status = newStatus;

  if (newStatus === 'signed' || newStatus === 'active') {
    contracts[index].signedAt = options?.signedAt || Date.now();
    if (options?.signedPdfHash) {
      contracts[index].signedPdfHash = options.signedPdfHash;
    }
  }

  await AsyncStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));

  const actionMap: Record<string, ContractAuditEntry['action']> = {
    sent: 'contract_sent',
    signed: 'contract_signed',
    active: 'contract_activated',
    terminated: 'contract_terminated',
  };

  await logContractAudit(actionMap[newStatus] || 'contract_created', updatedBy, {
    contractId,
    details: `Status changed from ${oldStatus} to ${newStatus}`,
  });

  return contracts[index];
}

export async function uploadSignedPdf(
  contractId: string,
  pdfContent: string,
  uploadedBy: string
): Promise<SignedContract | null> {
  const contracts = await getContracts();
  const index = contracts.findIndex((c) => c.id === contractId);
  if (index === -1) return null;

  const pdfHash = hashContent(pdfContent);
  contracts[index].signedPdfHash = pdfHash;

  await AsyncStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));

  await logContractAudit('pdf_uploaded', uploadedBy, {
    contractId,
    details: `PDF uploaded with hash: ${pdfHash.substring(0, 8)}...`,
  });

  return contracts[index];
}

export async function recordPdfAccess(
  contractId: string,
  accessedBy: string
): Promise<void> {
  await logContractAudit('pdf_accessed', accessedBy, {
    contractId,
    details: 'PDF document accessed',
  });
}

export async function renewContract(
  contractId: string,
  renewedBy: string,
  options?: {
    newExpirationDate?: number;
    newAnnualValue?: number;
  }
): Promise<SignedContract | null> {
  const contracts = await getContracts();
  const index = contracts.findIndex((c) => c.id === contractId);
  if (index === -1) return null;

  const contract = contracts[index];
  const renewalMonths = contract.renewalTermMonths || 12;
  const newExpiration = options?.newExpirationDate ||
    (contract.expirationDate
      ? contract.expirationDate + renewalMonths * 30 * 24 * 60 * 60 * 1000
      : Date.now() + renewalMonths * 30 * 24 * 60 * 60 * 1000);

  contracts[index] = {
    ...contract,
    expirationDate: newExpiration,
    annualValue: options?.newAnnualValue || contract.annualValue,
    status: 'active',
  };

  await AsyncStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));

  await logContractAudit('contract_renewed', renewedBy, {
    contractId,
    details: `Renewed for ${renewalMonths} months`,
  });

  return contracts[index];
}

// ============================================
// CONTRACT TEMPLATES (DEFAULT)
// ============================================

export const DEFAULT_CONTRACT_TEMPLATES: Omit<ContractTemplate, 'id' | 'createdAt' | 'lastModifiedAt' | 'contentHash'>[] = [
  {
    type: 'msa',
    version: '1.0.0',
    title: 'Master Service Agreement',
    isActive: true,
    locale: 'en',
  },
  {
    type: 'dpa',
    version: '1.0.0',
    title: 'Data Processing Agreement',
    isActive: true,
    locale: 'en',
  },
  {
    type: 'baa',
    version: '1.0.0',
    title: 'Business Associate Agreement (HIPAA)',
    isActive: true,
    locale: 'en',
  },
  {
    type: 'nda',
    version: '1.0.0',
    title: 'Non-Disclosure Agreement',
    isActive: true,
    locale: 'en',
  },
  {
    type: 'pilot',
    version: '1.0.0',
    title: 'Pilot Program Agreement',
    isActive: true,
    locale: 'en',
  },
  {
    type: 'enterprise',
    version: '1.0.0',
    title: 'Enterprise License Agreement',
    isActive: true,
    locale: 'en',
  },
  {
    type: 'sow',
    version: '1.0.0',
    title: 'Statement of Work',
    isActive: true,
    locale: 'en',
  },
  {
    type: 'amendment',
    version: '1.0.0',
    title: 'Contract Amendment',
    isActive: true,
    locale: 'en',
  },
];

export async function initializeDefaultTemplates(initializedBy: string): Promise<number> {
  const existing = await getTemplates();
  if (existing.length > 0) return 0;

  let count = 0;
  for (const template of DEFAULT_CONTRACT_TEMPLATES) {
    await createTemplate(
      {
        type: template.type,
        title: template.title,
        content: `[${template.title} - Version ${template.version}]`,
        locale: template.locale,
      },
      initializedBy
    );
    count++;
  }
  return count;
}

// ============================================
// CONTRACT SUMMARY & ANALYTICS
// ============================================

export async function getContractSummary(): Promise<{
  total: number;
  byStatus: Record<ContractStatus, number>;
  byType: Record<ContractType, number>;
  totalAnnualValue: number;
  expiringIn30Days: number;
  expiringIn90Days: number;
  autoRenewCount: number;
}> {
  const contracts = await getContracts();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;

  const summary = {
    total: contracts.length,
    byStatus: {
      draft: 0,
      sent: 0,
      negotiating: 0,
      signed: 0,
      active: 0,
      expired: 0,
      terminated: 0,
    } as Record<ContractStatus, number>,
    byType: {
      msa: 0,
      sow: 0,
      dpa: 0,
      baa: 0,
      nda: 0,
      pilot: 0,
      enterprise: 0,
      amendment: 0,
    } as Record<ContractType, number>,
    totalAnnualValue: 0,
    expiringIn30Days: 0,
    expiringIn90Days: 0,
    autoRenewCount: 0,
  };

  contracts.forEach((contract) => {
    summary.byStatus[contract.status]++;
    summary.byType[contract.type]++;

    if (contract.status === 'active') {
      summary.totalAnnualValue += contract.annualValue;

      if (contract.expirationDate) {
        const timeToExpiry = contract.expirationDate - now;
        if (timeToExpiry > 0 && timeToExpiry <= thirtyDays) {
          summary.expiringIn30Days++;
        } else if (timeToExpiry > 0 && timeToExpiry <= ninetyDays) {
          summary.expiringIn90Days++;
        }
      }

      if (contract.autoRenew) {
        summary.autoRenewCount++;
      }
    }
  });

  return summary;
}

export async function getExpiringContracts(
  daysAhead: number = 90
): Promise<SignedContract[]> {
  const contracts = await getContracts();
  const now = Date.now();
  const threshold = daysAhead * 24 * 60 * 60 * 1000;

  return contracts
    .filter((c) => {
      if (c.status !== 'active' || !c.expirationDate) return false;
      const timeToExpiry = c.expirationDate - now;
      return timeToExpiry > 0 && timeToExpiry <= threshold;
    })
    .sort((a, b) => (a.expirationDate || 0) - (b.expirationDate || 0));
}
