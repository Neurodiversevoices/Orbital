/**
 * Orbital Secure Storage Adapter
 *
 * Storage adapter for Supabase auth tokens that persists session data
 * in iOS Keychain / Android Keystore via expo-secure-store on native,
 * and falls back to localStorage on web (web platforms are already
 * plaintext-equivalent in browser storage).
 *
 * Why this file exists:
 * --------------------
 * Per docs/IOS_AUDIT_PRIVACY_2026-05-09.md §F1, Supabase auth tokens
 * (refresh + access) were previously persisted via AsyncStorage, which
 * stores values as plaintext SQLite/UserDefaults entries. On a jailbroken
 * iOS device or rooted Android, those tokens are recoverable. Moving the
 * tokens to the OS-provided secure enclave (Keychain on iOS, Keystore on
 * Android, both AES-256 backed) closes that finding.
 *
 * Chunking strategy:
 * ------------------
 * SecureStore enforces a 2 KB ceiling on individual value sizes.
 * A Supabase session payload (refresh + access JWT + user metadata)
 * routinely exceeds this. This adapter transparently chunks values
 * larger than CHUNK_THRESHOLD_BYTES (2000 chars to leave headroom for
 * UTF-8 multi-byte characters) into N pieces stored at sub-keys
 * `${key}.0`, `${key}.1`, ... `${key}.N-1`. The primary key `${key}`
 * holds a small JSON manifest of the form { __chunked: true, count: N }
 * that getItem uses to know whether to reassemble. Single-chunk values
 * are written at the primary key directly with no manifest.
 *
 * One-time AsyncStorage -> SecureStore migration:
 * -----------------------------------------------
 * On the first getItem call after this adapter is installed, if
 * SecureStore returns null AND AsyncStorage has a value at the same
 * key, the value is copied into SecureStore and then deleted from
 * AsyncStorage. Subsequent reads come from SecureStore. This is
 * transparent to the user — existing logged-in sessions survive the
 * upgrade with no logout / re-auth.
 *
 * Errors:
 * -------
 * - getItem: any read failure returns null (caller falls back to
 *   "no session" — Supabase will treat this as logged-out and the user
 *   re-auths once. No data loss because the SecureStore write was
 *   atomic per chunk and the AsyncStorage migration only deletes after
 *   a successful SecureStore write).
 * - setItem / removeItem: warnings via console.warn (Sentry breadcrumbs
 *   capture these in production).
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// SecureStore documents a 2048-byte limit per value. We use 2000 chars
// as the chunking threshold to leave headroom for UTF-8 multi-byte
// characters and a small manifest overhead.
const CHUNK_THRESHOLD_BYTES = 2000;

// Manifest sentinel written at the primary key when the value was
// chunked. Format: {"__chunked":true,"count":N}
interface ChunkManifest {
  __chunked: true;
  count: number;
}

function isChunkManifest(parsed: unknown): parsed is ChunkManifest {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    (parsed as { __chunked?: unknown }).__chunked === true &&
    typeof (parsed as { count?: unknown }).count === 'number'
  );
}

function parseManifest(raw: string | null): ChunkManifest | null {
  if (!raw) return null;
  // Fast-fail: manifests start with '{"__chunked"'. Avoid JSON.parse
  // on every plain-string token read.
  if (!raw.startsWith('{"__chunked"')) return null;
  try {
    const parsed = JSON.parse(raw);
    return isChunkManifest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function secureGetReassembled(key: string): Promise<string | null> {
  const head = await SecureStore.getItemAsync(key);
  if (head === null) return null;

  const manifest = parseManifest(head);
  if (!manifest) {
    // Single-chunk value stored directly at primary key.
    return head;
  }

  // Reassemble chunks `${key}.0` ... `${key}.N-1`.
  const parts: string[] = [];
  for (let i = 0; i < manifest.count; i++) {
    const part = await SecureStore.getItemAsync(`${key}.${i}`);
    if (part === null) {
      // Corrupt / partial write — treat as no value.
      return null;
    }
    parts.push(part);
  }
  return parts.join('');
}

async function secureSetChunked(key: string, value: string): Promise<void> {
  if (value.length <= CHUNK_THRESHOLD_BYTES) {
    // Clear any leftover chunks from a previous chunked write at this key.
    await clearLeftoverChunks(key);
    await SecureStore.setItemAsync(key, value);
    return;
  }

  // Split into CHUNK_THRESHOLD_BYTES-sized pieces.
  const count = Math.ceil(value.length / CHUNK_THRESHOLD_BYTES);
  for (let i = 0; i < count; i++) {
    const slice = value.slice(
      i * CHUNK_THRESHOLD_BYTES,
      (i + 1) * CHUNK_THRESHOLD_BYTES
    );
    await SecureStore.setItemAsync(`${key}.${i}`, slice);
  }

  // Write manifest last so partial writes can't be misread as complete.
  const manifest: ChunkManifest = { __chunked: true, count };
  await SecureStore.setItemAsync(key, JSON.stringify(manifest));
}

async function clearLeftoverChunks(key: string): Promise<void> {
  // Best-effort: read existing manifest at the primary key. If it
  // exists, delete its declared chunks. Walks at most `count` items.
  try {
    const head = await SecureStore.getItemAsync(key);
    const manifest = parseManifest(head);
    if (!manifest) return;
    for (let i = 0; i < manifest.count; i++) {
      try {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      } catch {
        // ignore per-chunk errors
      }
    }
  } catch {
    // ignore
  }
}

async function secureRemoveChunked(key: string): Promise<void> {
  await clearLeftoverChunks(key);
  await SecureStore.deleteItemAsync(key);
}

/**
 * One-time migration: if SecureStore is empty for `key` but AsyncStorage
 * has a value, copy AsyncStorage -> SecureStore and remove from
 * AsyncStorage. After migration, AsyncStorage no longer holds the token
 * and SecureStore is canonical. Idempotent: a second call is a no-op
 * because the AsyncStorage value has been deleted.
 */
async function migrateFromAsyncStorageIfNeeded(
  key: string
): Promise<string | null> {
  try {
    const legacy = await AsyncStorage.getItem(key);
    if (legacy === null) return null;

    // Write to SecureStore first; only delete the legacy copy if the
    // SecureStore write succeeds. This guarantees no token is lost
    // mid-migration.
    await secureSetChunked(key, legacy);
    try {
      await AsyncStorage.removeItem(key);
    } catch (removeErr) {
      // If removal fails, the migration still effectively succeeded —
      // SecureStore has the canonical copy. Next launch will retry
      // removal. Log but don't fail the read.
      if (__DEV__) {
        console.warn(
          '[secureStorage] AsyncStorage cleanup after migration failed:',
          removeErr
        );
      }
    }
    return legacy;
  } catch (err) {
    if (__DEV__) {
      console.warn('[secureStorage] migration failed:', err);
    }
    return null;
  }
}

/**
 * Storage adapter conforming to Supabase's expected shape:
 *   { getItem, setItem, removeItem }
 *
 * - Web: localStorage (matches prior behavior; web has no Keychain).
 * - Native (iOS/Android): SecureStore with chunking and one-time
 *   AsyncStorage->SecureStore migration on first read.
 */
export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined'
          ? localStorage.getItem(key)
          : null;
      } catch {
        return null;
      }
    }

    try {
      const value = await secureGetReassembled(key);
      if (value !== null) return value;

      // SecureStore returned null — try one-time AsyncStorage migration.
      // After the first successful migration on this device, AsyncStorage
      // is empty for this key and this branch is a fast no-op.
      return await migrateFromAsyncStorageIfNeeded(key);
    } catch (err) {
      if (__DEV__) {
        console.warn('[secureStorage] getItem failed:', err);
      }
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
      } catch (err) {
        console.warn('[secureStorage] localStorage setItem failed:', err);
      }
      return;
    }

    try {
      await secureSetChunked(key, value);
    } catch (err) {
      console.warn('[secureStorage] setItem failed:', err);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (err) {
        console.warn('[secureStorage] localStorage removeItem failed:', err);
      }
      return;
    }

    try {
      await secureRemoveChunked(key);
      // Also clear any legacy AsyncStorage value to prevent the next
      // migration pass from resurrecting a stale session after sign-out.
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // ignore — best effort
      }
    } catch (err) {
      console.warn('[secureStorage] removeItem failed:', err);
    }
  },
};

export default secureStorage;
