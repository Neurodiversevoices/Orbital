import { AuditAction, AuditEntry } from '../../types';
import { getAuditLog, logAuditEntry, clearAuditLog } from '../storage';

export async function logShareCreated(recipientId: string, recipientName: string): Promise<void> {
  await logAuditEntry('share_created', { recipientId, recipientName });
}

export async function logShareExpired(recipientId: string, recipientName: string): Promise<void> {
  await logAuditEntry('share_expired', { recipientId, recipientName });
}

export async function logShareRevoked(recipientId: string, recipientName: string): Promise<void> {
  await logAuditEntry('share_revoked', { recipientId, recipientName });
}

export async function logShareAccessed(recipientId: string, recipientName: string): Promise<void> {
  await logAuditEntry('share_accessed', { recipientId, recipientName });
}

export async function logExportGenerated(format: string, range: string): Promise<void> {
  await logAuditEntry('export_generated', { details: `${format} export (${range})` });
}

export async function getRecentAuditEntries(limit = 20): Promise<AuditEntry[]> {
  const entries = await getAuditLog();
  return entries.slice(0, limit);
}

export { clearAuditLog };
