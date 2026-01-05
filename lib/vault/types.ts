/**
 * Life Vault Types
 *
 * Zero-knowledge encrypted backup system.
 * User controls the key. Developer cannot decrypt.
 */

/**
 * Vault state stored locally (not in backup)
 */
export interface VaultState {
  /** Whether vault has been initialized */
  isInitialized: boolean;

  /** When vault was first set up */
  initializedAt: number | null;

  /** When last backup was performed */
  lastBackupAt: number | null;

  /** When last restore was performed */
  lastRestoreAt: number | null;

  /** Number of successful backups */
  backupCount: number;

  /** Whether cloud backup is enabled */
  cloudBackupEnabled: boolean;

  /** Hash of the encryption key (for verification, not the key itself) */
  keyVerificationHash: string | null;
}

/**
 * Backup manifest - metadata about a backup
 */
export interface BackupManifest {
  /** Unique backup ID */
  id: string;

  /** Version of backup format */
  version: number;

  /** When backup was created */
  createdAt: number;

  /** App version that created backup */
  appVersion: string;

  /** Number of records in backup */
  recordCounts: {
    capacityLogs: number;
    patternHistory: number;
    preferences: number;
    experiments?: number;
  };

  /** Checksum of encrypted payload */
  payloadChecksum: string;

  /** Salt used for key derivation (safe to store with backup) */
  salt: string;

  /** IV used for encryption (safe to store with backup) */
  iv: string;
}

/**
 * Data structure that gets encrypted
 */
export interface VaultPayload {
  /** Backup manifest */
  manifest: Omit<BackupManifest, 'payloadChecksum' | 'salt' | 'iv'>;

  /** Capacity logs */
  capacityLogs: unknown[];

  /** Pattern history records */
  patternHistory: unknown[];

  /** User preferences */
  preferences: unknown;

  /** Experiments (if any) */
  experiments?: unknown[];

  /** Accessibility settings */
  accessibility?: unknown;

  /** Additional settings to preserve */
  settings?: {
    tutorialSeen?: boolean;
    whyOrbitalSeen?: boolean;
    termsAccepted?: unknown;
  };
}

/**
 * Encrypted backup package
 */
export interface EncryptedBackup {
  /** Backup manifest (unencrypted metadata) */
  manifest: BackupManifest;

  /** Encrypted payload (base64) */
  encryptedPayload: string;
}

/**
 * Recovery phrase (24 words)
 */
export interface RecoveryPhrase {
  /** The 24 words */
  words: string[];

  /** When phrase was generated */
  generatedAt: number;

  /** Hash for verification */
  verificationHash: string;
}

/**
 * Backup result
 */
export interface BackupResult {
  success: boolean;
  backupId?: string;
  error?: string;
  manifest?: BackupManifest;
}

/**
 * Restore result
 */
export interface RestoreResult {
  success: boolean;
  recordsRestored?: {
    capacityLogs: number;
    patternHistory: number;
    preferences: boolean;
    experiments?: number;
  };
  error?: string;
  backupDate?: number;
}

/**
 * Cloud storage provider
 */
export type CloudProvider = 'icloud' | 'google_drive' | 'local_only';

/**
 * Cloud storage status
 */
export interface CloudStorageStatus {
  provider: CloudProvider;
  isAvailable: boolean;
  lastSyncAt: number | null;
  error?: string;
}

/**
 * Vault setup state for UI
 */
export type VaultSetupState =
  | 'not_started'
  | 'generating_key'
  | 'showing_phrase'
  | 'confirming_phrase'
  | 'completed'
  | 'error';

/**
 * Constants
 */
export const VAULT_CONSTANTS = {
  /** Current backup format version */
  BACKUP_VERSION: 1,

  /** Number of words in recovery phrase */
  PHRASE_WORD_COUNT: 24,

  /** Salt length in bytes */
  SALT_LENGTH: 32,

  /** IV length in bytes (AES-GCM standard) */
  IV_LENGTH: 12,

  /** Key length in bytes (256-bit) */
  KEY_LENGTH: 32,

  /** Storage key for vault state */
  VAULT_STATE_KEY: '@orbital:vault_state',

  /** Storage key for encrypted key (protected by device security) */
  ENCRYPTED_KEY_KEY: '@orbital:vault_encrypted_key',

  /** Filename for cloud backup */
  BACKUP_FILENAME: 'orbital_vault_backup.enc',

  /** Maximum backup file size (50MB) */
  MAX_BACKUP_SIZE: 50 * 1024 * 1024,
} as const;
