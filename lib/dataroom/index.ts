/**
 * Orbital Due Diligence Data Room
 *
 * Comprehensive data room infrastructure for investor due diligence,
 * compliance auditing, and enterprise governance.
 *
 * Modules:
 * - SOC2 Controls: Trust Services Criteria control framework
 * - Contract Vault: Contract templates and signed document management
 * - Revenue Engine: Billing, subscriptions, and revenue analytics
 * - Org Provisioning: Organization lifecycle management
 * - RBAC: Role-based access control with least-privilege defaults
 * - Security Posture: Security configuration and scoring
 * - Integration Interfaces: SSO, webhooks, and API management
 * - Data Room Generator: Comprehensive due diligence package generation
 */

// SOC2 Controls
export {
  getControls,
  getControl,
  getControlsByCategory,
  createControl,
  updateControlStatus,
  reviewControl,
  getEvidence,
  getEvidenceForControl,
  addEvidence,
  deactivateEvidence,
  getControlAuditLog,
  getComplianceSummary,
  initializeSOC2Controls,
  SOC2_CONTROL_TEMPLATES,
} from './soc2Controls';

// Contract Vault
export {
  getTemplates,
  getActiveTemplates,
  getTemplatesByType,
  getTemplate,
  createTemplate,
  updateTemplate,
  deprecateTemplate,
  getContracts,
  getContractsByOrg,
  getContractsByStatus,
  getContract,
  createContract,
  updateContractStatus,
  uploadSignedPdf,
  recordPdfAccess,
  renewContract,
  getContractSummary,
  getExpiringContracts,
  initializeDefaultTemplates,
  getContractAuditLog,
  DEFAULT_CONTRACT_TEMPLATES,
} from './contractVault';

// Revenue Engine
export {
  getPricingBands,
  setPricingBands,
  getPriceForConfig,
  createEscalator,
  calculateEscalatedPrice,
  getSubscriptions,
  getSubscriptionsByOrg,
  getActiveSubscription,
  getSubscription,
  createSubscription,
  updateSubscription,
  renewSubscription,
  cancelSubscription,
  getRevenueEvents,
  calculateARR,
  calculateMRR,
  getRenewalForecast,
  getRevenueMetrics,
  DEFAULT_PRICING_BANDS,
} from './revenueEngine';

// Org Provisioning
export {
  getProvisioningRequests,
  getPendingRequests,
  getProvisioningRequest,
  createProvisioningRequest,
  approveProvisioningRequest,
  rejectProvisioningRequest,
  getOrganizations,
  getActiveOrganizations,
  getOrganization,
  provisionOrganization,
  activateOrganization,
  suspendOrganization,
  updateOrgStatus,
  updateOrgSettings,
  updateOrgLimits,
  updateOrgContacts,
  getOrgAuditLog,
  getOffboardingRecords,
  initiateOrgOffboarding,
  markExportComplete,
  executeOrgDeletion,
  generateDeletionCertificate,
  getOrgMetrics,
} from './orgProvisioning';

// RBAC
export {
  getRoleDefinitions,
  getRoleDefinition,
  initializeRoleDefinitions,
  getRoleAssignments,
  getUserRoles,
  getEffectiveRole,
  assignRole,
  revokeRole,
  expireRoles,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getEffectivePermissions,
  requirePermission,
  requireRole,
  getOrgMembers,
  getRoleStats,
  getMinimumRoleForPermission,
  validateRoleAssignment,
  suggestLeastPrivilegeRole,
  getRBACauditLog,
  DEFAULT_ROLE_DEFINITIONS,
} from './rbac';

// Security Posture
export {
  getSecurityPosture,
  updateSecurityPosture,
  initializeSecurityPosture,
  recordKeyRotation,
  recordBackupCompletion,
  recordBackupRestore,
  recordVulnerabilityScan,
  recordIncidentDetection,
  recordIncidentResolution,
  recordDrillConducted,
  recordPlanReview,
  calculateSecurityScore,
  generateSecurityPostureReport,
  getSecurityAuditLog,
  DEFAULT_SECURITY_POSTURE,
} from './securityPosture';

// Integration Interfaces
export {
  getIntegrations,
  getOrgIntegrations,
  getIntegration,
  getIntegrationByType,
  configureIntegration,
  activateIntegration,
  disableIntegration,
  recordIntegrationError,
  getWebhooks,
  getOrgWebhooks,
  getWebhook,
  createWebhook,
  updateWebhookEvents,
  toggleWebhook,
  deleteWebhook,
  recordWebhookTrigger,
  getAPICredentials,
  getOrgAPICredentials,
  createAPICredential,
  validateAPIKey,
  revokeAPICredential,
  configureSSOIntegration,
  getIntegrationSummary,
  getIntegrationAuditLog,
  WEBHOOK_EVENTS,
} from './integrationInterfaces';

// Data Room Generator
export {
  generateDataRoomPackage,
  generateDataRoomReport,
  exportDataRoomJSON,
  generateExecutiveSummary,
  generateComplianceCertificate,
  DEFAULT_DATA_ROOM_OPTIONS,
} from './dataRoomGenerator';

export type { DataRoomOptions } from './dataRoomGenerator';
export type { OffboardingRecord } from './orgProvisioning';
export type { SecurityPostureScore } from './securityPosture';
export type { SSOConfig, WebhookEvent } from './integrationInterfaces';
