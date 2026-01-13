/**
 * CCI-Q4 Legal Confirmation — REQUIRED BEFORE ISSUANCE
 *
 * BEFORE ISSUING ANY CCI-Q4, USER MUST CONFIRM:
 * "I confirm this record is for my own use or for a dependent I am legally authorized to represent."
 *
 * Purpose:
 * Prevents third-party misuse and strengthens clinical artifact defensibility.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// CONSTANTS
// =============================================================================

const STORAGE_KEY = '@orbital:cci_confirmations';
const CONFIRMATION_VERSION = '1.0';

// =============================================================================
// TYPES
// =============================================================================

export interface CCIConfirmationRecord {
  purchase_id: string;
  confirmation_version: string;
  confirmation_text: string;
  confirmed_at: string; // ISO timestamp
  user_id?: string;
}

// =============================================================================
// CONFIRMATION TEXT — EXACT COPY (LEGAL)
// =============================================================================

export const CCI_CONFIRMATION_TEXT =
  'I confirm this record is for my own use or for a dependent I am legally authorized to represent.' as const;

// =============================================================================
// STORAGE FUNCTIONS
// =============================================================================

/**
 * Record CCI confirmation for a purchase
 */
export async function recordCCIConfirmation(
  purchaseId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const record: CCIConfirmationRecord = {
      purchase_id: purchaseId,
      confirmation_version: CONFIRMATION_VERSION,
      confirmation_text: CCI_CONFIRMATION_TEXT,
      confirmed_at: new Date().toISOString(),
      user_id: userId,
    };

    // Get existing confirmations
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const confirmations: CCIConfirmationRecord[] = existing
      ? JSON.parse(existing)
      : [];

    // Add new confirmation
    confirmations.push(record);

    // Store
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(confirmations));

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to record confirmation.' };
  }
}

/**
 * Get all CCI confirmations (for audit)
 */
export async function getCCIConfirmations(): Promise<CCIConfirmationRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Check if a specific purchase has confirmation
 */
export async function hasCCIConfirmation(purchaseId: string): Promise<boolean> {
  const confirmations = await getCCIConfirmations();
  return confirmations.some((c) => c.purchase_id === purchaseId);
}

/**
 * Get confirmation version for audit
 */
export function getConfirmationVersion(): string {
  return CONFIRMATION_VERSION;
}
