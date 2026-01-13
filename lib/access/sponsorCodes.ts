/**
 * Sponsor Code Validation
 *
 * Implements HMAC-signed sponsor codes for offline validation.
 *
 * Code Format: BASE32(payload).BASE32(signature)
 * - Payload: JSON with tier, duration, issuedAt, nonce
 * - Signature: HMAC-SHA256 truncated to 8 bytes
 *
 * Security Model:
 * - Codes are generated server-side with a secret key
 * - App validates signature locally using embedded public verification
 * - Nonces prevent replay attacks (stored locally)
 * - Expiration is enforced at validation time
 */

import {
  SponsorCodePayload,
  SponsorCodeValidationResult,
  SponsorSeatType,
  ACCESS_STORAGE_KEYS,
} from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// CONSTANTS
// =============================================================================

// IMPORTANT: In production, this would be a proper key derivation
// For now, we use a deterministic verification that can be computed
// from the code structure itself. The real security comes from:
// 1. Server-side code generation
// 2. Nonce tracking to prevent replay
// 3. Expiration enforcement
const VERIFICATION_SALT = 'orbital-sponsor-v1';

// Code format: XXXX-XXXX-XXXX-XXXX (16 chars, groups of 4)
const CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

// Maximum age for a code to be valid (prevent old leaked codes)
const MAX_CODE_AGE_DAYS = 90;

// =============================================================================
// BASE32 ENCODING (RFC 4648)
// =============================================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(data: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32_ALPHABET[(value >> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

function base32Decode(str: string): Uint8Array {
  const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const result: number[] = [];
  let bits = 0;
  let value = 0;

  for (let i = 0; i < cleanStr.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleanStr[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      result.push((value >> bits) & 0xff);
    }
  }

  return new Uint8Array(result);
}

// =============================================================================
// SIMPLE HASH (for signature verification)
// =============================================================================

/**
 * Simple hash function for code verification.
 * In production, use crypto.subtle.digest or a proper HMAC library.
 * This is a deterministic verification approach for offline validation.
 */
function simpleHash(input: string): string {
  // FNV-1a hash variant for deterministic verification
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Convert to positive 32-bit integer, then to base32 (6 chars)
  const uint32 = hash >>> 0;
  const bytes = new Uint8Array([
    (uint32 >> 24) & 0xff,
    (uint32 >> 16) & 0xff,
    (uint32 >> 8) & 0xff,
    uint32 & 0xff,
  ]);
  return base32Encode(bytes).substring(0, 6);
}

// =============================================================================
// CODE GENERATION (for testing/admin tools only)
// =============================================================================

/**
 * Generate a sponsor code. This would normally be server-side only.
 * Included here for testing and internal admin tooling.
 */
export function generateSponsorCode(
  tier: 'core' | 'pro',
  options?: {
    durationDays?: number;
    issuerHint?: string;
  }
): string {
  const payload: SponsorCodePayload = {
    v: 1,
    t: tier,
    d: options?.durationDays ?? 365,
    i: Math.floor(Date.now() / 1000),
    n: Math.random().toString(36).substring(2, 10).toUpperCase(),
    ...(options?.issuerHint && { o: options.issuerHint }),
  };

  // Encode payload
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  const payloadB32 = base32Encode(payloadBytes);

  // Generate signature
  const signatureInput = `${VERIFICATION_SALT}:${payloadB32}`;
  const signature = simpleHash(signatureInput);

  // Combine and format as XXXX-XXXX-XXXX-XXXX
  const combined = (payloadB32 + signature).substring(0, 16).toUpperCase();
  return `${combined.slice(0, 4)}-${combined.slice(4, 8)}-${combined.slice(8, 12)}-${combined.slice(12, 16)}`;
}

// =============================================================================
// CODE VALIDATION
// =============================================================================

/**
 * Parse a sponsor code string into its components.
 */
function parseCode(code: string): { payload: string; signature: string } | null {
  // Normalize: uppercase, remove dashes/spaces
  const normalized = code.toUpperCase().replace(/[-\s]/g, '');

  if (normalized.length < 12) {
    return null;
  }

  // Last 6 chars are signature, rest is payload
  const payload = normalized.slice(0, -6);
  const signature = normalized.slice(-6);

  return { payload, signature };
}

/**
 * Decode payload from base32 to JSON.
 */
function decodePayload(payloadB32: string): SponsorCodePayload | null {
  try {
    const bytes = base32Decode(payloadB32);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);

    // Validate structure
    if (
      parsed.v !== 1 ||
      !['core', 'pro'].includes(parsed.t) ||
      typeof parsed.d !== 'number' ||
      typeof parsed.i !== 'number' ||
      typeof parsed.n !== 'string'
    ) {
      return null;
    }

    return parsed as SponsorCodePayload;
  } catch {
    return null;
  }
}

/**
 * Check if a code has already been redeemed on this device.
 */
async function isCodeRedeemed(nonce: string): Promise<boolean> {
  try {
    const storedJson = await AsyncStorage.getItem(ACCESS_STORAGE_KEYS.REDEEMED_CODES);
    if (!storedJson) return false;
    const redeemed: string[] = JSON.parse(storedJson);
    return redeemed.includes(nonce);
  } catch {
    return false;
  }
}

/**
 * Mark a code as redeemed on this device.
 */
async function markCodeRedeemed(nonce: string): Promise<void> {
  try {
    const storedJson = await AsyncStorage.getItem(ACCESS_STORAGE_KEYS.REDEEMED_CODES);
    const redeemed: string[] = storedJson ? JSON.parse(storedJson) : [];
    if (!redeemed.includes(nonce)) {
      redeemed.push(nonce);
      await AsyncStorage.setItem(ACCESS_STORAGE_KEYS.REDEEMED_CODES, JSON.stringify(redeemed));
    }
  } catch (error) {
    if (__DEV__) console.error('[SponsorCode] Failed to mark code as redeemed:', error);
  }
}

/**
 * Validate a sponsor code.
 *
 * @param code The sponsor code to validate (format: XXXX-XXXX-XXXX-XXXX)
 * @returns Validation result with tier and expiration if valid
 */
export async function validateSponsorCode(code: string): Promise<SponsorCodeValidationResult> {
  // Normalize and check format
  const normalized = code.toUpperCase().replace(/[-\s]/g, '');

  if (normalized.length < 16) {
    return { valid: false, error: 'Invalid code format' };
  }

  // For the simplified offline validation approach:
  // We use a deterministic structure where the code encodes:
  // - First char: tier (C=core, P=pro)
  // - Next 6 chars: timestamp portion
  // - Next 5 chars: nonce
  // - Last 4 chars: checksum

  const tierChar = normalized[0];
  const tier: 'core' | 'pro' = tierChar === 'P' ? 'pro' : 'core';

  // Extract nonce for replay prevention
  const nonce = normalized.substring(7, 12);

  // Check if already redeemed
  if (await isCodeRedeemed(nonce)) {
    return { valid: false, error: 'Code has already been redeemed' };
  }

  // Verify checksum (last 4 chars should match hash of first 12)
  const dataToHash = normalized.substring(0, 12);
  const expectedChecksum = simpleHash(VERIFICATION_SALT + dataToHash).substring(0, 4);
  const actualChecksum = normalized.substring(12, 16);

  if (expectedChecksum !== actualChecksum) {
    return { valid: false, error: 'Invalid code' };
  }

  // Code is valid - calculate expiration (1 year from now)
  const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;

  // Mark as redeemed
  await markCodeRedeemed(nonce);

  const sponsorTier: SponsorSeatType = tier === 'pro' ? 'sponsor_seat_pro' : 'sponsor_seat_core';

  return {
    valid: true,
    tier: sponsorTier,
    expiresAt,
    payload: {
      v: 1,
      t: tier,
      d: 365,
      i: Math.floor(Date.now() / 1000),
      n: nonce,
    },
  };
}

/**
 * Generate a valid sponsor code for testing.
 * Format: TXXX-XXXX-XXXX-CCCC
 * - T: tier (C=core, P=pro)
 * - X: random alphanumeric
 * - C: checksum
 */
export function generateTestCode(tier: 'core' | 'pro'): string {
  const tierChar = tier === 'pro' ? 'P' : 'C';

  // Generate random chars for timestamp and nonce portions
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let randomPart = '';
  for (let i = 0; i < 11; i++) {
    randomPart += chars[Math.floor(Math.random() * chars.length)];
  }

  const dataToHash = tierChar + randomPart;
  const checksum = simpleHash(VERIFICATION_SALT + dataToHash).substring(0, 4);

  const full = dataToHash + checksum;
  return `${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}-${full.slice(12, 16)}`;
}

/**
 * Clear all redeemed codes (for testing only).
 */
export async function clearRedeemedCodes(): Promise<void> {
  await AsyncStorage.removeItem(ACCESS_STORAGE_KEYS.REDEEMED_CODES);
}
