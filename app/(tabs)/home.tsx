import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import TripCard from '../../src/components/TripCard';
import { SAMPLE_TRIPS } from '../../src/constants/sampleData';

const USER_NAME_KEY = '@trailmate_user_name';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Staggered entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(15)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchY = useRef(new Animated.Value(15)).current;
  const sectionOpacity = useRef(new Animated.Value(0)).current;
  const sectionY = useRef(new Animated.Value(20)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsY = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    AsyncStorage.getItem(USER_NAME_KEY).then((name) => {
      if (name) setUserName(name);
    });

    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(headerY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(searchOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(searchY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(sectionOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(sectionY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(cardsY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const upcomingTrips = SAMPLE_TRIPS.filter((t) => t.phase === 'planning' || t.phase === 'live');
  const pastTrips = SAMPLE_TRIPS.filter((t) => t.phase === 'review');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
      >
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: headerOpacity, transform: [{ translateY: headerY }] },
          ]}
        >
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{userName || 'Traveler'} ✨</Text>
          </View>
          <Pressable style={styles.avatarContainer} onPress={() => router.push('/notifications')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(userName || 'T').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.notifDot} />
          </Pressable>
        </Animated.View>

        {/* Search bar */}
        <Animated.View
          style={[
            styles.searchBar,
            { opacity: searchOpacity, transform: [{ translateY: searchY }] },
          ]}
        >
          <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Search trips, places...</Text>
        </Animated.View>

        {/* Quick actions */}
        <Animated.View
          style={[
            styles.quickActions,
            { opacity: searchOpacity, transform: [{ translateY: searchY }] },
          ]}
        >
          {[
            { icon: 'airplane-outline' as const, label: 'Flights' },
            { icon: 'bed-outline' as const, label: 'Hotels' },
            { icon: 'document-text-outline' as const, label: 'Packing' },
            { icon: 'swap-horizontal-outline' as const, label: 'Budget' },
          ].map((action, i) => (
            <Pressable key={i} style={styles.quickAction}>
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon} size={24} color={Colors.accent} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Upcoming trips */}
        <Animated.View
          style={{
            opacity: sectionOpacity,
            transform: [{ translateY: sectionY }],
          }}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Trips</Text>
            <Pressable>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          style={{
            opacity: cardsOpacity,
            transform: [{ translateY: cardsY }],
            alignItems: 'center',
          }}
        >
          {upcomingTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })} />
          ))}
        </Animated.View>

        {/* Past trips */}
        {pastTrips.length > 0 && (
          <>
            <Animated.View
              style={{
                opacity: cardsOpacity,
                transform: [{ translateY: cardsY }],
              }}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Memories</Text>
              </View>
            </Animated.View>
            <Animated.View
              style={{
                opacity: cardsOpacity,
                transform: [{ translateY: cardsY }],
                alignItems: 'center',
              }}
            >
              {pastTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onPress={() => router.push({ pathname: '/trip/[id]', params: { id: trip.id } })} />
              ))}
            </Animated.View>
          </>
        )}

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  userName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
    marginTop: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchPlaceholder: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textMuted,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...Shadows.card,
  },
  quickActionEmoji: {},
  quickActionLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  seeAll: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
});
