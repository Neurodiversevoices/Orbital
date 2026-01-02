import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  IdentityRecord,
  PatternRecord,
  RetentionClass,
  CapacityLog,
} from '../../types';
import { logImmutableAuditEntry } from './immutableAuditLog';

const IDENTITY_KEY = '@orbital:identity_records';
const PATTERN_KEY = '@orbital:pattern_records';
const IDENTITY_REF_MAP_KEY = '@orbital:identity_ref_map';

// Generate opaque reference that cannot be reversed to original ID
function generateOpaqueRef(id: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 8);
  return `ref_${timestamp}_${random}`;
}

// Simple hash for data integrity (in production, use crypto.subtle)
function hashData(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// ============================================
// IDENTITY RECORDS (PII LAYER)
// ============================================

export async function getIdentityRecords(): Promise<IdentityRecord[]> {
  const data = await AsyncStorage.getItem(IDENTITY_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function saveIdentityRecord(record: IdentityRecord): Promise<string> {
  const records = await getIdentityRecords();
  const existing = records.findIndex((r) => r.id === record.id);

  if (existing >= 0) {
    records[existing] = { ...record, lastModifiedAt: Date.now() };
  } else {
    records.push(record);
  }

  await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(records));

  // Create opaque reference mapping
  const refMap = await getIdentityRefMap();
  if (!refMap[record.id]) {
    refMap[record.id] = generateOpaqueRef(record.id);
    await saveIdentityRefMap(refMap);
  }

  await logImmutableAuditEntry('data_access', {
    actorType: 'system',
    actorRef: 'data_separation',
    action: existing >= 0 ? 'Identity record updated' : 'Identity record created',
    targetRef: refMap[record.id],
  });

  return refMap[record.id];
}

export async function deleteIdentityRecord(id: string): Promise<boolean> {
  const records = await getIdentityRecords();
  const filtered = records.filter((r) => r.id !== id);

  if (filtered.length === records.length) return false;

  await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(filtered));

  // Remove from ref map
  const refMap = await getIdentityRefMap();
  const opaqueRef = refMap[id];
  delete refMap[id];
  await saveIdentityRefMap(refMap);

  await logImmutableAuditEntry('data_delete', {
    actorType: 'system',
    actorRef: 'data_separation',
    action: 'Identity record deleted',
    targetRef: opaqueRef || 'unknown',
  });

  return true;
}

export async function purgeAllIdentityRecords(): Promise<number> {
  const records = await getIdentityRecords();
  const count = records.length;

  await AsyncStorage.removeItem(IDENTITY_KEY);
  await AsyncStorage.removeItem(IDENTITY_REF_MAP_KEY);

  await logImmutableAuditEntry('data_delete', {
    actorType: 'system',
    actorRef: 'data_separation',
    action: `All identity records purged (${count} total)`,
    metadata: { recordCount: count },
  });

  return count;
}

// ============================================
// IDENTITY REFERENCE MAPPING (Internal Only)
// ============================================

async function getIdentityRefMap(): Promise<Record<string, string>> {
  const data = await AsyncStorage.getItem(IDENTITY_REF_MAP_KEY);
  if (!data) return {};
  return JSON.parse(data);
}

async function saveIdentityRefMap(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(IDENTITY_REF_MAP_KEY, JSON.stringify(map));
}

export async function getOpaqueRef(identityId: string): Promise<string | null> {
  const refMap = await getIdentityRefMap();
  return refMap[identityId] || null;
}

// ============================================
// PATTERN RECORDS (De-identified Data Layer)
// ============================================

export async function getPatternRecords(): Promise<PatternRecord[]> {
  const data = await AsyncStorage.getItem(PATTERN_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function createPatternRecord(
  identityRef: string,
  logs: CapacityLog[]
): Promise<PatternRecord> {
  const now = Date.now();
  const dataHash = hashData(JSON.stringify(logs));

  const record: PatternRecord = {
    patternId: `pattern_${now}_${Math.random().toString(36).substr(2, 9)}`,
    identityRef,
    dataHash,
    createdAt: now,
    retentionClass: 'active',
  };

  const records = await getPatternRecords();
  records.push(record);
  await AsyncStorage.setItem(PATTERN_KEY, JSON.stringify(records));

  await logImmutableAuditEntry('data_access', {
    actorType: 'system',
    actorRef: 'data_separation',
    action: 'Pattern record created',
    targetRef: record.patternId,
    metadata: { dataHash },
  });

  return record;
}

export async function updatePatternRetentionClass(
  patternId: string,
  retentionClass: RetentionClass
): Promise<boolean> {
  const records = await getPatternRecords();
  const index = records.findIndex((r) => r.patternId === patternId);

  if (index === -1) return false;

  const oldClass = records[index].retentionClass;
  records[index].retentionClass = retentionClass;
  await AsyncStorage.setItem(PATTERN_KEY, JSON.stringify(records));

  await logImmutableAuditEntry('retention_applied', {
    actorType: 'system',
    actorRef: 'data_separation',
    action: `Pattern retention class changed: ${oldClass} -> ${retentionClass}`,
    targetRef: patternId,
  });

  return true;
}

export async function getPatternsByRetentionClass(
  retentionClass: RetentionClass
): Promise<PatternRecord[]> {
  const records = await getPatternRecords();
  return records.filter((r) => r.retentionClass === retentionClass);
}

export async function deletePatternRecord(patternId: string): Promise<boolean> {
  const records = await getPatternRecords();
  const filtered = records.filter((r) => r.patternId !== patternId);

  if (filtered.length === records.length) return false;

  await AsyncStorage.setItem(PATTERN_KEY, JSON.stringify(filtered));

  await logImmutableAuditEntry('data_delete', {
    actorType: 'system',
    actorRef: 'data_separation',
    action: 'Pattern record deleted',
    targetRef: patternId,
  });

  return true;
}

export async function purgePatternsByIdentityRef(identityRef: string): Promise<number> {
  const records = await getPatternRecords();
  const toDelete = records.filter((r) => r.identityRef === identityRef);
  const remaining = records.filter((r) => r.identityRef !== identityRef);

  await AsyncStorage.setItem(PATTERN_KEY, JSON.stringify(remaining));

  await logImmutableAuditEntry('data_delete', {
    actorType: 'system',
    actorRef: 'data_separation',
    action: `Pattern records purged for identity ref (${toDelete.length} total)`,
    targetRef: identityRef,
    metadata: { recordCount: toDelete.length },
  });

  return toDelete.length;
}

// ============================================
// COORDINATED DELETION
// ============================================

export async function performFullDataDeletion(identityId: string): Promise<{
  identityDeleted: boolean;
  patternsDeleted: number;
}> {
  // Get opaque ref before deleting identity
  const opaqueRef = await getOpaqueRef(identityId);

  // Delete identity record first
  const identityDeleted = await deleteIdentityRecord(identityId);

  // Delete associated pattern records using opaque ref
  let patternsDeleted = 0;
  if (opaqueRef) {
    patternsDeleted = await purgePatternsByIdentityRef(opaqueRef);
  }

  await logImmutableAuditEntry('data_delete', {
    actorType: 'system',
    actorRef: 'data_separation',
    action: 'Full data deletion completed',
    metadata: {
      identityDeleted,
      patternsDeleted,
    },
  });

  return { identityDeleted, patternsDeleted };
}

// ============================================
// DATA INTEGRITY VERIFICATION
// ============================================

export async function verifyDataSeparation(): Promise<{
  isValid: boolean;
  identityCount: number;
  patternCount: number;
  orphanedPatterns: number;
  issues: string[];
}> {
  const identities = await getIdentityRecords();
  const patterns = await getPatternRecords();
  const refMap = await getIdentityRefMap();

  const issues: string[] = [];
  const validRefs = new Set(Object.values(refMap));

  // Check for orphaned patterns (patterns without valid identity ref)
  const orphanedPatterns = patterns.filter((p) => !validRefs.has(p.identityRef));

  if (orphanedPatterns.length > 0) {
    issues.push(`${orphanedPatterns.length} orphaned pattern records found`);
  }

  // Check for identities without ref mapping
  const unmappedIdentities = identities.filter((i) => !refMap[i.id]);
  if (unmappedIdentities.length > 0) {
    issues.push(`${unmappedIdentities.length} identities without reference mapping`);
  }

  return {
    isValid: issues.length === 0,
    identityCount: identities.length,
    patternCount: patterns.length,
    orphanedPatterns: orphanedPatterns.length,
    issues,
  };
}
