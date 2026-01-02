import { ShareConfig, ViewContext } from '../../types';
import { getShareByToken, getRecipients } from '../storage';
import { logShareAccessed } from './auditLogger';

export interface ValidationResult {
  isValid: boolean;
  context?: ViewContext;
  error?: 'invalid_token' | 'expired' | 'revoked';
}

export async function validateShareAccess(token: string): Promise<ValidationResult> {
  const share = await getShareByToken(token);

  if (!share) {
    return { isValid: false, error: 'invalid_token' };
  }

  if (!share.isActive) {
    return { isValid: false, error: 'revoked' };
  }

  if (share.expiresAt < Date.now()) {
    return { isValid: false, error: 'expired' };
  }

  // Get recipient name for logging
  const recipients = await getRecipients();
  const recipient = recipients.find((r) => r.id === share.recipientId);

  if (recipient) {
    await logShareAccessed(share.recipientId, recipient.name);
  }

  const context: ViewContext = {
    mode: 'shared-readonly',
    shareConfig: share,
    ownerName: undefined, // Could be populated from preferences
  };

  return { isValid: true, context };
}

export function isShareExpired(share: ShareConfig): boolean {
  return share.expiresAt < Date.now();
}

export function getShareDaysRemaining(share: ShareConfig): number {
  const remaining = share.expiresAt - Date.now();
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}
