/**
 * CIRCLES DATA MODEL — STRICT TYPES
 *
 * "Air Traffic Control for empathy" — NOT a social feed.
 *
 * ============================================================================
 * THE SIX LAWS (ENFORCED BY ARCHITECTURE, NOT POLICY)
 * ============================================================================
 *
 * L1: NO AGGREGATION — Max 25 connections, no dashboards, no analytics
 * L2: NO HISTORY — Ephemeral signals, TTL-based expiration, no archives
 * L3: BIDIRECTIONAL CONSENT — Two-party opt-in, instant revocation
 * L4: SOCIAL FIREWALL — Cryptographic isolation, circles:* namespace only
 * L5: NO HIERARCHY — All connections peer-to-peer, no admin roles
 * L6: SYMMETRICAL VISIBILITY — If A sees B, B sees A (bidirectional)
 *
 * ============================================================================
 * TYPE SYSTEM STRATEGY
 * ============================================================================
 *
 * INTERNAL TYPES: Used within storage/service layer
 *   - May contain metadata (ownerId, timestamps)
 *   - NEVER exposed to external consumers
 *
 * VIEWER-SAFE TYPES: Returned by public APIs
 *   - Minimal surface area
 *   - No internal metadata
 *   - Compile-time narrowing enforced
 *
 * ============================================================================
 */

import {
  DEFAULT_SIGNAL_TTL_MS,
  MAX_SIGNAL_TTL_MS,
  MIN_SIGNAL_TTL_MS,
  CIRCLES_SCHEMA_VERSION,
  CIRCLES_SCOPE,
  CIRCLES_KEY_PREFIX,
} from './constants';

import type { CircleId, ConnectionId, InviteToken } from './ids';

// Re-export constants for backward compatibility
export {
  DEFAULT_SIGNAL_TTL_MS,
  MAX_SIGNAL_TTL_MS,
  MIN_SIGNAL_TTL_MS,
  CIRCLES_SCHEMA_VERSION,
  CIRCLES_SCOPE,
};

// Re-export ID types
export type { CircleId, ConnectionId, InviteToken };

// =============================================================================
// SIGNAL COLORS (Minimum Viable Signal)
// =============================================================================

/**
 * CircleColor represents the ONLY data shared in Circles.
 *
 * - cyan: Resourced / available
 * - amber: Stretched / limited capacity
 * - red: Depleted / not available
 * - unknown: Signal expired or not set
 *
 * INTENTIONALLY EXCLUDES:
 * - Numeric scores
 * - Reasons or tags
 * - Any text or context
 */
export type CircleColor = 'cyan' | 'amber' | 'red' | 'unknown';

/** All valid circle colors as array (for runtime validation) */
export const VALID_CIRCLE_COLORS: readonly CircleColor[] = ['cyan', 'amber', 'red', 'unknown'] as const;

/** Maps internal capacity states to Circle colors (one-way, lossy) */
export const CAPACITY_TO_CIRCLE_COLOR: Readonly<Record<string, CircleColor>> = {
  resourced: 'cyan',
  stretched: 'amber',
  depleted: 'red',
} as const;

// =============================================================================
// VIEWER-SAFE SIGNAL (Strict Minimal Payload)
// =============================================================================

/**
 * ViewerSafeSignal is the ONLY payload visible to signal viewers.
 *
 * This type is intentionally minimal and MUST NOT be extended.
 * Any field added here becomes visible to all connections.
 *
 * @invariant color is one of: 'cyan' | 'amber' | 'red' | 'unknown'
 * @invariant ttlExpiresAt is a valid ISO timestamp
 * @invariant scope is always 'circle'
 * @invariant schemaVersion matches CIRCLES_SCHEMA_VERSION
 */
export interface ViewerSafeSignal {
  /** The ONLY meaningful data: current color */
  readonly color: CircleColor;

  /** ISO timestamp when this signal expires and becomes "unknown" */
  readonly ttlExpiresAt: string;

  /** Hard-coded scope identifier — always "circle" */
  readonly scope: typeof CIRCLES_SCOPE;

  /** Schema version for forward compatibility */
  readonly schemaVersion: typeof CIRCLES_SCHEMA_VERSION;
}

/**
 * CircleSignal is an alias for ViewerSafeSignal.
 * Exists for semantic clarity in service layer.
 */
export type CircleSignal = ViewerSafeSignal;

// =============================================================================
// INTERNAL SIGNAL (Storage Layer Only)
// =============================================================================

/**
 * StoredSignal extends ViewerSafeSignal with internal metadata.
 *
 * @internal This type is NEVER exposed to viewers.
 * @invariant Must strip metadata before returning from public APIs.
 */
export interface StoredSignal extends ViewerSafeSignal {
  /** Owner's local user ID (internal only, never transmitted) */
  readonly ownerId: string;

  /** Internal creation timestamp (never exposed to viewers) */
  readonly _createdAt: number;

  /** Internal update timestamp (never exposed to viewers) */
  readonly _updatedAt: number;
}

/**
 * Type guard to strip internal metadata from StoredSignal.
 * Returns a ViewerSafeSignal with guaranteed no internal fields.
 */
export function toViewerSafe(signal: StoredSignal): ViewerSafeSignal {
  return {
    color: signal.color,
    ttlExpiresAt: signal.ttlExpiresAt,
    scope: signal.scope,
    schemaVersion: signal.schemaVersion,
  };
}

// =============================================================================
// CIRCLE USER (Local Identity Reference)
// =============================================================================

/**
 * CircleUser is a LOCAL identity reference only.
 *
 * This is NOT synced, NOT shared, and contains NO profile data.
 * It exists solely to key local storage and consent records.
 */
export interface CircleUser {
  /** Locally-generated opaque ID (prefixed with cir_) */
  readonly id: CircleId;

  /** User-chosen display hint (shown to connections, optional) */
  readonly displayHint?: string;

  /** When this local identity was created */
  readonly createdAt: number;
}

// =============================================================================
// CONNECTION STATUS (Consent Lifecycle)
// =============================================================================

/**
 * Connection status in the consent lifecycle.
 */
export type ConnectionStatus =
  | 'pending'   // Invite sent, awaiting acceptance
  | 'active'    // Both parties consented, sharing enabled
  | 'revoked'   // Either party revoked, sharing disabled
  | 'blocked';  // One party blocked, no future invites

/** All valid connection statuses as array (for runtime validation) */
export const VALID_CONNECTION_STATUSES: readonly ConnectionStatus[] = [
  'pending',
  'active',
  'revoked',
  'blocked',
] as const;

// =============================================================================
// CIRCLE CONNECTION (Internal Storage Type)
// =============================================================================

/**
 * CircleConnection represents a pairwise consent contract.
 *
 * @internal Contains internal fields not exposed to viewers.
 *
 * KEY INVARIANTS (L3: BIDIRECTIONAL CONSENT):
 * - Requires TWO-STEP HANDSHAKE (invite + accept)
 * - Either party can revoke INSTANTLY
 * - Revocation invalidates sharing in BOTH directions
 * - Blocked status prevents future invites
 */
export interface CircleConnection {
  /** Unique connection ID (prefixed with conn_) */
  readonly id: ConnectionId;

  /** Local user's ID in this connection */
  readonly localUserId: CircleId;

  /** Remote user's ID in this connection */
  readonly remoteUserId: string;

  /** Display hint for the remote user (optional) */
  readonly remoteDisplayHint?: string;

  /** Current connection status */
  readonly status: ConnectionStatus;

  /** When the connection was established (or last status change) */
  readonly statusChangedAt: number;

  /** Who initiated the connection */
  readonly initiatedBy: 'local' | 'remote';

  /** Internal: When this record was created */
  readonly _createdAt: number;
}

// =============================================================================
// VIEWER-SAFE CONNECTION (Public API Response)
// =============================================================================

/**
 * ConnectionSummary is the viewer-safe connection payload.
 * Excludes internal metadata and sensitive IDs.
 */
export interface ConnectionSummary {
  readonly id: string;
  readonly remoteDisplayHint?: string;
  readonly status: ConnectionStatus;
  readonly initiatedBy: 'local' | 'remote';
}

/**
 * Strip internal metadata from CircleConnection.
 * Returns a ConnectionSummary safe for public API responses.
 */
export function toConnectionSummary(conn: CircleConnection): ConnectionSummary {
  return {
    id: conn.id,
    remoteDisplayHint: conn.remoteDisplayHint,
    status: conn.status,
    initiatedBy: conn.initiatedBy,
  };
}

// =============================================================================
// CIRCLE INVITE (Pending Handshake Token)
// =============================================================================

/**
 * CircleInvite is a pending handshake token.
 *
 * INVARIANTS:
 * - One-time use only
 * - Expires after 24 hours
 * - Contains NO sensitive data
 */
export interface CircleInvite {
  /** Unique invite token (prefixed with inv_) */
  readonly token: InviteToken;

  /** ID of the user who created the invite */
  readonly inviterId: CircleId;

  /** Optional hint about intended recipient (not enforced) */
  readonly targetHint?: string;

  /** ISO timestamp when this invite expires */
  readonly expiresAt: string;

  /** Whether this invite has been used */
  readonly used: boolean;

  /** When the invite was created */
  readonly createdAt: number;
}

// =============================================================================
// CIRCLE PERMISSIONS (Explicit and Minimal)
// =============================================================================

/**
 * CirclePermissions defines what a connection can do.
 *
 * DESIGN: Permissions are MINIMAL by default.
 * L5 (NO HIERARCHY): No admin/elevated roles exist.
 */
export interface CirclePermissions {
  /** Can view the remote user's current signal */
  readonly canViewSignal: boolean;

  /** Can share own signal with the remote user */
  readonly canShareSignal: boolean;
}

/** Default permissions for active connections (L6: SYMMETRICAL) */
export const DEFAULT_PERMISSIONS: Readonly<CirclePermissions> = {
  canViewSignal: true,
  canShareSignal: true,
} as const;

/** Permissions when connection is revoked or blocked */
export const REVOKED_PERMISSIONS: Readonly<CirclePermissions> = {
  canViewSignal: false,
  canShareSignal: false,
} as const;

// =============================================================================
// BLOCKED USERS LIST
// =============================================================================

/**
 * BlockedUser represents a permanently blocked user ID.
 * Blocked users cannot send invites.
 */
export interface BlockedUser {
  /** The blocked user's ID */
  readonly blockedUserId: string;

  /** When the block was created */
  readonly blockedAt: number;
}

// =============================================================================
// FORBIDDEN FIELDS (Compile-Time Documentation)
// =============================================================================

/**
 * ForbiddenSignalFields documents fields that MUST NEVER exist in ViewerSafeSignal.
 * This type is never instantiated — it exists for documentation and invariant checks.
 *
 * If you're tempted to add any of these, you're violating the Six Laws.
 */
export type ForbiddenSignalFields = {
  /** FORBIDDEN (L2): Would enable reason inference */
  reasons?: never;
  tags?: never;
  category?: never;
  drivers?: never;

  /** FORBIDDEN (L2): Would enable history reconstruction */
  lastUpdatedAt?: never;
  updatedAt?: never;
  history?: never;
  previousColor?: never;
  changeCount?: never;

  /** FORBIDDEN (L4): Would enable surveillance */
  location?: never;
  deviceId?: never;
  ipAddress?: never;

  /** FORBIDDEN: Would enable quantification */
  score?: never;
  percentage?: never;
  numeric?: never;
  value?: never;

  /** FORBIDDEN: Would enable context inference */
  note?: never;
  text?: never;
  context?: never;
  message?: never;

  /** FORBIDDEN (L4): Would break Social Firewall */
  logRef?: never;
  patternRef?: never;
  vaultRef?: never;
  clinicalRef?: never;
  neuroLogRef?: never;
  energyRef?: never;
  capacityRef?: never;

  /** FORBIDDEN (L1): Would enable aggregation */
  groupId?: never;
  teamId?: never;
  orgId?: never;
  cohortId?: never;

  /** FORBIDDEN (L5): Would enable hierarchy */
  role?: never;
  admin?: never;
  permissions?: never;
  accessLevel?: never;
};

/** List of forbidden field names for runtime checking */
export const FORBIDDEN_FIELD_NAMES: readonly string[] = [
  // L2: Reason inference
  'reasons', 'tags', 'category', 'drivers',
  // L2: History reconstruction
  'lastUpdatedAt', 'updatedAt', 'history', 'previousColor', 'changeCount',
  // L4: Surveillance
  'location', 'deviceId', 'ipAddress',
  // Quantification
  'score', 'percentage', 'numeric', 'value',
  // Context inference
  'note', 'text', 'context', 'message',
  // L4: Social Firewall violation
  'logRef', 'patternRef', 'vaultRef', 'clinicalRef', 'neuroLogRef', 'energyRef', 'capacityRef',
  // L1: Aggregation
  'groupId', 'teamId', 'orgId', 'cohortId',
  // L5: Hierarchy
  'role', 'admin', 'permissions', 'accessLevel',
] as const;

// =============================================================================
// STORAGE KEY TYPES (Social Firewall Enforcement)
// =============================================================================

/**
 * All valid Circles storage key prefixes.
 * Keys MUST start with "circles:" to enforce Social Firewall.
 */
export type CirclesStorageKeyPrefix =
  | 'circles:user'
  | 'circles:signal'
  | 'circles:connection'
  | 'circles:invite'
  | 'circles:blocked';

/**
 * Validates that a storage key belongs to the Circles namespace.
 */
export function isCirclesKey(key: string): boolean {
  return key.startsWith(CIRCLES_KEY_PREFIX);
}

// =============================================================================
// API RESULT TYPES (Viewer-Safe)
// =============================================================================

export interface CreateInviteResult {
  readonly invite: CircleInvite;
  readonly shareableToken: string;
}

export interface AcceptInviteResult {
  readonly connection: ConnectionSummary;
  readonly success: boolean;
  readonly error?: string;
  readonly code?: string; // Security event code for audit trail
}

export interface SignalMap {
  readonly [connectionId: string]: ViewerSafeSignal;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Runtime check if a value is a valid CircleColor.
 */
export function isValidCircleColor(value: unknown): value is CircleColor {
  return typeof value === 'string' && VALID_CIRCLE_COLORS.includes(value as CircleColor);
}

/**
 * Runtime check if a value is a valid ConnectionStatus.
 */
export function isValidConnectionStatus(value: unknown): value is ConnectionStatus {
  return typeof value === 'string' && VALID_CONNECTION_STATUSES.includes(value as ConnectionStatus);
}
