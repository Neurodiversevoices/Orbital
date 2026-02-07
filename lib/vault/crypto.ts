/**
 * Life Vault Crypto Module
 *
 * AES-256-GCM encryption with PBKDF2 key derivation.
 * Zero-knowledge: encryption key derived from user's mnemonic.
 */

import * as Crypto from 'expo-crypto';
import { VAULT_CONSTANTS } from './types';

/**
 * Generate cryptographically secure random bytes
 */
export async function generateRandomBytes(length: number): Promise<Uint8Array> {
  const randomBytes = await Crypto.getRandomBytesAsync(length);
  return new Uint8Array(randomBytes);
}

/**
 * Generate a random salt for key derivation
 */
export async function generateSalt(): Promise<Uint8Array> {
  return generateRandomBytes(VAULT_CONSTANTS.SALT_LENGTH);
}

/**
 * Generate a random IV for AES-GCM
 */
export async function generateIV(): Promise<Uint8Array> {
  return generateRandomBytes(VAULT_CONSTANTS.IV_LENGTH);
}

/**
 * Convert Uint8Array to base64 string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert string to Uint8Array (UTF-8)
 */
export function stringToBytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert Uint8Array to string (UTF-8)
 */
export function bytesToString(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Hash data using SHA-256
 */
export async function sha256(data: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data
  );
}

/**
 * Derive encryption key from mnemonic using PBKDF2
 * Uses Web Crypto API available in React Native
 */
export async function deriveKeyFromMnemonic(
  mnemonic: string[],
  salt: Uint8Array
): Promise<CryptoKey> {
  const mnemonicString = mnemonic.join(' ');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    stringToBytes(mnemonicString) as unknown as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const encoded = stringToBytes(plaintext);
  return crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    encoded as unknown as BufferSource
  );
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext
  );
  return bytesToString(new Uint8Array(decrypted));
}

/**
 * Encrypt vault payload
 */
export async function encryptPayload(
  payload: unknown,
  mnemonic: string[]
): Promise<{ ciphertext: string; salt: string; iv: string }> {
  const salt = await generateSalt();
  const iv = await generateIV();
  const key = await deriveKeyFromMnemonic(mnemonic, salt);

  const plaintext = JSON.stringify(payload);
  const encrypted = await encrypt(plaintext, key, iv);

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
  };
}

/**
 * Decrypt vault payload
 */
export async function decryptPayload(
  ciphertext: string,
  salt: string,
  iv: string,
  mnemonic: string[]
): Promise<unknown> {
  const saltBytes = base64ToBytes(salt);
  const ivBytes = base64ToBytes(iv);
  const ciphertextBytes = base64ToBytes(ciphertext);

  const key = await deriveKeyFromMnemonic(mnemonic, saltBytes);
  const plaintext = await decrypt(ciphertextBytes.buffer as ArrayBuffer, key, ivBytes);

  return JSON.parse(plaintext);
}

/**
 * Generate a verification hash for the mnemonic
 * Used to verify user entered correct phrase without storing the phrase
 */
export async function generateVerificationHash(mnemonic: string[]): Promise<string> {
  const combined = mnemonic.join(' ') + ':orbital-vault-verification';
  return sha256(combined);
}

/**
 * Verify mnemonic against stored hash
 */
export async function verifyMnemonic(
  mnemonic: string[],
  storedHash: string
): Promise<boolean> {
  const hash = await generateVerificationHash(mnemonic);
  return hash === storedHash;
}
