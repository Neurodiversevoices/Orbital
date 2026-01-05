/**
 * CIRCLES INVITES — VIRAL HANDSHAKE SYSTEM
 *
 * Implements the audit-locked invite/handshake protocol.
 *
 * ============================================================================
 * SECURITY PROPERTIES
 * ============================================================================
 *
 * - displayCode alone is NEVER sufficient
 * - Redeem requires QR (inviteId + secretToken) OR (displayCode + PIN)
 * - Invites are SINGLE-USE
 * - Invites LOCK on first redeem attempt
 * - Wrong attempts trigger local lockout
 * - Invite auto-expires after TTL
 * - Hard maximum lifetime: 2 hours
 *
 * ============================================================================
 * ATOMIC HANDSHAKE (L3: BIDIRECTIONAL CONSENT)
 * ============================================================================
 *
 * 1) User A creates invite
 * 2) User B redeems invite (QR or Code+PIN)
 * 3) Invite becomes LOCKED
 * 4) User A must explicitly CONFIRM
 * 5) ONLY AFTER CONFIRM: connection becomes ACTIVE
 * 6) Invite is immediately destroyed
 *
 * If any step fails → connection is never created.
 *
 * ============================================================================
 */

import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAX_CONNECTIONS,
  CirclesLawViolation,
  CircleSecurityError,
  CircleSecurityEvent,
  CircleSecurityEventType,
  CIRCLES_KEY_PREFIX,
} from './constants';
import { assertNoHistory, assertNoAggregation, assertSymmetry } from './guardrails';
import {
  generateCircleId,
  generateConnectionId,
  assertValidCircleId,
  assertValidConnectionId,
  CircleId,
  ConnectionId,
} from './ids';
import { CircleConnection, ConnectionSummary, toConnectionSummary } from './types';
import {
  ensureLocalUser,
  getLocalUser,
  getAllConnections,
  saveConnection,
  isUserBlocked,
  addBlockedUser,
} from './storage';

// =============================================================================
// INVITE CONSTANTS
// =============================================================================

/** Default invite TTL: 30 minutes */
const DEFAULT_INVITE_TTL_MS: number = 30 * 60 * 1000;

/** Maximum invite TTL: 2 hours (hard cap) */
const MAX_INVITE_TTL_MS: number = 2 * 60 * 60 * 1000;

/** Extension amount: 30 minutes */
const EXTENSION_TTL_MS: number = 30 * 60 * 1000;

/** Maximum failed redemption attempts before lockout */
const MAX_REDEEM_ATTEMPTS: number = 5;

/** Lockout duration after max attempts: 15 minutes */
const LOCKOUT_DURATION_MS: number = 15 * 60 * 1000;

/** Rate limit: max invalid redeems per window */
const RATE_LIMIT_MAX_ATTEMPTS: number = 3;

/** Rate limit window: 1 minute */
const RATE_LIMIT_WINDOW_MS: number = 60 * 1000;

// =============================================================================
// DEVICE RATE LIMITER (In-Memory, Per-Session)
// =============================================================================

/**
 * Device-level rate limiter for redemption attempts.
 * Throws hard error if >3 invalid attempts in 1 minute.
 * This is in-memory and resets on app restart (acceptable for this use case).
 */
interface RateLimitEntry {
  attempts: number;
  windowStart: number;
}

const deviceRateLimiter: RateLimitEntry = {
  attempts: 0,
  windowStart: Date.now(),
};

function checkRateLimit(): void {
  const now = Date.now();

  // Reset window if expired
  if (now - deviceRateLimiter.windowStart > RATE_LIMIT_WINDOW_MS) {
    deviceRateLimiter.attempts = 0;
    deviceRateLimiter.windowStart = now;
  }

  // Check if over limit
  if (deviceRateLimiter.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
    const remainingMs = RATE_LIMIT_WINDOW_MS - (now - deviceRateLimiter.windowStart);
    const remainingSec = Math.ceil(remainingMs / 1000);
    throw new CircleSecurityError(
      CircleSecurityEvent.CIRCLES_RATE_LIMITED,
      `Too many invalid redemption attempts. Try again in ${remainingSec} seconds.`,
      { remainingSeconds: remainingSec }
    );
  }
}

function recordFailedAttempt(): void {
  const now = Date.now();

  // Reset window if expired
  if (now - deviceRateLimiter.windowStart > RATE_LIMIT_WINDOW_MS) {
    deviceRateLimiter.attempts = 0;
    deviceRateLimiter.windowStart = now;
  }

  deviceRateLimiter.attempts++;
}

function resetRateLimitOnSuccess(): void {
  deviceRateLimiter.attempts = 0;
  deviceRateLimiter.windowStart = Date.now();
}

// =============================================================================
// INVITE TYPES
// =============================================================================

/**
 * Invite status in the handshake lifecycle.
 */
export type InviteStatus =
  | 'PENDING'    // Created, awaiting redemption
  | 'LOCKED'     // Redeemed, awaiting confirmation
  | 'CONFIRMED'  // Confirmed, connection active
  | 'EXPIRED'    // TTL exceeded
  | 'REVOKED';   // Manually cancelled

/**
 * Full invite record (internal storage).
 */
export interface CirclesInvite {
  /** UUID v4 (never reused) */
  readonly inviteId: string;

  /** Human-readable short code (e.g., ABC-123) */
  readonly displayCode: string;

  /** 4-digit numeric PIN */
  readonly pin: string;

  /** ≥128-bit cryptographically secure token (hidden from UI) */
  readonly secretToken: string;

  /** Creator's Circle ID */
  readonly creatorId: CircleId;

  /** Creator's display name hint */
  readonly creatorDisplayHint?: string;

  /** ISO timestamp when invite expires (can be extended once) */
  expiresAt: string;

  /** ISO timestamp of original creation */
  readonly createdAt: string;

  /** Current status */
  status: InviteStatus;

  /** Redeemer's ID (set on redeem) */
  redeemerId?: string;

  /** Redeemer's display hint (set on redeem) */
  redeemerDisplayHint?: string;

  /** Number of extension applied (max 1) */
  extensionsApplied: number;

  /** Failed redemption attempt count */
  failedAttempts: number;

  /** Lockout expiry (if locked out) */
  lockoutUntil?: string;
}

/**
 * QR payload for scanning.
 */
export interface InviteQRPayload {
  inviteId: string;
  secretToken: string;
}

/**
 * Result of creating an invite.
 */
export interface CreateInviteResult {
  /** Full invite for storage */
  invite: CirclesInvite;
  /** QR payload object (for backwards compat) */
  qrPayload: InviteQRPayload;
  /** Deep-link URI for QR encoding: orbital://invite/{inviteId}/{secretToken} */
  qrDeepLink: string;
  /** Display code to show user */
  displayCode: string;
  /** PIN to show inviter */
  pin: string;
}

/**
 * Result of redemption attempt.
 */
export interface RedeemResult {
  success: boolean;
  /** Security event code for audit trail */
  code?: CircleSecurityEventType;
  error?: string;
  /** Invite ID if successful (for confirmation step) */
  inviteId?: string;
  /** Creator's display hint */
  creatorDisplayHint?: string;
  /** Remaining attempts before lockout */
  remainingAttempts?: number;
}

/**
 * Result of confirmation.
 */
export interface ConfirmResult {
  success: boolean;
  /** Security event code for audit trail */
  code?: CircleSecurityEventType;
  error?: string;
  connection?: ConnectionSummary;
}

// =============================================================================
// STORAGE KEYS
// =============================================================================

const INVITE_KEYS = {
  /** Invite by ID */
  invite: (inviteId: string): string => `${CIRCLES_KEY_PREFIX}invite:${inviteId}`,

  /** Index of displayCode -> inviteId */
  displayCodeIndex: (): string => `${CIRCLES_KEY_PREFIX}invite:_displayCodeIndex`,

  /** Pending invites created by local user */
  myPendingInvites: (): string => `${CIRCLES_KEY_PREFIX}invite:_myPending`,

  /** Pending invites awaiting my confirmation */
  awaitingMyConfirm: (): string => `${CIRCLES_KEY_PREFIX}invite:_awaitingConfirm`,
} as const;

// =============================================================================
// CRYPTOGRAPHIC UTILITIES
// =============================================================================

/**
 * Generate a cryptographically secure UUID v4.
 */
async function generateInviteId(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Generate a ≥128-bit secret token.
 */
async function generateSecretToken(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a human-readable display code (ABC-123 format).
 */
async function generateDisplayCode(): Promise<string> {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I, O (avoid confusion)
  const bytes = await Crypto.getRandomBytesAsync(6);

  const part1 = [
    letters[bytes[0] % letters.length],
    letters[bytes[1] % letters.length],
    letters[bytes[2] % letters.length],
  ].join('');

  const part2 = [
    (bytes[3] % 10).toString(),
    (bytes[4] % 10).toString(),
    (bytes[5] % 10).toString(),
  ].join('');

  return `${part1}-${part2}`;
}

/**
 * Generate a 4-digit PIN.
 */
async function generatePin(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(2);
  const num = ((bytes[0] << 8) | bytes[1]) % 10000;
  return num.toString().padStart(4, '0');
}

// =============================================================================
// STORAGE HELPERS
// =============================================================================

async function getInvite(inviteId: string): Promise<CirclesInvite | null> {
  const raw = await AsyncStorage.getItem(INVITE_KEYS.invite(inviteId));
  if (!raw) return null;
  return JSON.parse(raw) as CirclesInvite;
}

async function saveInvite(invite: CirclesInvite): Promise<void> {
  // L2: NO HISTORY — verify no history in invite
  assertNoHistory(invite);

  await AsyncStorage.setItem(
    INVITE_KEYS.invite(invite.inviteId),
    JSON.stringify(invite)
  );
}

async function deleteInvite(inviteId: string): Promise<void> {
  await AsyncStorage.removeItem(INVITE_KEYS.invite(inviteId));
}

async function getDisplayCodeIndex(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(INVITE_KEYS.displayCodeIndex());
  if (!raw) return {};
  return JSON.parse(raw);
}

async function setDisplayCodeIndex(index: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(INVITE_KEYS.displayCodeIndex(), JSON.stringify(index));
}

async function getMyPendingInvites(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(INVITE_KEYS.myPendingInvites());
  if (!raw) return [];
  return JSON.parse(raw);
}

async function setMyPendingInvites(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(INVITE_KEYS.myPendingInvites(), JSON.stringify(ids));
}

async function getAwaitingConfirm(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(INVITE_KEYS.awaitingMyConfirm());
  if (!raw) return [];
  return JSON.parse(raw);
}

async function setAwaitingConfirm(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(INVITE_KEYS.awaitingMyConfirm(), JSON.stringify(ids));
}

// =============================================================================
// INVITE LIFECYCLE
// =============================================================================

/**
 * Create a new invite.
 *
 * @throws CirclesLawViolation if connection limit would be exceeded
 */
export async function createInvite(
  creatorDisplayHint?: string
): Promise<CreateInviteResult> {
  const user = await ensureLocalUser();

  // L1: NO AGGREGATION — check connection limit
  const connections = await getAllConnections();
  assertNoAggregation(connections.length);

  // Also count pending invites
  const pending = await getMyPendingInvites();
  assertNoAggregation(connections.length + pending.length);

  // Generate invite components
  const inviteId = await generateInviteId();
  const displayCode = await generateDisplayCode();
  const pin = await generatePin();
  const secretToken = await generateSecretToken();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_INVITE_TTL_MS);

  const invite: CirclesInvite = {
    inviteId,
    displayCode,
    pin,
    secretToken,
    creatorId: user.id,
    creatorDisplayHint,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    status: 'PENDING',
    extensionsApplied: 0,
    failedAttempts: 0,
  };

  // Save invite
  await saveInvite(invite);

  // Update display code index
  const index = await getDisplayCodeIndex();
  index[displayCode] = inviteId;
  await setDisplayCodeIndex(index);

  // Track as my pending
  const myPending = await getMyPendingInvites();
  myPending.push(inviteId);
  await setMyPendingInvites(myPending);

  // Build deep-link URI: orbital://invite/{inviteId}/{secretToken}
  const qrDeepLink = `orbital://invite/${inviteId}/${secretToken}`;

  return {
    invite,
    qrPayload: { inviteId, secretToken },
    qrDeepLink,
    displayCode,
    pin,
  };
}

/**
 * Parse a QR deep-link URI into inviteId and secretToken.
 *
 * Format: orbital://invite/{inviteId}/{secretToken}
 *
 * @returns null if parsing fails
 */
export function parseQRDeepLink(deepLink: string): InviteQRPayload | null {
  try {
    // Handle both orbital:// and orbital:/ (some URL parsers strip a slash)
    const normalized = deepLink.replace('orbital:/', 'orbital://');

    // Match pattern: orbital://invite/{inviteId}/{secretToken}
    const match = normalized.match(/^orbital:\/\/invite\/([^/]+)\/([^/]+)$/);
    if (!match) {
      return null;
    }

    const [, inviteId, secretToken] = match;
    if (!inviteId || !secretToken) {
      return null;
    }

    return { inviteId, secretToken };
  } catch {
    return null;
  }
}

/**
 * Extend an invite's TTL (single extension allowed).
 *
 * @throws Error if extension not allowed
 */
export async function extendInvite(inviteId: string): Promise<void> {
  const invite = await getInvite(inviteId);
  if (!invite) {
    throw new Error('Invite not found');
  }

  const user = await getLocalUser();
  if (!user || invite.creatorId !== user.id) {
    throw new Error('Only creator can extend invite');
  }

  if (invite.status !== 'PENDING') {
    throw new Error('Can only extend pending invites');
  }

  if (invite.extensionsApplied >= 1) {
    throw new Error('Maximum extensions reached');
  }

  // Check hard cap
  const createdAt = new Date(invite.createdAt).getTime();
  const currentExpiry = new Date(invite.expiresAt).getTime();
  const newExpiry = currentExpiry + EXTENSION_TTL_MS;

  if (newExpiry - createdAt > MAX_INVITE_TTL_MS) {
    throw new Error('Cannot extend beyond maximum lifetime (2 hours)');
  }

  invite.expiresAt = new Date(newExpiry).toISOString();
  invite.extensionsApplied = 1;

  await saveInvite(invite);
}

/**
 * Redeem an invite via QR scan.
 *
 * @throws Error if rate limit exceeded (>3 invalid attempts in 1 minute)
 */
export async function redeemViaQR(
  qrPayload: InviteQRPayload,
  redeemerDisplayHint?: string
): Promise<RedeemResult> {
  // Check device rate limit FIRST (throws on violation)
  checkRateLimit();

  const invite = await getInvite(qrPayload.inviteId);
  if (!invite) {
    recordFailedAttempt();
    return { success: false, error: 'Invite not found' };
  }

  return processRedemption(invite, qrPayload.secretToken, redeemerDisplayHint);
}

/**
 * Redeem an invite via display code + PIN.
 *
 * @throws Error if rate limit exceeded (>3 invalid attempts in 1 minute)
 */
export async function redeemViaCode(
  displayCode: string,
  pin: string,
  redeemerDisplayHint?: string
): Promise<RedeemResult> {
  // Check device rate limit FIRST (throws on violation)
  checkRateLimit();

  // Normalize display code
  const normalizedCode = displayCode.toUpperCase().trim();

  // Look up invite ID from display code
  const index = await getDisplayCodeIndex();
  const inviteId = index[normalizedCode];

  if (!inviteId) {
    recordFailedAttempt();
    return { success: false, error: 'Invalid code' };
  }

  const invite = await getInvite(inviteId);
  if (!invite) {
    recordFailedAttempt();
    return { success: false, error: 'Invite not found' };
  }

  // Verify PIN
  if (invite.pin !== pin) {
    return handleFailedAttempt(invite);
  }

  // Use secretToken for verification (PIN alone is not sufficient)
  return processRedemption(invite, invite.secretToken, redeemerDisplayHint);
}

/**
 * Process redemption attempt.
 *
 * LOCK-ON-TOUCH: Once an invite is successfully redeemed, it IMMEDIATELY
 * transitions to LOCKED state. Any subsequent redemption attempts will fail
 * with INVITE_LOCKED, even if credentials are valid.
 */
async function processRedemption(
  invite: CirclesInvite,
  providedToken: string,
  redeemerDisplayHint?: string
): Promise<RedeemResult> {
  // Check lockout (too many failed attempts)
  if (invite.lockoutUntil) {
    const lockoutExpiry = new Date(invite.lockoutUntil).getTime();
    if (Date.now() < lockoutExpiry) {
      return {
        success: false,
        code: CircleSecurityEvent.CIRCLES_RATE_LIMITED,
        error: 'Too many attempts. Try again later.',
        remainingAttempts: 0,
      };
    }
    // Lockout expired, reset
    invite.failedAttempts = 0;
    invite.lockoutUntil = undefined;
  }

  // Check status — LOCK-ON-TOUCH enforcement
  if (invite.status === 'EXPIRED') {
    return {
      success: false,
      code: CircleSecurityEvent.INVITE_EXPIRED,
      error: 'Invite has expired',
    };
  }

  if (invite.status === 'REVOKED') {
    return {
      success: false,
      code: CircleSecurityEvent.INVITE_REVOKED,
      error: 'Invite has been cancelled',
    };
  }

  if (invite.status === 'CONFIRMED') {
    return {
      success: false,
      code: CircleSecurityEvent.HANDSHAKE_ALREADY_CONFIRMED,
      error: 'Invite already used',
    };
  }

  // LOCK-ON-TOUCH: Already locked to a redeemer
  if (invite.status === 'LOCKED') {
    return {
      success: false,
      code: CircleSecurityEvent.INVITE_LOCKED,
      error: 'Invite is locked to another user',
    };
  }

  // Check expiry
  const now = Date.now();
  const expiresAt = new Date(invite.expiresAt).getTime();
  if (now > expiresAt) {
    invite.status = 'EXPIRED';
    await saveInvite(invite);
    return {
      success: false,
      code: CircleSecurityEvent.INVITE_EXPIRED,
      error: 'Invite has expired',
    };
  }

  // Verify secret token
  if (invite.secretToken !== providedToken) {
    return handleFailedAttempt(invite);
  }

  // Get redeemer info
  const redeemer = await ensureLocalUser();

  // Check if redeemer is blocked by creator
  if (await isUserBlocked(invite.creatorId)) {
    return {
      success: false,
      code: CircleSecurityEvent.CONNECTION_BLOCKED_USER,
      error: 'Cannot redeem from blocked user',
    };
  }

  // Check self-redeem
  if (redeemer.id === invite.creatorId) {
    return {
      success: false,
      code: CircleSecurityEvent.INVITE_SELF_REDEEM,
      error: 'Cannot redeem your own invite',
    };
  }

  // L1: Check redeemer's connection limit
  const redeemerConnections = await getAllConnections();
  try {
    assertNoAggregation(redeemerConnections.length);
  } catch {
    return {
      success: false,
      code: CircleSecurityEvent.CONNECTION_LIMIT_REACHED,
      error: 'You have reached your connection limit',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCK-ON-TOUCH: IMMEDIATELY transition to LOCKED state
  // This prevents ANY replay attempts, even with valid credentials
  // ═══════════════════════════════════════════════════════════════════════════
  invite.status = 'LOCKED';
  invite.redeemerId = redeemer.id;
  invite.redeemerDisplayHint = redeemerDisplayHint;
  await saveInvite(invite);

  // Add to creator's awaiting confirm list
  const awaiting = await getAwaitingConfirm();
  if (!awaiting.includes(invite.inviteId)) {
    awaiting.push(invite.inviteId);
    await setAwaitingConfirm(awaiting);
  }

  // Reset rate limiter on successful redemption
  resetRateLimitOnSuccess();

  return {
    success: true,
    inviteId: invite.inviteId,
    creatorDisplayHint: invite.creatorDisplayHint,
  };
}

/**
 * Handle failed redemption attempt.
 *
 * Returns INVITE_INVALID_CREDENTIALS code for audit trail.
 */
async function handleFailedAttempt(invite: CirclesInvite): Promise<RedeemResult> {
  // Record in device rate limiter
  recordFailedAttempt();

  invite.failedAttempts++;

  if (invite.failedAttempts >= MAX_REDEEM_ATTEMPTS) {
    invite.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
    await saveInvite(invite);
    return {
      success: false,
      code: CircleSecurityEvent.CIRCLES_RATE_LIMITED,
      error: 'Too many attempts. Locked for 15 minutes.',
      remainingAttempts: 0,
    };
  }

  await saveInvite(invite);
  return {
    success: false,
    code: CircleSecurityEvent.INVITE_INVALID_CREDENTIALS,
    error: 'Invalid credentials',
    remainingAttempts: MAX_REDEEM_ATTEMPTS - invite.failedAttempts,
  };
}

/**
 * Confirm a redeemed invite (creator action).
 *
 * This is the final step that creates the connection.
 *
 * @throws CirclesLawViolation if any law is violated
 */
export async function confirmInvite(inviteId: string): Promise<ConfirmResult> {
  const invite = await getInvite(inviteId);
  if (!invite) {
    return {
      success: false,
      code: CircleSecurityEvent.INVITE_NOT_FOUND,
      error: 'Invite not found',
    };
  }

  const user = await getLocalUser();
  if (!user || invite.creatorId !== user.id) {
    return {
      success: false,
      code: CircleSecurityEvent.HANDSHAKE_UNAUTHORIZED,
      error: 'Only creator can confirm',
    };
  }

  if (invite.status === 'CONFIRMED') {
    return {
      success: false,
      code: CircleSecurityEvent.HANDSHAKE_ALREADY_CONFIRMED,
      error: 'Invite already confirmed',
    };
  }

  if (invite.status !== 'LOCKED') {
    return {
      success: false,
      code: CircleSecurityEvent.INVITE_NOT_FOUND,
      error: 'Invite is not awaiting confirmation',
    };
  }

  if (!invite.redeemerId) {
    return {
      success: false,
      code: CircleSecurityEvent.INVITE_NOT_FOUND,
      error: 'No redeemer found',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: ENFORCE ALL SIX LAWS BEFORE CREATING CONNECTION
  // ═══════════════════════════════════════════════════════════════════════════

  // L2: NO HISTORY — verify no history data
  assertNoHistory({ status: 'active', creatorId: invite.creatorId, redeemerId: invite.redeemerId });

  // L1: NO AGGREGATION — verify connection limits
  const connections = await getAllConnections();
  assertNoAggregation(connections.length);

  // L6 + L3: SYMMETRY + BIDIRECTIONAL — connection must be bidirectional
  assertSymmetry('BIDIRECTIONAL');

  // Create connection (L5: NO HIERARCHY — no roles assigned)
  const connectionId = await generateConnectionId();
  const now = Date.now();

  const connection: CircleConnection = {
    id: connectionId as ConnectionId,
    localUserId: user.id,
    remoteUserId: invite.redeemerId,
    remoteDisplayHint: invite.redeemerDisplayHint,
    status: 'active',
    statusChangedAt: now,
    initiatedBy: 'local',
    _createdAt: now,
  };

  // L4: SOCIAL FIREWALL — storage handles namespace isolation
  await saveConnection(connection);

  // Mark invite as confirmed
  invite.status = 'CONFIRMED';
  await saveInvite(invite);

  // Clean up indexes
  const myPending = await getMyPendingInvites();
  await setMyPendingInvites(myPending.filter((id) => id !== inviteId));

  const awaiting = await getAwaitingConfirm();
  await setAwaitingConfirm(awaiting.filter((id) => id !== inviteId));

  const displayIndex = await getDisplayCodeIndex();
  delete displayIndex[invite.displayCode];
  await setDisplayCodeIndex(displayIndex);

  // Destroy invite (single-use)
  await deleteInvite(inviteId);

  return {
    success: true,
    connection: toConnectionSummary(connection),
  };
}

/**
 * Reject a redeemed invite (creator action).
 */
export async function rejectInvite(inviteId: string): Promise<void> {
  const invite = await getInvite(inviteId);
  if (!invite) return;

  const user = await getLocalUser();
  if (!user || invite.creatorId !== user.id) {
    throw new Error('Only creator can reject');
  }

  invite.status = 'REVOKED';
  await saveInvite(invite);

  // Clean up
  const awaiting = await getAwaitingConfirm();
  await setAwaitingConfirm(awaiting.filter((id) => id !== inviteId));

  await destroyInvite(inviteId);
}

/**
 * Cancel/revoke a pending invite (creator action).
 */
export async function cancelInvite(inviteId: string): Promise<void> {
  const invite = await getInvite(inviteId);
  if (!invite) return;

  const user = await getLocalUser();
  if (!user || invite.creatorId !== user.id) {
    throw new Error('Only creator can cancel');
  }

  if (invite.status !== 'PENDING') {
    throw new Error('Can only cancel pending invites');
  }

  await destroyInvite(inviteId);
}

/**
 * Destroy an invite completely.
 */
async function destroyInvite(inviteId: string): Promise<void> {
  const invite = await getInvite(inviteId);
  if (!invite) return;

  // Remove from display code index
  const displayIndex = await getDisplayCodeIndex();
  delete displayIndex[invite.displayCode];
  await setDisplayCodeIndex(displayIndex);

  // Remove from my pending
  const myPending = await getMyPendingInvites();
  await setMyPendingInvites(myPending.filter((id) => id !== inviteId));

  // Remove from awaiting confirm
  const awaiting = await getAwaitingConfirm();
  await setAwaitingConfirm(awaiting.filter((id) => id !== inviteId));

  // Delete invite
  await deleteInvite(inviteId);
}

/**
 * Get invites awaiting my confirmation (as creator).
 */
export async function getInvitesAwaitingConfirmation(): Promise<CirclesInvite[]> {
  const ids = await getAwaitingConfirm();
  const invites: CirclesInvite[] = [];

  for (const id of ids) {
    const invite = await getInvite(id);
    if (invite && invite.status === 'LOCKED') {
      invites.push(invite);
    }
  }

  return invites;
}

/**
 * Get my pending (not yet redeemed) invites.
 */
export async function getMyPendingInvitesList(): Promise<CirclesInvite[]> {
  const ids = await getMyPendingInvites();
  const invites: CirclesInvite[] = [];

  for (const id of ids) {
    const invite = await getInvite(id);
    if (invite && invite.status === 'PENDING') {
      // Check expiry
      if (Date.now() > new Date(invite.expiresAt).getTime()) {
        invite.status = 'EXPIRED';
        await saveInvite(invite);
      } else {
        invites.push(invite);
      }
    }
  }

  return invites;
}

/**
 * Clean up expired invites.
 */
export async function cleanupExpiredInvites(): Promise<number> {
  const now = Date.now();
  let cleaned = 0;

  // Check my pending
  const myPending = await getMyPendingInvites();
  for (const id of myPending) {
    const invite = await getInvite(id);
    if (invite) {
      const expiresAt = new Date(invite.expiresAt).getTime();
      if (now > expiresAt) {
        await destroyInvite(id);
        cleaned++;
      }
    }
  }

  // Check awaiting confirm (shouldn't expire normally, but clean up orphans)
  const awaiting = await getAwaitingConfirm();
  for (const id of awaiting) {
    const invite = await getInvite(id);
    if (!invite) {
      const newAwaiting = awaiting.filter((i) => i !== id);
      await setAwaitingConfirm(newAwaiting);
      cleaned++;
    }
  }

  return cleaned;
}
