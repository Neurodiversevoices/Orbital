/**
 * CIRCLES STORAGE — ATOMIC, NAMESPACE-ISOLATED
 *
 * Local-first storage with STRICT namespace isolation and atomic writes.
 *
 * ============================================================================
 * SOCIAL FIREWALL ENFORCEMENT (L4)
 * ============================================================================
 *
 * ALL keys MUST start with "circles:" — no exceptions.
 * This ensures Circles data can be:
 * - Wiped independently of other Orbital data
 * - Never accidentally joined with logs/patterns/vault
 * - Audited for namespace violations
 *
 * ============================================================================
 * ATOMIC WRITES
 * ============================================================================
 *
 * Multi-key operations use AsyncStorage.multiSet/multiRemove for atomicity.
 * This prevents partial writes that could corrupt state.
 *
 * ============================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CircleUser,
  CircleConnection,
  CircleInvite,
  StoredSignal,
  BlockedUser,
  CirclesStorageKeyPrefix,
  isCirclesKey,
  toViewerSafe,
  ViewerSafeSignal,
} from './types';
import {
  CIRCLES_KEY_PREFIX,
  FORBIDDEN_KEY_PREFIXES,
  MAX_CONNECTIONS,
  CirclesLawViolation,
  assertValidConnectionCount,
} from './constants';
import {
  assertCirclesNamespace,
  validateStoredSignal,
  validateConnection,
  isSignalExpired,
  assertNoAggregation,
} from './invariants';
import {
  generateCircleId,
  generateConnectionId,
  generateInviteToken as generateInviteTokenId,
  assertValidCircleId,
  assertValidConnectionId,
  assertValidInviteToken,
  CircleId,
  ConnectionId,
  InviteToken,
} from './ids';

// =============================================================================
// STORAGE KEY GENERATORS (Namespace-Safe)
// =============================================================================

const KEYS = {
  /** Local user identity */
  user: (): string => 'circles:user',

  /** Signal for a specific user */
  signal: (userId: string): string => `circles:signal:${userId}`,

  /** Connection by ID */
  connection: (connectionId: string): string => `circles:connection:${connectionId}`,

  /** All connection IDs list */
  connectionIndex: (): string => 'circles:connection:_index',

  /** Invite by token */
  invite: (token: string): string => `circles:invite:${token}`,

  /** All invite tokens list */
  inviteIndex: (): string => 'circles:invite:_index',

  /** Blocked users list */
  blockedUsers: (): string => 'circles:blocked:_list',
} as const;

/**
 * Validates a key before use — throws if outside namespace or contains forbidden patterns.
 */
function validateKey(key: string): void {
  assertCirclesNamespace(key);
}

// =============================================================================
// LOW-LEVEL STORAGE PRIMITIVES (with validation)
// =============================================================================

/**
 * Get a value from storage with namespace validation.
 */
async function get<T>(key: string): Promise<T | null> {
  validateKey(key);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

/**
 * Set a value in storage with namespace validation.
 */
async function set<T>(key: string, value: T): Promise<void> {
  validateKey(key);
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/**
 * Remove a value from storage with namespace validation.
 */
async function remove(key: string): Promise<void> {
  validateKey(key);
  await AsyncStorage.removeItem(key);
}

/**
 * Atomic multi-set with namespace validation.
 */
async function multiSet(pairs: [string, unknown][]): Promise<void> {
  // Validate all keys first
  for (const [key] of pairs) {
    validateKey(key);
  }

  const serialized: [string, string][] = pairs.map(([key, value]) => [
    key,
    JSON.stringify(value),
  ]);

  await AsyncStorage.multiSet(serialized);
}

/**
 * Atomic multi-remove with namespace validation.
 */
async function multiRemove(keys: string[]): Promise<void> {
  // Validate all keys first
  for (const key of keys) {
    validateKey(key);
  }

  await AsyncStorage.multiRemove(keys);
}

/**
 * Get all keys that match a prefix.
 * Only returns keys within the Circles namespace.
 */
async function getKeysByPrefix(prefix: CirclesStorageKeyPrefix): Promise<string[]> {
  const allKeys = await AsyncStorage.getAllKeys();
  return allKeys.filter((key) => key.startsWith(prefix) && isCirclesKey(key));
}

// =============================================================================
// USER STORAGE
// =============================================================================

/**
 * Get the local Circle user identity.
 */
export async function getLocalUser(): Promise<CircleUser | null> {
  return get<CircleUser>(KEYS.user());
}

/**
 * Set the local Circle user identity.
 */
export async function setLocalUser(user: CircleUser): Promise<void> {
  // Validate the ID format
  assertValidCircleId(user.id);
  await set(KEYS.user(), user);
}

/**
 * Initialize local user if not exists.
 * Uses cryptographically secure ID generation.
 */
export async function ensureLocalUser(displayHint?: string): Promise<CircleUser> {
  let user = await getLocalUser();
  if (!user) {
    const id = await generateCircleId();
    user = {
      id: id as CircleId,
      displayHint,
      createdAt: Date.now(),
    };
    await setLocalUser(user);
  }
  return user;
}

// =============================================================================
// SIGNAL STORAGE
// =============================================================================

/**
 * Get a stored signal for a user.
 * Returns null if expired or not found.
 */
export async function getSignal(userId: string): Promise<StoredSignal | null> {
  const signal = await get<StoredSignal>(KEYS.signal(userId));
  if (!signal) return null;

  // Validate the signal
  validateStoredSignal(signal);

  // Check TTL expiration
  if (isSignalExpired(signal)) {
    // Expired signals return null (effectively "unknown")
    return null;
  }

  return signal;
}

/**
 * Set a signal for a user.
 * Validates the signal before storage.
 */
export async function setSignal(signal: StoredSignal): Promise<void> {
  validateStoredSignal(signal);
  await set(KEYS.signal(signal.ownerId), signal);
}

/**
 * Delete a signal for a user.
 */
export async function deleteSignal(userId: string): Promise<void> {
  await remove(KEYS.signal(userId));
}

/**
 * Get signals for multiple users.
 * Enforces L1 (NO AGGREGATION) limit.
 *
 * @throws CirclesLawViolation if too many users requested
 */
export async function getSignalsForUsers(
  userIds: string[]
): Promise<Map<string, StoredSignal>> {
  // L1: NO AGGREGATION — enforce limit
  assertNoAggregation(userIds, 'getSignalsForUsers');

  const results = new Map<string, StoredSignal>();

  for (const userId of userIds) {
    const signal = await getSignal(userId);
    if (signal) {
      results.set(userId, signal);
    }
  }

  return results;
}

// =============================================================================
// CONNECTION STORAGE (with atomic operations)
// =============================================================================

/**
 * Get the connection index (list of all connection IDs).
 */
async function getConnectionIndex(): Promise<string[]> {
  const index = await get<string[]>(KEYS.connectionIndex());
  return index || [];
}

/**
 * Get a connection by ID.
 */
export async function getConnection(connectionId: string): Promise<CircleConnection | null> {
  assertValidConnectionId(connectionId);
  const connection = await get<CircleConnection>(KEYS.connection(connectionId));
  if (connection) {
    validateConnection(connection);
  }
  return connection;
}

/**
 * Save a connection with atomic index update.
 * Enforces L1 (MAX_CONNECTIONS) limit.
 */
export async function saveConnection(connection: CircleConnection): Promise<void> {
  validateConnection(connection);

  const index = await getConnectionIndex();

  // Check if this is a new connection
  const isNew = !index.includes(connection.id);

  if (isNew) {
    // L1: NO AGGREGATION — enforce connection limit
    assertValidConnectionCount(index.length);

    // Add to index
    const newIndex = [...index, connection.id];

    // Atomic write: connection + index
    await multiSet([
      [KEYS.connection(connection.id), connection],
      [KEYS.connectionIndex(), newIndex],
    ]);
  } else {
    // Just update the connection
    await set(KEYS.connection(connection.id), connection);
  }
}

/**
 * Delete a connection with atomic cleanup.
 * Removes connection, signal, and updates index atomically.
 */
export async function deleteConnection(connectionId: string): Promise<void> {
  assertValidConnectionId(connectionId);

  const connection = await getConnection(connectionId);
  const index = await getConnectionIndex();
  const filteredIndex = index.filter((id) => id !== connectionId);

  // Prepare keys to remove
  const keysToRemove = [KEYS.connection(connectionId)];

  if (connection) {
    // Also remove the signal for this connection's remote user
    keysToRemove.push(KEYS.signal(connection.remoteUserId));
  }

  // Atomic operation: remove connection + signal, update index
  await multiRemove(keysToRemove);
  await set(KEYS.connectionIndex(), filteredIndex);
}

/**
 * Get all connections for the local user.
 */
export async function getAllConnections(): Promise<CircleConnection[]> {
  const index = await getConnectionIndex();

  // L1: NO AGGREGATION — this is an integrity check, should never exceed
  if (index.length > MAX_CONNECTIONS) {
    throw new CirclesLawViolation(
      'L1_NO_AGGREGATION',
      `Connection index has ${index.length} entries, exceeding MAX_CONNECTIONS (${MAX_CONNECTIONS}). Data integrity issue.`,
      { count: index.length }
    );
  }

  const connections: CircleConnection[] = [];

  for (const connectionId of index) {
    const connection = await getConnection(connectionId);
    if (connection) {
      connections.push(connection);
    }
  }

  return connections;
}

/**
 * Get active connections only.
 */
export async function getActiveConnections(): Promise<CircleConnection[]> {
  const all = await getAllConnections();
  return all.filter((c) => c.status === 'active');
}

/**
 * Find a connection by remote user ID.
 */
export async function findConnectionByRemoteUser(
  remoteUserId: string
): Promise<CircleConnection | null> {
  const all = await getAllConnections();
  return all.find((c) => c.remoteUserId === remoteUserId) || null;
}

/**
 * Update connection status with atomic signal cleanup on revoke/block.
 */
export async function updateConnectionStatus(
  connectionId: string,
  status: 'active' | 'revoked' | 'blocked'
): Promise<void> {
  const connection = await getConnection(connectionId);
  if (!connection) {
    throw new CirclesLawViolation(
      'L3_BIDIRECTIONAL_CONSENT',
      `Cannot update status: connection ${connectionId} not found`,
      { connectionId }
    );
  }

  const updated: CircleConnection = {
    ...connection,
    status,
    statusChangedAt: Date.now(),
  };

  if (status === 'revoked' || status === 'blocked') {
    // L3: BIDIRECTIONAL CONSENT — revocation must delete signals
    await multiRemove([KEYS.signal(connection.remoteUserId)]);
  }

  await set(KEYS.connection(connectionId), updated);
}

// =============================================================================
// INVITE STORAGE
// =============================================================================

/**
 * Get the invite index (list of all invite tokens).
 */
async function getInviteIndex(): Promise<string[]> {
  const index = await get<string[]>(KEYS.inviteIndex());
  return index || [];
}

/**
 * Get an invite by token.
 */
export async function getInvite(token: string): Promise<CircleInvite | null> {
  assertValidInviteToken(token);
  return get<CircleInvite>(KEYS.invite(token));
}

/**
 * Save an invite with atomic index update.
 */
export async function saveInvite(invite: CircleInvite): Promise<void> {
  assertValidInviteToken(invite.token);

  const index = await getInviteIndex();
  const newIndex = index.includes(invite.token) ? index : [...index, invite.token];

  // Atomic write
  await multiSet([
    [KEYS.invite(invite.token), invite],
    [KEYS.inviteIndex(), newIndex],
  ]);
}

/**
 * Mark an invite as used.
 */
export async function markInviteUsed(token: string): Promise<void> {
  assertValidInviteToken(token);

  const invite = await getInvite(token);
  if (invite) {
    const updated: CircleInvite = { ...invite, used: true };
    await set(KEYS.invite(token), updated);
  }
}

/**
 * Delete an invite with atomic index update.
 */
export async function deleteInvite(token: string): Promise<void> {
  assertValidInviteToken(token);

  const index = await getInviteIndex();
  const filteredIndex = index.filter((t) => t !== token);

  // Atomic operation
  await multiRemove([KEYS.invite(token)]);
  await set(KEYS.inviteIndex(), filteredIndex);
}

/**
 * Get all pending (unused, non-expired) invites.
 */
export async function getPendingInvites(): Promise<CircleInvite[]> {
  const index = await getInviteIndex();
  const now = Date.now();
  const pending: CircleInvite[] = [];

  for (const token of index) {
    try {
      const invite = await getInvite(token);
      if (invite && !invite.used) {
        const expiresAt = new Date(invite.expiresAt).getTime();
        if (now < expiresAt) {
          pending.push(invite);
        }
      }
    } catch {
      // Skip invalid tokens
    }
  }

  return pending;
}

/**
 * Clean up expired invites.
 */
export async function cleanupExpiredInvites(): Promise<number> {
  const index = await getInviteIndex();
  const now = Date.now();
  const tokensToDelete: string[] = [];

  for (const token of index) {
    try {
      const invite = await getInvite(token);
      if (invite) {
        const expiresAt = new Date(invite.expiresAt).getTime();
        if (now > expiresAt || invite.used) {
          tokensToDelete.push(token);
        }
      }
    } catch {
      // Invalid token, mark for deletion
      tokensToDelete.push(token);
    }
  }

  // Atomic cleanup
  if (tokensToDelete.length > 0) {
    const keysToRemove = tokensToDelete.map((t) => KEYS.invite(t));
    const filteredIndex = index.filter((t) => !tokensToDelete.includes(t));

    await multiRemove(keysToRemove);
    await set(KEYS.inviteIndex(), filteredIndex);
  }

  return tokensToDelete.length;
}

// =============================================================================
// BLOCKED USERS STORAGE
// =============================================================================

/**
 * Get the blocked users list.
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const blocked = await get<BlockedUser[]>(KEYS.blockedUsers());
  return blocked || [];
}

/**
 * Add a user to the blocked list.
 */
export async function addBlockedUser(userId: string): Promise<void> {
  const blocked = await getBlockedUsers();
  const exists = blocked.some((b) => b.blockedUserId === userId);

  if (!exists) {
    blocked.push({
      blockedUserId: userId,
      blockedAt: Date.now(),
    });
    await set(KEYS.blockedUsers(), blocked);
  }
}

/**
 * Remove a user from the blocked list.
 */
export async function removeBlockedUser(userId: string): Promise<void> {
  const blocked = await getBlockedUsers();
  const filtered = blocked.filter((b) => b.blockedUserId !== userId);
  await set(KEYS.blockedUsers(), filtered);
}

/**
 * Check if a user is blocked.
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  const blocked = await getBlockedUsers();
  return blocked.some((b) => b.blockedUserId === userId);
}

// =============================================================================
// BULK OPERATIONS (For Wipe & Debug)
// =============================================================================

/**
 * Wipe ALL Circles data.
 * This is the nuclear option — use for account deletion or data reset.
 *
 * IMPORTANT: This only wipes Circles data (circles:* keys).
 * Other Orbital data (logs, patterns, vault) is untouched.
 */
export async function wipeAllCirclesData(): Promise<number> {
  const allKeys = await AsyncStorage.getAllKeys();
  const circlesKeys = allKeys.filter(isCirclesKey);

  if (circlesKeys.length > 0) {
    await AsyncStorage.multiRemove(circlesKeys);
  }

  return circlesKeys.length;
}

/**
 * Get a summary of stored Circles data (for debugging).
 */
export async function getStorageSummary(): Promise<{
  hasUser: boolean;
  connectionCount: number;
  activeConnectionCount: number;
  pendingInviteCount: number;
  blockedUserCount: number;
  totalKeys: number;
}> {
  const user = await getLocalUser();
  const connections = await getAllConnections();
  const activeConnections = connections.filter((c) => c.status === 'active');
  const pendingInvites = await getPendingInvites();
  const blockedUsers = await getBlockedUsers();

  const allKeys = await AsyncStorage.getAllKeys();
  const circlesKeys = allKeys.filter(isCirclesKey);

  return {
    hasUser: !!user,
    connectionCount: connections.length,
    activeConnectionCount: activeConnections.length,
    pendingInviteCount: pendingInvites.length,
    blockedUserCount: blockedUsers.length,
    totalKeys: circlesKeys.length,
  };
}

/**
 * Verify Social Firewall integrity.
 * Checks that no Circles keys reference external data.
 */
export async function verifySocialFirewall(): Promise<{
  valid: boolean;
  violations: string[];
}> {
  const allKeys = await AsyncStorage.getAllKeys();
  const circlesKeys = allKeys.filter(isCirclesKey);
  const violations: string[] = [];

  for (const key of circlesKeys) {
    const lowerKey = key.toLowerCase();

    // Check for forbidden key prefixes embedded in the key
    for (const forbidden of FORBIDDEN_KEY_PREFIXES) {
      const forbiddenLower = forbidden.toLowerCase().replace(':', '');
      if (lowerKey.includes(forbiddenLower) && !lowerKey.includes('circle')) {
        violations.push(`Key "${key}" contains forbidden pattern "${forbidden}"`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Verify data integrity.
 * Checks connection limits, index consistency, etc.
 */
export async function verifyDataIntegrity(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // Check connection count
  const connections = await getAllConnections();
  if (connections.length > MAX_CONNECTIONS) {
    issues.push(`Connection count (${connections.length}) exceeds MAX_CONNECTIONS (${MAX_CONNECTIONS})`);
  }

  // Check index consistency
  const connectionIndex = await getConnectionIndex();
  for (const id of connectionIndex) {
    try {
      const conn = await getConnection(id);
      if (!conn) {
        issues.push(`Connection index references non-existent connection: ${id}`);
      }
    } catch {
      issues.push(`Connection index contains invalid ID: ${id}`);
    }
  }

  const inviteIndex = await getInviteIndex();
  for (const token of inviteIndex) {
    try {
      const invite = await getInvite(token);
      if (!invite) {
        issues.push(`Invite index references non-existent invite: ${token}`);
      }
    } catch {
      issues.push(`Invite index contains invalid token: ${token}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// =============================================================================
// RE-EXPORTS for service layer
// =============================================================================

export {
  generateCircleId,
  generateConnectionId,
  generateInviteTokenId as generateInviteToken,
};
