/**
 * CIRCLES CONSTANTS
 *
 * Compile-time constants that enforce the Six Laws.
 * These values can only be made MORE restrictive, never less.
 */

// =============================================================================
// LAW 1: NO AGGREGATION — Connection limit prevents network effects
// =============================================================================

/**
 * Maximum connections per user.
 *
 * This is a COMPILE-TIME constant. To change it:
 * 1. You must edit this file
 * 2. You can only LOWER this value, never raise it
 * 3. Any attempt to override via runtime parameter will throw
 *
 * 25 is chosen because:
 * - Small enough to prevent social network dynamics
 * - Large enough for close relationships
 * - Matches Dunbar's "sympathy group" (~15) with buffer
 */
export const MAX_CONNECTIONS = 25 as const;

/**
 * Type that enforces MAX_CONNECTIONS cannot be exceeded.
 * Used in validation to ensure compile-time safety.
 */
export type ConnectionCount = number & { __brand: 'ConnectionCount' };

export function assertValidConnectionCount(count: number): asserts count is ConnectionCount {
  if (count > MAX_CONNECTIONS) {
    throw new CirclesLawViolation(
      'L1_NO_AGGREGATION',
      `Connection count ${count} exceeds MAX_CONNECTIONS (${MAX_CONNECTIONS})`
    );
  }
  if (count < 0) {
    throw new CirclesLawViolation(
      'L1_NO_AGGREGATION',
      `Connection count cannot be negative: ${count}`
    );
  }
}

// =============================================================================
// LAW 2: NO HISTORY — TTL ensures signals expire
// =============================================================================

/**
 * Default signal TTL in milliseconds (1 hour).
 * Signals MUST expire. There is no "permanent" signal.
 *
 * DOCTRINE: Six Laws of Circles - Law 2 (NO HISTORY)
 * Hard 1-hour maximum enforced per product doctrine.
 */
export const DEFAULT_SIGNAL_TTL_MS: number = 60 * 60 * 1000;

/**
 * Minimum allowed TTL (15 minutes).
 * Prevents "instant expiry" abuse.
 */
export const MIN_SIGNAL_TTL_MS: number = 15 * 60 * 1000;

/**
 * Maximum allowed TTL (1 hour).
 *
 * DOCTRINE: Six Laws of Circles - Law 2 (NO HISTORY)
 * This is a HARD LIMIT. No signal may persist beyond 1 hour.
 * Any attempt to exceed this is a spec violation.
 */
export const MAX_SIGNAL_TTL_MS: number = 60 * 60 * 1000;

/**
 * Invite expiration in milliseconds (24 hours).
 */
export const INVITE_EXPIRY_MS: number = 24 * 60 * 60 * 1000;

// =============================================================================
// LAW 4: SOCIAL FIREWALL — Namespace isolation
// =============================================================================

/**
 * Storage key prefix for ALL Circles data.
 * No Circles data may exist outside this namespace.
 */
export const CIRCLES_KEY_PREFIX = 'circles:' as const;

/**
 * Forbidden key prefixes that Circles must NEVER touch.
 */
export const FORBIDDEN_KEY_PREFIXES = [
  'orbital:',
  'neuro-logs:',
  'logs:',
  'patterns:',
  'vault:',
  'clinical:',
  'capacity:',
  'energy:',
] as const;

/**
 * Circle ID prefix to distinguish from other domain IDs.
 */
export const CIRCLE_ID_PREFIX = 'cir_' as const;

/**
 * Connection ID prefix.
 */
export const CONNECTION_ID_PREFIX = 'conn_' as const;

/**
 * Invite token prefix.
 */
export const INVITE_TOKEN_PREFIX = 'inv_' as const;

// =============================================================================
// SCHEMA VERSION
// =============================================================================

/**
 * Current schema version for forward compatibility.
 */
export const CIRCLES_SCHEMA_VERSION = 1 as const;

/**
 * Hard-coded scope identifier.
 */
export const CIRCLES_SCOPE = 'circle' as const;

// =============================================================================
// SECURITY EVENT CODES (Auditable, Machine-Readable)
// =============================================================================

/**
 * Standardized security event codes for audit trail.
 * These codes are used in errors and can be parsed programmatically.
 */
export const CircleSecurityEvent = {
  // Rate limiting
  CIRCLES_RATE_LIMITED: 'CIRCLES_RATE_LIMITED',

  // Invite lifecycle
  INVITE_EXPIRED: 'INVITE_EXPIRED',
  INVITE_LOCKED: 'INVITE_LOCKED',
  INVITE_REVOKED: 'INVITE_REVOKED',
  INVITE_NOT_FOUND: 'INVITE_NOT_FOUND',
  INVITE_INVALID_CREDENTIALS: 'INVITE_INVALID_CREDENTIALS',
  INVITE_SELF_REDEEM: 'INVITE_SELF_REDEEM',

  // Handshake
  HANDSHAKE_REJECTED: 'HANDSHAKE_REJECTED',
  HANDSHAKE_ALREADY_CONFIRMED: 'HANDSHAKE_ALREADY_CONFIRMED',
  HANDSHAKE_UNAUTHORIZED: 'HANDSHAKE_UNAUTHORIZED',

  // Law violations (guardrails)
  SECURITY_VIOLATION_HISTORY_DETECTED: 'SECURITY_VIOLATION_HISTORY_DETECTED',
  SECURITY_VIOLATION_AGGREGATION_EXCEEDED: 'SECURITY_VIOLATION_AGGREGATION_EXCEEDED',
  SECURITY_VIOLATION_ASYMMETRIC_RELATION: 'SECURITY_VIOLATION_ASYMMETRIC_RELATION',
  SECURITY_VIOLATION_VIEWER_UNSAFE: 'SECURITY_VIOLATION_VIEWER_UNSAFE',

  // Connection limits
  CONNECTION_LIMIT_REACHED: 'CONNECTION_LIMIT_REACHED',
  CONNECTION_BLOCKED_USER: 'CONNECTION_BLOCKED_USER',
} as const;

export type CircleSecurityEventType = typeof CircleSecurityEvent[keyof typeof CircleSecurityEvent];

/**
 * Error thrown for security events.
 * Contains a machine-readable code for audit systems.
 */
export class CircleSecurityError extends Error {
  public readonly code: CircleSecurityEventType;
  public readonly context: Record<string, unknown>;

  constructor(
    code: CircleSecurityEventType,
    message: string,
    context: Record<string, unknown> = {}
  ) {
    super(`[${code}] ${message}`);
    this.name = 'CircleSecurityError';
    this.code = code;
    this.context = context;
  }
}

// =============================================================================
// LAW VIOLATION ERROR CLASS
// =============================================================================

/**
 * Error thrown when a Circles Law is violated.
 * This error should NEVER be caught and suppressed.
 */
export class CirclesLawViolation extends Error {
  public readonly law:
    | 'L1_NO_AGGREGATION'
    | 'L2_NO_HISTORY'
    | 'L3_BIDIRECTIONAL_CONSENT'
    | 'L4_SOCIAL_FIREWALL'
    | 'L5_NO_HIERARCHY'
    | 'L6_SYMMETRICAL_VISIBILITY';
  public readonly context: Record<string, unknown>;

  constructor(
    law:
      | 'L1_NO_AGGREGATION'
      | 'L2_NO_HISTORY'
      | 'L3_BIDIRECTIONAL_CONSENT'
      | 'L4_SOCIAL_FIREWALL'
      | 'L5_NO_HIERARCHY'
      | 'L6_SYMMETRICAL_VISIBILITY',
    message: string,
    context: Record<string, unknown> = {}
  ) {
    super(`[CIRCLES LAW ${law}] ${message}`);
    this.name = 'CirclesLawViolation';
    this.law = law;
    this.context = context;
  }
}
