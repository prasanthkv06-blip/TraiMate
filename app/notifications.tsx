import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import {
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  timeAgo,
  type LocalNotification,
} from '../src/services/notificationService';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<LocalNotification[]>([]);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const reload = useCallback(async () => {
    const notifs = await loadNotifications();
    setNotifications(notifs);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    markNotificationRead(id);
  };

  const markAllRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllNotificationsRead();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={10}>
            <Text style={styles.markAllRead}>Read all</Text>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        {unreadCount > 0 && (
          <View style={styles.unreadBanner}>
            <Text style={styles.unreadText}>{unreadCount} unread</Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {notifications.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🔔</Text>
              <Text style={{ fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text, marginBottom: 8 }}>No notifications yet</Text>
              <Text style={{ fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: 'center' }}>
                Activity from your squad will show up here
              </Text>
            </View>
          )}

          {/* New section */}
          {notifications.some((n) => !n.read) && (
            <Text style={styles.sectionLabel}>NEW</Text>
          )}
          {notifications
            .filter((n) => !n.read)
            .map((notif) => (
              <Pressable
                key={notif.id}
                onPress={() => markRead(notif.id)}
                style={[styles.notifCard, styles.notifCardUnread]}
              >
                <View style={styles.notifDot} />
                <View style={styles.notifIcon}>
                  <Text style={styles.notifEmoji}>{notif.emoji}</Text>
                </View>
                <View style={styles.notifBody}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  <Text style={styles.notifText}>{notif.body}</Text>
                  <Text style={styles.notifTime}>{timeAgo(notif.time)}</Text>
                </View>
              </Pressable>
            ))}

          {/* Earlier section */}
          {notifications.some((n) => n.read) && (
            <Text style={styles.sectionLabel}>EARLIER</Text>
          )}
          {notifications
            .filter((n) => n.read)
            .map((notif) => (
              <Pressable
                key={notif.id}
                style={styles.notifCard}
              >
                <View style={styles.notifIcon}>
                  <Text style={styles.notifEmoji}>{notif.emoji}</Text>
                </View>
                <View style={styles.notifBody}>
                  <Text style={[styles.notifTitle, styles.notifTitleRead]}>{notif.title}</Text>
                  <Text style={[styles.notifText, styles.notifTextRead]}>{notif.body}</Text>
                  <Text style={styles.notifTime}>{timeAgo(notif.time)}</Text>
                </View>
              </Pressable>
            ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backArrow: { fontSize: 24, color: Colors.text },
  headerTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text },
  markAllRead: { fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.sm, color: Colors.accent },
  content: { flex: 1 },
  unreadBanner: {
    backgroundColor: Colors.accent,
    marginHorizontal: Spacing.xl,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.pill,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  unreadText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  scrollContent: { paddingHorizontal: Spacing.xl },
  sectionLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    padding: 14,
    borderRadius: BorderRadius.lg,
    marginBottom: 8,
    ...Shadows.card,
  },
  notifCardUnread: {
    backgroundColor: '#FDF6F0',
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifEmoji: { fontSize: 22 },
  notifBody: { flex: 1 },
  notifTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginBottom: 2,
  },
  notifTitleRead: {
    fontFamily: Fonts.bodyMedium,
    color: Colors.textSecondary,
  },
  notifText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  notifTextRead: {
    color: Colors.textSecondary,
  },
  notifTime: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
});
