import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ImmutableAuditEntry,
  AuditEventType,
} from '../../types';

const AUDIT_KEY = '@orbital:immutable_audit';
const SEQUENCE_KEY = '@orbital:audit_sequence';

// Simple hash function for chain integrity (in production, use crypto.subtle)
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

function generateEntryHash(entry: Omit<ImmutableAuditEntry, 'entryHash'>): string {
  const content = JSON.stringify({
    id: entry.id,
    sequence: entry.sequence,
    timestamp: entry.timestamp,
    eventType: entry.eventType,
    actorType: entry.actorType,
    actorRef: entry.actorRef,
    action: entry.action,
    previousHash: entry.previousHash,
  });
  return simpleHash(content);
}

async function getNextSequence(): Promise<number> {
  const current = await AsyncStorage.getItem(SEQUENCE_KEY);
  const next = current ? parseInt(current, 10) + 1 : 1;
  await AsyncStorage.setItem(SEQUENCE_KEY, next.toString());
  return next;
}

async function getLastEntryHash(): Promise<string> {
  const entries = await getAuditEntries(1);
  if (entries.length === 0) {
    return '0000000000000000'; // Genesis hash
  }
  return entries[0].entryHash;
}

export async function logImmutableAuditEntry(
  eventType: AuditEventType,
  params: {
    actorType: 'user' | 'admin' | 'system' | 'org_admin';
    actorRef: string;
    action: string;
    targetRef?: string;
    scope?: string;
    metadata?: Record<string, string | number | boolean>;
  }
): Promise<ImmutableAuditEntry> {
  const sequence = await getNextSequence();
  const previousHash = await getLastEntryHash();
  const timestamp = Date.now();
  const id = `audit_${timestamp}_${sequence}`;

  const entryWithoutHash: Omit<ImmutableAuditEntry, 'entryHash'> = {
    id,
    sequence,
    timestamp,
    eventType,
    actorType: params.actorType,
    actorRef: params.actorRef,
    targetRef: params.targetRef,
    action: params.action,
    scope: params.scope,
    metadata: params.metadata,
    previousHash,
  };

  const entryHash = generateEntryHash(entryWithoutHash);

  const entry: ImmutableAuditEntry = {
    ...entryWithoutHash,
    entryHash,
  };

  // Append to audit log
  const existing = await getAuditEntries();
  existing.unshift(entry);
  await AsyncStorage.setItem(AUDIT_KEY, JSON.stringify(existing));

  return entry;
}

export async function getAuditEntries(limit?: number): Promise<ImmutableAuditEntry[]> {
  const data = await AsyncStorage.getItem(AUDIT_KEY);
  if (!data) return [];
  const entries: ImmutableAuditEntry[] = JSON.parse(data);
  return limit ? entries.slice(0, limit) : entries;
}

export async function getAuditEntriesByType(
  eventType: AuditEventType,
  limit?: number
): Promise<ImmutableAuditEntry[]> {
  const entries = await getAuditEntries();
  const filtered = entries.filter((e) => e.eventType === eventType);
  return limit ? filtered.slice(0, limit) : filtered;
}

export async function getAuditEntriesByActor(
  actorRef: string,
  limit?: number
): Promise<ImmutableAuditEntry[]> {
  const entries = await getAuditEntries();
  const filtered = entries.filter((e) => e.actorRef === actorRef);
  return limit ? filtered.slice(0, limit) : filtered;
}

export async function getAuditEntriesByTarget(
  targetRef: string,
  limit?: number
): Promise<ImmutableAuditEntry[]> {
  const entries = await getAuditEntries();
  const filtered = entries.filter((e) => e.targetRef === targetRef);
  return limit ? filtered.slice(0, limit) : filtered;
}

export async function getAuditEntriesByDateRange(
  startDate: number,
  endDate: number
): Promise<ImmutableAuditEntry[]> {
  const entries = await getAuditEntries();
  return entries.filter((e) => e.timestamp >= startDate && e.timestamp <= endDate);
}

export async function verifyAuditChainIntegrity(): Promise<{
  isValid: boolean;
  brokenAt?: number;
  totalEntries: number;
}> {
  const entries = await getAuditEntries();
  if (entries.length === 0) {
    return { isValid: true, totalEntries: 0 };
  }

  // Entries are stored newest-first, so we verify from end to start
  const reversed = [...entries].reverse();

  for (let i = 0; i < reversed.length; i++) {
    const entry = reversed[i];

    // Verify entry hash
    const expectedHash = generateEntryHash({
      id: entry.id,
      sequence: entry.sequence,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      actorType: entry.actorType,
      actorRef: entry.actorRef,
      targetRef: entry.targetRef,
      action: entry.action,
      scope: entry.scope,
      metadata: entry.metadata,
      previousHash: entry.previousHash,
    });

    if (entry.entryHash !== expectedHash) {
      return { isValid: false, brokenAt: entry.sequence, totalEntries: entries.length };
    }

    // Verify chain linkage (except for first entry)
    if (i > 0) {
      const previousEntry = reversed[i - 1];
      if (entry.previousHash !== previousEntry.entryHash) {
        return { isValid: false, brokenAt: entry.sequence, totalEntries: entries.length };
      }
    }
  }

  return { isValid: true, totalEntries: entries.length };
}

export async function exportAuditLog(
  startDate?: number,
  endDate?: number
): Promise<string> {
  let entries: ImmutableAuditEntry[];

  if (startDate && endDate) {
    entries = await getAuditEntriesByDateRange(startDate, endDate);
  } else {
    entries = await getAuditEntries();
  }

  const integrity = await verifyAuditChainIntegrity();

  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    chainIntegrity: integrity,
    entryCount: entries.length,
    entries,
  }, null, 2);
}
