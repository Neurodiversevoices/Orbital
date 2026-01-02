// Immutable Audit Log
export {
  logImmutableAuditEntry,
  getAuditEntries,
  getAuditEntriesByType,
  getAuditEntriesByActor,
  getAuditEntriesByTarget,
  getAuditEntriesByDateRange,
  verifyAuditChainIntegrity,
  exportAuditLog,
} from './immutableAuditLog';

// Consent Lifecycle
export {
  getConsentBundle,
  grantConsent,
  modifyConsent,
  revokeConsent,
  revokeAllConsents,
  checkConsentStatus,
  getActiveConsents,
  getConsentHistory,
  processExpiredConsents,
  scheduleConsentReview,
  isConsentReviewDue,
  hasRequiredConsents,
  REQUIRED_CONSENTS,
} from './consentLifecycle';

// Data Separation
export {
  getIdentityRecords,
  saveIdentityRecord,
  deleteIdentityRecord,
  purgeAllIdentityRecords,
  getOpaqueRef,
  getPatternRecords,
  createPatternRecord,
  updatePatternRetentionClass,
  getPatternsByRetentionClass,
  deletePatternRecord,
  purgePatternsByIdentityRef,
  performFullDataDeletion,
  verifyDataSeparation,
} from './dataSeparation';

// Retention Controls
export {
  getRetentionPolicies,
  getActiveRetentionPolicy,
  createRetentionPolicy,
  updateRetentionPolicy,
  getRetentionSchedules,
  createRetentionSchedule,
  applyLegalHold,
  releaseLegalHold,
  processScheduledDeletions,
  getUpcomingDeletions,
  getRetentionSummary,
} from './retentionControls';

// Export Watermarking
export {
  generateWatermark,
  formatWatermarkHeader,
  formatWatermarkFooter,
  getWatermarkedExports,
  recordWatermarkedExport,
  recordExportAccess,
  verifyExportIntegrity,
  wrapContentWithWatermark,
  createWatermarkedExport,
} from './exportWatermarking';

// Account Offboarding
export {
  getOffboardingRequests,
  getActiveOffboardingRequest,
  initiateOffboarding,
  advanceOffboardingStage,
  cancelOffboarding,
  executeDataFreeze,
  executeExportWindow,
  scheduleDeletion,
  executeDeletion,
  getOffboardingStatus,
  processOffboardingTimeline,
} from './accountOffboarding';

// Incident Disclosure
export {
  getDisclosures,
  getActiveDisclosures,
  getPendingAcknowledgements,
  createDisclosure,
  updateDisclosure,
  resolveDisclosure,
  getAcknowledgements,
  acknowledgeDisclosure,
  hasAcknowledgedDisclosure,
  getDisclosuresByType,
  getDisclosuresBySeverity,
  getRecentDisclosures,
  createPolicyChangeDisclosure,
  createSecurityIncidentDisclosure,
  getAcknowledgementReport,
  getComplianceStatus,
} from './incidentDisclosure';

// Jurisdiction Deployment
export {
  getCurrentJurisdiction,
  setJurisdiction,
  getDeploymentFlags,
  isFeatureEnabled,
  requiresConsent,
  supportsRightToErasure,
  supportsDataPortability,
  requiresMinorProtections,
  handlesEducationalRecords,
  handlesHealthData,
  isRetentionWindowAllowed,
  getDefaultRetentionWindow,
  getAllowedRetentionWindows,
  getRequiredPolicies,
  isPolicyRequired,
  getDataResidency,
  getJurisdictionBehavior,
  validateJurisdictionCompliance,
  detectJurisdictionFromLocale,
} from './jurisdictionDeployment';

// Legal Policies
export {
  getPolicyDocuments,
  getPolicyDocument,
  getCurrentPolicyVersion,
  createPolicyDocument,
  updatePolicyDocument,
  getPolicyAcceptances,
  acceptPolicy,
  hasAcceptedPolicy,
  hasAcceptedAllRequiredPolicies,
  getPendingPolicyAcceptances,
} from './legalPolicies';
