/**
 * CIRCLES UI API WRAPPER
 *
 * Maps UI requirements to the lib/circles service layer.
 * This is the ONLY file that imports from lib/circles in the UI layer.
 */

import {
  // From invites.ts (new viral handshake)
  createInvite,
  extendInvite,
  redeemViaQR,
  redeemViaCode,
  confirmInvite,
  rejectInvite,
  cancelInvite,
  getInvitesAwaitingConfirmation,
  getMyPendingInvitesList,
  cleanupExpiredInvites,
  parseQRDeepLink,
  CirclesInvite,
  InviteQRPayload,

  // From service.ts
  circlesGetMyConnections,
  circlesSetMySignal,
  circlesInit,
  circlesGetMyId,

  // Security events (for UI-aware error handling)
  CircleSecurityError,
  CircleSecurityEvent,
} from '../../lib/circles';

// Re-export for UI layer to use in error handling
export { CircleSecurityError, CircleSecurityEvent };

// =============================================================================
// VIEW TYPES (UI-safe)
// =============================================================================

export type InviteView = {
  inviteId: string;
  displayCode: string; // ABC-123
  pin: string; // 4 digits
  expiresInSeconds: number;
  expiresAtIso: string;
  /** Deep-link URI for QR: orbital://invite/{inviteId}/{secretToken} */
  qrDeepLink: string;
  status: 'PENDING' | 'LOCKED' | 'CONFIRMED' | 'EXPIRED' | 'REVOKED';
};

export type PendingConfirmation = {
  inviteId: string;
  /** Ephemeral label from redeemer (NOT stored in connection) */
  handshakeLabel: string;
  // NO timestamps - viewer safety
};

export type ConnectionSummary = {
  connectionId: string;
  peerDisplayName?: string;
  // NO timestamps - viewer safety
};

// =============================================================================
// TRANSFORM HELPERS
// =============================================================================

function inviteToView(invite: CirclesInvite, qrDeepLink: string): InviteView {
  const expiresAt = new Date(invite.expiresAt).getTime();
  const now = Date.now();
  const expiresInSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));

  return {
    inviteId: invite.inviteId,
    displayCode: invite.displayCode,
    pin: invite.pin,
    expiresInSeconds,
    expiresAtIso: invite.expiresAt,
    qrDeepLink,
    status: invite.status,
  };
}

// =============================================================================
// CIRCLES API
// =============================================================================

export const CirclesAPI = {
  /**
   * Initialize Circles for this device.
   */
  async init(displayHint?: string): Promise<void> {
    return circlesInit(displayHint);
  },

  /**
   * Get my Circle ID.
   */
  async getMyId(): Promise<string | null> {
    return circlesGetMyId();
  },

  /**
   * Create a new invite.
   */
  async createInvite(creatorDisplayHint?: string): Promise<InviteView> {
    const result = await createInvite(creatorDisplayHint);
    return inviteToView(result.invite, result.qrDeepLink);
  },

  /**
   * Extend an invite's TTL (+30 min, max once).
   */
  async extendInvite(inviteId: string): Promise<InviteView> {
    await extendInvite(inviteId);
    // Re-fetch to get updated state
    const pending = await getMyPendingInvitesList();
    const invite = pending.find((i) => i.inviteId === inviteId);
    if (!invite) {
      throw new Error('Invite not found after extension');
    }
    // Rebuild deep-link for the updated invite
    const qrDeepLink = `orbital://invite/${invite.inviteId}/${invite.secretToken}`;
    return inviteToView(invite, qrDeepLink);
  },

  /**
   * Revoke/cancel an invite.
   */
  async revokeInvite(inviteId: string): Promise<void> {
    return cancelInvite(inviteId);
  },

  /**
   * Expire an invite immediately (same as revoke for UI purposes).
   */
  async expireInviteNow(inviteId: string): Promise<void> {
    return cancelInvite(inviteId);
  },

  /**
   * Redeem via QR deep-link or legacy JSON payload.
   *
   * Accepts:
   * - Deep-link: orbital://invite/{inviteId}/{secretToken}
   * - Legacy JSON: {"inviteId":"...","secretToken":"..."}
   *
   * @param qrInput - Deep-link URI or JSON string
   * @param handshakeLabel - Ephemeral label for identity (NOT stored permanently)
   */
  async redeemByQr(
    qrInput: string,
    handshakeLabel?: string
  ): Promise<{ inviteId: string; needsFinalHandshake: boolean }> {
    let payload: InviteQRPayload | null = null;

    // Try deep-link format first (preferred)
    if (qrInput.startsWith('orbital://') || qrInput.startsWith('orbital:/')) {
      payload = parseQRDeepLink(qrInput);
    }

    // Fall back to JSON format (legacy)
    if (!payload) {
      try {
        payload = JSON.parse(qrInput);
      } catch {
        // Not JSON either
      }
    }

    if (!payload || !payload.inviteId || !payload.secretToken) {
      throw new Error('Invalid QR format. Expected orbital://invite/... deep-link');
    }

    const result = await redeemViaQR(payload, handshakeLabel);
    if (!result.success) {
      throw new Error(result.error || 'Redeem failed');
    }

    return {
      inviteId: result.inviteId!,
      needsFinalHandshake: true, // Always needs confirmation
    };
  },

  /**
   * Redeem via display code + PIN.
   *
   * @param displayCode - Display code (e.g., ABC-123)
   * @param pin - 4-digit PIN
   * @param handshakeLabel - Ephemeral label for identity (NOT stored permanently)
   */
  async redeemByCodePin(
    displayCode: string,
    pin: string,
    handshakeLabel?: string
  ): Promise<{ inviteId: string; needsFinalHandshake: boolean }> {
    const result = await redeemViaCode(displayCode, pin, handshakeLabel);
    if (!result.success) {
      throw new Error(result.error || 'Redeem failed');
    }

    return {
      inviteId: result.inviteId!,
      needsFinalHandshake: true,
    };
  },

  /**
   * Confirm handshake (creator action) to activate connection.
   */
  async confirmHandshake(inviteId: string): Promise<{ connectionId: string }> {
    const result = await confirmInvite(inviteId);
    if (!result.success) {
      throw new Error(result.error || 'Confirm failed');
    }

    return {
      connectionId: result.connection!.id,
    };
  },

  /**
   * Reject a pending handshake.
   */
  async rejectHandshake(inviteId: string): Promise<void> {
    return rejectInvite(inviteId);
  },

  /**
   * List invites awaiting my confirmation (as creator).
   * Returns ephemeral handshake labels (NOT stored in connection).
   */
  async listPendingConfirmations(): Promise<PendingConfirmation[]> {
    const invites = await getInvitesAwaitingConfirmation();
    return invites.map((inv) => ({
      inviteId: inv.inviteId,
      handshakeLabel: inv.redeemerDisplayHint || 'Peer',
    }));
  },

  /**
   * Get a single pending confirmation by invite ID.
   * SECURITY: Fetches label from invite record, NOT URL params (prevents URL leak).
   */
  async getPendingConfirmation(inviteId: string): Promise<PendingConfirmation | null> {
    const invites = await getInvitesAwaitingConfirmation();
    const invite = invites.find((inv) => inv.inviteId === inviteId);
    if (!invite) {
      return null;
    }
    return {
      inviteId: invite.inviteId,
      handshakeLabel: invite.redeemerDisplayHint || 'Peer',
    };
  },

  /**
   * List my active connections.
   * NO timestamps returned - viewer safety.
   */
  async listConnections(): Promise<ConnectionSummary[]> {
    const connections = await circlesGetMyConnections();
    return connections.map((c) => ({
      connectionId: c.id,
      peerDisplayName: c.remoteDisplayHint,
    }));
  },

  /**
   * Set my current signal color.
   */
  async setMySignal(color: 'cyan' | 'amber' | 'red'): Promise<void> {
    return circlesSetMySignal(color);
  },

  /**
   * Clean up expired invites.
   */
  async cleanup(): Promise<number> {
    return cleanupExpiredInvites();
  },
};
