// Capacity states: resourced (high capacity), stretched (moderate), depleted (low)
export type CapacityState = 'resourced' | 'stretched' | 'depleted';

// Legacy alias for backwards compatibility
export type EnergyState = CapacityState;

export type Category = 'sensory' | 'demand' | 'social';

// Keep Tag as alias for backwards compatibility with existing data
export type Tag = Category | 'sleep' | 'stress' | 'exercise' | 'meds' | 'food';

export interface CapacityLog {
  id: string;
  state: CapacityState;
  timestamp: number;
  tags: Tag[];
  category?: Category;
  note?: string;
}

// Legacy alias
export type EnergyLog = CapacityLog;

export const ALL_CATEGORIES: Category[] = ['sensory', 'demand', 'social'];

export const CAPACITY_STATES: CapacityState[] = ['resourced', 'stretched', 'depleted'];

// Legacy alias
export const ENERGY_STATES = CAPACITY_STATES;

// Orbital Modes
export type OrbitalMode = 'personal' | 'family' | 'clinician-share' | 'org-pilot' | 'enterprise';

export const ORBITAL_MODES: Record<OrbitalMode, { label: string; description: string }> = {
  personal: {
    label: 'Personal',
    description: 'Individual self-tracking. Your data stays yours.',
  },
  family: {
    label: 'Family',
    description: 'Shared household view for caregivers and partners.',
  },
  'clinician-share': {
    label: 'Clinician-Share',
    description: 'Read-only access for your therapist or doctor.',
  },
  'org-pilot': {
    label: 'Org Pilot',
    description: 'Aggregated insights for employers, schools, or clinics.',
  },
  enterprise: {
    label: 'Enterprise',
    description: 'Multi-org deployment with compliance features.',
  },
};

// Patterns Unlock Tiers
export type UnlockTier = 'locked' | 'week' | 'two-week' | 'month' | 'quarter' | 'year';

export interface UnlockTierConfig {
  tier: UnlockTier;
  requiredLogs: number;
  label: string;
  timeRangeLabel: string;
  features: string[];
  unlockToast: string;
  unlockBody: string;
}

export const UNLOCK_TIERS: UnlockTierConfig[] = [
  {
    tier: 'locked',
    requiredLogs: 0,
    label: 'Locked',
    timeRangeLabel: '',
    features: [],
    unlockToast: '',
    unlockBody: '',
  },
  {
    tier: 'week',
    requiredLogs: 7,
    label: 'Week View',
    timeRangeLabel: '7d',
    features: ['7-day graph', 'basic stats'],
    unlockToast: 'Week View unlocked',
    unlockBody: "You've logged enough to see your first patterns. This is just the beginning—patterns sharpen with time.",
  },
  {
    tier: 'two-week',
    requiredLogs: 14,
    label: 'Two-Week View',
    timeRangeLabel: '14d',
    features: ['14-day graph', 'trend indicator'],
    unlockToast: 'Two-Week View unlocked',
    unlockBody: 'Trend detection is now active. You can start to see which direction your capacity is moving.',
  },
  {
    tier: 'month',
    requiredLogs: 30,
    label: 'Month View',
    timeRangeLabel: '1m',
    features: ['30-day graph', 'category breakdown'],
    unlockToast: 'Month View unlocked',
    unlockBody: 'Category attribution is now available. See which drivers—sensory, demand, social—correlate with your capacity shifts.',
  },
  {
    tier: 'quarter',
    requiredLogs: 90,
    label: 'Quarter View',
    timeRangeLabel: '90d',
    features: ['90-day graph', 'pattern insights'],
    unlockToast: 'Quarter View unlocked',
    unlockBody: 'Pattern intelligence is now active. Orbital can surface day-of-week and time-of-day patterns based on your history.',
  },
  {
    tier: 'year',
    requiredLogs: 365,
    label: 'Year View',
    timeRangeLabel: '1y',
    features: ['full longitudinal view', '1-year history badge'],
    unlockToast: '1-Year History unlocked',
    unlockBody: "You've built a full year of longitudinal capacity data. This is rare. This is yours. Patterns at this depth reveal what short-term tracking never could.",
  },
];

export function getUnlockTier(logCount: number): UnlockTierConfig {
  // Return highest tier the user qualifies for
  for (let i = UNLOCK_TIERS.length - 1; i >= 0; i--) {
    if (logCount >= UNLOCK_TIERS[i].requiredLogs) {
      return UNLOCK_TIERS[i];
    }
  }
  return UNLOCK_TIERS[0];
}

export function getNextUnlockTier(logCount: number): UnlockTierConfig | null {
  const currentTier = getUnlockTier(logCount);
  const currentIndex = UNLOCK_TIERS.findIndex(t => t.tier === currentTier.tier);
  if (currentIndex < UNLOCK_TIERS.length - 1) {
    return UNLOCK_TIERS[currentIndex + 1];
  }
  return null;
}

export function getAvailableTimeRanges(logCount: number): string[] {
  const tier = getUnlockTier(logCount);
  const tierIndex = UNLOCK_TIERS.findIndex(t => t.tier === tier.tier);
  return UNLOCK_TIERS.slice(1, tierIndex + 1)
    .map(t => t.timeRangeLabel)
    .filter(Boolean);
}

// ============================================
// SHARING & ACCESS CONTROL TYPES
// ============================================

export type RecipientRole = 'parent' | 'clinician' | 'employer' | 'school' | 'partner' | 'other';

export interface ShareRecipient {
  id: string;
  name: string;
  role: RecipientRole;
  createdAt: number;
}

export interface ShareConfig {
  id: string;
  recipientId: string;
  expiresAt: number;
  createdAt: number;
  accessToken: string;
  isActive: boolean;
}

export type AuditAction = 'share_created' | 'share_expired' | 'share_revoked' | 'share_accessed' | 'export_generated';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  timestamp: number;
  recipientId?: string;
  recipientName?: string;
  details?: string;
}

// ============================================
// EXPORT TYPES
// ============================================

export type ExportFormat = 'json' | 'csv' | 'summary';
export type ExportRange = '90d' | '1y' | 'all';

export interface ExportConfig {
  format: ExportFormat;
  range: ExportRange;
  includeNotes: boolean;
}

export interface ExportSummary {
  generatedAt: number;
  rangeStart: number;
  rangeEnd: number;
  totalLogs: number;
  averageCapacity: number;
  depletedPercentage: number;
  stateDistribution: Record<CapacityState, number>;
  categoryBreakdown: Record<Category, { count: number; strainRate: number }>;
}

// ============================================
// ENHANCED CAPACITY LOG (Compliance-Ready)
// ============================================

export interface CapacityLogV2 extends CapacityLog {
  _version: 2;
  _createdAt: number;
  _isMedical?: boolean;  // Reserved for future medical context
}

// ============================================
// VIEW MODE TYPES
// ============================================

export type ViewMode = 'owner' | 'shared-readonly';

export interface ViewContext {
  mode: ViewMode;
  shareConfig?: ShareConfig;
  ownerName?: string;
}

// ============================================
// PREFERENCES
// ============================================

export interface OrbitalPreferences {
  locale: 'en' | 'es';
  orbitalMode: OrbitalMode;
  sharingEnabled: boolean;
  lastExportAt?: number;
}

// ============================================
// TERMS OF SERVICE ACCEPTANCE
// ============================================

export interface TermsAcceptance {
  version: string;
  acceptedAt: number;
  method: 'explicit_click' | 'continued_use';
  ipHash?: string;  // Hashed, not stored directly
}

export interface TermsAcceptanceRecord {
  currentVersion: string;
  acceptances: TermsAcceptance[];
  lastPromptedAt?: number;
}

export const CURRENT_TERMS_VERSION = '1.0';

// ============================================
// INSTITUTIONAL MODE CONFIGURATION
// ============================================

export type InstitutionalTier = 'personal' | 'family' | 'pilot' | 'enterprise';

export interface InstitutionalConfig {
  tier: InstitutionalTier;
  orgId?: string;
  orgName?: string;
  enabledFeatures: InstitutionalFeature[];
  dataRetentionYears: number;
  complianceMode: boolean;
  auditRequired: boolean;
  reportingEnabled: boolean;
  activatedAt?: number;
  licenseExpiresAt?: number;
}

export type InstitutionalFeature =
  | 'executive_reports'      // PDF board/executive reports
  | 'extended_history'       // Multi-year data retention
  | 'advanced_sharing'       // Role-based sharing controls
  | 'audit_trail'           // Full audit logging
  | 'sensory_alerts'        // Environmental load detection
  | 'aggregate_insights'    // De-identified population views
  | 'compliance_export'     // HIPAA/FERPA ready exports
  | 'api_access';           // External API integration

export const INSTITUTIONAL_FEATURE_SETS: Record<InstitutionalTier, InstitutionalFeature[]> = {
  personal: [],
  family: ['advanced_sharing'],
  pilot: ['advanced_sharing', 'audit_trail', 'executive_reports'],
  enterprise: [
    'executive_reports',
    'extended_history',
    'advanced_sharing',
    'audit_trail',
    'sensory_alerts',
    'aggregate_insights',
    'compliance_export',
    'api_access',
  ],
};

// ============================================
// HISTORY VAULT (Long-Horizon Retention)
// ============================================

export interface VaultedCapacityLog {
  id: string;
  state: CapacityState;
  timestamp: number;
  category?: Category;
  // Note: Personal identifiers stripped for vault
  _vaultedAt: number;
  _yearMonth: string; // YYYY-MM for efficient indexing
}

export interface HistoryVaultMetadata {
  earliestEntry: number;
  latestEntry: number;
  totalEntries: number;
  yearMonthCounts: Record<string, number>;
}

// ============================================
// SENSORY ALERT TYPES
// ============================================

export type AlertSeverity = 'notice' | 'moderate' | 'high';
export type SensoryAlertType = 'ambient_noise' | 'screen_time' | 'environmental';

export interface SensoryAlertConfig {
  enabled: boolean;
  noiseThresholdDb: number;       // Default: 70dB
  sustainedNoiseMinutes: number;  // Default: 15 min
  quietHoursStart?: string;       // HH:MM format
  quietHoursEnd?: string;
  alertCooldownMinutes: number;   // Default: 60 min
}

export interface SensoryAlertEvent {
  id: string;
  type: SensoryAlertType;
  severity: AlertSeverity;
  triggeredAt: number;
  durationMinutes?: number;
  peakValue?: number;
  acknowledged: boolean;
}

// ============================================
// EXECUTIVE REPORT TYPES
// ============================================

export type ReportPeriod = 'quarterly' | 'annual' | 'custom';
export type ReportFormat = 'pdf' | 'summary_text';

export interface ExecutiveReportConfig {
  period: ReportPeriod;
  format: ReportFormat;
  includeCharts: boolean;
  includeRecommendations: boolean;
  customStartDate?: number;
  customEndDate?: number;
}

export interface ExecutiveReportData {
  generatedAt: number;
  periodStart: number;
  periodEnd: number;
  summary: ExportSummary;
  trajectoryAnalysis: {
    overallTrend: 'improving' | 'stable' | 'declining';
    weeklyAverages: number[];
    significantPatterns: string[];
  };
  categoryInsights: {
    category: Category;
    impactScore: number;
    recommendation?: string;
  }[];
}

// ============================================
// INSTITUTIONAL FOUNDATIONS
// ============================================

// Legal & Governance
export type PolicyType =
  | 'terms_of_service'
  | 'privacy_policy'
  | 'data_retention_policy'
  | 'cancellation_refund_policy'
  | 'non_diagnostic_disclaimer'
  | 'jurisdiction_governing_law';

export interface PolicyDocument {
  type: PolicyType;
  version: string;
  effectiveDate: number;
  content: string;
  locale: 'en' | 'es';
  hash: string; // SHA-256 of content for integrity verification
}

export interface PolicyAcceptance {
  policyType: PolicyType;
  policyVersion: string;
  acceptedAt: number;
  ipHash?: string; // Hashed IP for audit, not stored raw
  userAgent?: string;
}

// Data Separation Architecture
export interface IdentityRecord {
  id: string;
  // PII fields - stored separately, deleted independently
  displayName?: string;
  email?: string;
  orgMembership?: string;
  createdAt: number;
  lastModifiedAt: number;
}

export interface PatternRecord {
  // Decoupled from identity - linked only by opaque reference
  patternId: string;
  identityRef: string; // Opaque reference, not direct ID
  dataHash: string;
  createdAt: number;
  retentionClass: RetentionClass;
}

export type RetentionClass = 'active' | 'archived' | 'pending_deletion' | 'legally_held';

// Immutable Audit Log
export type AuditEventType =
  | 'data_access'
  | 'data_export'
  | 'data_share'
  | 'data_delete'
  | 'consent_granted'
  | 'consent_modified'
  | 'consent_revoked'
  | 'policy_accepted'
  | 'admin_action'
  | 'config_change'
  | 'auth_event'
  | 'retention_applied'
  | 'offboarding_initiated'
  | 'offboarding_completed';

export interface ImmutableAuditEntry {
  id: string;
  sequence: number; // Monotonic sequence for tamper detection
  timestamp: number;
  eventType: AuditEventType;
  actorType: 'user' | 'admin' | 'system' | 'org_admin';
  actorRef: string; // Opaque reference
  targetRef?: string;
  action: string;
  scope?: string;
  metadata?: Record<string, string | number | boolean>;
  previousHash: string; // Hash of previous entry for chain integrity
  entryHash: string; // Hash of this entry
}

// Consent Lifecycle
export type ConsentScope =
  | 'data_collection'
  | 'data_processing'
  | 'data_sharing'
  | 'data_export'
  | 'institutional_access'
  | 'research_participation'
  | 'marketing_communications';

export type ConsentStatus = 'granted' | 'modified' | 'expired' | 'revoked';

export interface ConsentRecord {
  id: string;
  scope: ConsentScope;
  status: ConsentStatus;
  grantedAt: number;
  modifiedAt?: number;
  expiresAt?: number;
  revokedAt?: number;
  version: string;
  conditions?: string;
  auditRef: string; // Reference to audit entry
}

export interface ConsentBundle {
  userId: string;
  consents: ConsentRecord[];
  lastReviewedAt: number;
  nextReviewDue?: number;
}

// Institutional Retention Controls
export type RetentionWindow = '1y' | '3y' | '5y' | '7y' | 'indefinite';

export interface RetentionPolicy {
  id: string;
  orgId: string;
  window: RetentionWindow;
  appliesTo: 'all_data' | 'pattern_data' | 'identity_data' | 'audit_data';
  effectiveDate: number;
  legalBasis?: string;
  approvedBy: string;
  approvedAt: number;
}

export interface RetentionSchedule {
  dataRef: string;
  retentionPolicy: string;
  createdAt: number;
  scheduledDeletionAt?: number;
  legalHoldUntil?: number;
  status: RetentionClass;
}

// Export Integrity & Watermarking
export interface ExportWatermark {
  orgName: string;
  exportDate: number;
  scope: string;
  recordCount: number;
  disclaimer: string;
  exportedBy: string;
  integrityHash: string;
  jurisdiction?: string;
}

export interface WatermarkedExport {
  id: string;
  format: 'pdf' | 'csv' | 'json';
  watermark: ExportWatermark;
  createdAt: number;
  expiresAt?: number;
  accessCount: number;
  auditRef: string;
}

// Account Offboarding
export type OffboardingStage =
  | 'initiated'
  | 'data_frozen'
  | 'export_window'
  | 'deletion_scheduled'
  | 'deletion_in_progress'
  | 'completed'
  | 'cancelled';

export interface OffboardingRequest {
  id: string;
  orgId: string;
  requestedBy: string;
  requestedAt: number;
  stage: OffboardingStage;
  stageHistory: {
    stage: OffboardingStage;
    timestamp: number;
    actor: string;
  }[];
  exportWindowEndsAt?: number;
  scheduledDeletionAt?: number;
  completedAt?: number;
  confirmationArtifact?: string;
  auditRef: string;
}

// Incident & Change Disclosure
export type IncidentSeverity = 'informational' | 'minor' | 'major' | 'critical';
export type DisclosureType = 'security_incident' | 'policy_change' | 'service_change' | 'data_breach';

export interface IncidentDisclosure {
  id: string;
  type: DisclosureType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  affectedScopes: string[];
  disclosedAt: number;
  effectiveAt?: number;
  resolvedAt?: number;
  version: string;
  acknowledgementRequired: boolean;
}

export interface DisclosureAcknowledgement {
  disclosureId: string;
  acknowledgedBy: string;
  acknowledgedAt: number;
  auditRef: string;
}

// Jurisdiction Deployment
export type JurisdictionCode = 'US' | 'US_FERPA' | 'US_HIPAA_ADJ' | 'EU_GDPR' | 'UK' | 'CA' | 'AU';

export interface JurisdictionConfig {
  code: JurisdictionCode;
  dataResidency: string;
  features: {
    rightToErasure: boolean;
    dataPortability: boolean;
    consentRequired: boolean;
    minorProtections: boolean;
    educationalRecords: boolean;
    healthDataHandling: boolean;
  };
  retentionOverrides?: Partial<Record<RetentionWindow, boolean>>;
  requiredDisclosures: PolicyType[];
}

// ============================================
// DUE DILIGENCE DATA ROOM
// ============================================

// SOC2 Control Framework
export type SOC2Category = 'CC' | 'A' | 'C' | 'PI' | 'P'; // Common Criteria, Availability, Confidentiality, Processing Integrity, Privacy
export type ControlStatus = 'implemented' | 'partial' | 'planned' | 'not_applicable';
export type EvidenceType = 'policy' | 'procedure' | 'screenshot' | 'log_export' | 'config' | 'attestation' | 'report';

export interface SOC2Control {
  id: string;
  category: SOC2Category;
  controlId: string; // e.g., "CC1.1", "CC6.1"
  title: string;
  description: string;
  status: ControlStatus;
  implementationNotes: string;
  evidenceRefs: string[];
  lastReviewedAt: number;
  reviewedBy: string;
  nextReviewDue: number;
}

export interface EvidenceRecord {
  id: string;
  controlId: string;
  type: EvidenceType;
  title: string;
  description: string;
  filePath?: string;
  contentHash: string;
  collectedAt: number;
  collectedBy: string;
  expiresAt?: number;
  isActive: boolean;
}

export interface ControlAuditLog {
  id: string;
  controlId: string;
  action: 'status_change' | 'evidence_added' | 'evidence_removed' | 'review_completed';
  previousValue?: string;
  newValue?: string;
  performedBy: string;
  performedAt: number;
  notes?: string;
}

// Contract Management
export type ContractType = 'msa' | 'sow' | 'dpa' | 'baa' | 'nda' | 'pilot' | 'enterprise' | 'amendment';
export type ContractStatus = 'draft' | 'sent' | 'negotiating' | 'signed' | 'active' | 'expired' | 'terminated';

export interface ContractTemplate {
  id: string;
  type: ContractType;
  version: string;
  title: string;
  contentHash: string;
  createdAt: number;
  lastModifiedAt: number;
  isActive: boolean;
  locale: 'en' | 'es';
}

export interface SignedContract {
  id: string;
  templateId: string;
  type: ContractType;
  orgId: string;
  orgName: string;
  status: ContractStatus;
  signedAt?: number;
  effectiveDate: number;
  expirationDate?: number;
  autoRenew: boolean;
  renewalTermMonths?: number;
  annualValue: number;
  currency: 'USD' | 'EUR' | 'GBP';
  signedPdfHash?: string;
  counterpartySignatory?: string;
  internalSignatory?: string;
  auditRef: string;
}

// Revenue Engine
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type PricingTier = 'personal' | 'family' | 'pilot' | 'enterprise' | 'custom';
export type EscalatorType = 'fixed_percent' | 'cpi_linked' | 'custom';

export interface PricingBand {
  tier: PricingTier;
  minSeats: number;
  maxSeats: number;
  pricePerSeat: number;
  currency: 'USD' | 'EUR' | 'GBP';
  billingCycle: BillingCycle;
}

export interface EscalatorConfig {
  type: EscalatorType;
  annualPercent?: number;
  capPercent?: number;
  floorPercent?: number;
  effectiveAfterMonths: number;
}

export interface SubscriptionRecord {
  id: string;
  orgId: string;
  tier: PricingTier;
  seats: number;
  pricePerSeat: number;
  currency: 'USD' | 'EUR' | 'GBP';
  billingCycle: BillingCycle;
  startDate: number;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  renewalDate?: number;
  escalator?: EscalatorConfig;
  contractId?: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
  multiYearTermMonths?: number;
  prepaidMonths?: number;
  discountPercent?: number;
}

export interface RevenueEvent {
  id: string;
  subscriptionId: string;
  orgId: string;
  eventType: 'new' | 'renewal' | 'upgrade' | 'downgrade' | 'cancellation' | 'escalation';
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  occurredAt: number;
  periodStart: number;
  periodEnd: number;
  invoiceRef?: string;
  notes?: string;
}

export interface RenewalForecast {
  subscriptionId: string;
  orgId: string;
  orgName: string;
  currentARR: number;
  renewalDate: number;
  projectedARR: number;
  escalatorApplied: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  lastEngagementAt?: number;
}

// Org Provisioning
export type OrgStatus = 'pending' | 'active' | 'suspended' | 'offboarding' | 'terminated';

export interface OrgRecord {
  id: string;
  name: string;
  displayName: string;
  tier: PricingTier;
  status: OrgStatus;
  jurisdictionCode: JurisdictionCode;
  createdAt: number;
  activatedAt?: number;
  primaryContact: {
    name: string;
    email: string;
    role: string;
  };
  billingContact?: {
    name: string;
    email: string;
  };
  technicalContact?: {
    name: string;
    email: string;
  };
  settings: {
    retentionWindow: RetentionWindow;
    ssoEnabled: boolean;
    ssoProvider?: string;
    mfaRequired: boolean;
    dataResidency: string;
  };
  limits: {
    maxSeats: number;
    maxStorageGb: number;
    apiRateLimit: number;
  };
  auditRef: string;
}

export interface ProvisioningRequest {
  id: string;
  orgName: string;
  tier: PricingTier;
  requestedBy: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'provisioned' | 'rejected';
  approvedBy?: string;
  approvedAt?: number;
  provisionedAt?: number;
  orgId?: string;
  notes?: string;
}

// RBAC
export type SystemRole = 'super_admin' | 'org_admin' | 'billing_admin' | 'support' | 'auditor' | 'user';
export type Permission =
  | 'read_own_data'
  | 'write_own_data'
  | 'read_org_data'
  | 'write_org_data'
  | 'manage_users'
  | 'manage_billing'
  | 'manage_settings'
  | 'view_audit_log'
  | 'export_data'
  | 'share_data'
  | 'manage_integrations'
  | 'access_api'
  | 'manage_contracts'
  | 'view_analytics'
  | 'manage_compliance';

export interface RoleDefinition {
  role: SystemRole;
  displayName: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
  createdAt: number;
}

export interface UserRoleAssignment {
  userId: string;
  orgId: string;
  role: SystemRole;
  assignedBy: string;
  assignedAt: number;
  expiresAt?: number;
  isActive: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  super_admin: [
    'read_own_data', 'write_own_data', 'read_org_data', 'write_org_data',
    'manage_users', 'manage_billing', 'manage_settings', 'view_audit_log',
    'export_data', 'share_data', 'manage_integrations', 'access_api',
    'manage_contracts', 'view_analytics', 'manage_compliance',
  ],
  org_admin: [
    'read_own_data', 'write_own_data', 'read_org_data',
    'manage_users', 'manage_settings', 'view_audit_log',
    'export_data', 'share_data', 'view_analytics',
  ],
  billing_admin: [
    'read_own_data', 'manage_billing', 'view_audit_log', 'manage_contracts',
  ],
  support: [
    'read_org_data', 'view_audit_log', 'view_analytics',
  ],
  auditor: [
    'read_org_data', 'view_audit_log', 'export_data', 'manage_compliance',
  ],
  user: [
    'read_own_data', 'write_own_data', 'export_data', 'share_data',
  ],
};

// Security Posture
export interface SecurityPosture {
  lastUpdated: number;
  updatedBy: string;
  encryption: {
    atRest: { enabled: boolean; algorithm: string; keyRotationDays: number };
    inTransit: { enabled: boolean; protocol: string; minVersion: string };
  };
  keyManagement: {
    provider: string;
    keyTypes: string[];
    rotationPolicy: string;
    lastRotation: number;
  };
  backup: {
    enabled: boolean;
    frequency: string;
    retentionDays: number;
    lastBackup: number;
    testRestoreDate?: number;
    offsite: boolean;
  };
  availability: {
    targetUptime: number; // e.g., 99.9
    rtoHours: number;
    rpoHours: number;
    lastIncident?: number;
    mttfHours?: number;
    mttrHours?: number;
  };
  accessControls: {
    mfaRequired: boolean;
    mfaMethods: string[];
    sessionTimeoutMinutes: number;
    ipAllowlisting: boolean;
    ssoAvailable: boolean;
  };
  auditLogging: {
    enabled: boolean;
    retentionDays: number;
    realTimeAlerts: boolean;
    immutableStorage: boolean;
  };
  vulnerabilityManagement: {
    scanFrequency: string;
    lastScan: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    patchSLA: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  incidentResponse: {
    planVersion: string;
    lastPlanReview: number;
    lastDrill: number;
    responseTeamSize: number;
    averageResponseTimeMinutes: number;
  };
}

// Integration Interfaces
export type IntegrationType = 'sso' | 'scim' | 'webhook' | 'api' | 'export';
export type IntegrationStatus = 'available' | 'configured' | 'active' | 'error' | 'disabled';

export interface IntegrationConfig {
  id: string;
  orgId: string;
  type: IntegrationType;
  status: IntegrationStatus;
  provider?: string;
  configuredAt?: number;
  configuredBy?: string;
  settings: Record<string, string | boolean | number>;
  lastActivityAt?: number;
  errorMessage?: string;
}

export interface WebhookEndpoint {
  id: string;
  orgId: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
  failureCount: number;
  lastFailure?: { at: number; error: string };
}

export interface APICredential {
  id: string;
  orgId: string;
  name: string;
  keyPrefix: string; // First 8 chars for display
  keyHash: string;
  permissions: Permission[];
  createdAt: number;
  createdBy: string;
  lastUsedAt?: number;
  expiresAt?: number;
  isActive: boolean;
  rateLimit: number;
}

// Data Room Package
export interface DataRoomPackage {
  id: string;
  generatedAt: number;
  generatedBy: string;
  version: string;
  sections: {
    companyOverview: boolean;
    financialSummary: boolean;
    customerContracts: boolean;
    soc2Controls: boolean;
    securityPosture: boolean;
    auditLogs: boolean;
    orgList: boolean;
    revenueMetrics: boolean;
    technicalArchitecture: boolean;
    legalDocuments: boolean;
  };
  accessLog: { accessedBy: string; accessedAt: number; section?: string }[];
  expiresAt?: number;
  watermark: string;
}

export const JURISDICTION_CONFIGS: Record<JurisdictionCode, JurisdictionConfig> = {
  US: {
    code: 'US',
    dataResidency: 'US',
    features: {
      rightToErasure: false,
      dataPortability: true,
      consentRequired: false,
      minorProtections: true,
      educationalRecords: false,
      healthDataHandling: false,
    },
    requiredDisclosures: ['terms_of_service', 'privacy_policy', 'non_diagnostic_disclaimer'],
  },
  US_FERPA: {
    code: 'US_FERPA',
    dataResidency: 'US',
    features: {
      rightToErasure: true,
      dataPortability: true,
      consentRequired: true,
      minorProtections: true,
      educationalRecords: true,
      healthDataHandling: false,
    },
    retentionOverrides: { 'indefinite': false },
    requiredDisclosures: ['terms_of_service', 'privacy_policy', 'data_retention_policy', 'non_diagnostic_disclaimer'],
  },
  US_HIPAA_ADJ: {
    code: 'US_HIPAA_ADJ',
    dataResidency: 'US',
    features: {
      rightToErasure: true,
      dataPortability: true,
      consentRequired: true,
      minorProtections: true,
      educationalRecords: false,
      healthDataHandling: true,
    },
    retentionOverrides: { '1y': false },
    requiredDisclosures: ['terms_of_service', 'privacy_policy', 'data_retention_policy', 'non_diagnostic_disclaimer', 'jurisdiction_governing_law'],
  },
  EU_GDPR: {
    code: 'EU_GDPR',
    dataResidency: 'EU',
    features: {
      rightToErasure: true,
      dataPortability: true,
      consentRequired: true,
      minorProtections: true,
      educationalRecords: false,
      healthDataHandling: true,
    },
    requiredDisclosures: ['terms_of_service', 'privacy_policy', 'data_retention_policy', 'cancellation_refund_policy', 'non_diagnostic_disclaimer', 'jurisdiction_governing_law'],
  },
  UK: {
    code: 'UK',
    dataResidency: 'UK',
    features: {
      rightToErasure: true,
      dataPortability: true,
      consentRequired: true,
      minorProtections: true,
      educationalRecords: false,
      healthDataHandling: true,
    },
    requiredDisclosures: ['terms_of_service', 'privacy_policy', 'data_retention_policy', 'non_diagnostic_disclaimer', 'jurisdiction_governing_law'],
  },
  CA: {
    code: 'CA',
    dataResidency: 'CA',
    features: {
      rightToErasure: true,
      dataPortability: true,
      consentRequired: true,
      minorProtections: true,
      educationalRecords: false,
      healthDataHandling: true,
    },
    requiredDisclosures: ['terms_of_service', 'privacy_policy', 'data_retention_policy', 'non_diagnostic_disclaimer'],
  },
  AU: {
    code: 'AU',
    dataResidency: 'AU',
    features: {
      rightToErasure: true,
      dataPortability: true,
      consentRequired: true,
      minorProtections: true,
      educationalRecords: false,
      healthDataHandling: true,
    },
    requiredDisclosures: ['terms_of_service', 'privacy_policy', 'data_retention_policy', 'non_diagnostic_disclaimer'],
  },
};

// ============================================
// RESEARCH INFRASTRUCTURE
// ============================================

// Research Consent Mode
export type ResearchConsentScope =
  | 'cohort_inclusion'
  | 'trajectory_export'
  | 'sensor_data'
  | 'intervention_markers'
  | 'longitudinal_patterns'
  | 'deidentified_sharing';

export type ResearchConsentStatus = 'not_asked' | 'pending' | 'granted' | 'declined' | 'withdrawn';

export interface ResearchConsent {
  id: string;
  userId: string;
  scope: ResearchConsentScope;
  status: ResearchConsentStatus;
  studyId?: string;
  grantedAt?: number;
  expiresAt?: number;
  withdrawnAt?: number;
  version: string;
  consentLanguageHash: string;
  auditRef: string;
}

export interface ResearchConsentBundle {
  userId: string;
  consents: ResearchConsent[];
  lastUpdated: number;
  hasActiveResearchParticipation: boolean;
}

// De-Identified Cohort Builder
export type AgeBand = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
export type RegionBucket = 'north_america' | 'europe' | 'asia_pacific' | 'latin_america' | 'other';
export type ContextBucket = 'work' | 'education' | 'personal' | 'caregiving' | 'mixed';

export interface CohortCriteria {
  ageBands?: AgeBand[];
  regions?: RegionBucket[];
  contexts?: ContextBucket[];
  minSignalCount?: number;
  minDaysActive?: number;
  dateRange?: { start: number; end: number };
  hasInterventionMarkers?: boolean;
  capacityPatterns?: {
    averageAbove?: number;
    averageBelow?: number;
    varianceAbove?: number;
  };
}

export interface CohortMember {
  cohortParticipantId: string; // Opaque, not traceable to user
  ageBand: AgeBand;
  region: RegionBucket;
  context: ContextBucket;
  signalCount: number;
  daysActive: number;
  firstSignalAt: number;
  lastSignalAt: number;
  hasInterventionMarkers: boolean;
  qualityScore: number;
}

export interface Cohort {
  id: string;
  name: string;
  description: string;
  criteria: CohortCriteria;
  memberCount: number;
  createdAt: number;
  createdBy: string;
  studyId?: string;
  isLocked: boolean;
  lockedAt?: number;
  expiresAt?: number;
}

// Real-World Evidence Export
export type RWEExportFormat = 'cdisc_sdtm' | 'fhir_r4' | 'omop_cdm' | 'orbital_native' | 'csv_flat';

export interface RWEExportConfig {
  format: RWEExportFormat;
  cohortId: string;
  includeTrajectories: boolean;
  includeInterventions: boolean;
  includeSensorProxies: boolean;
  includeQualityMetrics: boolean;
  dateRange?: { start: number; end: number };
  aggregationLevel: 'individual' | 'daily' | 'weekly';
}

export interface RWEExportPackage {
  id: string;
  cohortId: string;
  format: RWEExportFormat;
  generatedAt: number;
  generatedBy: string;
  recordCount: number;
  fileManifest: {
    filename: string;
    contentHash: string;
    recordCount: number;
    description: string;
  }[];
  metadata: {
    studyId?: string;
    protocolVersion?: string;
    dataQualityScore: number;
    dateRange: { start: number; end: number };
    deidentificationMethod: string;
  };
  accessLog: { accessedBy: string; accessedAt: number }[];
}

// Intervention Marker Tags
export type InterventionCategory =
  | 'medication_start'
  | 'medication_stop'
  | 'dose_change'
  | 'therapy_start'
  | 'therapy_end'
  | 'therapy_change'
  | 'lifestyle_change'
  | 'environmental_change'
  | 'support_change'
  | 'other';

export interface InterventionMarker {
  id: string;
  userId: string;
  category: InterventionCategory;
  label: string;
  occurredAt: number;
  createdAt: number;
  notes?: string;
  isPrivate: boolean; // If true, excluded from research exports
  deidentifiedId?: string; // Opaque ID for research use
}

// Outcome-Neutral Trajectory Reports
export interface TrajectoryWindow {
  windowId: string;
  type: 'pre' | 'post';
  referenceEventId: string;
  startAt: number;
  endAt: number;
  signalCount: number;
  dataPoints: {
    timestamp: number;
    normalizedCapacity: number;
    drivers?: string[];
  }[];
  statistics: {
    mean: number;
    standardDeviation: number;
    trend: number;
    volatility: number;
  };
}

export interface TrajectoryReport {
  id: string;
  cohortParticipantId: string;
  referenceEventId: string;
  referenceEventCategory: InterventionCategory;
  preWindow: TrajectoryWindow;
  postWindow: TrajectoryWindow;
  windowDays: number;
  generatedAt: number;
  qualityScore: number;
}

// Adherence-Free Engagement Signals
export interface EngagementSignal {
  id: string;
  userId: string;
  signalType:
    | 'session_start'
    | 'session_end'
    | 'pattern_view'
    | 'signal_logged'
    | 'export_generated'
    | 'share_created';
  occurredAt: number;
  sessionDurationMs?: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface EngagementProfile {
  cohortParticipantId: string;
  totalSessions: number;
  totalSignalsLogged: number;
  averageSessionDurationMs: number;
  averageSignalsPerWeek: number;
  activeDays: number;
  longestGapDays: number;
  engagementPattern: 'consistent' | 'periodic' | 'sporadic' | 'declining' | 'new';
  firstEngagementAt: number;
  lastEngagementAt: number;
}

// Protocol Template Library
export type ProtocolType = 'observational' | 'registry' | 'rwe_study' | 'pilot' | 'validation';
export type ProtocolStatus = 'draft' | 'irb_pending' | 'approved' | 'active' | 'completed' | 'archived';

export interface ProtocolTemplate {
  id: string;
  type: ProtocolType;
  title: string;
  version: string;
  description: string;
  primaryEndpoints: string[];
  secondaryEndpoints: string[];
  inclusionCriteria: CohortCriteria;
  estimatedDuration: string;
  estimatedCohortSize: number;
  dataElementsRequired: string[];
  irbLanguage: {
    studyPurpose: string;
    participantRights: string;
    dataHandling: string;
    risksBenefits: string;
    withdrawalProcess: string;
  };
  createdAt: number;
  lastModifiedAt: number;
  isPublished: boolean;
}

export interface StudyProtocol {
  id: string;
  templateId: string;
  title: string;
  sponsorId: string;
  sponsorName: string;
  status: ProtocolStatus;
  version: string;
  irbApprovalNumber?: string;
  irbApprovalDate?: number;
  startDate?: number;
  endDate?: number;
  cohortId?: string;
  principalInvestigator: string;
  dataAccessAgreementId?: string;
  createdAt: number;
  lastModifiedAt: number;
}

// Data Provenance & Quality Scores
export interface DataProvenanceRecord {
  dataPointId: string;
  cohortParticipantId: string;
  sourceType: 'manual_entry' | 'sensor_derived' | 'api_import';
  capturedAt: number;
  deviceType?: string;
  appVersion: string;
  timezoneOffset: number;
  modificationHistory: {
    modifiedAt: number;
    modificationType: 'create' | 'update' | 'delete';
  }[];
}

export interface DataQualityScore {
  cohortParticipantId: string;
  overallScore: number; // 0-100
  dimensions: {
    completeness: number;
    consistency: number;
    timeliness: number;
    continuity: number;
    stability: number;
  };
  metrics: {
    totalSignals: number;
    expectedSignals: number;
    missingDays: number;
    duplicateCount: number;
    outlierCount: number;
    averageGapHours: number;
    longestGapHours: number;
    signalFrequency: 'high' | 'medium' | 'low';
  };
  calculatedAt: number;
}

// Pharma Partnership Portal
export type PartnershipType = 'data_access' | 'study_collaboration' | 'platform_integration' | 'validation_study';
export type PartnershipStatus = 'inquiry' | 'negotiating' | 'legal_review' | 'active' | 'paused' | 'terminated';

export interface PartnershipRequest {
  id: string;
  companyName: string;
  companyType: 'pharma' | 'biotech' | 'cro' | 'academic' | 'health_system' | 'other';
  contactName: string;
  contactEmail: string;
  partnershipType: PartnershipType;
  proposedUseCase: string;
  estimatedCohortSize: number;
  estimatedDuration: string;
  dataElementsRequested: string[];
  status: PartnershipStatus;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  notes?: string;
}

export interface PartnershipAgreement {
  id: string;
  requestId: string;
  partnerId: string;
  partnerName: string;
  partnershipType: PartnershipType;
  status: PartnershipStatus;
  effectiveDate: number;
  expirationDate: number;
  dataAccessScope: {
    cohortCriteria: CohortCriteria;
    dataElements: string[];
    exportFormats: RWEExportFormat[];
    accessFrequency: 'one_time' | 'quarterly' | 'monthly' | 'continuous';
  };
  governanceTerms: {
    dataRetentionDays: number;
    reidentificationProhibited: boolean;
    publishingRights: 'partner' | 'joint' | 'orbital_approval';
    auditRights: boolean;
  };
  financialTerms: {
    feeStructure: 'per_record' | 'flat_fee' | 'revenue_share' | 'in_kind';
    amount?: number;
    currency?: string;
  };
  contractDocumentHash: string;
  signedAt: number;
  signedBy: string;
  auditLog: { action: string; performedBy: string; performedAt: number }[];
}

// Zero-Content Sensor Inputs
export type SensorProxyType =
  | 'noise_level'
  | 'sleep_proxy'
  | 'activity_proxy'
  | 'screen_time_proxy'
  | 'location_stability';

export type SensorEventLevel = 'low' | 'moderate' | 'high' | 'very_high';

export interface SensorProxyEvent {
  id: string;
  userId: string;
  proxyType: SensorProxyType;
  eventLevel: SensorEventLevel;
  occurredAt: number;
  durationMs?: number;
  // No raw content stored - only categorical/bucketed values
  metadata?: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: number;
    isWeekend: boolean;
  };
}

export interface SensorProxyProfile {
  cohortParticipantId: string;
  proxyType: SensorProxyType;
  periodStart: number;
  periodEnd: number;
  eventCounts: Record<SensorEventLevel, number>;
  averageEventsPerDay: number;
  dominantTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  weekdayVsWeekendRatio: number;
}

export interface SensorConsentConfig {
  userId: string;
  enabledProxies: SensorProxyType[];
  consentedAt: number;
  lastModifiedAt: number;
  processingPreferences: {
    localOnly: boolean;
    includeInResearch: boolean;
    retentionDays: number;
  };
}

// ============================================
// ACCESSIBILITY SETTINGS
// ============================================

export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome';
export type TextSize = 'default' | 'large' | 'xlarge';
export type ButtonSize = 'default' | 'large' | 'xlarge';
export type HapticIntensity = 'off' | 'light' | 'medium' | 'strong';

export interface AccessibilitySettings {
  // Simple Mode - one-tap maximum accessibility
  simpleMode: boolean;

  // Visual
  highContrast: boolean;
  colorBlindMode: ColorBlindMode;
  textSize: TextSize;
  reduceMotion: boolean;

  // Motor
  bigButtonMode: boolean;
  buttonSize: ButtonSize;
  oneHandedMode: 'off' | 'left' | 'right';

  // Haptics
  hapticFeedback: boolean;
  hapticIntensity: HapticIntensity;

  // Cognitive
  simplifiedText: boolean;
  confirmActions: boolean;  // "Are you sure?" prompts
  undoEnabled: boolean;     // Undo support

  // Voice
  voiceControlEnabled: boolean;
  dictationEnabled: boolean;

  // Captions
  liveCaptionsEnabled: boolean;

  // Data
  offlineMode: boolean;
  lowDataMode: boolean;

  // Onboarding
  guidedSetupCompleted: boolean;
  showTooltips: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  // Simple Mode
  simpleMode: false,

  // Visual
  highContrast: false,
  colorBlindMode: 'none',
  textSize: 'default',
  reduceMotion: false,

  // Motor
  bigButtonMode: false,
  buttonSize: 'default',
  oneHandedMode: 'off',

  // Haptics
  hapticFeedback: true,
  hapticIntensity: 'medium',

  // Cognitive
  simplifiedText: false,
  confirmActions: true,
  undoEnabled: true,

  // Voice
  voiceControlEnabled: false,
  dictationEnabled: false,

  // Captions
  liveCaptionsEnabled: false,

  // Data
  offlineMode: false,
  lowDataMode: false,

  // Onboarding
  guidedSetupCompleted: false,
  showTooltips: true,
};

// Accessible color palettes
export const ACCESSIBLE_THEMES = {
  default: {
    primary: '#00E5FF',
    secondary: '#E8A830',
    danger: '#F44336',
    success: '#4CAF50',
    background: '#0A0A0F',
    card: 'rgba(255,255,255,0.03)',
  },
  highContrast: {
    primary: '#00FFFF',
    secondary: '#FFD700',
    danger: '#FF0000',
    success: '#00FF00',
    background: '#000000',
    card: '#1A1A1A',
  },
  protanopia: {
    primary: '#00BFFF',
    secondary: '#FFD700',
    danger: '#FF8C00',
    success: '#00CED1',
    background: '#0A0A0F',
    card: 'rgba(255,255,255,0.03)',
  },
  deuteranopia: {
    primary: '#00BFFF',
    secondary: '#FFD700',
    danger: '#FF8C00',
    success: '#00CED1',
    background: '#0A0A0F',
    card: 'rgba(255,255,255,0.03)',
  },
  tritanopia: {
    primary: '#FF69B4',
    secondary: '#00CED1',
    danger: '#FF6347',
    success: '#98FB98',
    background: '#0A0A0F',
    card: 'rgba(255,255,255,0.03)',
  },
  monochrome: {
    primary: '#FFFFFF',
    secondary: '#CCCCCC',
    danger: '#999999',
    success: '#FFFFFF',
    background: '#000000',
    card: '#1A1A1A',
  },
} as const;

// Text size multipliers
export const TEXT_SIZE_MULTIPLIERS: Record<TextSize, number> = {
  default: 1,
  large: 1.25,
  xlarge: 1.5,
};

// Button size multipliers
export const BUTTON_SIZE_MULTIPLIERS: Record<ButtonSize, number> = {
  default: 1,
  large: 1.3,
  xlarge: 1.6,
};

// Haptic patterns for different actions
export type HapticPattern = 'success' | 'warning' | 'error' | 'selection' | 'impact';

export const HAPTIC_PATTERNS: Record<HapticPattern, { type: string; intensity: number }> = {
  success: { type: 'notificationSuccess', intensity: 1 },
  warning: { type: 'notificationWarning', intensity: 0.8 },
  error: { type: 'notificationError', intensity: 1 },
  selection: { type: 'selection', intensity: 0.5 },
  impact: { type: 'impactMedium', intensity: 0.7 },
};

// Undo action record
export interface UndoAction {
  id: string;
  type: 'delete_log' | 'clear_data' | 'revoke_share' | 'settings_change';
  timestamp: number;
  data: unknown;
  expiresAt: number;
}

// ============================================
// PATTERN HISTORY RETENTION SYSTEM
// ============================================
//
// IMPORTANT: Pattern history is retained permanently for product improvement,
// safety, fraud prevention, and analytics. User "delete" actions soft-delete
// and de-identify but do NOT erase pattern history records.
//
// TODO: COMPLIANCE NOTE - Some jurisdictions (e.g., GDPR, CCPA) may require
// deletion in limited cases. De-identification is the default path. Legal
// review recommended before expanding to EU/UK markets. For now, we implement
// retention + de-identification as the standard approach.
//

export type PatternRetentionState = 'permanent' | 'regulatory_hold' | 'pending_review';

export type DeletionState =
  | 'active'           // Normal, visible to user
  | 'user_deleted'     // User requested deletion, hidden from view
  | 'account_deleted'  // Account deleted, de-identified
  | 'deidentified';    // Fully de-identified, retained for analytics

export type PatternMode =
  | 'personal'
  | 'family'
  | 'clinician-share'
  | 'org-pilot'
  | 'enterprise'
  | 'demo';

// Core Pattern History record - immutable retention
export interface PatternHistoryRecord {
  // Primary identifiers
  id: string;
  sessionId: string;

  // User linkage (nullable after de-identification)
  userId: string | null;
  userIdHash?: string; // Hashed version for analytics after de-identification

  // Context
  mode: PatternMode;
  timestamp: number;

  // Pattern data (always retained)
  inputSummary: PatternInputSummary;
  derivedPatterns: DerivedPatternData;

  // Metadata (selectively retained)
  metadata: PatternMetadata;

  // Retention & deletion tracking
  retentionPolicy: PatternRetentionState;
  deletionState: DeletionState;

  // Deletion timestamps
  userVisibleDeletedAt: number | null;
  accountDeletedAt: number | null;
  deidentifiedAt: number | null;

  // Immutable audit trail
  createdAt: number;
  lastModifiedAt: number;
  modificationHistory: PatternModificationEvent[];
}

// Summary of user input (de-identifiable)
export interface PatternInputSummary {
  capacityState: CapacityState;
  category: Category | null;
  tagsCount: number;
  hasNote: boolean;
  noteLength?: number; // Length only, not content after de-identification
  // Note content removed during de-identification
  noteContent?: string;
}

// Derived pattern analytics (always retained)
export interface DerivedPatternData {
  // Normalized capacity score (0-100)
  normalizedCapacity: number;

  // Time-based patterns
  hourOfDay: number;
  dayOfWeek: number;
  isWeekend: boolean;

  // Trend indicators
  previousStateTransition?: {
    fromState: CapacityState;
    hoursSinceLast: number;
  };

  // Aggregated patterns (safe for retention)
  weeklyPattern?: {
    averageCapacity: number;
    varianceScore: number;
    dominantCategory: Category | null;
  };

  // Quality signals
  dataQualityScore: number;
  isOutlier: boolean;
}

// Metadata (partially de-identifiable)
export interface PatternMetadata {
  // App context (retained)
  appVersion: string;
  platform: 'ios' | 'android' | 'web';

  // Time context (retained)
  timezoneOffset: number;
  localHour: number;

  // Device context (removed during de-identification)
  deviceId?: string;

  // Session context (retained in hashed form)
  sessionDurationMs?: number;
  signalCountInSession?: number;

  // Org context (retained for enterprise)
  orgId?: string;

  // Research flags
  includedInResearch?: boolean;
  researchConsentVersion?: string;
}

// Modification tracking
export interface PatternModificationEvent {
  timestamp: number;
  action: 'created' | 'user_deleted' | 'account_deleted' | 'deidentified' | 'metadata_updated';
  actor: 'user' | 'system' | 'admin';
  details?: string;
}

// Pattern History query filters
export interface PatternHistoryQuery {
  userId?: string;
  sessionId?: string;
  mode?: PatternMode;
  dateRange?: { start: number; end: number };
  deletionState?: DeletionState;
  includeDeidentified?: boolean;
  limit?: number;
  offset?: number;
}

// Pattern History write request
export interface PatternHistoryWriteRequest {
  capacityLog: CapacityLog;
  mode: PatternMode;
  sessionId: string;
  userId: string;
  metadata?: Partial<PatternMetadata>;
}

// De-identification result
export interface DeidentificationResult {
  recordsProcessed: number;
  recordsDeidentified: number;
  errors: string[];
  completedAt: number;
}

// Deletion disclosure text (used in UI)
export const DELETION_DISCLOSURE = {
  short: "Deleting removes this from your view. We retain pattern history for system improvement and safety.",
  full: "When you delete data, it is removed from your personal view and any linked identity information is removed. However, we retain de-identified pattern history permanently for product improvement, analytics, safety, and fraud prevention. This data cannot be traced back to you after deletion.",
  accountDeletion: "Deleting your account removes your personal information and unlinks your identity from all data. Pattern history is retained in de-identified form for product improvement, analytics, safety, and fraud prevention purposes.",
} as const;

// Export helper for creating pattern history records
export function createPatternHistoryRecord(
  request: PatternHistoryWriteRequest
): PatternHistoryRecord {
  const { capacityLog, mode, sessionId, userId, metadata } = request;
  const now = Date.now();

  // Calculate normalized capacity
  const normalizedCapacity = capacityLog.state === 'resourced' ? 100
    : capacityLog.state === 'stretched' ? 50
    : 0;

  const date = new Date(capacityLog.timestamp);

  return {
    id: `ph_${capacityLog.id}`,
    sessionId,
    userId,
    mode,
    timestamp: capacityLog.timestamp,

    inputSummary: {
      capacityState: capacityLog.state,
      category: capacityLog.category || null,
      tagsCount: capacityLog.tags?.length || 0,
      hasNote: !!capacityLog.note,
      noteLength: capacityLog.note?.length,
      noteContent: capacityLog.note,
    },

    derivedPatterns: {
      normalizedCapacity,
      hourOfDay: date.getHours(),
      dayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      dataQualityScore: 100,
      isOutlier: false,
    },

    metadata: {
      appVersion: '1.0.0',
      platform: 'web',
      timezoneOffset: new Date().getTimezoneOffset(),
      localHour: date.getHours(),
      ...metadata,
    },

    retentionPolicy: 'permanent',
    deletionState: 'active',

    userVisibleDeletedAt: null,
    accountDeletedAt: null,
    deidentifiedAt: null,

    createdAt: now,
    lastModifiedAt: now,
    modificationHistory: [{
      timestamp: now,
      action: 'created',
      actor: 'user',
    }],
  };
}

// De-identify a pattern history record
export function deidentifyPatternRecord(
  record: PatternHistoryRecord,
  reason: 'user_deleted' | 'account_deleted'
): PatternHistoryRecord {
  const now = Date.now();

  // Create hash of userId for analytics continuity
  const userIdHash = record.userId
    ? `hash_${record.userId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0).toString(16)}`
    : undefined;

  return {
    ...record,

    // Remove direct identifiers
    userId: null,
    userIdHash,

    // Remove PII from input summary
    inputSummary: {
      ...record.inputSummary,
      noteContent: undefined, // Remove actual note content
    },

    // Remove device identifiers from metadata
    metadata: {
      ...record.metadata,
      deviceId: undefined,
    },

    // Update deletion state
    deletionState: reason === 'account_deleted' ? 'account_deleted' : 'user_deleted',
    userVisibleDeletedAt: reason === 'user_deleted' ? now : record.userVisibleDeletedAt,
    accountDeletedAt: reason === 'account_deleted' ? now : record.accountDeletedAt,
    deidentifiedAt: now,

    lastModifiedAt: now,
    modificationHistory: [
      ...record.modificationHistory,
      {
        timestamp: now,
        action: reason === 'account_deleted' ? 'account_deleted' : 'user_deleted',
        actor: 'system',
        details: `Record de-identified due to ${reason}`,
      },
    ],
  };
}
