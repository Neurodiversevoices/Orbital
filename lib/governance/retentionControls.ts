import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RetentionPolicy,
  RetentionSchedule,
  RetentionWindow,
  RetentionClass,
} from '../../types';
import { logImmutableAuditEntry } from './immutableAuditLog';
import { updatePatternRetentionClass, getPatternRecords } from './dataSeparation';

const RETENTION_POLICIES_KEY = '@orbital:retention_policies';
const RETENTION_SCHEDULES_KEY = '@orbital:retention_schedules';

const RETENTION_WINDOW_MS: Record<RetentionWindow, number> = {
  '1y': 365 * 24 * 60 * 60 * 1000,
  '3y': 3 * 365 * 24 * 60 * 60 * 1000,
  '5y': 5 * 365 * 24 * 60 * 60 * 1000,
  '7y': 7 * 365 * 24 * 60 * 60 * 1000,
  'indefinite': Infinity,
};

function generatePolicyId(): string {
  return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateScheduleId(): string {
  return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// RETENTION POLICIES
// ============================================

export async function getRetentionPolicies(): Promise<RetentionPolicy[]> {
  const data = await AsyncStorage.getItem(RETENTION_POLICIES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function getActiveRetentionPolicy(orgId: string): Promise<RetentionPolicy | null> {
  const policies = await getRetentionPolicies();
  return policies.find((p) => p.orgId === orgId) || null;
}

export async function createRetentionPolicy(
  orgId: string,
  window: RetentionWindow,
  approvedBy: string,
  options?: {
    appliesTo?: 'all_data' | 'pattern_data' | 'identity_data' | 'audit_data';
    legalBasis?: string;
  }
): Promise<RetentionPolicy> {
  const now = Date.now();
  const policy: RetentionPolicy = {
    id: generatePolicyId(),
    orgId,
    window,
    appliesTo: options?.appliesTo || 'all_data',
    effectiveDate: now,
    legalBasis: options?.legalBasis,
    approvedBy,
    approvedAt: now,
  };

  const policies = await getRetentionPolicies();

  // Deactivate any existing policy for this org (only one active per org)
  const existingIndex = policies.findIndex((p) => p.orgId === orgId);
  if (existingIndex >= 0) {
    policies.splice(existingIndex, 1);
  }

  policies.push(policy);
  await AsyncStorage.setItem(RETENTION_POLICIES_KEY, JSON.stringify(policies));

  await logImmutableAuditEntry('config_change', {
    actorType: 'org_admin',
    actorRef: approvedBy,
    action: `Retention policy created: ${window} for ${options?.appliesTo || 'all_data'}`,
    targetRef: policy.id,
    scope: orgId,
    metadata: { window, appliesTo: options?.appliesTo || 'all_data' },
  });

  return policy;
}

export async function updateRetentionPolicy(
  policyId: string,
  updates: {
    window?: RetentionWindow;
    legalBasis?: string;
  },
  updatedBy: string
): Promise<RetentionPolicy | null> {
  const policies = await getRetentionPolicies();
  const index = policies.findIndex((p) => p.id === policyId);

  if (index === -1) return null;

  const old = policies[index];
  policies[index] = {
    ...old,
    ...updates,
    approvedBy: updatedBy,
    approvedAt: Date.now(),
  };

  await AsyncStorage.setItem(RETENTION_POLICIES_KEY, JSON.stringify(policies));

  await logImmutableAuditEntry('config_change', {
    actorType: 'org_admin',
    actorRef: updatedBy,
    action: `Retention policy updated: ${old.window} -> ${updates.window || old.window}`,
    targetRef: policyId,
  });

  return policies[index];
}

// ============================================
// RETENTION SCHEDULES
// ============================================

export async function getRetentionSchedules(): Promise<RetentionSchedule[]> {
  const data = await AsyncStorage.getItem(RETENTION_SCHEDULES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function createRetentionSchedule(
  dataRef: string,
  policyId: string
): Promise<RetentionSchedule> {
  const policies = await getRetentionPolicies();
  const policy = policies.find((p) => p.id === policyId);

  if (!policy) {
    throw new Error(`Policy not found: ${policyId}`);
  }

  const now = Date.now();
  const windowMs = RETENTION_WINDOW_MS[policy.window];
  const scheduledDeletionAt = windowMs === Infinity ? undefined : now + windowMs;

  const schedule: RetentionSchedule = {
    dataRef,
    retentionPolicy: policyId,
    createdAt: now,
    scheduledDeletionAt,
    status: 'active',
  };

  const schedules = await getRetentionSchedules();
  schedules.push(schedule);
  await AsyncStorage.setItem(RETENTION_SCHEDULES_KEY, JSON.stringify(schedules));

  await logImmutableAuditEntry('retention_applied', {
    actorType: 'system',
    actorRef: 'retention_controls',
    action: `Retention schedule created: ${policy.window}`,
    targetRef: dataRef,
    metadata: { policy: policyId, window: policy.window },
  });

  return schedule;
}

export async function applyLegalHold(
  dataRef: string,
  holdUntil: number,
  reason: string,
  appliedBy: string
): Promise<RetentionSchedule | null> {
  const schedules = await getRetentionSchedules();
  const index = schedules.findIndex((s) => s.dataRef === dataRef);

  if (index === -1) return null;

  schedules[index].legalHoldUntil = holdUntil;
  schedules[index].status = 'legally_held';

  await AsyncStorage.setItem(RETENTION_SCHEDULES_KEY, JSON.stringify(schedules));

  // Also update pattern record
  await updatePatternRetentionClass(dataRef, 'legally_held');

  await logImmutableAuditEntry('retention_applied', {
    actorType: 'admin',
    actorRef: appliedBy,
    action: `Legal hold applied: ${reason}`,
    targetRef: dataRef,
    metadata: { holdUntil, reason },
  });

  return schedules[index];
}

export async function releaseLegalHold(
  dataRef: string,
  releasedBy: string
): Promise<RetentionSchedule | null> {
  const schedules = await getRetentionSchedules();
  const index = schedules.findIndex((s) => s.dataRef === dataRef);

  if (index === -1) return null;

  schedules[index].legalHoldUntil = undefined;
  schedules[index].status = 'active';

  await AsyncStorage.setItem(RETENTION_SCHEDULES_KEY, JSON.stringify(schedules));

  await updatePatternRetentionClass(dataRef, 'active');

  await logImmutableAuditEntry('retention_applied', {
    actorType: 'admin',
    actorRef: releasedBy,
    action: 'Legal hold released',
    targetRef: dataRef,
  });

  return schedules[index];
}

// ============================================
// RETENTION ENFORCEMENT
// ============================================

export async function processScheduledDeletions(): Promise<{
  processed: number;
  deleted: number;
  heldBack: number;
}> {
  const now = Date.now();
  const schedules = await getRetentionSchedules();
  const patterns = await getPatternRecords();

  let processed = 0;
  let deleted = 0;
  let heldBack = 0;

  for (const schedule of schedules) {
    if (schedule.status === 'pending_deletion') continue;
    if (!schedule.scheduledDeletionAt) continue;
    if (schedule.scheduledDeletionAt > now) continue;

    processed++;

    // Check for legal hold
    if (schedule.legalHoldUntil && schedule.legalHoldUntil > now) {
      heldBack++;
      continue;
    }

    // Mark for deletion
    schedule.status = 'pending_deletion';
    await updatePatternRetentionClass(schedule.dataRef, 'pending_deletion');
    deleted++;
  }

  await AsyncStorage.setItem(RETENTION_SCHEDULES_KEY, JSON.stringify(schedules));

  if (processed > 0) {
    await logImmutableAuditEntry('retention_applied', {
      actorType: 'system',
      actorRef: 'retention_controls',
      action: `Scheduled deletions processed`,
      metadata: { processed, deleted, heldBack },
    });
  }

  return { processed, deleted, heldBack };
}

export async function getUpcomingDeletions(withinDays: number = 30): Promise<RetentionSchedule[]> {
  const now = Date.now();
  const windowEnd = now + withinDays * 24 * 60 * 60 * 1000;
  const schedules = await getRetentionSchedules();

  return schedules.filter(
    (s) =>
      s.status === 'active' &&
      s.scheduledDeletionAt &&
      s.scheduledDeletionAt <= windowEnd &&
      (!s.legalHoldUntil || s.legalHoldUntil < s.scheduledDeletionAt)
  );
}

export async function getRetentionSummary(orgId: string): Promise<{
  policy: RetentionPolicy | null;
  totalScheduled: number;
  activeRecords: number;
  pendingDeletion: number;
  legalHolds: number;
}> {
  const policy = await getActiveRetentionPolicy(orgId);
  const schedules = await getRetentionSchedules();

  const policySchedules = schedules.filter(
    (s) => s.retentionPolicy === policy?.id
  );

  return {
    policy,
    totalScheduled: policySchedules.length,
    activeRecords: policySchedules.filter((s) => s.status === 'active').length,
    pendingDeletion: policySchedules.filter((s) => s.status === 'pending_deletion').length,
    legalHolds: policySchedules.filter((s) => s.status === 'legally_held').length,
  };
}
