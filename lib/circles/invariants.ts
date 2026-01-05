/**
 * CIRCLES INVARIANTS — SIX LAWS ENFORCEMENT LAYER
 *
 * Runtime guards that ENFORCE the Six Laws.
 * These are not suggestions — violations THROW immediately.
 *
 * ============================================================================
 * THE SIX LAWS (ENFORCED HERE)
 * ============================================================================
 *
 * L1: NO AGGREGATION — assertNoAggregation(), assertValidConnectionCount()
 * L2: NO HISTORY — assertNoHistory(), assertValidTTL()
 * L3: BIDIRECTIONAL CONSENT — assertValidConsent(), assertInviteValid()
 * L4: SOCIAL FIREWALL — assertCirclesNamespace(), assertSignalClean()
 * L5: NO HIERARCHY — assertNoHierarchy()
 * L6: SYMMETRICAL VISIBILITY — assertSymmetricalVisibility()
 *
 * ============================================================================
 */

import {
  MAX_CONNECTIONS,
  DEFAULT_SIGNAL_TTL_MS,
  MIN_SIGNAL_TTL_MS,
  MAX_SIGNAL_TTL_MS,
  CIRCLES_KEY_PREFIX,
  CIRCLES_SCOPE,
  CIRCLES_SCHEMA_VERSION,
  FORBIDDEN_KEY_PREFIXES,
  CirclesLawViolation,
  assertValidConnectionCount,
} from './constants';

import {
  ViewerSafeSignal,
  StoredSignal,
  CircleConnection,
  CircleInvite,
  CircleColor,
  ConnectionStatus,
  FORBIDDEN_FIELD_NAMES,
  VALID_CIRCLE_COLORS,
  VALID_CONNECTION_STATUSES,
  isCirclesKey,
  toViewerSafe,
} from './types';

import {
  assertValidCircleId,
  assertValidConnectionId,
  assertValidInviteToken,
  isCircleIdFormat,
  isConnectionIdFormat,
  isInviteTokenFormat,
} from './ids';

// Re-export for convenience
export { CirclesLawViolation } from './constants';

// =============================================================================
// L1: NO AGGREGATION — Max 25 connections, no dashboards, no analytics
// =============================================================================

/**
 * Asserts that no aggregation is being attempted.
 *
 * @throws CirclesLawViolation if connection count exceeds MAX_CONNECTIONS
 */
export function assertNoAggregation(
  connectionIds: string[],
  operation: string
): void {
  if (connectionIds.length > MAX_CONNECTIONS) {
    throw new CirclesLawViolation(
      'L1_NO_AGGREGATION',
      `Operation "${operation}" involves ${connectionIds.length} connections, exceeding limit of ${MAX_CONNECTIONS}. This prevents drift into social network patterns.`,
      { connectionCount: connectionIds.length, limit: MAX_CONNECTIONS }
    );
  }
}

/**
 * Asserts that a data structure is not an aggregate.
 * Prevents accidental introduction of analytics objects.
 *
 * @throws CirclesLawViolation if aggregate patterns detected
 */
export function assertNotAggregate(data: unknown, label: string): void {
  if (data === null || typeof data !== 'object') return;

  const obj = data as Record<string, unknown>;

  // Forbidden aggregate patterns
  const aggregatePatterns = [
    'count',
    'total',
    'sum',
    'average',
    'mean',
    'median',
    'distribution',
    'breakdown',
    'statistics',
    'stats',
    'analytics',
    'insights',
    'trend',
    'trends',
    'ranking',
    'rankings',
    'leaderboard',
    'dashboard',
    'cohort',
    'aggregate',
    'grouped',
    'summary',
  ];

  for (const pattern of aggregatePatterns) {
    if (pattern in obj) {
      throw new CirclesLawViolation(
        'L1_NO_AGGREGATION',
        `Data structure "${label}" contains aggregate field "${pattern}". Aggregation is forbidden.`,
        { field: pattern }
      );
    }
  }
}

// =============================================================================
// L2: NO HISTORY — Ephemeral signals, TTL-based expiration
// =============================================================================

/**
 * Asserts that a TTL value is within allowed bounds.
 *
 * @throws CirclesLawViolation if TTL is invalid
 */
export function assertValidTTL(ttlMs: number): void {
  if (typeof ttlMs !== 'number' || isNaN(ttlMs)) {
    throw new CirclesLawViolation(
      'L2_NO_HISTORY',
      `TTL must be a number, got ${typeof ttlMs}`,
      { ttl: ttlMs }
    );
  }

  if (ttlMs < MIN_SIGNAL_TTL_MS) {
    throw new CirclesLawViolation(
      'L2_NO_HISTORY',
      `TTL ${ttlMs}ms is below minimum ${MIN_SIGNAL_TTL_MS}ms (15 minutes). Prevents instant expiry abuse.`,
      { ttl: ttlMs, minimum: MIN_SIGNAL_TTL_MS }
    );
  }

  if (ttlMs > MAX_SIGNAL_TTL_MS) {
    throw new CirclesLawViolation(
      'L2_NO_HISTORY',
      `TTL ${ttlMs}ms exceeds maximum ${MAX_SIGNAL_TTL_MS}ms (4 hours). Prevents "permanent" signals.`,
      { ttl: ttlMs, maximum: MAX_SIGNAL_TTL_MS }
    );
  }
}

/**
 * Asserts that no history fields exist in a data structure.
 *
 * @throws CirclesLawViolation if history fields detected
 */
export function assertNoHistory(data: unknown, label: string): void {
  if (data === null || typeof data !== 'object') return;

  const obj = data as Record<string, unknown>;

  // Forbidden history field patterns
  const historyPatterns = [
    'lastUpdatedAt',
    'updatedAt',
    'history',
    'previousColor',
    'changeCount',
    'timeline',
    'trend',
    'trends',
    'archive',
    'archived',
    'previous',
    'historical',
  ];

  for (const pattern of historyPatterns) {
    if (pattern in obj) {
      throw new CirclesLawViolation(
        'L2_NO_HISTORY',
        `Data structure "${label}" contains history field "${pattern}". History is forbidden.`,
        { field: pattern }
      );
    }
  }

  // Check for array fields that might contain history
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value) && value.length > 1) {
      // Arrays with multiple items might be history — check if they look like time series
      const hasTimestamps = value.some(
        (item) =>
          item &&
          typeof item === 'object' &&
          ('timestamp' in item || 'at' in item || 'date' in item || 'time' in item)
      );

      if (hasTimestamps) {
        throw new CirclesLawViolation(
          'L2_NO_HISTORY',
          `Data structure "${label}" contains array field "${key}" that appears to be a time series. History is forbidden.`,
          { field: key, itemCount: value.length }
        );
      }
    }
  }
}

/**
 * Asserts that a viewer payload contains no history metadata.
 *
 * @throws CirclesLawViolation if timestamp fields detected
 */
export function assertViewerPayloadNoHistory(signal: ViewerSafeSignal): void {
  const obj = signal as unknown as Record<string, unknown>;
  const forbidden = ['_createdAt', '_updatedAt', 'createdAt', 'lastUpdatedAt', 'updatedAt'];

  for (const field of forbidden) {
    if (field in obj) {
      throw new CirclesLawViolation(
        'L2_NO_HISTORY',
        `Viewer payload contains timestamp field "${field}". This enables history inference.`,
        { field }
      );
    }
  }
}

/**
 * Checks if a signal has expired based on TTL.
 */
export function isSignalExpired(signal: ViewerSafeSignal): boolean {
  const now = Date.now();
  const expiresAt = new Date(signal.ttlExpiresAt).getTime();
  return now > expiresAt;
}

// =============================================================================
// L3: BIDIRECTIONAL CONSENT — Two-party opt-in, instant revocation
// =============================================================================

/**
 * Asserts that a connection has valid bidirectional consent.
 *
 * @throws CirclesLawViolation if consent invariants violated
 */
export function assertValidConsent(connection: CircleConnection): void {
  // Both user IDs must be present
  if (!connection.localUserId || !connection.remoteUserId) {
    throw new CirclesLawViolation(
      'L3_BIDIRECTIONAL_CONSENT',
      'Connection missing user IDs. Both parties must be identified.',
      { connection }
    );
  }

  // Self-connections are forbidden
  if (connection.localUserId === connection.remoteUserId) {
    throw new CirclesLawViolation(
      'L3_BIDIRECTIONAL_CONSENT',
      'Self-connections are forbidden.',
      { userId: connection.localUserId }
    );
  }

  // Status must be explicit
  if (!VALID_CONNECTION_STATUSES.includes(connection.status)) {
    throw new CirclesLawViolation(
      'L3_BIDIRECTIONAL_CONSENT',
      `Invalid connection status: "${connection.status}". Must be: ${VALID_CONNECTION_STATUSES.join(', ')}`,
      { status: connection.status }
    );
  }

  // initiatedBy must be explicit
  if (connection.initiatedBy !== 'local' && connection.initiatedBy !== 'remote') {
    throw new CirclesLawViolation(
      'L3_BIDIRECTIONAL_CONSENT',
      `Invalid initiatedBy value: "${connection.initiatedBy}". Must be "local" or "remote".`,
      { initiatedBy: connection.initiatedBy }
    );
  }
}

/**
 * Asserts that an invite is valid for acceptance.
 *
 * @throws CirclesLawViolation if invite is invalid
 */
export function assertInviteValid(invite: CircleInvite): void {
  // Validate token format
  assertValidInviteToken(invite.token);

  if (invite.used) {
    throw new CirclesLawViolation(
      'L3_BIDIRECTIONAL_CONSENT',
      'Invite has already been used. One-time use only.',
      { token: invite.token }
    );
  }

  const now = Date.now();
  const expiresAt = new Date(invite.expiresAt).getTime();

  if (now > expiresAt) {
    throw new CirclesLawViolation(
      'L3_BIDIRECTIONAL_CONSENT',
      'Invite has expired.',
      { expiresAt: invite.expiresAt, now: new Date(now).toISOString() }
    );
  }
}

/**
 * Asserts that a revocation is complete (no lingering signals).
 *
 * @throws CirclesLawViolation if signals remain after revocation
 */
export function assertRevocationComplete(
  connection: CircleConnection,
  signalCount: number
): void {
  if (connection.status === 'revoked' || connection.status === 'blocked') {
    if (signalCount > 0) {
      throw new CirclesLawViolation(
        'L3_BIDIRECTIONAL_CONSENT',
        'Revoked connection still has associated signals. Revocation must delete all signals.',
        { connectionId: connection.id, signalCount }
      );
    }
  }
}

// =============================================================================
// L4: SOCIAL FIREWALL — Cryptographic isolation, circles:* namespace only
// =============================================================================

/**
 * Asserts that a storage key is within the Circles namespace.
 *
 * @throws CirclesLawViolation if key is outside namespace
 */
export function assertCirclesNamespace(key: string): void {
  if (!isCirclesKey(key)) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Storage key "${key}" is outside Circles namespace. All keys must start with "${CIRCLES_KEY_PREFIX}".`,
      { key }
    );
  }

  // Also ensure no forbidden prefixes appear after circles:
  for (const forbidden of FORBIDDEN_KEY_PREFIXES) {
    if (key.includes(forbidden)) {
      throw new CirclesLawViolation(
        'L4_SOCIAL_FIREWALL',
        `Storage key "${key}" contains forbidden prefix "${forbidden}".`,
        { key, forbidden }
      );
    }
  }
}

/**
 * Deep scans an object for forbidden fields.
 *
 * @throws CirclesLawViolation if any forbidden field detected
 */
export function assertNoForbiddenFields(data: unknown, label: string): void {
  if (data === null || typeof data !== 'object') return;

  const obj = data as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    // Check against forbidden field names
    if (FORBIDDEN_FIELD_NAMES.includes(key)) {
      throw new CirclesLawViolation(
        'L4_SOCIAL_FIREWALL',
        `Data structure "${label}" contains forbidden field "${key}".`,
        { field: key }
      );
    }

    // Recursively check nested objects
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      assertNoForbiddenFields(value, `${label}.${key}`);
    }

    // Check array items
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === 'object') {
          assertNoForbiddenFields(item, `${label}.${key}[${index}]`);
        }
      });
    }
  }
}

/**
 * Asserts that a signal contains no forbidden fields and has valid structure.
 *
 * @throws CirclesLawViolation if signal is invalid
 */
export function assertSignalClean(signal: unknown, label: string): void {
  if (signal === null || typeof signal !== 'object') {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Signal "${label}" is not a valid object.`,
      { signal }
    );
  }

  const obj = signal as Record<string, unknown>;

  // Deep scan for forbidden fields
  assertNoForbiddenFields(obj, label);

  // Verify required fields
  if (!('color' in obj)) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Signal "${label}" missing required "color" field.`,
      { signal: obj }
    );
  }

  // Verify color is valid
  if (!VALID_CIRCLE_COLORS.includes(obj.color as CircleColor)) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Signal "${label}" has invalid color: "${obj.color}". Must be: ${VALID_CIRCLE_COLORS.join(', ')}`,
      { color: obj.color }
    );
  }

  // Verify scope is correct
  if ('scope' in obj && obj.scope !== CIRCLES_SCOPE) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Signal "${label}" has invalid scope: "${obj.scope}". Must be "${CIRCLES_SCOPE}".`,
      { scope: obj.scope }
    );
  }

  // Verify schemaVersion
  if ('schemaVersion' in obj && obj.schemaVersion !== CIRCLES_SCHEMA_VERSION) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Signal "${label}" has invalid schemaVersion: ${obj.schemaVersion}. Must be ${CIRCLES_SCHEMA_VERSION}.`,
      { schemaVersion: obj.schemaVersion }
    );
  }
}

/**
 * Asserts that no external data references exist.
 *
 * @throws CirclesLawViolation if external references detected
 */
export function assertNoExternalReferences(data: unknown, label: string): void {
  if (data === null || typeof data !== 'object') return;

  const obj = data as Record<string, unknown>;

  // Check for any field containing external domain hints
  const externalPatterns = [
    'log', 'pattern', 'vault', 'clinical', 'capacity', 'energy',
    'neuro', 'orbital', 'diagnostic', 'medical', 'treatment',
  ];

  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    for (const pattern of externalPatterns) {
      if (lowerKey.includes(pattern) && !lowerKey.includes('circle')) {
        throw new CirclesLawViolation(
          'L4_SOCIAL_FIREWALL',
          `Data structure "${label}" contains field "${key}" which may reference external Orbital data.`,
          { field: key }
        );
      }
    }
  }
}

// =============================================================================
// L5: NO HIERARCHY — All connections peer-to-peer, no admin roles
// =============================================================================

/**
 * Asserts that no hierarchy exists in connection or user data.
 *
 * @throws CirclesLawViolation if hierarchy patterns detected
 */
export function assertNoHierarchy(data: unknown, label: string): void {
  if (data === null || typeof data !== 'object') return;

  const obj = data as Record<string, unknown>;

  // Forbidden hierarchy patterns
  const hierarchyPatterns = [
    'role',
    'admin',
    'moderator',
    'owner',
    'manager',
    'supervisor',
    'accessLevel',
    'permissionLevel',
    'tier',
    'rank',
    'privilege',
    'authority',
    'canManage',
    'canAdmin',
    'isAdmin',
    'isOwner',
  ];

  for (const pattern of hierarchyPatterns) {
    if (pattern in obj) {
      throw new CirclesLawViolation(
        'L5_NO_HIERARCHY',
        `Data structure "${label}" contains hierarchy field "${pattern}". All connections are peer-to-peer.`,
        { field: pattern }
      );
    }
  }
}

// =============================================================================
// L6: SYMMETRICAL VISIBILITY — If A sees B, B sees A
// =============================================================================

/**
 * Asserts that visibility is symmetrical between two connections.
 *
 * @throws CirclesLawViolation if visibility is asymmetrical
 */
export function assertSymmetricalVisibility(
  connectionA: CircleConnection,
  connectionB: CircleConnection | null
): void {
  // If A sees B, B must see A with same status
  if (connectionA.status === 'active') {
    if (!connectionB) {
      throw new CirclesLawViolation(
        'L6_SYMMETRICAL_VISIBILITY',
        'Active connection has no reciprocal. If A sees B, B must see A.',
        { connectionId: connectionA.id }
      );
    }

    if (connectionB.status !== 'active') {
      throw new CirclesLawViolation(
        'L6_SYMMETRICAL_VISIBILITY',
        `Asymmetrical visibility: A is "${connectionA.status}" but B is "${connectionB.status}".`,
        { connectionAId: connectionA.id, connectionBId: connectionB.id }
      );
    }
  }
}

/**
 * Asserts that permissions are symmetrical (canView === canShare for both).
 *
 * @throws CirclesLawViolation if permissions are asymmetrical
 */
export function assertSymmetricalPermissions(
  canViewA: boolean,
  canShareA: boolean,
  canViewB: boolean,
  canShareB: boolean
): void {
  if (canViewA !== canViewB || canShareA !== canShareB) {
    throw new CirclesLawViolation(
      'L6_SYMMETRICAL_VISIBILITY',
      'Asymmetrical permissions detected. Both parties must have identical view/share rights.',
      { canViewA, canShareA, canViewB, canShareB }
    );
  }
}

// =============================================================================
// COMPOSITE VALIDATORS
// =============================================================================

/**
 * Validates a signal for storage (internal use).
 * Allows internal fields like ownerId and _createdAt.
 */
export function validateStoredSignal(signal: StoredSignal): void {
  assertSignalClean(signal, 'StoredSignal');
  assertNoHistory(signal, 'StoredSignal');
  assertNoExternalReferences(signal, 'StoredSignal');
  assertNoHierarchy(signal, 'StoredSignal');
  assertNotAggregate(signal, 'StoredSignal');

  // Stored signals MUST have ownerId
  if (!signal.ownerId) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      'StoredSignal missing ownerId.',
      { signal }
    );
  }

  // Validate TTL
  const ttlMs = new Date(signal.ttlExpiresAt).getTime() - Date.now();
  // Allow expired signals to be read (they'll return 'unknown')
  if (ttlMs > 0) {
    assertValidTTL(ttlMs);
  }
}

/**
 * Validates a signal for transmission to viewers.
 * This is the STRICTEST validation — no internal fields allowed.
 *
 * @throws CirclesLawViolation if signal fails any check
 */
export function validateViewerSignal(signal: ViewerSafeSignal): void {
  assertSignalClean(signal, 'ViewerSignal');
  assertViewerPayloadNoHistory(signal);
  assertNoHistory(signal, 'ViewerSignal');
  assertNoExternalReferences(signal, 'ViewerSignal');
  assertNoHierarchy(signal, 'ViewerSignal');
  assertNotAggregate(signal, 'ViewerSignal');

  // Viewer signals must NOT have internal fields
  const obj = signal as unknown as Record<string, unknown>;
  const internalFields = ['ownerId', '_createdAt', '_updatedAt', '_internal'];
  for (const field of internalFields) {
    if (field in obj) {
      throw new CirclesLawViolation(
        'L4_SOCIAL_FIREWALL',
        `Viewer signal contains internal field "${field}". This is a data leak.`,
        { field }
      );
    }
  }

  // Verify required fields exist with correct types
  if (typeof signal.color !== 'string') {
    throw new CirclesLawViolation('L4_SOCIAL_FIREWALL', 'color must be a string', {});
  }
  if (typeof signal.ttlExpiresAt !== 'string') {
    throw new CirclesLawViolation('L4_SOCIAL_FIREWALL', 'ttlExpiresAt must be a string', {});
  }
  if (signal.scope !== CIRCLES_SCOPE) {
    throw new CirclesLawViolation('L4_SOCIAL_FIREWALL', `scope must be "${CIRCLES_SCOPE}"`, {});
  }
  if (signal.schemaVersion !== CIRCLES_SCHEMA_VERSION) {
    throw new CirclesLawViolation('L4_SOCIAL_FIREWALL', `schemaVersion must be ${CIRCLES_SCHEMA_VERSION}`, {});
  }
}

/**
 * Validates a connection for storage.
 */
export function validateConnection(connection: CircleConnection): void {
  assertValidConsent(connection);
  assertNoHistory(connection, 'CircleConnection');
  assertNoExternalReferences(connection, 'CircleConnection');
  assertNoHierarchy(connection, 'CircleConnection');
  assertNotAggregate(connection, 'CircleConnection');

  // Validate IDs
  assertValidConnectionId(connection.id);
  assertValidCircleId(connection.localUserId);
}

/**
 * Validates an invite for transmission.
 */
export function validateInvite(invite: CircleInvite): void {
  assertInviteValid(invite);
  assertNoHistory(invite, 'CircleInvite');
  assertNoExternalReferences(invite, 'CircleInvite');
  assertNoHierarchy(invite, 'CircleInvite');
  assertNotAggregate(invite, 'CircleInvite');
}

/**
 * Strips a StoredSignal to ViewerSafeSignal and validates it.
 * Use this to safely convert internal storage to viewer payload.
 */
export function toValidatedViewerSignal(stored: StoredSignal): ViewerSafeSignal {
  const viewerSignal = toViewerSafe(stored);
  validateViewerSignal(viewerSignal);
  return viewerSignal;
}
