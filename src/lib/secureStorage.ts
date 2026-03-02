import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MASTER_KEY_ALIAS = 'traimate_master_key';
const ENCRYPTED_PREFIX = 'enc_v1:';
const IV_LENGTH = 12;

let cachedMasterKey: CryptoKey | null = null;

// ---------------------------------------------------------------------------
// Helpers – base64 <-> ArrayBuffer
// ---------------------------------------------------------------------------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ---------------------------------------------------------------------------
// Master-key management
// ---------------------------------------------------------------------------

async function getRawKeyBytes(): Promise<Uint8Array> {
  let stored: string | null = null;

  if (Platform.OS === 'web') {
    // Web: fall back to localStorage (document limitation)
    stored = typeof localStorage !== 'undefined'
      ? localStorage.getItem(MASTER_KEY_ALIAS)
      : null;
  } else {
    stored = await SecureStore.getItemAsync(MASTER_KEY_ALIAS);
  }

  if (stored) {
    return new Uint8Array(base64ToArrayBuffer(stored));
  }

  // Generate a new 256-bit key
  const keyBytes = await Crypto.getRandomBytesAsync(32);

  const encoded = arrayBufferToBase64(keyBytes.buffer as ArrayBuffer);

  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MASTER_KEY_ALIAS, encoded);
    }
  } else {
    await SecureStore.setItemAsync(MASTER_KEY_ALIAS, encoded);
  }

  return keyBytes;
}

async function getMasterKey(): Promise<CryptoKey> {
  if (cachedMasterKey) {
    return cachedMasterKey;
  }

  const rawBytes = await getRawKeyBytes();

  const key = await crypto.subtle.importKey(
    'raw',
    rawBytes as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );

  cachedMasterKey = key;
  return key;
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt
// ---------------------------------------------------------------------------

async function encrypt(plaintext: string): Promise<string> {
  const key = await getMasterKey();
  const iv = await Crypto.getRandomBytesAsync(IV_LENGTH);
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data,
  );

  // Concatenate IV + ciphertext
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(new Uint8Array(iv), 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return ENCRYPTED_PREFIX + arrayBufferToBase64(combined.buffer);
}

async function decrypt(stored: string): Promise<string> {
  // Legacy plaintext – return as-is
  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    return stored;
  }

  const key = await getMasterKey();
  const raw = base64ToArrayBuffer(stored.slice(ENCRYPTED_PREFIX.length));
  const bytes = new Uint8Array(raw);

  const iv = bytes.slice(0, IV_LENGTH);
  const ciphertext = bytes.slice(IV_LENGTH);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return decoder.decode(plainBuffer);
}

// ---------------------------------------------------------------------------
// Public API – drop-in AsyncStorage replacement for sensitive data
// ---------------------------------------------------------------------------

async function getItem(key: string): Promise<string | null> {
  const stored = await AsyncStorage.getItem(key);
  if (stored === null) {
    return null;
  }
  return decrypt(stored);
}

async function setItem(key: string, value: string): Promise<void> {
  const encrypted = await encrypt(value);
  await AsyncStorage.setItem(key, encrypted);
}

async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

function clearMasterKey(): void {
  cachedMasterKey = null;
}

export const SecureStorage = {
  getItem,
  setItem,
  removeItem,
};

export { clearMasterKey };
