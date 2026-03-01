import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { loadActivityLog } from '../../src/services/tripService';
import type { ActivityLogEntry } from '../../src/services/storageCache';

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

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tripId?: string }>();
  const tripId = params.tripId || '';
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);

  const fadeIn = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    if (!tripId) return;
    const log = await loadActivityLog(tripId);
    setEntries(log);
  }, [tripId]);

  useEffect(() => {
    loadData();
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [loadData]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Activity</Text>
        <View style={{ width: 22 }} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {entries.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptySubtext}>
                Trip activity will appear here as your squad makes changes
              </Text>
            </View>
          )}

          {entries.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryIcon}>
                <Text style={styles.entryEmoji}>{entry.emoji}</Text>
              </View>
              <View style={styles.entryContent}>
                <Text style={styles.entryText}>
                  <Text style={styles.entryUserName}>{entry.userName}</Text>
                  {' '}{entry.details}
                </Text>
                <Text style={styles.entryTime}>{timeAgo(entry.createdAt)}</Text>
              </View>
            </View>
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
  headerTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    ...Shadows.card,
  },
  entryEmoji: { fontSize: 18 },
  entryContent: { flex: 1 },
  entryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  entryUserName: {
    fontFamily: Fonts.bodySemiBold,
    color: Colors.text,
  },
  entryTime: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
