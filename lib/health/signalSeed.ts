/**
 * Per-User Signal Seed — Atmospheric Reservoir visual signature
 *
 * The Atmospheric Reservoir centerpiece (`<AtmosphericReservoir>`) renders a
 * volumetric two-body shader. To make every user's reservoir visibly unique
 * without leaking any actual physiology onto the GPU, we hash a small set of
 * long-term physiological constants together with a per-device random salt and
 * map the hash bytes into a `SignalSeed` of shader uniforms (4 noise offsets,
 * a hue shift, a surface pattern selector, a breathing period, and a rotation
 * speed). Two principles drive the design:
 *
 *   1. Deterministic-yet-unique. The same physiology produces the same seed,
 *      which means the user's visual is stable across cold launches without
 *      ever having to round-trip through Supabase. Different physiology
 *      produces a different seed.
 *
 *   2. Privacy-by-construction. The seed is one-way: a 32-byte SHA-256 of
 *      `${salt}|${hr}|${hrv}|${bedtime}|${sleep}|${ageDays}` truncated to 8
 *      bytes of usable output. Even if the seed leaked, the salt is in
 *      Keychain (`kSecAttrAccessibleAfterFirstUnlock`) and the inputs are
 *      bucket-rounded, so no inversion is feasible. We never serialize the
 *      raw physiology — only the derived 8 floats/ints reach the renderer.
 *
 * The bucket strategy (HR ±1 bpm, HRV ±1 ms SDNN, bedtime ±15 min, sleep
 * ±0.5 h, age in whole days) means the seed only re-derives when long-term
 * physiology drifts past a threshold. Two users with the same physiology
 * still get different seeds because the salt is per-device.
 *
 * Family resemblance side-effect (Circles): users in the same circle whose
 * physiology happens to converge during a shared event will trend toward
 * visually similar seeds because the bucketed inputs converge. The salt
 * keeps them distinct rather than identical — they "rhyme" rather than
 * collide. See docs/SIGNAL_SEED_v1.md.
 *
 * Salt persistence: SecureStore on iOS uses Keychain with the default
 * `kSecAttrAccessibleAfterFirstUnlock` accessibility class, which is
 * included in iCloud Keychain backups when the user has it enabled. That
 * means salt — and therefore the user's reservoir signature — survives a
 * restore-from-backup onto a new device. A full sign-out (`resetSignalSalt`)
 * is the only path that regenerates the salt; session sign-out preserves it.
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

/** 4 floats 0..1 used as `vec4` noise offsets in the SKSL fragment shader. */
export type SeedTuple = readonly [number, number, number, number];

export interface SignalSeed {
  /** 4 floats 0..1 for shader vec4 noise offsets. */
  seed: SeedTuple;
  /** Hue rotation applied to the reservoir spectrum, in degrees. Range ±10°. */
  hueShift: number;
  /** Surface displacement style: 0 laminar, 1 turbulent, 2 banded, 3 cellular. */
  surfacePattern: number;
  /** Breathing pulse period in seconds. Range 4..8. */
  pulseSeconds: number;
  /** Demand-body orbital speed (rad/s scaled). Range 0.04..0.12. */
  rotationSpeed: number;
}

export interface PhysiologicalSignature {
  /** Resting HR, bpm. Bucket-rounded to 1 bpm. */
  restingHR: number;
  /** HRV SDNN baseline, ms. Bucket-rounded to 1 ms. */
  hrvBaseline: number;
  /** Bedtime midpoint as minutes from midnight. Bucket-rounded to 15 min. */
  bedtimeMins: number;
  /** Mean nightly sleep duration in hours. Bucket-rounded to 0.5 h. */
  sleepHours: number;
  /** Days since the user's first capacity log. Bucket-rounded to whole days. */
  signalAgeDays: number;
}

// -----------------------------------------------------------------------------
// Storage keys + tuning constants
// -----------------------------------------------------------------------------

/** Keychain (iOS) / Keystore (Android) / localStorage (web) key for the salt. */
const SALT_KEY = 'orbital.signalSalt';

/** AsyncStorage key for the derived-seed cache. */
const SEED_CACHE_KEY = 'orbital.signalSeed.cache';

/** Cache TTL — re-derive once a day even if fingerprint is unchanged. */
const SEED_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Salt length in bytes. SHA-256 hashes any input length, but 16 bytes of
 *  CSPRNG entropy is more than sufficient and keeps the persisted blob small. */
const SALT_BYTES = 16;

// -----------------------------------------------------------------------------
// Starter seed (deterministic, no physiology)
// -----------------------------------------------------------------------------

/**
 * The starter seed is what brand-new users see while their physiology data
 * is still empty. It is intentionally a calm, neutral signature — laminar
 * surface, mid-range hue (no shift), mid-range pulse and rotation, even noise
 * offsets — so that as the user's data fills in, the reservoir evolves away
 * from this baseline rather than starting from a jarring random visual.
 */
const STARTER_SEED: SignalSeed = Object.freeze({
  seed: Object.freeze([0.5, 0.5, 0.5, 0.5]) as SeedTuple,
  hueShift: 0,
  surfacePattern: 0,
  pulseSeconds: 6,
  rotationSpeed: 0.08,
});

/**
 * New-user fallback. Returns the starter seed but also lazily ensures a salt
 * exists, so the next physiology-driven derivation is fast.
 */
export async function deriveStarterSeed(): Promise<SignalSeed> {
  try {
    await ensureSalt();
  } catch (e) {
    console.warn('[signalSeed] starter ensureSalt failed:', e);
  }
  return STARTER_SEED;
}

// -----------------------------------------------------------------------------
// Salt management
// -----------------------------------------------------------------------------

function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s;
}

async function readSalt(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // SecureStore on web is unavailable; fall back to AsyncStorage. The salt
    // is not security-sensitive in isolation (it does not authorize anything;
    // it only diversifies a hash), so plaintext storage on web is acceptable.
    return AsyncStorage.getItem(SALT_KEY);
  }
  return SecureStore.getItemAsync(SALT_KEY);
}

async function writeSalt(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(SALT_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SALT_KEY, value);
}

async function deleteSalt(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(SALT_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SALT_KEY);
}

/**
 * Read the persisted salt or generate + persist a new one. The result is a
 * lowercase hex string of length `SALT_BYTES * 2`.
 */
async function ensureSalt(): Promise<string> {
  const existing = await readSalt();
  if (existing && /^[0-9a-f]+$/.test(existing) && existing.length === SALT_BYTES * 2) {
    return existing;
  }
  const fresh = bytesToHex(Crypto.getRandomBytes(SALT_BYTES));
  await writeSalt(fresh);
  return fresh;
}

/**
 * Force-reset the salt. Call this only on full sign-out (user wants a fresh
 * identity / a different reservoir signature on the next session). A normal
 * Supabase sign-out should NOT call this — the user's reservoir survives the
 * session boundary.
 */
export async function resetSignalSalt(): Promise<void> {
  try {
    await deleteSalt();
  } catch (e) {
    console.warn('[signalSeed] resetSignalSalt deleteSalt failed:', e);
  }
  try {
    await AsyncStorage.removeItem(SEED_CACHE_KEY);
  } catch (e) {
    console.warn('[signalSeed] resetSignalSalt clearCache failed:', e);
  }
}

// -----------------------------------------------------------------------------
// Bucket rounding (the privacy + stability layer)
// -----------------------------------------------------------------------------

function bucketRound(value: number, step: number): number {
  if (!Number.isFinite(value) || step <= 0) return 0;
  return Math.round(value / step) * step;
}

function bucketSignature(sig: PhysiologicalSignature): PhysiologicalSignature {
  return {
    restingHR: bucketRound(sig.restingHR, 1),
    hrvBaseline: bucketRound(sig.hrvBaseline, 1),
    bedtimeMins: bucketRound(sig.bedtimeMins, 15),
    sleepHours: bucketRound(sig.sleepHours, 0.5),
    signalAgeDays: bucketRound(sig.signalAgeDays, 1),
  };
}

function fingerprint(sig: PhysiologicalSignature): string {
  const b = bucketSignature(sig);
  return `${b.restingHR}|${b.hrvBaseline}|${b.bedtimeMins}|${b.sleepHours}|${b.signalAgeDays}`;
}

// -----------------------------------------------------------------------------
// Hex parsing (type-safe; never returns NaN)
// -----------------------------------------------------------------------------

function hexNibble(c: string): number {
  // '0'..'9' -> 0..9, 'a'..'f' -> 10..15. Returns 0 on anything else; the
  // caller has already pattern-validated the digest length, so this branch
  // is defensive only.
  const code = c.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 97 && code <= 102) return code - 87;
  if (code >= 65 && code <= 70) return code - 55;
  return 0;
}

function parseFirstBytes(hex: string, n: number): Uint8Array {
  const out = new Uint8Array(n);
  const safe = hex.toLowerCase();
  for (let i = 0; i < n; i++) {
    const hi = hexNibble(safe.charAt(i * 2));
    const lo = hexNibble(safe.charAt(i * 2 + 1));
    out[i] = ((hi << 4) | lo) & 0xff;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Cache helpers
// -----------------------------------------------------------------------------

interface CachedSeedEntry {
  fingerprint: string;
  derivedAt: number;
  seed: SignalSeed;
}

async function readCache(): Promise<CachedSeedEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(SEED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedSeedEntry>;
    if (
      typeof parsed.fingerprint !== 'string' ||
      typeof parsed.derivedAt !== 'number' ||
      !parsed.seed ||
      !Array.isArray(parsed.seed.seed) ||
      parsed.seed.seed.length !== 4
    ) {
      return null;
    }
    return parsed as CachedSeedEntry;
  } catch (e) {
    console.warn('[signalSeed] readCache parse failed:', e);
    return null;
  }
}

async function writeCache(entry: CachedSeedEntry): Promise<void> {
  try {
    await AsyncStorage.setItem(SEED_CACHE_KEY, JSON.stringify(entry));
  } catch (e) {
    console.warn('[signalSeed] writeCache failed:', e);
  }
}

// -----------------------------------------------------------------------------
// Seed derivation
// -----------------------------------------------------------------------------

/**
 * Map 8 hash bytes onto the SignalSeed surface uniforms.
 *
 *   bytes[0..3] -> seed[0..3]      (uniform vec4 noise offsets, byte/255)
 *   bytes[4]    -> hueShift        (-10..+10 degrees)
 *   bytes[5]    -> surfacePattern  (0..3, byte % 4)
 *   bytes[6]    -> pulseSeconds    (4..8 seconds)
 *   bytes[7]    -> rotationSpeed   (0.04..0.12 rad/s scaled)
 */
function bytesToSeed(b: Uint8Array): SignalSeed {
  const s0 = b[0] / 255;
  const s1 = b[1] / 255;
  const s2 = b[2] / 255;
  const s3 = b[3] / 255;
  const seedTuple: SeedTuple = [s0, s1, s2, s3] as const;
  const hueShift = (b[4] / 255) * 20 - 10;
  const surfacePattern = b[5] % 4;
  const pulseSeconds = 4 + (b[6] / 255) * 4;
  const rotationSpeed = 0.04 + (b[7] / 255) * 0.08;
  return {
    seed: seedTuple,
    hueShift,
    surfacePattern,
    pulseSeconds,
    rotationSpeed,
  };
}

/**
 * Derive a SignalSeed from a physiological signature. Errors at any step fall
 * back to the starter seed so the caller never sees an exception.
 */
export async function deriveSignalSeed(
  sig: PhysiologicalSignature,
): Promise<SignalSeed> {
  try {
    const fp = fingerprint(sig);

    // Cache hit: same physiology bucket, within TTL.
    const cached = await readCache();
    const now = Date.now();
    if (
      cached &&
      cached.fingerprint === fp &&
      now - cached.derivedAt < SEED_CACHE_TTL_MS
    ) {
      return cached.seed;
    }

    const salt = await ensureSalt();
    const input = `${salt}|${fp}`;
    const hex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      input,
    );
    if (typeof hex !== 'string' || hex.length < 16) {
      console.warn('[signalSeed] unexpected digest output');
      return STARTER_SEED;
    }

    const bytes = parseFirstBytes(hex, 16);
    // We only use the first 8 bytes for uniform mapping; the remaining 8
    // bytes are headroom for future uniforms (e.g. cellular noise warp).
    const seed = bytesToSeed(bytes);

    await writeCache({ fingerprint: fp, derivedAt: now, seed });
    return seed;
  } catch (e) {
    console.warn('[signalSeed] deriveSignalSeed failed:', e);
    return STARTER_SEED;
  }
}

// -----------------------------------------------------------------------------
// Test / dev helpers
// -----------------------------------------------------------------------------

/** @internal — exposed for unit tests. */
export const _internals = {
  STARTER_SEED,
  SALT_KEY,
  SEED_CACHE_KEY,
  bucketSignature,
  fingerprint,
  parseFirstBytes,
  bytesToSeed,
};
