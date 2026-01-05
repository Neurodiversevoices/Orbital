/**
 * CIRCLES GUARDRAILS — HARD STOP ENFORCEMENT
 *
 * These functions enforce the Circles Doctrine at runtime.
 *
 * ============================================================================
 * CRITICAL DESIGN PRINCIPLE
 * ============================================================================
 *
 * These guards DO NOT return boolean (true/false).
 * They THROW ERRORS to immediately abort any transaction that violates
 * the Doctrine. There is no "soft fail" — violations are hard stops.
 *
 * ============================================================================
 * THE LAWS ENFORCED
 * ============================================================================
 *
 * Law 1: NO HISTORY — No arrays, time-series, or historical data
 * Law 2: SYMMETRY — All relationships must be bidirectional
 * Law 5: NO AGGREGATION — Maximum 25 members per circle
 *
 * ============================================================================
 */

import { MAX_CONNECTIONS } from './constants';

// =============================================================================
// ERROR MESSAGES (Standardized Security Violation Format)
// =============================================================================

const SECURITY_VIOLATIONS = {
  HISTORY_PERSISTENCE: 'SECURITY_VIOLATION [Law 1]: History Persistence is Prohibited',
  ASYMMETRIC_SURVEILLANCE: 'SECURITY_VIOLATION [Law 2]: Asymmetric Surveillance Prohibited',
  AGGREGATION_LIMIT: 'SECURITY_VIOLATION [Law 5]: Aggregation Limit Exceeded',
} as const;

// =============================================================================
// HISTORY DETECTION PATTERNS
// =============================================================================

/**
 * Field names that indicate historical data.
 * Presence of any of these is a Law 1 violation.
 */
const HISTORY_FIELD_PATTERNS: readonly string[] = [
  'history',
  'timeline',
  'archive',
  'archives',
  'historical',
  'past',
  'previous',
  'previousState',
  'previousColor',
  'lastState',
  'lastColor',
  'stateHistory',
  'colorHistory',
  'signalHistory',
  'changeLog',
  'changelog',
  'auditLog',
  'auditTrail',
  'events',
  'eventLog',
  'snapshots',
  'revisions',
  'versions',
  'trends',
  'trend',
  'trendData',
  'timeSeries',
  'timeSeriesData',
  'dataPoints',
  'samples',
  'recordings',
  'logs',
] as const;

/**
 * Field names that indicate timestamp-based tracking.
 * These enable history reconstruction and are prohibited.
 */
const TIMESTAMP_FIELD_PATTERNS: readonly string[] = [
  'createdAt',
  'updatedAt',
  'modifiedAt',
  'lastUpdatedAt',
  'lastModifiedAt',
  'deletedAt',
  'archivedAt',
  'timestamp',
  'timestamps',
  'date',
  'dates',
  'time',
  'times',
  'at',
  'when',
] as const;

// =============================================================================
// LAW 1: NO HISTORY — assertNoHistory()
// =============================================================================

/**
 * Asserts that data contains no history, arrays, or time-series data.
 *
 * This is a HARD STOP. Any violation throws immediately.
 *
 * @param data - Any payload to validate
 * @throws Error with SECURITY_VIOLATION message if history detected
 *
 * @example
 * ```typescript
 * // This will throw:
 * assertNoHistory({ history: [] });
 *
 * // This will throw:
 * assertNoHistory([1, 2, 3]);
 *
 * // This will throw:
 * assertNoHistory({ events: [{ timestamp: 123 }] });
 *
 * // This passes:
 * assertNoHistory({ color: 'cyan', ttlExpiresAt: '2030-01-01' });
 * ```
 */
export function assertNoHistory(data: unknown): void {
  // Rule 1: Top-level arrays are history
  if (Array.isArray(data)) {
    throw new Error(SECURITY_VIOLATIONS.HISTORY_PERSISTENCE);
  }

  // Null/undefined/primitives are safe
  if (data === null || data === undefined || typeof data !== 'object') {
    return;
  }

  const obj = data as Record<string, unknown>;

  // Rule 2: Check for history field patterns
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();

    // Check against history patterns
    for (const pattern of HISTORY_FIELD_PATTERNS) {
      if (lowerKey === pattern.toLowerCase() || lowerKey.includes(pattern.toLowerCase())) {
        throw new Error(SECURITY_VIOLATIONS.HISTORY_PERSISTENCE);
      }
    }

    // Check against timestamp patterns (these enable history reconstruction)
    for (const pattern of TIMESTAMP_FIELD_PATTERNS) {
      // Allow 'ttlExpiresAt' specifically (it's for expiration, not history)
      if (key === 'ttlExpiresAt') continue;

      if (lowerKey === pattern.toLowerCase()) {
        throw new Error(SECURITY_VIOLATIONS.HISTORY_PERSISTENCE);
      }
    }
  }

  // Rule 3: Nested arrays are time-series data
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      // Any array with more than 0 items could be history
      if (value.length > 0) {
        // Check if it looks like time-series data
        const looksLikeTimeSeries = value.some(
          (item) =>
            item !== null &&
            typeof item === 'object' &&
            Object.keys(item as object).some((k) => {
              const lower = k.toLowerCase();
              return (
                lower.includes('time') ||
                lower.includes('date') ||
                lower.includes('at') ||
                lower === 'ts' ||
                lower === 't'
              );
            })
        );

        if (looksLikeTimeSeries) {
          throw new Error(SECURITY_VIOLATIONS.HISTORY_PERSISTENCE);
        }

        // Arrays of objects with sequential/ordered data are history
        if (value.length > 1 && value.every((item) => item !== null && typeof item === 'object')) {
          throw new Error(SECURITY_VIOLATIONS.HISTORY_PERSISTENCE);
        }
      }
    }

    // Rule 4: Recursively check nested objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      assertNoHistory(value);
    }
  }
}

// =============================================================================
// LAW 5: NO AGGREGATION — assertNoAggregation()
// =============================================================================

/**
 * Asserts that member count does not exceed the aggregation limit.
 *
 * This is a HARD STOP. Any violation throws immediately.
 *
 * @param memberCount - Number of members in a circle
 * @throws Error with SECURITY_VIOLATION message if limit exceeded
 *
 * @example
 * ```typescript
 * // This will throw:
 * assertNoAggregation(26);
 *
 * // This will throw:
 * assertNoAggregation(100);
 *
 * // This passes:
 * assertNoAggregation(25);
 *
 * // This passes:
 * assertNoAggregation(1);
 * ```
 */
export function assertNoAggregation(memberCount: number): void {
  if (typeof memberCount !== 'number' || isNaN(memberCount)) {
    throw new Error(SECURITY_VIOLATIONS.AGGREGATION_LIMIT);
  }

  if (memberCount < 0) {
    throw new Error(SECURITY_VIOLATIONS.AGGREGATION_LIMIT);
  }

  if (memberCount > MAX_CONNECTIONS) {
    throw new Error(SECURITY_VIOLATIONS.AGGREGATION_LIMIT);
  }
}

// =============================================================================
// LAW 2: SYMMETRY — assertSymmetry()
// =============================================================================

/**
 * Valid relationship types that satisfy symmetry requirement.
 */
type SymmetricRelationship = 'BIDIRECTIONAL';

/**
 * Asserts that a relationship is bidirectional (symmetric).
 *
 * This is a HARD STOP. Any violation throws immediately.
 *
 * Asymmetric relationships enable surveillance — one party can observe
 * another without reciprocal visibility. This is prohibited.
 *
 * @param relationshipType - The type of relationship
 * @throws Error with SECURITY_VIOLATION message if not bidirectional
 *
 * @example
 * ```typescript
 * // This will throw:
 * assertSymmetry('UNIDIRECTIONAL');
 *
 * // This will throw:
 * assertSymmetry('one-way');
 *
 * // This will throw:
 * assertSymmetry('');
 *
 * // This passes:
 * assertSymmetry('BIDIRECTIONAL');
 * ```
 */
export function assertSymmetry(relationshipType: string): void {
  if (typeof relationshipType !== 'string') {
    throw new Error(SECURITY_VIOLATIONS.ASYMMETRIC_SURVEILLANCE);
  }

  if (relationshipType !== 'BIDIRECTIONAL') {
    throw new Error(SECURITY_VIOLATIONS.ASYMMETRIC_SURVEILLANCE);
  }
}

// =============================================================================
// COMBINED GUARDRAIL — assertAllGuardrails()
// =============================================================================

/**
 * Options for combined guardrail check.
 */
interface GuardrailCheckOptions {
  /** Payload data to check for history */
  data?: unknown;
  /** Member count to check against limit */
  memberCount?: number;
  /** Relationship type to check for symmetry */
  relationshipType?: string;
}

/**
 * Runs all applicable guardrail checks based on provided options.
 *
 * This is a HARD STOP. Any violation throws immediately.
 *
 * @param options - Which guardrails to check
 * @throws Error with SECURITY_VIOLATION message if any check fails
 *
 * @example
 * ```typescript
 * // Check all guardrails:
 * assertAllGuardrails({
 *   data: { color: 'cyan' },
 *   memberCount: 5,
 *   relationshipType: 'BIDIRECTIONAL',
 * });
 *
 * // Check only specific guardrails:
 * assertAllGuardrails({ memberCount: 10 });
 * ```
 */
export function assertAllGuardrails(options: GuardrailCheckOptions): void {
  if (options.data !== undefined) {
    assertNoHistory(options.data);
  }

  if (options.memberCount !== undefined) {
    assertNoAggregation(options.memberCount);
  }

  if (options.relationshipType !== undefined) {
    assertSymmetry(options.relationshipType);
  }
}

// =============================================================================
// VIEWER SAFETY — assertViewerSafe()
// =============================================================================

/**
 * Allowed fields in viewer payload.
 */
const VIEWER_ALLOWED_FIELDS: readonly string[] = [
  'connectionId',
  'peerDisplayName',
  'color',
] as const;

/**
 * Valid color values.
 */
const VALID_COLORS: readonly string[] = [
  'cyan',
  'amber',
  'red',
  'unknown',
] as const;

/**
 * Forbidden fields that must NEVER appear in viewer payload.
 */
const VIEWER_FORBIDDEN_FIELDS: readonly string[] = [
  'timestamp',
  'timestamps',
  'ttl',
  'ttlExpiresAt',
  'expiresAt',
  'expiry',
  'updatedAt',
  'createdAt',
  'lastUpdated',
  'updateCadence',
  'frequency',
  'tags',
  'notes',
  'reasons',
  'score',
  'numeric',
  'value',
  'location',
  'device',
  'deviceId',
  'ip',
  'ipAddress',
  'ownerId',
  '_createdAt',
  '_updatedAt',
  '_internal',
  'schemaVersion',
  'scope',
] as const;

/**
 * Asserts that a payload is safe for viewer consumption.
 *
 * This is a HARD STOP. Any violation throws immediately.
 *
 * Viewer payload MUST be:
 * {
 *   connectionId,
 *   peerDisplayName?,
 *   color: "cyan" | "amber" | "red" | "unknown"
 * }
 *
 * @param payload - Payload to validate
 * @throws Error if payload contains forbidden fields or invalid structure
 *
 * @example
 * ```typescript
 * // This will throw (has timestamp):
 * assertViewerSafe({ connectionId: '123', color: 'cyan', timestamp: 123 });
 *
 * // This will throw (has ttl):
 * assertViewerSafe({ connectionId: '123', color: 'cyan', ttlExpiresAt: '...' });
 *
 * // This passes:
 * assertViewerSafe({ connectionId: '123', color: 'cyan' });
 * ```
 */
export function assertViewerSafe(payload: unknown): void {
  if (payload === null || payload === undefined) {
    throw new Error('SECURITY_VIOLATION [Viewer Safety]: Payload is null or undefined');
  }

  if (typeof payload !== 'object') {
    throw new Error('SECURITY_VIOLATION [Viewer Safety]: Payload must be an object');
  }

  if (Array.isArray(payload)) {
    throw new Error('SECURITY_VIOLATION [Viewer Safety]: Payload cannot be an array');
  }

  const obj = payload as Record<string, unknown>;

  // Check for forbidden fields
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();

    // Check against forbidden fields
    for (const forbidden of VIEWER_FORBIDDEN_FIELDS) {
      if (lowerKey === forbidden.toLowerCase()) {
        throw new Error(`SECURITY_VIOLATION [Viewer Safety]: Forbidden field "${key}" detected`);
      }
    }

    // Check for timestamp-like patterns
    if (
      lowerKey.includes('time') ||
      lowerKey.includes('date') ||
      lowerKey.includes('at') && lowerKey.length > 2 ||
      lowerKey.includes('stamp') ||
      lowerKey.includes('ttl') ||
      lowerKey.includes('expir')
    ) {
      throw new Error(`SECURITY_VIOLATION [Viewer Safety]: Timestamp-like field "${key}" detected`);
    }
  }

  // Validate required field: color
  if (!('color' in obj)) {
    throw new Error('SECURITY_VIOLATION [Viewer Safety]: Missing required field "color"');
  }

  if (!VALID_COLORS.includes(obj.color as string)) {
    throw new Error(`SECURITY_VIOLATION [Viewer Safety]: Invalid color "${obj.color}"`);
  }

  // Validate optional fields
  for (const key of Object.keys(obj)) {
    if (!VIEWER_ALLOWED_FIELDS.includes(key)) {
      throw new Error(`SECURITY_VIOLATION [Viewer Safety]: Unexpected field "${key}"`);
    }
  }

  // Validate connectionId if present
  if ('connectionId' in obj && typeof obj.connectionId !== 'string') {
    throw new Error('SECURITY_VIOLATION [Viewer Safety]: connectionId must be a string');
  }

  // Validate peerDisplayName if present
  if ('peerDisplayName' in obj && obj.peerDisplayName !== undefined && typeof obj.peerDisplayName !== 'string') {
    throw new Error('SECURITY_VIOLATION [Viewer Safety]: peerDisplayName must be a string');
  }
}

/**
 * Create a viewer-safe payload from connection data.
 * Strips all internal/forbidden fields.
 */
export function toViewerPayload(
  connectionId: string,
  color: 'cyan' | 'amber' | 'red' | 'unknown',
  peerDisplayName?: string
): { connectionId: string; color: string; peerDisplayName?: string } {
  const payload: { connectionId: string; color: string; peerDisplayName?: string } = {
    connectionId,
    color,
  };

  if (peerDisplayName !== undefined) {
    payload.peerDisplayName = peerDisplayName;
  }

  // Validate before returning
  assertViewerSafe(payload);

  return payload;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { SECURITY_VIOLATIONS };
export type { SymmetricRelationship, GuardrailCheckOptions };
