import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RWEExportConfig,
  RWEExportPackage,
  RWEExportFormat,
  CohortMember,
  TrajectoryReport,
  EngagementProfile,
  DataQualityScore,
  SensorProxyProfile,
} from '../../types';
import { getCohort, getCohortMembers } from './cohortBuilder';
import { getTrajectoryReports } from './trajectoryReports';
import { getQualityScore } from './dataQuality';

const RWE_EXPORTS_KEY = '@orbital:rwe_exports';

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
// RWE EXPORT PACKAGE STORAGE
// ============================================

async function getAllExports(): Promise<RWEExportPackage[]> {
  const data = await AsyncStorage.getItem(RWE_EXPORTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

async function saveExport(exportPkg: RWEExportPackage): Promise<void> {
  const exports = await getAllExports();
  exports.push(exportPkg);
  await AsyncStorage.setItem(RWE_EXPORTS_KEY, JSON.stringify(exports));
}

export async function getRWEExport(exportId: string): Promise<RWEExportPackage | null> {
  const exports = await getAllExports();
  return exports.find((e) => e.id === exportId) || null;
}

export async function getCohortExports(cohortId: string): Promise<RWEExportPackage[]> {
  const exports = await getAllExports();
  return exports.filter((e) => e.cohortId === cohortId);
}

// ============================================
// EXPORT FORMAT GENERATORS
// ============================================

interface ExportableData {
  members: CohortMember[];
  trajectories?: TrajectoryReport[];
  qualityScores?: DataQualityScore[];
  engagementProfiles?: EngagementProfile[];
  sensorProfiles?: SensorProxyProfile[];
}

function generateOrbitalNativeExport(data: ExportableData): string {
  return JSON.stringify({
    format: 'orbital_native',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    participants: data.members.map((m) => ({
      participantId: m.cohortParticipantId,
      demographics: {
        ageBand: m.ageBand,
        region: m.region,
        context: m.context,
      },
      dataProfile: {
        signalCount: m.signalCount,
        daysActive: m.daysActive,
        firstSignalAt: m.firstSignalAt,
        lastSignalAt: m.lastSignalAt,
        hasInterventions: m.hasInterventionMarkers,
        qualityScore: m.qualityScore,
      },
    })),
    trajectories: data.trajectories?.map((t) => ({
      participantId: t.cohortParticipantId,
      referenceEvent: t.referenceEventCategory,
      windowDays: t.windowDays,
      preWindow: t.preWindow.statistics,
      postWindow: t.postWindow.statistics,
      qualityScore: t.qualityScore,
    })),
    qualityMetrics: data.qualityScores,
  }, null, 2);
}

function generateCSVFlatExport(data: ExportableData): string {
  const lines: string[] = [];

  // Header
  lines.push([
    'participant_id',
    'age_band',
    'region',
    'context',
    'signal_count',
    'days_active',
    'first_signal_date',
    'last_signal_date',
    'has_interventions',
    'quality_score',
  ].join(','));

  // Data rows
  for (const member of data.members) {
    lines.push([
      member.cohortParticipantId,
      member.ageBand,
      member.region,
      member.context,
      member.signalCount,
      member.daysActive,
      new Date(member.firstSignalAt).toISOString().split('T')[0],
      new Date(member.lastSignalAt).toISOString().split('T')[0],
      member.hasInterventionMarkers ? 'true' : 'false',
      member.qualityScore,
    ].join(','));
  }

  return lines.join('\n');
}

function generateCDISCSDTMExport(data: ExportableData): string {
  // CDISC SDTM (Study Data Tabulation Model) format
  // This is a simplified representation
  const domains = {
    DM: { // Demographics domain
      STUDYID: 'ORBITAL',
      DOMAIN: 'DM',
      records: data.members.map((m, i) => ({
        USUBJID: m.cohortParticipantId,
        SUBJID: m.cohortParticipantId.replace('P-', ''),
        RFSTDTC: new Date(m.firstSignalAt).toISOString().split('T')[0],
        RFENDTC: new Date(m.lastSignalAt).toISOString().split('T')[0],
        AGEGR1: m.ageBand,
        COUNTRY: m.region.toUpperCase(),
      })),
    },
    QS: { // Questionnaire domain (capacity signals)
      STUDYID: 'ORBITAL',
      DOMAIN: 'QS',
      records: data.members.map((m) => ({
        USUBJID: m.cohortParticipantId,
        QSCAT: 'CAPACITY',
        QSSCAT: 'SELF-REPORTED',
        QSTEST: 'Normalized Capacity Score',
        QSORRES: m.qualityScore,
        VISITNUM: m.signalCount,
      })),
    },
  };

  return JSON.stringify(domains, null, 2);
}

function generateFHIRR4Export(data: ExportableData): string {
  // FHIR R4 Bundle format
  const bundle = {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: data.members.map((m) => ({
      resource: {
        resourceType: 'Observation',
        id: m.cohortParticipantId,
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'survey',
            display: 'Survey',
          }],
        }],
        code: {
          coding: [{
            system: 'http://orbitalhealth.app/fhir/capacity',
            code: 'capacity-score',
            display: 'Self-Reported Capacity Score',
          }],
        },
        subject: {
          reference: `Patient/${m.cohortParticipantId}`,
        },
        effectivePeriod: {
          start: new Date(m.firstSignalAt).toISOString(),
          end: new Date(m.lastSignalAt).toISOString(),
        },
        valueQuantity: {
          value: m.qualityScore,
          unit: 'score',
          system: 'http://unitsofmeasure.org',
          code: '{score}',
        },
        component: [
          {
            code: { text: 'Signal Count' },
            valueInteger: m.signalCount,
          },
          {
            code: { text: 'Days Active' },
            valueInteger: m.daysActive,
          },
        ],
      },
    })),
  };

  return JSON.stringify(bundle, null, 2);
}

function generateOMOPCDMExport(data: ExportableData): string {
  // OMOP CDM (Common Data Model) format
  const tables = {
    person: data.members.map((m, i) => ({
      person_id: i + 1,
      person_source_value: m.cohortParticipantId,
      gender_concept_id: 0, // Unknown
      year_of_birth: 0, // Not stored - only age band
      age_band: m.ageBand,
      location_id: m.region,
    })),
    observation: data.members.map((m, i) => ({
      observation_id: i + 1,
      person_id: i + 1,
      observation_concept_id: 4000000, // Custom concept for capacity
      observation_date: new Date(m.lastSignalAt).toISOString().split('T')[0],
      observation_type_concept_id: 44818702, // Patient self-reported
      value_as_number: m.qualityScore,
      observation_source_value: 'ORBITAL_CAPACITY',
    })),
    observation_period: data.members.map((m, i) => ({
      observation_period_id: i + 1,
      person_id: i + 1,
      observation_period_start_date: new Date(m.firstSignalAt).toISOString().split('T')[0],
      observation_period_end_date: new Date(m.lastSignalAt).toISOString().split('T')[0],
      period_type_concept_id: 44814724, // Observation period from data
    })),
  };

  return JSON.stringify(tables, null, 2);
}

// ============================================
// RWE EXPORT GENERATION
// ============================================

export async function generateRWEExport(
  config: RWEExportConfig,
  generatedBy: string,
  studyId?: string,
  protocolVersion?: string
): Promise<RWEExportPackage> {
  const cohort = await getCohort(config.cohortId);
  if (!cohort) throw new Error('Cohort not found');

  const members = await getCohortMembers(config.cohortId);
  if (members.length === 0) throw new Error('Cohort is empty');

  // Gather additional data based on config
  const exportData: ExportableData = { members };

  if (config.includeTrajectories) {
    const allTrajectories = await getTrajectoryReports();
    const memberIds = new Set(members.map((m) => m.cohortParticipantId));
    exportData.trajectories = allTrajectories.filter((t) =>
      memberIds.has(t.cohortParticipantId)
    );
  }

  if (config.includeQualityMetrics) {
    const qualityScores: DataQualityScore[] = [];
    for (const member of members) {
      const score = await getQualityScore(member.cohortParticipantId);
      if (score) qualityScores.push(score);
    }
    exportData.qualityScores = qualityScores;
  }

  // Generate export in requested format
  let exportContent: string;
  let fileExtension: string;

  switch (config.format) {
    case 'orbital_native':
      exportContent = generateOrbitalNativeExport(exportData);
      fileExtension = 'json';
      break;
    case 'csv_flat':
      exportContent = generateCSVFlatExport(exportData);
      fileExtension = 'csv';
      break;
    case 'cdisc_sdtm':
      exportContent = generateCDISCSDTMExport(exportData);
      fileExtension = 'json';
      break;
    case 'fhir_r4':
      exportContent = generateFHIRR4Export(exportData);
      fileExtension = 'json';
      break;
    case 'omop_cdm':
      exportContent = generateOMOPCDMExport(exportData);
      fileExtension = 'json';
      break;
    default:
      exportContent = generateOrbitalNativeExport(exportData);
      fileExtension = 'json';
  }

  // Calculate average quality score
  const totalQuality = members.reduce((sum, m) => sum + m.qualityScore, 0);
  const avgQuality = Math.round(totalQuality / members.length);

  // Determine date range
  const timestamps = members.flatMap((m) => [m.firstSignalAt, m.lastSignalAt]);
  const dateRange = {
    start: Math.min(...timestamps),
    end: Math.max(...timestamps),
  };

  const exportPackage: RWEExportPackage = {
    id: generateId('rwe'),
    cohortId: config.cohortId,
    format: config.format,
    generatedAt: Date.now(),
    generatedBy,
    recordCount: members.length,
    fileManifest: [
      {
        filename: `cohort_${cohort.id}_${config.format}.${fileExtension}`,
        contentHash: hashContent(exportContent),
        recordCount: members.length,
        description: `${config.format.toUpperCase()} export of cohort ${cohort.name}`,
      },
    ],
    metadata: {
      studyId,
      protocolVersion,
      dataQualityScore: avgQuality,
      dateRange,
      deidentificationMethod: 'k-anonymity with bucketed demographics',
    },
    accessLog: [],
  };

  // Add trajectory file if included
  if (config.includeTrajectories && exportData.trajectories?.length) {
    exportPackage.fileManifest.push({
      filename: `trajectories_${cohort.id}.json`,
      contentHash: hashContent(JSON.stringify(exportData.trajectories)),
      recordCount: exportData.trajectories.length,
      description: 'Intervention trajectory reports',
    });
  }

  await saveExport(exportPackage);
  return exportPackage;
}

// ============================================
// EXPORT ACCESS LOGGING
// ============================================

export async function recordExportAccess(
  exportId: string,
  accessedBy: string
): Promise<void> {
  const exports = await getAllExports();
  const index = exports.findIndex((e) => e.id === exportId);
  if (index === -1) return;

  exports[index].accessLog.push({
    accessedBy,
    accessedAt: Date.now(),
  });

  await AsyncStorage.setItem(RWE_EXPORTS_KEY, JSON.stringify(exports));
}

// ============================================
// EXPORT METADATA GENERATION
// ============================================

export function generateExportMetadataDocument(pkg: RWEExportPackage): string {
  return `
================================================================================
              REAL-WORLD EVIDENCE DATA EXPORT PACKAGE
================================================================================

EXPORT INFORMATION
------------------
Export ID: ${pkg.id}
Cohort ID: ${pkg.cohortId}
Format: ${pkg.format}
Generated: ${new Date(pkg.generatedAt).toISOString()}
Generated By: ${pkg.generatedBy}

DATA SUMMARY
------------
Total Records: ${pkg.recordCount}
Data Quality Score: ${pkg.metadata.dataQualityScore}/100
Date Range: ${new Date(pkg.metadata.dateRange.start).toISOString().split('T')[0]} to ${new Date(pkg.metadata.dateRange.end).toISOString().split('T')[0]}

DEIDENTIFICATION
----------------
Method: ${pkg.metadata.deidentificationMethod}
Direct Identifiers: None included
Quasi-Identifiers: Bucketed (age band, region, context)

FILE MANIFEST
-------------
${pkg.fileManifest.map((f) => `
  File: ${f.filename}
  Records: ${f.recordCount}
  Hash: ${f.contentHash}
  Description: ${f.description}
`).join('\n')}

${pkg.metadata.studyId ? `
STUDY INFORMATION
-----------------
Study ID: ${pkg.metadata.studyId}
Protocol Version: ${pkg.metadata.protocolVersion || 'Not specified'}
` : ''}

ACCESS LOG
----------
${pkg.accessLog.length > 0
  ? pkg.accessLog.map((a) => `  ${new Date(a.accessedAt).toISOString()}: ${a.accessedBy}`).join('\n')
  : '  No access recorded'}

================================================================================
DATA USE NOTICE
================================================================================
This data export contains de-identified, self-reported capacity data.
It does not constitute medical records or clinical data.
Use is governed by the applicable data access agreement.
Re-identification of participants is strictly prohibited.
================================================================================
`;
}

// ============================================
// SUPPORTED FORMAT INFORMATION
// ============================================

export const RWE_FORMAT_INFO: Record<RWEExportFormat, {
  name: string;
  description: string;
  useCase: string;
}> = {
  orbital_native: {
    name: 'Orbital Native JSON',
    description: 'Full-fidelity export in Orbital\'s native schema',
    useCase: 'Custom analysis, data warehousing, API integration',
  },
  csv_flat: {
    name: 'Flat CSV',
    description: 'Simple comma-separated format for spreadsheet analysis',
    useCase: 'Quick analysis, Excel/Sheets compatibility',
  },
  cdisc_sdtm: {
    name: 'CDISC SDTM',
    description: 'Study Data Tabulation Model format for regulatory submissions',
    useCase: 'FDA submissions, clinical trial integration',
  },
  fhir_r4: {
    name: 'FHIR R4',
    description: 'HL7 FHIR Release 4 format for healthcare interoperability',
    useCase: 'EHR integration, healthcare data exchange',
  },
  omop_cdm: {
    name: 'OMOP CDM',
    description: 'Observational Medical Outcomes Partnership Common Data Model',
    useCase: 'Large-scale observational research, network studies',
  },
};
