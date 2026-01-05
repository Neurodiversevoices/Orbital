/**
 * CIRCLES ID GENERATION & VALIDATION
 *
 * All IDs are prefixed to prevent cross-domain confusion.
 * Validation is strict — malformed IDs throw, never return false.
 */

import * as Crypto from 'expo-crypto';
import {
  CIRCLE_ID_PREFIX,
  CONNECTION_ID_PREFIX,
  INVITE_TOKEN_PREFIX,
  CirclesLawViolation,
} from './constants';

// =============================================================================
// UUID GENERATION
// =============================================================================

/**
 * Generate a cryptographically secure UUID v4.
 */
async function generateUUID(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);

  // Set version (4) and variant (RFC4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

// =============================================================================
// ID GENERATORS
// =============================================================================

/**
 * Generate a Circle ID (cir_<uuid>).
 */
export async function generateCircleId(): Promise<string> {
  const uuid = await generateUUID();
  return `${CIRCLE_ID_PREFIX}${uuid}`;
}

/**
 * Generate a Connection ID (conn_<uuid>).
 */
export async function generateConnectionId(): Promise<string> {
  const uuid = await generateUUID();
  return `${CONNECTION_ID_PREFIX}${uuid}`;
}

/**
 * Generate an Invite Token (inv_<uuid>).
 */
export async function generateInviteToken(): Promise<string> {
  const uuid = await generateUUID();
  return `${INVITE_TOKEN_PREFIX}${uuid}`;
}

// =============================================================================
// ID VALIDATORS — These THROW, never return false
// =============================================================================

/**
 * Branded type for validated Circle ID.
 */
export type CircleId = string & { __brand: 'CircleId' };

/**
 * Branded type for validated Connection ID.
 */
export type ConnectionId = string & { __brand: 'ConnectionId' };

/**
 * Branded type for validated Invite Token.
 */
export type InviteToken = string & { __brand: 'InviteToken' };

/**
 * UUID v4 pattern (case-insensitive).
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Assert that a string is a valid Circle ID.
 * @throws CirclesLawViolation if invalid
 */
export function assertValidCircleId(id: string): asserts id is CircleId {
  if (typeof id !== 'string') {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Circle ID must be a string, got ${typeof id}`,
      { received: id }
    );
  }

  if (!id.startsWith(CIRCLE_ID_PREFIX)) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Circle ID must start with "${CIRCLE_ID_PREFIX}", got "${id.slice(0, 10)}..."`,
      { received: id }
    );
  }

  const uuid = id.slice(CIRCLE_ID_PREFIX.length);
  if (!UUID_PATTERN.test(uuid)) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Circle ID contains invalid UUID: "${uuid}"`,
      { received: id }
    );
  }
}

/**
 * Assert that a string is a valid Connection ID.
 * @throws CirclesLawViolation if invalid
 */
export function assertValidConnectionId(id: string): asserts id is ConnectionId {
  if (typeof id !== 'string') {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Connection ID must be a string, got ${typeof id}`,
      { received: id }
    );
  }

  if (!id.startsWith(CONNECTION_ID_PREFIX)) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Connection ID must start with "${CONNECTION_ID_PREFIX}", got "${id.slice(0, 10)}..."`,
      { received: id }
    );
  }

  const uuid = id.slice(CONNECTION_ID_PREFIX.length);
  if (!UUID_PATTERN.test(uuid)) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Connection ID contains invalid UUID: "${uuid}"`,
      { received: id }
    );
  }
}

/**
 * Assert that a string is a valid Invite Token.
 * @throws CirclesLawViolation if invalid
 */
export function assertValidInviteToken(token: string): asserts token is InviteToken {
  if (typeof token !== 'string') {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Invite token must be a string, got ${typeof token}`,
      { received: token }
    );
  }

  if (!token.startsWith(INVITE_TOKEN_PREFIX)) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Invite token must start with "${INVITE_TOKEN_PREFIX}", got "${token.slice(0, 10)}..."`,
      { received: token }
    );
  }

  const uuid = token.slice(INVITE_TOKEN_PREFIX.length);
  if (!UUID_PATTERN.test(uuid)) {
    throw new CirclesLawViolation(
      'L4_SOCIAL_FIREWALL',
      `Invite token contains invalid UUID: "${uuid}"`,
      { received: token }
    );
  }
}

// =============================================================================
// SAFE CHECKERS (for conditional logic, not validation)
// =============================================================================

/**
 * Check if a string looks like a Circle ID (non-throwing).
 */
export function isCircleIdFormat(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (!id.startsWith(CIRCLE_ID_PREFIX)) return false;
  return UUID_PATTERN.test(id.slice(CIRCLE_ID_PREFIX.length));
}

/**
 * Check if a string looks like a Connection ID (non-throwing).
 */
export function isConnectionIdFormat(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (!id.startsWith(CONNECTION_ID_PREFIX)) return false;
  return UUID_PATTERN.test(id.slice(CONNECTION_ID_PREFIX.length));
}

/**
 * Check if a string looks like an Invite Token (non-throwing).
 */
export function isInviteTokenFormat(token: string): boolean {
  if (typeof token !== 'string') return false;
  if (!token.startsWith(INVITE_TOKEN_PREFIX)) return false;
  return UUID_PATTERN.test(token.slice(INVITE_TOKEN_PREFIX.length));
}
