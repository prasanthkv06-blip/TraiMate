import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'TrailMate',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function savePushToken(userId: string, token: string) {
  await (supabase.from('profiles') as any)
    .update({ push_token: token })
    .eq('id', userId);
}

export function setupRealtimeNotifications(userId: string, onNotification: (payload: any) => void) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new);

        // Also show a local notification
        Notifications.scheduleNotificationAsync({
          content: {
            title: (payload.new as any).title,
            body: (payload.new as any).body,
          },
          trigger: null as any,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Subscribe to realtime changes for a trip (verifies membership first)
export function subscribeToTrip(tripId: string, handlers: {
  onExpense?: (payload: any) => void;
  onPoll?: (payload: any) => void;
  onItinerary?: (payload: any) => void;
  onMember?: (payload: any) => void;
}) {
  let channelRef: ReturnType<typeof supabase.channel> | null = null;

  // Verify trip membership before subscribing
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data) return; // Not a member, don't subscribe
    } catch {
      // If verification fails (e.g. offline), allow subscription for offline-first UX
    }

    channelRef = supabase
      .channel(`trip:${tripId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `trip_id=eq.${tripId}`,
      }, (payload) => handlers.onExpense?.(payload))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'polls',
        filter: `trip_id=eq.${tripId}`,
      }, (payload) => handlers.onPoll?.(payload))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'itinerary_items',
        filter: `trip_id=eq.${tripId}`,
      }, (payload) => handlers.onItinerary?.(payload))
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_members',
        filter: `trip_id=eq.${tripId}`,
      }, (payload) => handlers.onMember?.(payload))
      .subscribe();
  })();

  return () => {
    if (channelRef) {
      supabase.removeChannel(channelRef);
    }
  };
}
