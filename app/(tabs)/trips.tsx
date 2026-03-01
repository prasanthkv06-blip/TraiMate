import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../src/constants/theme';
import TripCard from '../../src/components/TripCard';
import type { Trip } from '../../src/components/TripCard';
import { SAMPLE_TRIPS } from '../../src/constants/sampleData';
import { fetchTrips, type TripIndexEntry } from '../../src/services/tripService';

type Filter = 'all' | 'upcoming' | 'memories';

const FILTERS: { key: Filter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'globe-outline' },
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
  { key: 'memories', label: 'Memories', icon: 'heart-outline' },
];

interface RealTrip extends Trip {
  rawStartDate: string | null;
  rawEndDate: string | null;
}

function toTripCardShape(entry: TripIndexEntry): RealTrip {
  const formatDate = (iso: string | null) => {
    if (!iso) return 'TBD';
    try {
      const d = new Date(iso);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    } catch {
      return 'TBD';
    }
  };

  return {
    id: entry.id,
    name: entry.name,
    destination: entry.destination,
    startDate: formatDate(entry.startDate),
    endDate: formatDate(entry.endDate),
    rawStartDate: entry.startDate,
    rawEndDate: entry.endDate,
    photos: entry.coverImage
      ? [entry.coverImage]
      : ['https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80'],
    memberCount: entry.memberCount,
    phase: entry.phase,
    emoji: entry.emoji,
  };
}

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [realTrips, setRealTrips] = useState<RealTrip[]>([]);

  const loadRealTrips = useCallback(async () => {
    try {
      const entries = await fetchTrips();
      setRealTrips(entries.map(toTripCardShape));
    } catch {}
  }, []);

  useEffect(() => {
    loadRealTrips();
  }, [loadRealTrips]);

  useFocusEffect(
    useCallback(() => {
      loadRealTrips();
    }, [loadRealTrips])
  );

  const allTrips = [...realTrips, ...SAMPLE_TRIPS];

  const filteredTrips = allTrips.filter((trip) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'upcoming') return trip.phase === 'planning' || trip.phase === 'live';
    if (activeFilter === 'memories') return trip.phase === 'review';
    return true;
  });

  const handleTripPress = useCallback((trip: Trip) => {
    const isSample = SAMPLE_TRIPS.some(s => s.id === trip.id);
    if (isSample) {
      router.push({ pathname: '/trip/[id]', params: { id: trip.id } });
    } else {
      const real = trip as RealTrip;
      router.push({
        pathname: '/trip/[id]',
        params: {
          id: trip.id,
          destination: trip.destination,
          tripName: trip.name,
          startDate: real.rawStartDate || '',
          endDate: real.rawEndDate || '',
        },
      });
    }
  }, [router]);

  const renderItem = useCallback(({ item }: { item: RealTrip | Trip }) => (
    <View style={styles.cardWrapper}>
      <TripCard
        trip={item}
        onPress={() => handleTripPress(item)}
      />
    </View>
  ), [handleTripPress]);

  const keyExtractor = useCallback((item: Trip) => item.id, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="airplane-outline" size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No trips here yet</Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === 'upcoming'
          ? 'Plan your next adventure!'
          : 'Your travel memories will show up here'}
      </Text>
    </View>
  ), [activeFilter]);

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
      <FlatList
        data={filteredTrips}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={<View style={{ height: 120 }} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
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
