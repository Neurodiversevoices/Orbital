import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ProtocolTemplate,
  StudyProtocol,
  ProtocolType,
  ProtocolStatus,
  CohortCriteria,
} from '../../types';

const PROTOCOL_TEMPLATES_KEY = '@orbital:protocol_templates';
const STUDY_PROTOCOLS_KEY = '@orbital:study_protocols';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// DEFAULT PROTOCOL TEMPLATES (IRB-Ready)
// ============================================

export const DEFAULT_PROTOCOL_TEMPLATES: Omit<ProtocolTemplate, 'id' | 'createdAt' | 'lastModifiedAt'>[] = [
  {
    type: 'observational',
    title: 'Longitudinal Capacity Pattern Study',
    version: '1.0.0',
    description: 'Observational study of self-reported capacity patterns over time in diverse populations.',
    primaryEndpoints: [
      'Change in mean normalized capacity over 90 days',
      'Capacity pattern stability (variance)',
    ],
    secondaryEndpoints: [
      'Correlation between capacity drivers and capacity levels',
      'Temporal patterns (day-of-week, time-of-day)',
    ],
    inclusionCriteria: {
      minSignalCount: 30,
      minDaysActive: 30,
    },
    estimatedDuration: '6 months',
    estimatedCohortSize: 500,
    dataElementsRequired: [
      'Normalized capacity signals',
      'Capacity driver categories',
      'Signal timestamps',
    ],
    irbLanguage: {
      studyPurpose: 'This study aims to understand patterns in self-reported functional capacity across diverse populations. Your participation will help researchers identify trends and factors that influence capacity over time.',
      participantRights: 'Your participation is entirely voluntary. You may withdraw at any time without penalty. You have the right to access your data, request corrections, and request deletion of your data.',
      dataHandling: 'Your data will be de-identified before any research use. Direct identifiers (name, email, etc.) will never be shared with researchers. Only aggregate patterns and de-identified individual trajectories will be analyzed.',
      risksBenefits: 'Risks: Minimal. Some participants may experience mild discomfort when reflecting on capacity fluctuations. Benefits: Contributing to research that may help others understand capacity patterns. No direct medical benefit is expected.',
      withdrawalProcess: 'To withdraw, use the Research Participation settings in the app. Previously exported de-identified data cannot be recalled, but no new data will be shared after withdrawal.',
    },
    isPublished: true,
  },
  {
    type: 'rwe_study',
    title: 'Real-World Capacity Response Study',
    version: '1.0.0',
    description: 'Study of capacity trajectories around self-reported life interventions (medication changes, therapy, lifestyle modifications).',
    primaryEndpoints: [
      'Pre/post capacity trajectory comparison',
      'Time to capacity stabilization after intervention',
    ],
    secondaryEndpoints: [
      'Intervention category effects',
      'Baseline capacity as predictor of response',
    ],
    inclusionCriteria: {
      minSignalCount: 60,
      minDaysActive: 60,
      hasInterventionMarkers: true,
    },
    estimatedDuration: '12 months',
    estimatedCohortSize: 200,
    dataElementsRequired: [
      'Normalized capacity signals',
      'Intervention marker categories',
      'Intervention timestamps',
      'Pre/post trajectory windows',
    ],
    irbLanguage: {
      studyPurpose: 'This study examines how self-reported capacity patterns change around major life events or interventions that you have chosen to record. No claims about treatment effectiveness will be made.',
      participantRights: 'Your participation is entirely voluntary. You control which intervention markers are shared with research. You may mark any marker as private to exclude it from research.',
      dataHandling: 'Intervention categories (e.g., "started therapy") are included, but specific details (e.g., therapist name, medication name) are never shared. All data is de-identified.',
      risksBenefits: 'Risks: Minimal. Reflecting on interventions may cause mild emotional response. Benefits: Contributing to understanding of how people experience changes around life events.',
      withdrawalProcess: 'Withdraw through app settings at any time. Mark individual markers as private to exclude specific events.',
    },
    isPublished: true,
  },
  {
    type: 'registry',
    title: 'Capacity Tracking Registry',
    version: '1.0.0',
    description: 'Long-term registry of capacity patterns for population-level research.',
    primaryEndpoints: [
      'Population capacity distribution',
      'Demographic pattern variations',
    ],
    secondaryEndpoints: [
      'Seasonal capacity variations',
      'Regional capacity patterns',
    ],
    inclusionCriteria: {
      minSignalCount: 90,
      minDaysActive: 90,
    },
    estimatedDuration: 'Ongoing',
    estimatedCohortSize: 10000,
    dataElementsRequired: [
      'Normalized capacity signals',
      'Age band',
      'Region bucket',
      'Context category',
    ],
    irbLanguage: {
      studyPurpose: 'This registry collects de-identified capacity data to enable future research studies. Your contribution helps build a valuable resource for understanding functional capacity across populations.',
      participantRights: 'Voluntary participation. Your data contributes to a shared research resource. You may withdraw, preventing future data contribution.',
      dataHandling: 'Only bucketed demographic data (age range, region) is collected. No precise ages, locations, or identifying information is included.',
      risksBenefits: 'Risks: Minimal. Benefits: Contributing to long-term research infrastructure. No direct benefit to participants.',
      withdrawalProcess: 'Withdraw through app settings. Previously contributed registry data cannot be removed but will not be updated.',
    },
    isPublished: true,
  },
  {
    type: 'pilot',
    title: 'Pilot Study Template',
    version: '1.0.0',
    description: 'Template for small-scale feasibility and pilot studies.',
    primaryEndpoints: [
      'Feasibility metrics (enrollment, retention)',
      'Data quality assessment',
    ],
    secondaryEndpoints: [
      'Preliminary capacity patterns',
    ],
    inclusionCriteria: {
      minSignalCount: 14,
      minDaysActive: 14,
    },
    estimatedDuration: '3 months',
    estimatedCohortSize: 50,
    dataElementsRequired: [
      'Normalized capacity signals',
      'Engagement metrics',
      'Data quality scores',
    ],
    irbLanguage: {
      studyPurpose: 'This pilot study tests the feasibility of using Orbital data for research purposes. The focus is on data quality and participant engagement rather than capacity outcomes.',
      participantRights: 'Voluntary participation in a limited pilot study. Full rights to access and delete your data.',
      dataHandling: 'Pilot data may be used to improve research methods. All data is de-identified.',
      risksBenefits: 'Risks: Minimal. Benefits: Helping improve research methods for future studies.',
      withdrawalProcess: 'Withdraw at any time through app settings.',
    },
    isPublished: true,
  },
  {
    type: 'validation',
    title: 'Data Quality Validation Study',
    version: '1.0.0',
    description: 'Validation of Orbital capacity data against external measures.',
    primaryEndpoints: [
      'Correlation with external measures',
      'Test-retest reliability',
    ],
    secondaryEndpoints: [
      'Sensitivity to known changes',
      'Comparison with established instruments',
    ],
    inclusionCriteria: {
      minSignalCount: 30,
      minDaysActive: 30,
    },
    estimatedDuration: '6 months',
    estimatedCohortSize: 100,
    dataElementsRequired: [
      'Normalized capacity signals',
      'External validation data (collected separately)',
      'Data quality metrics',
    ],
    irbLanguage: {
      studyPurpose: 'This study validates the reliability and validity of Orbital capacity data by comparing it with established measures.',
      participantRights: 'You may be asked to complete additional assessments outside the app. Participation in validation activities is voluntary.',
      dataHandling: 'Validation study data is kept separate from registry data. De-identification maintained.',
      risksBenefits: 'Risks: Additional time for validation measures. Benefits: Contributing to scientific validation of capacity tracking methods.',
      withdrawalProcess: 'Withdraw at any time. Validation data collected separately may be retained per that study\'s protocol.',
    },
    isPublished: true,
  },
];

// ============================================
// PROTOCOL TEMPLATE MANAGEMENT
// ============================================

export async function getProtocolTemplates(): Promise<ProtocolTemplate[]> {
  const data = await AsyncStorage.getItem(PROTOCOL_TEMPLATES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getPublishedTemplates(): Promise<ProtocolTemplate[]> {
  const templates = await getProtocolTemplates();
  return templates.filter((t) => t.isPublished);
}

export async function getTemplatesByType(type: ProtocolType): Promise<ProtocolTemplate[]> {
  const templates = await getPublishedTemplates();
  return templates.filter((t) => t.type === type);
}

export async function getProtocolTemplate(templateId: string): Promise<ProtocolTemplate | null> {
  const templates = await getProtocolTemplates();
  return templates.find((t) => t.id === templateId) || null;
}

export async function createProtocolTemplate(
  params: Omit<ProtocolTemplate, 'id' | 'createdAt' | 'lastModifiedAt'>
): Promise<ProtocolTemplate> {
  const now = Date.now();
  const template: ProtocolTemplate = {
    id: generateId('ptpl'),
    ...params,
    createdAt: now,
    lastModifiedAt: now,
  };

  const templates = await getProtocolTemplates();
  templates.push(template);
  await AsyncStorage.setItem(PROTOCOL_TEMPLATES_KEY, JSON.stringify(templates));

  return template;
}

export async function initializeDefaultTemplates(): Promise<number> {
  const existing = await getProtocolTemplates();
  if (existing.length > 0) return 0;

  let count = 0;
  for (const template of DEFAULT_PROTOCOL_TEMPLATES) {
    await createProtocolTemplate(template);
    count++;
  }
  return count;
}

// ============================================
// STUDY PROTOCOL MANAGEMENT
// ============================================

export async function getStudyProtocols(): Promise<StudyProtocol[]> {
  const data = await AsyncStorage.getItem(STUDY_PROTOCOLS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getStudyProtocol(protocolId: string): Promise<StudyProtocol | null> {
  const protocols = await getStudyProtocols();
  return protocols.find((p) => p.id === protocolId) || null;
}

export async function getProtocolsBySponsor(sponsorId: string): Promise<StudyProtocol[]> {
  const protocols = await getStudyProtocols();
  return protocols.filter((p) => p.sponsorId === sponsorId);
}

export async function getProtocolsByStatus(status: ProtocolStatus): Promise<StudyProtocol[]> {
  const protocols = await getStudyProtocols();
  return protocols.filter((p) => p.status === status);
}

export async function createStudyProtocol(
  params: {
    templateId: string;
    title: string;
    sponsorId: string;
    sponsorName: string;
    principalInvestigator: string;
  }
): Promise<StudyProtocol> {
  const template = await getProtocolTemplate(params.templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  const now = Date.now();
  const protocol: StudyProtocol = {
    id: generateId('prot'),
    templateId: params.templateId,
    title: params.title,
    sponsorId: params.sponsorId,
    sponsorName: params.sponsorName,
    status: 'draft',
    version: '1.0.0',
    principalInvestigator: params.principalInvestigator,
    createdAt: now,
    lastModifiedAt: now,
  };

  const protocols = await getStudyProtocols();
  protocols.push(protocol);
  await AsyncStorage.setItem(STUDY_PROTOCOLS_KEY, JSON.stringify(protocols));

  return protocol;
}

export async function updateProtocolStatus(
  protocolId: string,
  status: ProtocolStatus,
  details?: {
    irbApprovalNumber?: string;
    irbApprovalDate?: number;
    startDate?: number;
    endDate?: number;
    cohortId?: string;
    dataAccessAgreementId?: string;
  }
): Promise<StudyProtocol | null> {
  const protocols = await getStudyProtocols();
  const index = protocols.findIndex((p) => p.id === protocolId);
  if (index === -1) return null;

  protocols[index] = {
    ...protocols[index],
    status,
    lastModifiedAt: Date.now(),
    ...details,
  };

  await AsyncStorage.setItem(STUDY_PROTOCOLS_KEY, JSON.stringify(protocols));
  return protocols[index];
}

// ============================================
// IRB DOCUMENT GENERATION
// ============================================

export async function generateIRBSubmissionDocument(protocolId: string): Promise<string> {
  const protocol = await getStudyProtocol(protocolId);
  if (!protocol) throw new Error('Protocol not found');

  const template = await getProtocolTemplate(protocol.templateId);
  if (!template) throw new Error('Template not found');

  return `
================================================================================
              INSTITUTIONAL REVIEW BOARD SUBMISSION
================================================================================

STUDY INFORMATION
-----------------
Protocol ID: ${protocol.id}
Title: ${protocol.title}
Version: ${protocol.version}
Type: ${template.type}

Sponsor: ${protocol.sponsorName}
Principal Investigator: ${protocol.principalInvestigator}

STUDY DESCRIPTION
-----------------
${template.description}

PRIMARY ENDPOINTS
-----------------
${template.primaryEndpoints.map((e, i) => `${i + 1}. ${e}`).join('\n')}

SECONDARY ENDPOINTS
-------------------
${template.secondaryEndpoints.map((e, i) => `${i + 1}. ${e}`).join('\n')}

INCLUSION CRITERIA
------------------
- Minimum signals logged: ${template.inclusionCriteria.minSignalCount || 'None specified'}
- Minimum days active: ${template.inclusionCriteria.minDaysActive || 'None specified'}
${template.inclusionCriteria.hasInterventionMarkers ? '- Must have intervention markers' : ''}
${template.inclusionCriteria.ageBands ? `- Age bands: ${template.inclusionCriteria.ageBands.join(', ')}` : ''}
${template.inclusionCriteria.regions ? `- Regions: ${template.inclusionCriteria.regions.join(', ')}` : ''}

ESTIMATED PARAMETERS
--------------------
Duration: ${template.estimatedDuration}
Cohort Size: ${template.estimatedCohortSize}

DATA ELEMENTS
-------------
${template.dataElementsRequired.map((d) => `• ${d}`).join('\n')}

================================================================================
                    PARTICIPANT CONSENT LANGUAGE
================================================================================

STUDY PURPOSE
-------------
${template.irbLanguage.studyPurpose}

PARTICIPANT RIGHTS
------------------
${template.irbLanguage.participantRights}

DATA HANDLING
-------------
${template.irbLanguage.dataHandling}

RISKS AND BENEFITS
------------------
${template.irbLanguage.risksBenefits}

WITHDRAWAL PROCESS
------------------
${template.irbLanguage.withdrawalProcess}

================================================================================
Generated: ${new Date().toISOString()}
Protocol Status: ${protocol.status}
================================================================================
`;
}

// ============================================
// PROTOCOL SUMMARY
// ============================================

export async function getProtocolSummary(): Promise<{
  totalTemplates: number;
  publishedTemplates: number;
  totalStudies: number;
  byStatus: Record<ProtocolStatus, number>;
  byType: Record<ProtocolType, number>;
}> {
  const templates = await getProtocolTemplates();
  const protocols = await getStudyProtocols();

  const byStatus: Record<ProtocolStatus, number> = {
    draft: 0, irb_pending: 0, approved: 0, active: 0, completed: 0, archived: 0,
  };
  const byType: Record<ProtocolType, number> = {
    observational: 0, registry: 0, rwe_study: 0, pilot: 0, validation: 0,
  };

  for (const protocol of protocols) {
    byStatus[protocol.status]++;
    const template = templates.find((t) => t.id === protocol.templateId);
    if (template) {
      byType[template.type]++;
    }
  }

  return {
    totalTemplates: templates.length,
    publishedTemplates: templates.filter((t) => t.isPublished).length,
    totalStudies: protocols.length,
    byStatus,
    byType,
  };
}
