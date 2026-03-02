/**
 * Migrates guest (device-based) data to an authenticated user account.
 * Updates local AsyncStorage trip data and attempts background Supabase sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId } from './deviceUser';
import { loadTripsIndex, saveTripsIndex, loadTripLocally, saveTripLocally } from './storageCache';
import { supabase } from '../lib/supabase';

const GUEST_MODE_KEY = '@traimate_guest_mode';

export async function migrateGuestDataToUser(newUserId: string): Promise<void> {
  const oldDeviceId = await getDeviceId();

  // 1. Update trips index: swap createdBy from device ID to user ID
  const index = await loadTripsIndex();
  const updatedIndex = index.map(trip =>
    trip.createdBy === oldDeviceId
      ? { ...trip, createdBy: newUserId }
      : trip
  );
  await saveTripsIndex(updatedIndex);

  // 2. Update each trip blob
  for (const trip of updatedIndex) {
    const blob = await loadTripLocally(trip.id);
    if (!blob) continue;

    let changed = false;

    // Update meta.createdBy
    if (blob.meta.createdBy === oldDeviceId) {
      blob.meta.createdBy = newUserId;
      changed = true;
    }

    // Update members[].userId
    if (blob.members) {
      for (const member of blob.members) {
        if (member.userId === oldDeviceId) {
          member.userId = newUserId;
          changed = true;
        }
      }
    }

    if (changed) {
      await saveTripLocally(trip.id, blob);
    }
  }

  // 3. Background Supabase RPC sync (silently catch errors)
  try {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    if (url.length > 0 && !url.includes('your-project')) {
      await supabase.rpc('migrate_guest_data', {
        old_device_id: oldDeviceId,
        new_user_id: newUserId,
      } as any);
    }
  } catch {
    // Silently fail — local migration is sufficient
  }

  // 4. Remove guest mode flag
  await AsyncStorage.removeItem(GUEST_MODE_KEY);
}
