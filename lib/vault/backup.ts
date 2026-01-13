import { Paths, File } from 'expo-file-system';
import { encryptPayload } from './crypto';
import { EnergyLog } from '../../types';

export const BackupService = {
  /**
   * Encrypts logs and saves to local file system
   */
  createBackup: async (logs: EnergyLog[], mnemonic: string): Promise<string> => {
    try {
      // 1. Convert mnemonic string to array (crypto.ts expects string[])
      const mnemonicArray = mnemonic.split(' ');

      // 2. Encrypt using existing crypto module
      const encrypted = await encryptPayload(logs, mnemonicArray);

      // 3. Serialize encrypted payload (includes ciphertext, salt, iv)
      const encryptedData = JSON.stringify(encrypted);

      // 4. Write to File using new expo-file-system API
      const fileName = `orbital_backup_${Date.now()}.enc`;
      const file = new File(Paths.document, fileName);
      await file.write(encryptedData);

      return file.uri;
    } catch (error) {
      if (__DEV__) console.error('Backup failed:', error);
      throw new Error('Failed to create secure backup');
    }
  }
};
