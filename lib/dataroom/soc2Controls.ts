import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SOC2Control,
  EvidenceRecord,
  ControlAuditLog,
  SOC2Category,
  ControlStatus,
  EvidenceType,
} from '../../types';

const CONTROLS_KEY = '@orbital:soc2_controls';
const EVIDENCE_KEY = '@orbital:soc2_evidence';
const CONTROL_AUDIT_KEY = '@orbital:soc2_control_audit';

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
// SOC2 CONTROLS
// ============================================

export async function getControls(): Promise<SOC2Control[]> {
  const data = await AsyncStorage.getItem(CONTROLS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getControlsByCategory(category: SOC2Category): Promise<SOC2Control[]> {
  const controls = await getControls();
  return controls.filter((c) => c.category === category);
}

export async function getControl(controlId: string): Promise<SOC2Control | null> {
  const controls = await getControls();
  return controls.find((c) => c.controlId === controlId) || null;
}

export async function createControl(
  params: {
    category: SOC2Category;
    controlId: string;
    title: string;
    description: string;
    status: ControlStatus;
    implementationNotes: string;
  },
  createdBy: string
): Promise<SOC2Control> {
  const now = Date.now();
  const control: SOC2Control = {
    id: generateId('ctrl'),
    category: params.category,
    controlId: params.controlId,
    title: params.title,
    description: params.description,
    status: params.status,
    implementationNotes: params.implementationNotes,
    evidenceRefs: [],
    lastReviewedAt: now,
    reviewedBy: createdBy,
    nextReviewDue: now + 90 * 24 * 60 * 60 * 1000, // 90 days
  };

  const controls = await getControls();
  controls.push(control);
  await AsyncStorage.setItem(CONTROLS_KEY, JSON.stringify(controls));

  await logControlChange(control.controlId, 'status_change', undefined, params.status, createdBy, 'Control created');

  return control;
}

export async function updateControlStatus(
  controlId: string,
  newStatus: ControlStatus,
  updatedBy: string,
  notes?: string
): Promise<SOC2Control | null> {
  const controls = await getControls();
  const index = controls.findIndex((c) => c.controlId === controlId);
  if (index === -1) return null;

  const oldStatus = controls[index].status;
  controls[index].status = newStatus;
  controls[index].lastReviewedAt = Date.now();
  controls[index].reviewedBy = updatedBy;

  await AsyncStorage.setItem(CONTROLS_KEY, JSON.stringify(controls));
  await logControlChange(controlId, 'status_change', oldStatus, newStatus, updatedBy, notes);

  return controls[index];
}

export async function reviewControl(
  controlId: string,
  reviewedBy: string,
  notes?: string
): Promise<SOC2Control | null> {
  const controls = await getControls();
  const index = controls.findIndex((c) => c.controlId === controlId);
  if (index === -1) return null;

  const now = Date.now();
  controls[index].lastReviewedAt = now;
  controls[index].reviewedBy = reviewedBy;
  controls[index].nextReviewDue = now + 90 * 24 * 60 * 60 * 1000;

  await AsyncStorage.setItem(CONTROLS_KEY, JSON.stringify(controls));
  await logControlChange(controlId, 'review_completed', undefined, undefined, reviewedBy, notes);

  return controls[index];
}

// ============================================
// EVIDENCE RECORDS
// ============================================

export async function getEvidence(): Promise<EvidenceRecord[]> {
  const data = await AsyncStorage.getItem(EVIDENCE_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getEvidenceForControl(controlId: string): Promise<EvidenceRecord[]> {
  const evidence = await getEvidence();
  return evidence.filter((e) => e.controlId === controlId && e.isActive);
}

export async function addEvidence(
  params: {
    controlId: string;
    type: EvidenceType;
    title: string;
    description: string;
    content: string;
    filePath?: string;
    expiresAt?: number;
  },
  collectedBy: string
): Promise<EvidenceRecord> {
  const evidence: EvidenceRecord = {
    id: generateId('evid'),
    controlId: params.controlId,
    type: params.type,
    title: params.title,
    description: params.description,
    filePath: params.filePath,
    contentHash: hashContent(params.content),
    collectedAt: Date.now(),
    collectedBy,
    expiresAt: params.expiresAt,
    isActive: true,
  };

  const allEvidence = await getEvidence();
  allEvidence.push(evidence);
  await AsyncStorage.setItem(EVIDENCE_KEY, JSON.stringify(allEvidence));

  // Update control's evidence refs
  const controls = await getControls();
  const controlIndex = controls.findIndex((c) => c.controlId === params.controlId);
  if (controlIndex >= 0) {
    controls[controlIndex].evidenceRefs.push(evidence.id);
    await AsyncStorage.setItem(CONTROLS_KEY, JSON.stringify(controls));
  }

  await logControlChange(params.controlId, 'evidence_added', undefined, evidence.id, collectedBy);

  return evidence;
}

export async function deactivateEvidence(
  evidenceId: string,
  deactivatedBy: string
): Promise<boolean> {
  const allEvidence = await getEvidence();
  const index = allEvidence.findIndex((e) => e.id === evidenceId);
  if (index === -1) return false;

  const controlId = allEvidence[index].controlId;
  allEvidence[index].isActive = false;
  await AsyncStorage.setItem(EVIDENCE_KEY, JSON.stringify(allEvidence));

  await logControlChange(controlId, 'evidence_removed', evidenceId, undefined, deactivatedBy);

  return true;
}

// ============================================
// CONTROL AUDIT LOG
// ============================================

async function logControlChange(
  controlId: string,
  action: ControlAuditLog['action'],
  previousValue: string | undefined,
  newValue: string | undefined,
  performedBy: string,
  notes?: string
): Promise<ControlAuditLog> {
  const entry: ControlAuditLog = {
    id: generateId('clog'),
    controlId,
    action,
    previousValue,
    newValue,
    performedBy,
    performedAt: Date.now(),
    notes,
  };

  const data = await AsyncStorage.getItem(CONTROL_AUDIT_KEY);
  const log: ControlAuditLog[] = data ? JSON.parse(data) : [];
  log.unshift(entry);
  await AsyncStorage.setItem(CONTROL_AUDIT_KEY, JSON.stringify(log));

  return entry;
}

export async function getControlAuditLog(controlId?: string): Promise<ControlAuditLog[]> {
  const data = await AsyncStorage.getItem(CONTROL_AUDIT_KEY);
  if (!data) return [];
  const log: ControlAuditLog[] = JSON.parse(data);
  if (controlId) {
    return log.filter((e) => e.controlId === controlId);
  }
  return log;
}

// ============================================
// SOC2 CONTROL TEMPLATES
// ============================================

export const SOC2_CONTROL_TEMPLATES: Omit<SOC2Control, 'id' | 'evidenceRefs' | 'lastReviewedAt' | 'reviewedBy' | 'nextReviewDue'>[] = [
  // Common Criteria - Security
  { category: 'CC', controlId: 'CC1.1', title: 'COSO Principle 1', description: 'The entity demonstrates a commitment to integrity and ethical values.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC1.2', title: 'Board Independence', description: 'The board of directors demonstrates independence from management.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC2.1', title: 'Information Quality', description: 'The entity obtains or generates and uses relevant, quality information.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC3.1', title: 'Risk Assessment', description: 'The entity specifies objectives with sufficient clarity.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC4.1', title: 'Monitoring Activities', description: 'The entity selects, develops, and performs ongoing evaluations.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC5.1', title: 'Control Activities', description: 'The entity selects and develops control activities.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC6.1', title: 'Logical Access', description: 'Logical access security software, infrastructure, and architectures.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC6.2', title: 'User Registration', description: 'Prior to issuing system credentials, registration and authorization.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC6.3', title: 'Role-Based Access', description: 'The entity authorizes, modifies, or removes access to data.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC6.6', title: 'Threat Protection', description: 'Security measures against threats from sources outside system boundaries.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC6.7', title: 'Data Transmission', description: 'Encryption for transmission of data to meet objectives.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC7.1', title: 'Vulnerability Management', description: 'Detection and monitoring of security events.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC7.2', title: 'Incident Response', description: 'Procedures for responding to security incidents.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC8.1', title: 'Change Management', description: 'Authorization, design, development, testing of changes.', status: 'planned', implementationNotes: '' },
  { category: 'CC', controlId: 'CC9.1', title: 'Risk Mitigation', description: 'Risk mitigation activities are identified and implemented.', status: 'planned', implementationNotes: '' },

  // Availability
  { category: 'A', controlId: 'A1.1', title: 'Capacity Management', description: 'Current processing capacity and usage maintained.', status: 'planned', implementationNotes: '' },
  { category: 'A', controlId: 'A1.2', title: 'Recovery Planning', description: 'Environmental protections and recovery infrastructure.', status: 'planned', implementationNotes: '' },

  // Confidentiality
  { category: 'C', controlId: 'C1.1', title: 'Confidential Data', description: 'Procedures for identifying and classifying confidential information.', status: 'planned', implementationNotes: '' },
  { category: 'C', controlId: 'C1.2', title: 'Data Disposal', description: 'Procedures for disposal of confidential information.', status: 'planned', implementationNotes: '' },

  // Processing Integrity
  { category: 'PI', controlId: 'PI1.1', title: 'Data Accuracy', description: 'System processing is complete, valid, accurate, timely.', status: 'planned', implementationNotes: '' },

  // Privacy
  { category: 'P', controlId: 'P1.1', title: 'Privacy Notice', description: 'Privacy notice is provided to data subjects.', status: 'planned', implementationNotes: '' },
  { category: 'P', controlId: 'P2.1', title: 'Consent', description: 'Explicit consent is obtained for collection and use.', status: 'planned', implementationNotes: '' },
  { category: 'P', controlId: 'P3.1', title: 'Data Minimization', description: 'Personal information is collected only for stated purposes.', status: 'planned', implementationNotes: '' },
  { category: 'P', controlId: 'P4.1', title: 'Use Limitation', description: 'Personal information is used only as disclosed.', status: 'planned', implementationNotes: '' },
  { category: 'P', controlId: 'P5.1', title: 'Retention', description: 'Personal information is retained only as needed.', status: 'planned', implementationNotes: '' },
  { category: 'P', controlId: 'P6.1', title: 'Data Subject Rights', description: 'Access to personal information for review and correction.', status: 'planned', implementationNotes: '' },
  { category: 'P', controlId: 'P7.1', title: 'Third Party Disclosure', description: 'Personal information disclosed to third parties as authorized.', status: 'planned', implementationNotes: '' },
  { category: 'P', controlId: 'P8.1', title: 'Privacy Incidents', description: 'Incidents are evaluated and notifications made as required.', status: 'planned', implementationNotes: '' },
];

export async function initializeSOC2Controls(initializedBy: string): Promise<number> {
  const existing = await getControls();
  if (existing.length > 0) return 0;

  let count = 0;
  for (const template of SOC2_CONTROL_TEMPLATES) {
    await createControl(template, initializedBy);
    count++;
  }
  return count;
}

// ============================================
// COMPLIANCE SUMMARY
// ============================================

export async function getComplianceSummary(): Promise<{
  total: number;
  implemented: number;
  partial: number;
  planned: number;
  notApplicable: number;
  percentComplete: number;
  byCategory: Record<SOC2Category, { total: number; implemented: number }>;
  overdueReviews: number;
}> {
  const controls = await getControls();
  const now = Date.now();

  const summary = {
    total: controls.length,
    implemented: 0,
    partial: 0,
    planned: 0,
    notApplicable: 0,
    percentComplete: 0,
    byCategory: {} as Record<SOC2Category, { total: number; implemented: number }>,
    overdueReviews: 0,
  };

  const categories: SOC2Category[] = ['CC', 'A', 'C', 'PI', 'P'];
  categories.forEach((cat) => {
    summary.byCategory[cat] = { total: 0, implemented: 0 };
  });

  controls.forEach((control) => {
    summary.byCategory[control.category].total++;

    switch (control.status) {
      case 'implemented':
        summary.implemented++;
        summary.byCategory[control.category].implemented++;
        break;
      case 'partial':
        summary.partial++;
        break;
      case 'planned':
        summary.planned++;
        break;
      case 'not_applicable':
        summary.notApplicable++;
        break;
    }

    if (control.nextReviewDue < now) {
      summary.overdueReviews++;
    }
  });

  const applicable = summary.total - summary.notApplicable;
  summary.percentComplete = applicable > 0
    ? Math.round((summary.implemented / applicable) * 100)
    : 0;

  return summary;
}
