import * as Random from 'expo-crypto';
import { entropyToMnemonic, mnemonicToSeed } from 'bip39';
import { Buffer } from 'buffer';

// Polyfill Buffer for React Native if not already global
if (typeof global.Buffer === 'undefined') {
  (global as any).Buffer = Buffer;
}

export const MnemonicService = {
  /**
   * Generates a new 12-word BIP39 mnemonic
   */
  generatePhrase: async (): Promise<string> => {
    // Generate 128 bits of entropy for a 12-word phrase
    const entropy = await Random.getRandomBytesAsync(16);
    // Convert Uint8Array to Buffer for bip39's entropyToMnemonic
    const entropyBuffer = Buffer.from(entropy);
    return entropyToMnemonic(entropyBuffer);
  },

  /**
   * Derives a 256-bit encryption key from the mnemonic using PBKDF2 logic
   * (Or standard BIP39 seed derivation if preferred)
   */
  deriveKey: async (mnemonic: string): Promise<string> => {
    // Standard BIP39 seed derivation
    const seed = await mnemonicToSeed(mnemonic);
    // We take the first 32 bytes (256 bits) for AES-256
    return seed.slice(0, 32).toString('hex');
  },

  validate: (phrase: string): boolean => {
    return phrase.split(' ').length === 12; // Simple check, real app uses validateMnemonic
  }
};
