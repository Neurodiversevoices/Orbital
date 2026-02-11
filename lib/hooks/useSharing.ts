import { useState, useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import { ShareRecipient, ShareConfig, RecipientRole, AuditEntry } from '../../types';
import {
  createRecipient,
  removeRecipient,
  listRecipients,
  createShare,
  revokeShareAccess,
  listActiveShares,
  getSharesForRecipient,
  generateShareLink,
  getRecentAuditEntries,
  ShareDuration,
} from '../sharing';

interface UseSharingReturn {
  recipients: ShareRecipient[];
  activeShares: ShareConfig[];
  auditLog: AuditEntry[];
  isLoading: boolean;
  error: string | null;
  addRecipient: (name: string, role: RecipientRole) => Promise<ShareRecipient>;
  deleteRecipient: (id: string) => Promise<void>;
  createNewShare: (recipientId: string, duration: ShareDuration) => Promise<ShareConfig>;
  revokeShare: (shareId: string) => Promise<void>;
  getShareLink: (token: string) => string;
  refresh: () => Promise<void>;
}

export function useSharing(): UseSharingReturn {
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [activeShares, setActiveShares] = useState<ShareConfig[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [recipientData, shareData, auditData] = await Promise.all([
        listRecipients(),
        listActiveShares(),
        getRecentAuditEntries(20),
      ]);
      setRecipients(recipientData);
      setActiveShares(shareData);
      setAuditLog(auditData);
    } catch (e) {
      Sentry.captureException(e, { tags: { hook: 'useSharing' } });
      setError('Failed to load sharing data');
      if (__DEV__) console.error('[Orbital Sharing] Load failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addRecipient = useCallback(async (name: string, role: RecipientRole): Promise<ShareRecipient> => {
    const recipient = await createRecipient(name, role);
    setRecipients((prev) => [...prev, recipient]);
    return recipient;
  }, []);

  const deleteRecipientHandler = useCallback(async (id: string): Promise<void> => {
    await removeRecipient(id);
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    // Also remove shares for this recipient
    setActiveShares((prev) => prev.filter((s) => s.recipientId !== id));
    // Refresh audit log
    const auditData = await getRecentAuditEntries(20);
    setAuditLog(auditData);
  }, []);

  const createNewShare = useCallback(async (recipientId: string, duration: ShareDuration): Promise<ShareConfig> => {
    const share = await createShare(recipientId, duration);
    setActiveShares((prev) => [...prev, share]);
    // Refresh audit log
    const auditData = await getRecentAuditEntries(20);
    setAuditLog(auditData);
    return share;
  }, []);

  const revokeShareHandler = useCallback(async (shareId: string): Promise<void> => {
    await revokeShareAccess(shareId);
    setActiveShares((prev) => prev.filter((s) => s.id !== shareId));
    // Refresh audit log
    const auditData = await getRecentAuditEntries(20);
    setAuditLog(auditData);
  }, []);

  const getShareLink = useCallback((token: string): string => {
    return generateShareLink(token);
  }, []);

  return {
    recipients,
    activeShares,
    auditLog,
    isLoading,
    error,
    addRecipient,
    deleteRecipient: deleteRecipientHandler,
    createNewShare,
    revokeShare: revokeShareHandler,
    getShareLink,
    refresh: loadData,
  };
}
