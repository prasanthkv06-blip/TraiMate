import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../src/constants/theme';
import TripCard from '../../src/components/TripCard';
import { SAMPLE_TRIPS } from '../../src/constants/sampleData';

type Filter = 'all' | 'upcoming' | 'memories';

const FILTERS: { key: Filter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'globe-outline' },
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'memories', label: 'Memories', icon: 'heart-outline' },
];

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const filteredTrips = SAMPLE_TRIPS.filter((trip) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'upcoming') return trip.phase === 'planning' || trip.phase === 'live';
    if (activeFilter === 'memories') return trip.phase === 'review';
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <Text style={styles.title}>My Trips</Text>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        style={styles.filtersScroll}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveFilter(f.key);
              }}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Ionicons
                name={f.icon}
                size={14}
                color={isActive ? Colors.white : Colors.textSecondary}
              />
              <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Trip list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {filteredTrips.length > 0 ? (
          filteredTrips.map((trip) => (
            <View key={trip.id} style={styles.cardWrapper}>
              <TripCard
                trip={trip}
                onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })}
              />
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="airplane-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No trips here yet</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'upcoming'
                ? 'Plan your next adventure!'
                : 'Your travel memories will show up here'}
            </Text>
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  filtersScroll: {
    flexGrow: 0,
    marginBottom: Spacing.lg,
  },
  filtersRow: {
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.sage,
    borderColor: Colors.sage,
  },
  filterLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  filterLabelActive: {
    color: Colors.white,
  },
  listContent: {
    alignItems: 'center',
  },
  cardWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  emptySubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
