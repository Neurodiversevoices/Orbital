import { ShareRecipient, ShareConfig, RecipientRole } from '../../types';
import {
  getRecipients,
  saveRecipient,
  deleteRecipient,
  getShares,
  getActiveShares,
  saveShare,
  revokeShare,
  generateId,
  generateAccessToken,
} from '../storage';
import { logShareCreated, logShareRevoked } from './auditLogger';

export type ShareDuration = 7 | 14 | 30 | 90;

const DURATION_MS: Record<ShareDuration, number> = {
  7: 7 * 24 * 60 * 60 * 1000,
  14: 14 * 24 * 60 * 60 * 1000,
  30: 30 * 24 * 60 * 60 * 1000,
  90: 90 * 24 * 60 * 60 * 1000,
};

// ============================================
// RECIPIENT MANAGEMENT
// ============================================

export async function createRecipient(
  name: string,
  role: RecipientRole
): Promise<ShareRecipient> {
  const recipient: ShareRecipient = {
    id: generateId(),
    name,
    role,
    createdAt: Date.now(),
  };
  await saveRecipient(recipient);
  return recipient;
}

export async function removeRecipient(id: string): Promise<void> {
  // Revoke all shares for this recipient first
  const shares = await getShares();
  for (const share of shares) {
    if (share.recipientId === id && share.isActive) {
      await revokeShare(share.id);
    }
  }
  await deleteRecipient(id);
}

export async function listRecipients(): Promise<ShareRecipient[]> {
  return getRecipients();
}

// ============================================
// SHARE MANAGEMENT
// ============================================

export async function createShare(
  recipientId: string,
  duration: ShareDuration
): Promise<ShareConfig> {
  const recipients = await getRecipients();
  const recipient = recipients.find((r) => r.id === recipientId);

  if (!recipient) {
    throw new Error('Recipient not found');
  }

  const share: ShareConfig = {
    id: generateId(),
    recipientId,
    expiresAt: Date.now() + DURATION_MS[duration],
    createdAt: Date.now(),
    accessToken: generateAccessToken(),
    isActive: true,
  };

  await saveShare(share);
  await logShareCreated(recipientId, recipient.name);

  return share;
}

export async function revokeShareAccess(shareId: string): Promise<void> {
  const shares = await getShares();
  const share = shares.find((s) => s.id === shareId);

  if (share) {
    const recipients = await getRecipients();
    const recipient = recipients.find((r) => r.id === share.recipientId);

    await revokeShare(shareId);

    if (recipient) {
      await logShareRevoked(share.recipientId, recipient.name);
    }
  }
}

export async function listActiveShares(): Promise<ShareConfig[]> {
  return getActiveShares();
}

export async function listAllShares(): Promise<ShareConfig[]> {
  return getShares();
}

export async function getSharesForRecipient(recipientId: string): Promise<ShareConfig[]> {
  const shares = await getShares();
  return shares.filter((s) => s.recipientId === recipientId);
}

// ============================================
// SHARE LINK GENERATION
// ============================================

export function generateShareLink(token: string, baseUrl?: string): string {
  // For app-only sharing, we generate an orbital:// deep link
  // If baseUrl is provided (future web support), use that instead
  if (baseUrl) {
    return `${baseUrl}/shared/${token}`;
  }
  return `orbital://shared/${token}`;
}
