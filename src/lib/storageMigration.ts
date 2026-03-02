import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorage } from './secureStorage';

const STORAGE_VERSION_KEY = '@traimate_storage_version';
const TARGET_VERSION = 2;

const SENSITIVE_EXACT_KEYS = ['@traimate_travel_documents'];
const SENSITIVE_PREFIX = '@traimate_trip_';

/**
 * Migrate existing plaintext sensitive data to encrypted storage.
 *
 * Safe to call on every app launch — it checks the persisted storage version
 * and only runs when an upgrade is needed.
 */
export async function runStorageMigration(): Promise<void> {
  try {
    const versionRaw = await AsyncStorage.getItem(STORAGE_VERSION_KEY);
    const currentVersion = versionRaw ? parseInt(versionRaw, 10) : 0;

    if (currentVersion >= TARGET_VERSION) {
      return; // Already up-to-date
    }

    // Collect all keys that need encryption
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToMigrate: string[] = [];

    for (const key of allKeys) {
      if (SENSITIVE_EXACT_KEYS.includes(key)) {
        keysToMigrate.push(key);
        continue;
      }
      if (key.startsWith(SENSITIVE_PREFIX)) {
        keysToMigrate.push(key);
      }
    }

    // Re-encrypt each key in-place: read plaintext via AsyncStorage, write
    // encrypted value via SecureStorage (which writes back to AsyncStorage
    // under the hood with the enc_v1: prefix).
    for (const key of keysToMigrate) {
      const plaintext = await AsyncStorage.getItem(key);
      if (plaintext === null) {
        continue;
      }

      // If already encrypted (e.g. partial migration), skip
      if (plaintext.startsWith('enc_v1:')) {
        continue;
      }

      await SecureStorage.setItem(key, plaintext);
    }

    // Persist the new version
    await AsyncStorage.setItem(STORAGE_VERSION_KEY, String(TARGET_VERSION));
  } catch (error) {
    // Migration is best-effort — log but do not crash the app
    console.warn('[storageMigration] migration failed:', error);
  }
}
