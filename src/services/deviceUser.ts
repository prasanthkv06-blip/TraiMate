/**
 * Device-based identity for guest mode.
 * Generates a stable UUID on first launch, used as `created_by` for all DB rows.
 */
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@traimate_device_id';
const USER_PROFILE_KEY = '@traimate_user_profile';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  cachedDeviceId = id;
  return id;
}

export interface UserProfile {
  deviceId: string;
  name: string;
  avatarEmoji: string;
}

export async function getUserProfile(): Promise<UserProfile> {
  const deviceId = await getDeviceId();
  const stored = await AsyncStorage.getItem(USER_PROFILE_KEY);
  if (stored) {
    try {
      return { ...JSON.parse(stored), deviceId };
    } catch {}
  }
  return { deviceId, name: 'Traveler', avatarEmoji: '🧳' };
}

export async function saveUserProfile(profile: Omit<UserProfile, 'deviceId'>): Promise<void> {
  await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

/**
 * Returns the current user ID: Supabase auth user ID if authenticated,
 * otherwise falls back to the device-based UUID for guest mode.
 */
export async function getCurrentUserId(): Promise<string> {
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch {
    // Supabase not configured or error — fall back to device ID
  }
  return getDeviceId();
}
