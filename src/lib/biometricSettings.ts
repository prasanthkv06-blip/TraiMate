import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'traimate_biometric_enabled';
const BIOMETRIC_TIMEOUT_KEY = 'traimate_biometric_timeout';

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return val === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(enabled));
}

// Timeout in seconds before requiring re-auth (default 60s)
export async function getBiometricTimeout(): Promise<number> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_TIMEOUT_KEY);
  return val ? parseInt(val, 10) : 60;
}

export async function setBiometricTimeout(seconds: number): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_TIMEOUT_KEY, String(seconds));
}
