import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityPosture } from '../../types';

const SECURITY_POSTURE_KEY = '@orbital:security_posture';
const SECURITY_AUDIT_KEY = '@orbital:security_audit';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// DEFAULT SECURITY POSTURE
// ============================================

export const DEFAULT_SECURITY_POSTURE: SecurityPosture = {
  lastUpdated: Date.now(),
  updatedBy: 'system',
  encryption: {
    atRest: {
      enabled: true,
      algorithm: 'AES-256-GCM',
      keyRotationDays: 90,
    },
    inTransit: {
      enabled: true,
      protocol: 'TLS',
      minVersion: '1.3',
    },
  },
  keyManagement: {
    provider: 'Platform-managed',
    keyTypes: ['encryption', 'signing', 'api'],
    rotationPolicy: 'Automatic 90-day rotation',
    lastRotation: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
  },
  backup: {
    enabled: true,
    frequency: 'daily',
    retentionDays: 30,
    lastBackup: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    testRestoreDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    offsite: true,
  },
  availability: {
    targetUptime: 99.9,
    rtoHours: 4,
    rpoHours: 1,
  },
  accessControls: {
    mfaRequired: true,
    mfaMethods: ['totp', 'sms', 'email'],
    sessionTimeoutMinutes: 480,
    ipAllowlisting: false,
    ssoAvailable: true,
  },
  auditLogging: {
    enabled: true,
    retentionDays: 365,
    realTimeAlerts: true,
    immutableStorage: true,
  },
  vulnerabilityManagement: {
    scanFrequency: 'weekly',
    lastScan: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
    criticalVulnerabilities: 0,
    highVulnerabilities: 0,
    patchSLA: {
      critical: 24,
      high: 72,
      medium: 168,
      low: 720,
    },
  },
  incidentResponse: {
    planVersion: '2.0',
    lastPlanReview: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days ago
    lastDrill: Date.now() - 180 * 24 * 60 * 60 * 1000, // 180 days ago
    responseTeamSize: 4,
    averageResponseTimeMinutes: 15,
  },
};

// ============================================
// SECURITY AUDIT LOG
// ============================================

interface SecurityAuditEntry {
  id: string;
  eventType:
    | 'posture_updated'
    | 'key_rotated'
    | 'backup_completed'
    | 'backup_restored'
    | 'vulnerability_scan'
    | 'incident_detected'
    | 'incident_resolved'
    | 'drill_conducted'
    | 'plan_updated'
    | 'access_review';
  performedBy: string;
  performedAt: number;
  category: 'encryption' | 'backup' | 'access' | 'vulnerability' | 'incident' | 'audit';
  details: string;
  metadata?: Record<string, unknown>;
}

async function logSecurityEvent(
  eventType: SecurityAuditEntry['eventType'],
  category: SecurityAuditEntry['category'],
  performedBy: string,
  details: string,
  metadata?: Record<string, unknown>
): Promise<SecurityAuditEntry> {
  const entry: SecurityAuditEntry = {
    id: generateId('sec'),
    eventType,
    performedBy,
    performedAt: Date.now(),
    category,
    details,
    metadata,
  };

  const data = await AsyncStorage.getItem(SECURITY_AUDIT_KEY);
  const log: SecurityAuditEntry[] = data ? JSON.parse(data) : [];
  log.unshift(entry);
  await AsyncStorage.setItem(SECURITY_AUDIT_KEY, JSON.stringify(log));

  return entry;
}

export async function getSecurityAuditLog(
  filter?: { category?: SecurityAuditEntry['category']; startDate?: number; endDate?: number }
): Promise<SecurityAuditEntry[]> {
  const data = await AsyncStorage.getItem(SECURITY_AUDIT_KEY);
  if (!data) return [];
  let log: SecurityAuditEntry[] = JSON.parse(data);

  if (filter?.category) {
    log = log.filter((e) => e.category === filter.category);
  }
  if (filter?.startDate) {
    log = log.filter((e) => e.performedAt >= filter.startDate!);
  }
  if (filter?.endDate) {
    log = log.filter((e) => e.performedAt <= filter.endDate!);
  }

  return log;
}

// ============================================
// SECURITY POSTURE MANAGEMENT
// ============================================

export async function getSecurityPosture(): Promise<SecurityPosture> {
  const data = await AsyncStorage.getItem(SECURITY_POSTURE_KEY);
  if (!data) return DEFAULT_SECURITY_POSTURE;
  return JSON.parse(data);
}

export async function updateSecurityPosture(
  updates: Partial<SecurityPosture>,
  updatedBy: string
): Promise<SecurityPosture> {
  const current = await getSecurityPosture();
  const updated: SecurityPosture = {
    ...current,
    ...updates,
    lastUpdated: Date.now(),
    updatedBy,
  };

  await AsyncStorage.setItem(SECURITY_POSTURE_KEY, JSON.stringify(updated));

  await logSecurityEvent(
    'posture_updated',
    'audit',
    updatedBy,
    'Security posture configuration updated'
  );

  return updated;
}

export async function initializeSecurityPosture(): Promise<void> {
  const existing = await AsyncStorage.getItem(SECURITY_POSTURE_KEY);
  if (!existing) {
    await AsyncStorage.setItem(SECURITY_POSTURE_KEY, JSON.stringify(DEFAULT_SECURITY_POSTURE));
  }
}

// ============================================
// KEY ROTATION
// ============================================

export async function recordKeyRotation(
  keyType: string,
  rotatedBy: string
): Promise<SecurityPosture> {
  const posture = await getSecurityPosture();
  posture.keyManagement.lastRotation = Date.now();
  posture.lastUpdated = Date.now();
  posture.updatedBy = rotatedBy;

  await AsyncStorage.setItem(SECURITY_POSTURE_KEY, JSON.stringify(posture));

  await logSecurityEvent(
    'key_rotated',
    'encryption',
    rotatedBy,
    `Key rotation completed for ${keyType}`,
    { keyType }
  );

  return posture;
}

// ============================================
// BACKUP OPERATIONS
// ============================================

export async function recordBackupCompletion(
  completedBy: string,
  metadata?: { size?: number; duration?: number }
): Promise<SecurityPosture> {
  const posture = await getSecurityPosture();
  posture.backup.lastBackup = Date.now();
  posture.lastUpdated = Date.now();
  posture.updatedBy = completedBy;

  await AsyncStorage.setItem(SECURITY_POSTURE_KEY, JSON.stringify(posture));

  await logSecurityEvent(
    'backup_completed',
    'backup',
    completedBy,
    'Backup completed successfully',
    metadata
  );

  return posture;
}

export async function recordBackupRestore(
  restoredBy: string,
  restoreDate: number
): Promise<SecurityPosture> {
  const posture = await getSecurityPosture();
  posture.backup.testRestoreDate = Date.now();
  posture.lastUpdated = Date.now();
  posture.updatedBy = restoredBy;

  await AsyncStorage.setItem(SECURITY_POSTURE_KEY, JSON.stringify(posture));

  await logSecurityEvent(
    'backup_restored',
    'backup',
    restoredBy,
    `Backup restore test completed for backup from ${new Date(restoreDate).toISOString()}`
  );

  return posture;
}

// ============================================
// VULNERABILITY MANAGEMENT
// ============================================

export async function recordVulnerabilityScan(
  scannedBy: string,
  results: { critical: number; high: number; medium?: number; low?: number }
): Promise<SecurityPosture> {
  const posture = await getSecurityPosture();
  posture.vulnerabilityManagement.lastScan = Date.now();
  posture.vulnerabilityManagement.criticalVulnerabilities = results.critical;
  posture.vulnerabilityManagement.highVulnerabilities = results.high;
  posture.lastUpdated = Date.now();
  posture.updatedBy = scannedBy;

  await AsyncStorage.setItem(SECURITY_POSTURE_KEY, JSON.stringify(posture));

  await logSecurityEvent(
    'vulnerability_scan',
    'vulnerability',
    scannedBy,
    `Vulnerability scan completed: ${results.critical} critical, ${results.high} high`,
    results
  );

  return posture;
}

// ============================================
// INCIDENT MANAGEMENT
// ============================================

export async function recordIncidentDetection(
  detectedBy: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  description: string
): Promise<string> {
  const incidentId = generateId('inc');

  await logSecurityEvent(
    'incident_detected',
    'incident',
    detectedBy,
    description,
    { incidentId, severity }
  );

  return incidentId;
}

export async function recordIncidentResolution(
  incidentId: string,
  resolvedBy: string,
  resolutionNotes: string,
  responseTimeMinutes: number
): Promise<SecurityPosture> {
  const posture = await getSecurityPosture();
  posture.incidentResponse.averageResponseTimeMinutes = Math.round(
    (posture.incidentResponse.averageResponseTimeMinutes + responseTimeMinutes) / 2
  );
  posture.lastUpdated = Date.now();
  posture.updatedBy = resolvedBy;

  await AsyncStorage.setItem(SECURITY_POSTURE_KEY, JSON.stringify(posture));

  await logSecurityEvent(
    'incident_resolved',
    'incident',
    resolvedBy,
    resolutionNotes,
    { incidentId, responseTimeMinutes }
  );

  return posture;
}

// ============================================
// DRILLS AND PLAN REVIEWS
// ============================================

export async function recordDrillConducted(
  conductedBy: string,
  drillType: string,
  outcome: 'success' | 'partial' | 'failed',
  notes?: string
): Promise<SecurityPosture> {
  const posture = await getSecurityPosture();
  posture.incidentResponse.lastDrill = Date.now();
  posture.lastUpdated = Date.now();
  posture.updatedBy = conductedBy;

  await AsyncStorage.setItem(SECURITY_POSTURE_KEY, JSON.stringify(posture));

  await logSecurityEvent(
    'drill_conducted',
    'incident',
    conductedBy,
    `${drillType} drill conducted: ${outcome}`,
    { drillType, outcome, notes }
  );

  return posture;
}

export async function recordPlanReview(
  reviewedBy: string,
  newVersion: string
): Promise<SecurityPosture> {
  const posture = await getSecurityPosture();
  posture.incidentResponse.planVersion = newVersion;
  posture.incidentResponse.lastPlanReview = Date.now();
  posture.lastUpdated = Date.now();
  posture.updatedBy = reviewedBy;

  await AsyncStorage.setItem(SECURITY_POSTURE_KEY, JSON.stringify(posture));

  await logSecurityEvent(
    'plan_updated',
    'incident',
    reviewedBy,
    `Incident response plan updated to version ${newVersion}`
  );

  return posture;
}

// ============================================
// SECURITY POSTURE REPORT
// ============================================

export interface SecurityPostureScore {
  overall: number;
  encryption: number;
  backup: number;
  accessControls: number;
  vulnerabilityManagement: number;
  incidentResponse: number;
  auditLogging: number;
  recommendations: string[];
}

export async function calculateSecurityScore(): Promise<SecurityPostureScore> {
  const posture = await getSecurityPosture();
  const now = Date.now();
  const recommendations: string[] = [];

  // Encryption score (0-100)
  let encryptionScore = 0;
  if (posture.encryption.atRest.enabled) encryptionScore += 40;
  if (posture.encryption.atRest.algorithm.includes('AES-256')) encryptionScore += 10;
  if (posture.encryption.inTransit.enabled) encryptionScore += 40;
  if (posture.encryption.inTransit.minVersion === '1.3') encryptionScore += 10;

  // Backup score (0-100)
  let backupScore = 0;
  if (posture.backup.enabled) {
    backupScore += 30;
    const daysSinceBackup = (now - posture.backup.lastBackup) / (24 * 60 * 60 * 1000);
    if (daysSinceBackup < 1) backupScore += 30;
    else if (daysSinceBackup < 7) backupScore += 20;
    else recommendations.push('Backup is overdue');

    if (posture.backup.offsite) backupScore += 20;

    if (posture.backup.testRestoreDate) {
      const daysSinceTest = (now - posture.backup.testRestoreDate) / (24 * 60 * 60 * 1000);
      if (daysSinceTest < 30) backupScore += 20;
      else if (daysSinceTest < 90) backupScore += 10;
      else recommendations.push('Backup restore test overdue');
    }
  } else {
    recommendations.push('Backups are not enabled');
  }

  // Access controls score (0-100)
  let accessScore = 0;
  if (posture.accessControls.mfaRequired) accessScore += 40;
  else recommendations.push('MFA should be required');

  if (posture.accessControls.ssoAvailable) accessScore += 20;
  if (posture.accessControls.sessionTimeoutMinutes <= 480) accessScore += 20;
  if (posture.accessControls.mfaMethods.length >= 2) accessScore += 20;

  // Vulnerability management score (0-100)
  let vulnScore = 0;
  const daysSinceScan = (now - posture.vulnerabilityManagement.lastScan) / (24 * 60 * 60 * 1000);
  if (daysSinceScan < 7) vulnScore += 30;
  else if (daysSinceScan < 30) vulnScore += 15;
  else recommendations.push('Vulnerability scan overdue');

  if (posture.vulnerabilityManagement.criticalVulnerabilities === 0) vulnScore += 40;
  else recommendations.push(`${posture.vulnerabilityManagement.criticalVulnerabilities} critical vulnerabilities need remediation`);

  if (posture.vulnerabilityManagement.highVulnerabilities === 0) vulnScore += 30;
  else if (posture.vulnerabilityManagement.highVulnerabilities <= 2) vulnScore += 15;

  // Incident response score (0-100)
  let irScore = 0;
  const daysSinceDrill = (now - posture.incidentResponse.lastDrill) / (24 * 60 * 60 * 1000);
  if (daysSinceDrill < 90) irScore += 30;
  else if (daysSinceDrill < 180) irScore += 15;
  else recommendations.push('Incident response drill overdue');

  const daysSincePlanReview = (now - posture.incidentResponse.lastPlanReview) / (24 * 60 * 60 * 1000);
  if (daysSincePlanReview < 180) irScore += 30;
  else recommendations.push('Incident response plan review overdue');

  if (posture.incidentResponse.averageResponseTimeMinutes <= 15) irScore += 40;
  else if (posture.incidentResponse.averageResponseTimeMinutes <= 60) irScore += 20;

  // Audit logging score (0-100)
  let auditScore = 0;
  if (posture.auditLogging.enabled) auditScore += 40;
  if (posture.auditLogging.retentionDays >= 365) auditScore += 20;
  if (posture.auditLogging.realTimeAlerts) auditScore += 20;
  if (posture.auditLogging.immutableStorage) auditScore += 20;

  const overall = Math.round(
    (encryptionScore + backupScore + accessScore + vulnScore + irScore + auditScore) / 6
  );

  return {
    overall,
    encryption: encryptionScore,
    backup: backupScore,
    accessControls: accessScore,
    vulnerabilityManagement: vulnScore,
    incidentResponse: irScore,
    auditLogging: auditScore,
    recommendations,
  };
}

// ============================================
// SECURITY POSTURE REPORT GENERATION
// ============================================

export async function generateSecurityPostureReport(): Promise<string> {
  const posture = await getSecurityPosture();
  const score = await calculateSecurityScore();
  const now = new Date();

  return `
SECURITY POSTURE REPORT
=======================
Generated: ${now.toISOString()}

OVERALL SECURITY SCORE: ${score.overall}/100

COMPONENT SCORES:
-----------------
Encryption:              ${score.encryption}/100
Backup & Recovery:       ${score.backup}/100
Access Controls:         ${score.accessControls}/100
Vulnerability Mgmt:      ${score.vulnerabilityManagement}/100
Incident Response:       ${score.incidentResponse}/100
Audit Logging:           ${score.auditLogging}/100

ENCRYPTION
----------
At-Rest Encryption: ${posture.encryption.atRest.enabled ? 'Enabled' : 'Disabled'}
  Algorithm: ${posture.encryption.atRest.algorithm}
  Key Rotation: Every ${posture.encryption.atRest.keyRotationDays} days

In-Transit Encryption: ${posture.encryption.inTransit.enabled ? 'Enabled' : 'Disabled'}
  Protocol: ${posture.encryption.inTransit.protocol} ${posture.encryption.inTransit.minVersion}+

KEY MANAGEMENT
--------------
Provider: ${posture.keyManagement.provider}
Key Types: ${posture.keyManagement.keyTypes.join(', ')}
Rotation Policy: ${posture.keyManagement.rotationPolicy}
Last Rotation: ${new Date(posture.keyManagement.lastRotation).toISOString()}

BACKUP & RECOVERY
-----------------
Backup Status: ${posture.backup.enabled ? 'Enabled' : 'Disabled'}
Frequency: ${posture.backup.frequency}
Retention: ${posture.backup.retentionDays} days
Last Backup: ${new Date(posture.backup.lastBackup).toISOString()}
Offsite Storage: ${posture.backup.offsite ? 'Yes' : 'No'}
Last Restore Test: ${posture.backup.testRestoreDate ? new Date(posture.backup.testRestoreDate).toISOString() : 'Never'}

AVAILABILITY
------------
Target Uptime: ${posture.availability.targetUptime}%
Recovery Time Objective (RTO): ${posture.availability.rtoHours} hours
Recovery Point Objective (RPO): ${posture.availability.rpoHours} hours

ACCESS CONTROLS
---------------
MFA Required: ${posture.accessControls.mfaRequired ? 'Yes' : 'No'}
MFA Methods: ${posture.accessControls.mfaMethods.join(', ')}
Session Timeout: ${posture.accessControls.sessionTimeoutMinutes} minutes
SSO Available: ${posture.accessControls.ssoAvailable ? 'Yes' : 'No'}
IP Allowlisting: ${posture.accessControls.ipAllowlisting ? 'Enabled' : 'Disabled'}

VULNERABILITY MANAGEMENT
------------------------
Scan Frequency: ${posture.vulnerabilityManagement.scanFrequency}
Last Scan: ${new Date(posture.vulnerabilityManagement.lastScan).toISOString()}
Critical Vulnerabilities: ${posture.vulnerabilityManagement.criticalVulnerabilities}
High Vulnerabilities: ${posture.vulnerabilityManagement.highVulnerabilities}

Patch SLA (hours):
  Critical: ${posture.vulnerabilityManagement.patchSLA.critical}
  High: ${posture.vulnerabilityManagement.patchSLA.high}
  Medium: ${posture.vulnerabilityManagement.patchSLA.medium}
  Low: ${posture.vulnerabilityManagement.patchSLA.low}

INCIDENT RESPONSE
-----------------
Plan Version: ${posture.incidentResponse.planVersion}
Last Plan Review: ${new Date(posture.incidentResponse.lastPlanReview).toISOString()}
Last Drill: ${new Date(posture.incidentResponse.lastDrill).toISOString()}
Response Team Size: ${posture.incidentResponse.responseTeamSize}
Avg Response Time: ${posture.incidentResponse.averageResponseTimeMinutes} minutes

AUDIT LOGGING
-------------
Status: ${posture.auditLogging.enabled ? 'Enabled' : 'Disabled'}
Retention: ${posture.auditLogging.retentionDays} days
Real-time Alerts: ${posture.auditLogging.realTimeAlerts ? 'Yes' : 'No'}
Immutable Storage: ${posture.auditLogging.immutableStorage ? 'Yes' : 'No'}

${score.recommendations.length > 0 ? `
RECOMMENDATIONS
---------------
${score.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
` : ''}
---
Last Updated: ${new Date(posture.lastUpdated).toISOString()}
Updated By: ${posture.updatedBy}
`;
}
