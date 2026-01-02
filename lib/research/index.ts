/**
 * Orbital Research Infrastructure
 *
 * Comprehensive research platform for ethical pharma/academic partnerships
 * with strong privacy protections and participant consent controls.
 *
 * Modules:
 * - Research Consent: Explicit opt-in, separate from app use
 * - Cohort Builder: De-identified cohorts with bucketed demographics
 * - Intervention Markers: User-entered life event tags
 * - Trajectory Reports: Outcome-neutral pre/post analysis
 * - Engagement Signals: Adherence-free usage patterns
 * - Data Quality: Provenance tracking and quality scores
 * - Sensor Inputs: Zero-content environmental proxies
 * - Protocol Library: IRB-ready study templates
 * - Partnership Portal: Pharma partnership governance
 * - RWE Export: Standardized longitudinal data exports
 */

// Research Consent Mode
export {
  getUserConsents,
  getConsentBundle,
  getConsentForScope,
  hasActiveConsent,
  hasAllRequiredConsents,
  presentConsent,
  grantConsent,
  declineConsent,
  withdrawConsent,
  withdrawAllConsents,
  validateConsentForExport,
  processExpiredConsents,
  getResearchParticipationSummary,
  renewConsent,
  getConsentAuditLog,
  RESEARCH_CONSENT_LANGUAGE,
} from './researchConsent';

// Cohort Builder
export {
  getCohorts,
  getCohort,
  getActiveCohorts,
  getCohortsByStudy,
  createCohort,
  updateCohortCriteria,
  lockCohort,
  deleteCohort,
  getCohortMembers,
  addMemberToCohort,
  removeMemberFromCohort,
  matchesCriteria,
  filterCohortMembers,
  getCohortStatistics,
  exportCohortManifest,
  calculateAgeBand,
  determineRegionBucket,
  inferContextBucket,
} from './cohortBuilder';

// Intervention Markers
export {
  getUserMarkers,
  getMarker,
  getMarkersByCategory,
  getMarkersInDateRange,
  createMarker,
  updateMarker,
  deleteMarker,
  setMarkerPrivacy,
  getResearchEligibleMarkers,
  getUserMarkerStats,
  getMarkerTimeline,
  findNearbyMarkers,
  INTERVENTION_CATEGORY_LABELS,
} from './interventionMarkers';

// Trajectory Reports
export {
  generateTrajectoryWindow,
  generateTrajectoryReport,
  getTrajectoryReports,
  getTrajectoryReport,
  getReportsByCategory,
  comparePrePostWindows,
  aggregateTrajectories,
  exportTrajectoryCurve,
} from './trajectoryReports';

// Engagement Signals
export {
  recordEngagementSignal,
  recordSessionStart,
  recordSessionEnd,
  recordSignalLogged,
  recordPatternView,
  recordExportGenerated,
  recordShareCreated,
  getUserEngagementSignals,
  getSignalsInDateRange,
  generateEngagementProfile,
  getAggregateEngagementMetrics,
  analyzeEngagementTrend,
} from './engagementSignals';

// Data Quality & Provenance
export {
  recordDataProvenance,
  recordDataModification,
  getProvenanceRecord,
  getParticipantProvenance,
  calculateDataQualityScore,
  getQualityScore,
  getAggregateQualityMetrics,
  meetsQualityThreshold,
  QUALITY_THRESHOLDS,
} from './dataQuality';

// Sensor Inputs
export {
  getSensorConsentConfig,
  updateSensorConsentConfig,
  isSensorProxyEnabled,
  recordSensorProxyEvent,
  getUserSensorEvents,
  getSensorEventsInRange,
  generateSensorProxyProfile,
  getResearchEligibleSensorData,
  categorizeNoiseLevel,
  categorizeSleepQuality,
  categorizeActivityLevel,
  aggregateSensorProfiles,
} from './sensorInputs';

// Protocol Library
export {
  getProtocolTemplates,
  getPublishedTemplates,
  getTemplatesByType,
  getProtocolTemplate,
  createProtocolTemplate,
  initializeDefaultTemplates,
  getStudyProtocols,
  getStudyProtocol,
  getProtocolsBySponsor,
  getProtocolsByStatus,
  createStudyProtocol,
  updateProtocolStatus,
  generateIRBSubmissionDocument,
  getProtocolSummary,
  DEFAULT_PROTOCOL_TEMPLATES,
} from './protocolLibrary';

// Partnership Portal
export {
  getPartnershipRequests,
  getPartnershipRequest,
  getPendingRequests,
  submitPartnershipRequest,
  updateRequestStatus,
  getPartnershipAgreements,
  getPartnershipAgreement,
  getActiveAgreements,
  getAgreementsByPartner,
  createPartnershipAgreement,
  signAgreement,
  activateAgreement,
  pauseAgreement,
  terminateAgreement,
  recordDataAccess,
  recordAuditConducted,
  getPartnershipSummary,
  validateDataAccess,
  getPartnershipAuditLog,
} from './partnershipPortal';

// RWE Export
export {
  getRWEExport,
  getCohortExports,
  generateRWEExport,
  recordExportAccess,
  generateExportMetadataDocument,
  RWE_FORMAT_INFO,
} from './rweExport';

// Re-export types for convenience
export type {
  ResearchConsent,
  ResearchConsentBundle,
  ResearchConsentScope,
  ResearchConsentStatus,
  Cohort,
  CohortCriteria,
  CohortMember,
  AgeBand,
  RegionBucket,
  ContextBucket,
  InterventionMarker,
  InterventionCategory,
  TrajectoryWindow,
  TrajectoryReport,
  EngagementSignal,
  EngagementProfile,
  DataProvenanceRecord,
  DataQualityScore,
  SensorProxyEvent,
  SensorProxyProfile,
  SensorProxyType,
  SensorEventLevel,
  SensorConsentConfig,
  ProtocolTemplate,
  StudyProtocol,
  ProtocolType,
  ProtocolStatus,
  PartnershipRequest,
  PartnershipAgreement,
  PartnershipType,
  PartnershipStatus,
  RWEExportConfig,
  RWEExportPackage,
  RWEExportFormat,
} from '../../types';
