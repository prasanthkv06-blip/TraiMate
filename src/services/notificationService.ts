/**
 * Local notification service — generates notifications from activity log entries.
 * Works fully offline by reading from AsyncStorage.
 * When Supabase is configured, realtime notifications supplement local ones.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadTripsIndex, loadTripLocally, type ActivityLogEntry } from './storageCache';
import { getDeviceId } from './deviceUser';

const LAST_SEEN_KEY = '@traimate_notif_last_seen';
const READ_IDS_KEY = '@traimate_notif_read_ids';

export interface LocalNotification {
  id: string;
  type: 'trip_invite' | 'expense_added' | 'poll_created' | 'itinerary_update' | 'member_joined' | 'reminder';
  title: string;
  body: string;
  emoji: string;
  tripName?: string;
  tripId?: string;
  read: boolean;
  time: string; // ISO string
}

function actionTypeToNotifType(actionType: string): LocalNotification['type'] {
  const map: Record<string, LocalNotification['type']> = {
    member_joined: 'member_joined',
    expense_added: 'expense_added',
    itinerary_updated: 'itinerary_update',
    poll_created: 'poll_created',
    poll_voted: 'poll_created',
    journal_added: 'itinerary_update',
    trip_updated: 'itinerary_update',
    packing_updated: 'reminder',
    booking_added: 'expense_added',
    booking_updated: 'expense_added',
    booking_removed: 'expense_added',
    chat_message: 'reminder',
  };
  return map[actionType] || 'reminder';
}

function actionTypeToTitle(actionType: string): string {
  const map: Record<string, string> = {
    member_joined: 'New member',
    expense_added: 'New expense',
    itinerary_updated: 'Itinerary updated',
    poll_created: 'New poll',
    poll_voted: 'Poll vote',
    journal_added: 'Journal updated',
    trip_updated: 'Trip updated',
    packing_updated: 'Packing list updated',
    booking_added: 'New booking',
    booking_updated: 'Booking updated',
    booking_removed: 'Booking removed',
    chat_message: 'New message',
  };
  return map[actionType] || 'Trip update';
}

function timeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

/**
 * Load all notifications from activity logs across all trips.
 * Merges read status from local storage.
 */
export async function loadNotifications(): Promise<LocalNotification[]> {
  const deviceId = await getDeviceId();
  const trips = await loadTripsIndex();
  const readIds = await getReadIds();
  const allNotifs: LocalNotification[] = [];

  for (const trip of trips) {
    const blob = await loadTripLocally(trip.id);
    if (!blob?.activityLog) continue;

    for (const entry of blob.activityLog) {
      // Skip own actions — you don't need notifications for what you did
      if (entry.userId === deviceId) continue;

      allNotifs.push({
        id: entry.id,
        type: actionTypeToNotifType(entry.actionType),
        title: actionTypeToTitle(entry.actionType),
        body: `${entry.userName} ${entry.details}`,
        emoji: entry.emoji,
        tripName: trip.name,
        tripId: trip.id,
        read: readIds.has(entry.id),
        time: entry.createdAt,
      });
    }
  }

  // Sort by time, newest first
  allNotifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // Limit to 50 most recent
  return allNotifs.slice(0, 50);
}

async function getReadIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_IDS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const ids = await getReadIds();
  ids.add(id);
  // Keep max 200 read IDs to prevent unbounded growth
  const arr = [...ids].slice(-200);
  await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(arr));
}

export async function markAllNotificationsRead(): Promise<void> {
  const notifs = await loadNotifications();
  const ids = await getReadIds();
  for (const n of notifs) ids.add(n.id);
  const arr = [...ids].slice(-200);
  await AsyncStorage.setItem(READ_IDS_KEY, JSON.stringify(arr));
}

export { timeAgo };
