/**
 * CIRCLES MODULE — SIX LAWS ENFORCED
 *
 * "Air Traffic Control for empathy" — NOT a social feed.
 *
 * Exports the public API for the Circles system.
 * Internal storage and invariants are not directly exported.
 *
 * ============================================================================
 * THE SIX LAWS
 * ============================================================================
 *
 * L1: NO AGGREGATION — Max 25 connections, no analytics
 * L2: NO HISTORY — Ephemeral signals with TTL
 * L3: BIDIRECTIONAL CONSENT — Invite/accept handshake
 * L4: SOCIAL FIREWALL — circles:* namespace isolation
 * L5: NO HIERARCHY — Peer-to-peer only
 * L6: SYMMETRICAL VISIBILITY — Bidirectional viewing
 *
 * ============================================================================
 */

// =============================================================================
// PUBLIC API (Service Layer)
// =============================================================================

export {
  // Initialization
  circlesInit,
  circlesGetMyId,

  // Connections (L3, L6)
  circlesRevokeConnection,
  circlesBlockUser,
  circlesUnblockUser,
  circlesGetMyConnections,
  circlesGetActiveConnectionCount,
  circlesGetBlockedUsers,

  // Signals (L2: NO HISTORY, L4: SOCIAL FIREWALL)
  circlesSetMySignal,
  circlesSetMySignalFromCapacity,
  circlesClearMySignal,
  circlesGetMySignal,
  circlesGetSignalsForMe,
  circlesGetSignalForConnection,

  // Maintenance
  circlesRunCleanup,
  circlesWipeAll,
  circlesGetStorageSummary,
  circlesVerifyFirewall,
  circlesVerifyIntegrity,

  // Constants
  DEFAULT_SIGNAL_TTL_MS,
  MIN_SIGNAL_TTL_MS,
  MAX_SIGNAL_TTL_MS,
  INVITE_EXPIRY_MS,
  MAX_CONNECTIONS,
  CIRCLES_SCOPE,
  CIRCLES_SCHEMA_VERSION,

  // Error classes
  CirclesLawViolation,
  CircleSecurityError,
  CircleSecurityEvent,
} from './service';

// =============================================================================
// PUBLIC TYPES
// =============================================================================

export type {
  CircleColor,
  CircleSignal,
  ViewerSafeSignal,
  CircleConnection,
  ConnectionSummary,
  SignalMap,
} from './service';

// Additional types needed by consumers
export type {
  CircleUser,
  CircleInvite,
  CirclePermissions,
  ConnectionStatus,
  StoredSignal,
  BlockedUser,
  CircleId,
  ConnectionId,
  InviteToken,
} from './types';

// =============================================================================
// SELF-TEST (Development/Verification)
// =============================================================================

export {
  runCirclesSelfTest,
  runCirclesSelfTestWithLogging,
  verifyCirclesInvariants,
} from './selfTest';

// =============================================================================
// ID UTILITIES (For advanced use cases)
// =============================================================================

export {
  generateCircleId,
  generateConnectionId,
  generateInviteToken,
  assertValidCircleId,
  assertValidConnectionId,
  assertValidInviteToken,
  isCircleIdFormat,
  isConnectionIdFormat,
  isInviteTokenFormat,
} from './ids';

// =============================================================================
// INVARIANT VALIDATORS (For testing/debugging)
// =============================================================================

export {
  validateViewerSignal,
  validateStoredSignal,
  validateConnection,
  validateInvite,
  isSignalExpired,
  toValidatedViewerSignal,
} from './invariants';

// =============================================================================
// GUARDRAILS — HARD STOP ENFORCEMENT
// =============================================================================

export {
  assertNoHistory,
  assertNoAggregation,
  assertSymmetry,
  assertAllGuardrails,
  assertViewerSafe,
  toViewerPayload,
  SECURITY_VIOLATIONS,
} from './guardrails';

export type {
  SymmetricRelationship,
  GuardrailCheckOptions,
} from './guardrails';

// =============================================================================
// INVITES — VIRAL HANDSHAKE (L3: BIDIRECTIONAL CONSENT)
// =============================================================================

export {
  // Create invites
  createInvite,
  extendInvite,
  cancelInvite,

  // Redeem invites
  redeemViaQR,
  redeemViaCode,
  parseQRDeepLink,

  // Confirm/reject (creator action)
  confirmInvite,
  rejectInvite,

  // Query
  getInvitesAwaitingConfirmation,
  getMyPendingInvitesList,

  // Cleanup
  cleanupExpiredInvites,
} from './invites';

export type {
  InviteStatus,
  CirclesInvite,
  InviteQRPayload,
  CreateInviteResult,
  RedeemResult,
  ConfirmResult,
} from './invites';
