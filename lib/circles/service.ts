/**
 * CIRCLES SERVICE — PUBLIC API WITH SIX LAWS ENFORCEMENT
 *
 * Public API for the Circles "live dot" system.
 * All operations are validated against the Six Laws before execution.
 *
 * ============================================================================
 * API DESIGN PRINCIPLES
 * ============================================================================
 *
 * 1. MINIMAL: Only the essential operations exist
 * 2. SAFE BY DEFAULT: Returns viewer-safe payloads automatically
 * 3. CONSENT-FIRST: All sharing requires explicit bidirectional consent
 * 4. EPHEMERAL: Signals expire automatically, no history accumulates
 * 5. PEER-TO-PEER: No hierarchy, all connections are equal
 * 6. SYMMETRICAL: If A sees B, B sees A
 *
 * ============================================================================
 * SIX LAWS ENFORCEMENT
 * ============================================================================
 *
 * L1: NO AGGREGATION — Connection limit enforced, no analytics returned
 * L2: NO HISTORY — Signals expire via TTL, no archives
 * L3: BIDIRECTIONAL CONSENT — Invite/accept handshake required
 * L4: SOCIAL FIREWALL — All data in circles:* namespace
 * L5: NO HIERARCHY — No admin roles, all connections equal
 * L6: SYMMETRICAL VISIBILITY — Bidirectional visibility enforced
 *
 * ============================================================================
 */

import {
  CircleColor,
  CircleSignal,
  CircleConnection,
  CircleInvite,
  ConnectionSummary,
  ViewerSafeSignal,
  SignalMap,
  CreateInviteResult,
  AcceptInviteResult,
  StoredSignal,
  CIRCLES_SCOPE,
  CIRCLES_SCHEMA_VERSION,
  CAPACITY_TO_CIRCLE_COLOR,
  toViewerSafe,
  toConnectionSummary,
  CircleId,
  ConnectionId,
  InviteToken,
} from './types';

import {
  MAX_CONNECTIONS,
  DEFAULT_SIGNAL_TTL_MS,
  INVITE_EXPIRY_MS,
  MIN_SIGNAL_TTL_MS,
  MAX_SIGNAL_TTL_MS,
  CirclesLawViolation,
  CircleSecurityError,
  CircleSecurityEvent,
  assertValidConnectionCount,
} from './constants';

import {
  getLocalUser,
  ensureLocalUser,
  getSignal,
  setSignal,
  deleteSignal,
  getConnection,
  saveConnection,
  deleteConnection,
  updateConnectionStatus,
  getAllConnections,
  getActiveConnections,
  findConnectionByRemoteUser,
  getInvite,
  saveInvite,
  markInviteUsed,
  deleteInvite,
  cleanupExpiredInvites,
  addBlockedUser,
  removeBlockedUser,
  isUserBlocked,
  getBlockedUsers,
  generateCircleId,
  generateConnectionId,
  generateInviteToken,
  wipeAllCirclesData,
  getStorageSummary,
  verifySocialFirewall,
  verifyDataIntegrity,
} from './storage';

import {
  validateViewerSignal,
  validateStoredSignal,
  validateConnection,
  validateInvite,
  assertInviteValid,
  assertNoAggregation,
  assertRevocationComplete,
  assertValidTTL,
  assertNoHierarchy,
  isSignalExpired,
  toValidatedViewerSignal,
  CirclesLawViolation as InvariantViolation,
} from './invariants';

import {
  assertValidCircleId,
  assertValidConnectionId,
  assertValidInviteToken,
} from './ids';

import { checkIsPro } from '../entitlements';

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the Circles system for the local user.
 *
 * Call this once when the app starts or when user opts into Circles.
 */
export async function circlesInit(displayHint?: string): Promise<void> {
  await ensureLocalUser(displayHint);
  await cleanupExpiredInvites();
}

/**
 * Get the local user's Circle ID.
 */
export async function circlesGetMyId(): Promise<string | null> {
  const user = await getLocalUser();
  return user?.id ?? null;
}

// =============================================================================
// INVITE MANAGEMENT (L3: BIDIRECTIONAL CONSENT)
// =============================================================================

/**
 * Create an invite to share Circles with someone.
 *
 * @param targetHint Optional hint about who this invite is for (e.g., "Partner")
 * @returns The invite with a shareable token
 * @throws CirclesLawViolation if connection limit would be exceeded
 */
export async function circlesCreateInvite(targetHint?: string): Promise<CreateInviteResult> {
  // DOCTRINE: Circles requires Pro subscription
  const isPro = await checkIsPro();
  if (!isPro) {
    throw new CircleSecurityError(
      CircleSecurityEvent.PRO_REQUIRED_CREATOR,
      'Pro subscription required to create Circle invites',
      {}
    );
  }

  const user = await ensureLocalUser();

  // L1: NO AGGREGATION — check connection limit before creating invite
  const connections = await getAllConnections();
  assertValidConnectionCount(connections.length);

  const token = await generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS).toISOString();

  const invite: CircleInvite = {
    token: token as InviteToken,
    inviterId: user.id,
    targetHint,
    expiresAt,
    used: false,
    createdAt: Date.now(),
  };

  // Validate before saving
  await saveInvite(invite);

  return {
    invite,
    shareableToken: token,
  };
}

/**
 * Accept an invite from another user.
 *
 * This completes the bidirectional consent handshake (L3).
 *
 * @param token The invite token received from the inviter
 * @returns The established connection
 */
export async function circlesAcceptInvite(token: string): Promise<AcceptInviteResult> {
  // DOCTRINE: Circles requires Pro subscription
  const isPro = await checkIsPro();
  if (!isPro) {
    return {
      connection: null as unknown as ConnectionSummary,
      success: false,
      error: 'Pro subscription required to join Circles',
      code: CircleSecurityEvent.PRO_REQUIRED_REDEEMER,
    };
  }

  // Validate token format
  try {
    assertValidInviteToken(token);
  } catch (e) {
    return {
      connection: null as unknown as ConnectionSummary,
      success: false,
      error: 'Invalid invite token format',
    };
  }

  const user = await ensureLocalUser();

  // Get and validate invite
  const invite = await getInvite(token);
  if (!invite) {
    return {
      connection: null as unknown as ConnectionSummary,
      success: false,
      error: 'Invite not found or expired',
    };
  }

  try {
    assertInviteValid(invite);
  } catch (e) {
    if (e instanceof CirclesLawViolation) {
      return {
        connection: null as unknown as ConnectionSummary,
        success: false,
        error: e.message,
      };
    }
    throw e;
  }

  // Check if inviter is blocked
  if (await isUserBlocked(invite.inviterId)) {
    return {
      connection: null as unknown as ConnectionSummary,
      success: false,
      error: 'Cannot accept invite from blocked user',
    };
  }

  // Check if connection already exists
  const existing = await findConnectionByRemoteUser(invite.inviterId);
  if (existing && existing.status === 'active') {
    return {
      connection: toConnectionSummary(existing),
      success: true,
      error: 'Connection already exists',
    };
  }

  // L1: NO AGGREGATION — check connection limit
  const connections = await getAllConnections();
  try {
    assertValidConnectionCount(connections.length);
  } catch (e) {
    return {
      connection: null as unknown as ConnectionSummary,
      success: false,
      error: `Connection limit reached (${MAX_CONNECTIONS})`,
    };
  }

  // Create the connection
  const connectionId = await generateConnectionId();
  const now = Date.now();

  const connection: CircleConnection = {
    id: connectionId as ConnectionId,
    localUserId: user.id,
    remoteUserId: invite.inviterId,
    remoteDisplayHint: invite.targetHint,
    status: 'active',
    statusChangedAt: now,
    initiatedBy: 'remote',
    _createdAt: now,
  };

  // L3, L5, L6: Validate connection (consent, no hierarchy, etc.)
  validateConnection(connection);
  await saveConnection(connection);

  // Mark invite as used (one-time use)
  await markInviteUsed(token);

  return {
    connection: toConnectionSummary(connection),
    success: true,
  };
}

/**
 * Cancel a pending invite.
 */
export async function circlesCancelInvite(token: string): Promise<void> {
  assertValidInviteToken(token);
  await deleteInvite(token);
}

// =============================================================================
// CONNECTION MANAGEMENT (L3: BIDIRECTIONAL CONSENT, L6: SYMMETRICAL)
// =============================================================================

/**
 * Revoke a connection.
 *
 * This immediately:
 * - Invalidates sharing in BOTH directions (L6: SYMMETRICAL)
 * - Deletes all associated signals (L2: NO HISTORY)
 * - Marks the connection as revoked (L3: CONSENT)
 *
 * @param connectionId The connection to revoke
 */
export async function circlesRevokeConnection(connectionId: string): Promise<void> {
  assertValidConnectionId(connectionId);

  const connection = await getConnection(connectionId);
  if (!connection) {
    throw new CirclesLawViolation(
      'L3_BIDIRECTIONAL_CONSENT',
      'Connection not found',
      { connectionId }
    );
  }

  // L3 + L6: Revocation is bidirectional and immediate
  await updateConnectionStatus(connectionId, 'revoked');

  // Verify revocation is complete (no lingering signals)
  assertRevocationComplete(connection, 0);
}

/**
 * Block a user.
 *
 * This:
 * - Revokes any existing connection
 * - Prevents future invites from this user
 *
 * @param userId The user ID to block
 */
export async function circlesBlockUser(userId: string): Promise<void> {
  // Find and revoke any existing connection
  const connection = await findConnectionByRemoteUser(userId);
  if (connection) {
    await updateConnectionStatus(connection.id, 'blocked');
  }

  // Add to blocked list
  await addBlockedUser(userId);
}

/**
 * Unblock a user.
 */
export async function circlesUnblockUser(userId: string): Promise<void> {
  await removeBlockedUser(userId);

  // Update connection status if exists
  const connection = await findConnectionByRemoteUser(userId);
  if (connection && connection.status === 'blocked') {
    await updateConnectionStatus(connection.id, 'revoked');
  }
}

/**
 * Get all connections for the local user.
 *
 * Returns viewer-safe summaries only (L4: SOCIAL FIREWALL).
 */
export async function circlesGetMyConnections(): Promise<ConnectionSummary[]> {
  const connections = await getAllConnections();

  // L5: NO HIERARCHY — no special roles or permissions returned
  return connections.map(toConnectionSummary);
}

/**
 * Get active connection count.
 */
export async function circlesGetActiveConnectionCount(): Promise<number> {
  const active = await getActiveConnections();
  return active.length;
}

// =============================================================================
// SIGNAL MANAGEMENT (L2: NO HISTORY)
// =============================================================================

/**
 * Set my current signal color.
 *
 * This broadcasts my current state to all active connections.
 * The signal will automatically expire after the TTL (L2: NO HISTORY).
 *
 * @param color The current state color (cyan/amber/red)
 * @param ttlMs Optional custom TTL in milliseconds (default: 90 minutes)
 * @throws CirclesLawViolation if TTL is outside allowed bounds
 */
export async function circlesSetMySignal(
  color: 'cyan' | 'amber' | 'red',
  ttlMs: number = DEFAULT_SIGNAL_TTL_MS
): Promise<void> {
  // DOCTRINE: Circles requires Pro subscription
  const isPro = await checkIsPro();
  if (!isPro) {
    throw new CircleSecurityError(
      CircleSecurityEvent.PRO_LAPSED_SHARING_SUSPENDED,
      'Pro subscription required to share signals',
      {}
    );
  }

  // L2: NO HISTORY — validate TTL bounds
  assertValidTTL(ttlMs);

  const user = await ensureLocalUser();
  const now = Date.now();

  const signal: StoredSignal = {
    color,
    ttlExpiresAt: new Date(now + ttlMs).toISOString(),
    scope: CIRCLES_SCOPE,
    schemaVersion: CIRCLES_SCHEMA_VERSION,
    ownerId: user.id,
    _createdAt: now,
    _updatedAt: now,
  };

  // Validate before storing (L4: SOCIAL FIREWALL)
  validateStoredSignal(signal);
  await setSignal(signal);
}

/**
 * Set my signal from a capacity state.
 *
 * Convenience method that maps capacity states to Circle colors.
 */
export async function circlesSetMySignalFromCapacity(
  capacityState: 'resourced' | 'stretched' | 'depleted',
  ttlMs: number = DEFAULT_SIGNAL_TTL_MS
): Promise<void> {
  // DOCTRINE: Circles requires Pro subscription
  const isPro = await checkIsPro();
  if (!isPro) {
    throw new CircleSecurityError(
      CircleSecurityEvent.PRO_LAPSED_SHARING_SUSPENDED,
      'Pro subscription required to share signals',
      {}
    );
  }

  const color = CAPACITY_TO_CIRCLE_COLOR[capacityState];
  if (!color || color === 'unknown') {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Invalid capacity state: ${capacityState}`,
      { capacityState }
    );
  }
  await circlesSetMySignal(color as 'cyan' | 'amber' | 'red', ttlMs);
}

/**
 * Clear my current signal.
 *
 * Makes my status "unknown" to all connections.
 */
export async function circlesClearMySignal(): Promise<void> {
  const user = await getLocalUser();
  if (user) {
    await deleteSignal(user.id);
  }
}

/**
 * Get my current signal (if any).
 */
export async function circlesGetMySignal(): Promise<CircleColor> {
  // DOCTRINE: Circles requires Pro subscription
  const isPro = await checkIsPro();
  if (!isPro) {
    // Pro lapse hides own signal from self (suspended state)
    return 'unknown';
  }

  const user = await getLocalUser();
  if (!user) return 'unknown';

  const signal = await getSignal(user.id);
  if (!signal) return 'unknown';

  // L2: NO HISTORY — expired signals become unknown
  if (isSignalExpired(signal)) {
    await deleteSignal(user.id);
    return 'unknown';
  }

  return signal.color;
}

// =============================================================================
// VIEWING SIGNALS — The Core Read Path (L4, L6 enforced)
// =============================================================================

/**
 * Get signals from all active connections.
 *
 * IMPORTANT: This returns VIEWER-SAFE payloads only (L4: SOCIAL FIREWALL).
 * No internal metadata, no timestamps that reveal update cadence.
 *
 * Expired signals are automatically filtered out and returned as "unknown" (L2).
 *
 * @returns A map of connectionId -> ViewerSafeSignal
 */
export async function circlesGetSignalsForMe(): Promise<SignalMap> {
  // DOCTRINE: Circles requires Pro subscription
  // Pro lapse suspends signal viewing (but does not delete connections)
  const isPro = await checkIsPro();
  if (!isPro) {
    // Return empty map — signals are suspended, not deleted
    return {} as SignalMap;
  }

  const connections = await getActiveConnections();
  const result: Record<string, ViewerSafeSignal> = {};

  // L1: NO AGGREGATION — enforce limit
  assertNoAggregation(
    connections.map((c) => c.id),
    'circlesGetSignalsForMe'
  );

  for (const connection of connections) {
    // Get the signal for this connection's remote user
    const storedSignal = await getSignal(connection.remoteUserId);

    // Create viewer-safe signal
    let viewerSignal: ViewerSafeSignal;

    if (!storedSignal || isSignalExpired(storedSignal)) {
      // No signal or expired -> unknown (L2: NO HISTORY)
      viewerSignal = createUnknownSignal();
    } else {
      // L4: Strip internal fields for viewer safety
      viewerSignal = toValidatedViewerSignal(storedSignal);
    }

    result[connection.id] = viewerSignal;
  }

  return result as SignalMap;
}

/**
 * Get signal for a specific connection.
 *
 * @param connectionId The connection ID
 * @returns Viewer-safe signal, or null if connection not found/inactive
 */
export async function circlesGetSignalForConnection(
  connectionId: string
): Promise<ViewerSafeSignal | null> {
  assertValidConnectionId(connectionId);

  const connection = await getConnection(connectionId);
  if (!connection || connection.status !== 'active') {
    return null;
  }

  const storedSignal = await getSignal(connection.remoteUserId);

  if (!storedSignal || isSignalExpired(storedSignal)) {
    return createUnknownSignal();
  }

  // L4: Return validated viewer-safe signal
  return toValidatedViewerSignal(storedSignal);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create an "unknown" signal for expired or missing signals.
 */
function createUnknownSignal(): ViewerSafeSignal {
  const signal: ViewerSafeSignal = {
    color: 'unknown',
    ttlExpiresAt: new Date(0).toISOString(), // Already expired
    scope: CIRCLES_SCOPE,
    schemaVersion: CIRCLES_SCHEMA_VERSION,
  };

  // Validate even the unknown signal
  validateViewerSignal(signal);
  return signal;
}

// =============================================================================
// MAINTENANCE & DEBUG
// =============================================================================

/**
 * Run cleanup tasks.
 * Call periodically (e.g., on app foreground).
 */
export async function circlesRunCleanup(): Promise<void> {
  await cleanupExpiredInvites();

  // Clean up expired signals for local user
  const user = await getLocalUser();
  if (user) {
    const signal = await getSignal(user.id);
    if (signal && isSignalExpired(signal)) {
      await deleteSignal(user.id);
    }
  }
}

/**
 * Completely wipe all Circles data.
 *
 * USE WITH CAUTION: This deletes all connections, signals, and invites.
 */
export async function circlesWipeAll(): Promise<number> {
  return wipeAllCirclesData();
}

/**
 * Get storage summary for debugging.
 */
export async function circlesGetStorageSummary(): Promise<{
  hasUser: boolean;
  connectionCount: number;
  activeConnectionCount: number;
  pendingInviteCount: number;
  blockedUserCount: number;
  totalKeys: number;
}> {
  return getStorageSummary();
}

/**
 * Verify Social Firewall integrity.
 */
export async function circlesVerifyFirewall(): Promise<{
  valid: boolean;
  violations: string[];
}> {
  return verifySocialFirewall();
}

/**
 * Verify data integrity (connection limits, index consistency).
 */
export async function circlesVerifyIntegrity(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  return verifyDataIntegrity();
}

// =============================================================================
// BLOCKED USERS QUERY
// =============================================================================

/**
 * Get list of blocked user IDs.
 */
export async function circlesGetBlockedUsers(): Promise<string[]> {
  const blocked = await getBlockedUsers();
  return blocked.map((b) => b.blockedUserId);
}

// =============================================================================
// TYPE EXPORTS (for consumers)
// =============================================================================

export type {
  CircleColor,
  CircleSignal,
  ViewerSafeSignal,
  CircleConnection,
  ConnectionSummary,
  SignalMap,
  CreateInviteResult,
  AcceptInviteResult,
};

export {
  DEFAULT_SIGNAL_TTL_MS,
  MIN_SIGNAL_TTL_MS,
  MAX_SIGNAL_TTL_MS,
  INVITE_EXPIRY_MS,
  MAX_CONNECTIONS,
  CIRCLES_SCOPE,
  CIRCLES_SCHEMA_VERSION,
  CirclesLawViolation,
  CircleSecurityError,
  CircleSecurityEvent,
};
