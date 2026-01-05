import { File } from 'expo-file-system';
import { decryptPayload } from './crypto';
import { EnergyLog } from '../../types';

export const RestoreService = {
  /**
   * Reads file, decrypts, and returns logs
   */
  restoreFromBackup: async (fileUri: string, mnemonic: string): Promise<EnergyLog[]> => {
    try {
      // 1. Convert mnemonic string to array (crypto.ts expects string[])
      const mnemonicArray = mnemonic.split(' ');

      // 2. Read File using new expo-file-system API
      const file = new File(fileUri);
      const encryptedContent = await file.text();

      // 3. Parse the encrypted payload (contains ciphertext, salt, iv)
      const { ciphertext, salt, iv } = JSON.parse(encryptedContent);

      // 4. Decrypt using existing crypto module
      const logs = await decryptPayload(ciphertext, salt, iv, mnemonicArray);

      // 5. Validate
      if (!Array.isArray(logs)) {
        throw new Error('Invalid backup format');
      }

      return logs as EnergyLog[];
    } catch (error) {
      console.error('Restore failed:', error);
      throw new Error('Invalid mnemonic or corrupted backup file');
    }
  }
};
