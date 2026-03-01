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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import TripCard from '../../src/components/TripCard';
import { SAMPLE_TRIPS } from '../../src/constants/sampleData';

const USER_NAME_KEY = '@traimate_user_name';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Derive stats from trip data
function getTripStats() {
  const upcoming = SAMPLE_TRIPS.filter((t) => t.phase === 'planning' || t.phase === 'live');
  const past = SAMPLE_TRIPS.filter((t) => t.phase === 'review');

  // Extract unique countries from destination strings
  const countries = new Set(
    SAMPLE_TRIPS.map((t) => {
      const parts = t.destination.split(', ');
      return parts[parts.length - 1];
    })
  );

  // Rough day calculation from date strings
  const totalDays = SAMPLE_TRIPS.reduce((sum, t) => {
    const startDay = parseInt(t.startDate.split(' ')[1], 10);
    const endDay = parseInt(t.endDate.split(' ')[1], 10);
    return sum + Math.max(endDay - startDay, 1);
  }, 0);

  return {
    upcomingCount: upcoming.length,
    pastCount: past.length,
    countriesCount: countries.size,
    totalDays,
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const stats = getTripStats();

  // Staggered entrance animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(15)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchY = useRef(new Animated.Value(15)).current;
  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const welcomeY = useRef(new Animated.Value(20)).current;
  const chipsOpacity = useRef(new Animated.Value(0)).current;
  const chipsY = useRef(new Animated.Value(15)).current;
  const sectionOpacity = useRef(new Animated.Value(0)).current;
  const sectionY = useRef(new Animated.Value(20)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsY = useRef(new Animated.Value(25)).current;

  // Sparkle pulse animation
  const sparklePulse = useRef(new Animated.Value(1)).current;

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
        Animated.timing(welcomeOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(welcomeY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(chipsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(chipsY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
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

    // Looping sparkle pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(sparklePulse, { toValue: 1.2, duration: 1200, useNativeDriver: true }),
        Animated.timing(sparklePulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const upcomingTrips = SAMPLE_TRIPS.filter((t) => t.phase === 'planning' || t.phase === 'live');
  const pastTrips = SAMPLE_TRIPS.filter((t) => t.phase === 'review');

  const insightChips = [
    { icon: 'calendar-outline' as const, label: `${stats.upcomingCount} upcoming trips`, color: Colors.sage },
    { icon: 'globe-outline' as const, label: `${stats.countriesCount} countries explored`, color: Colors.accent },
    { icon: 'airplane-outline' as const, label: `${stats.totalDays} days of travel`, color: Colors.sageDark },
    { icon: 'people-outline' as const, label: `${SAMPLE_TRIPS.reduce((s, t) => s + t.memberCount, 0)} travel companions`, color: Colors.accentDark },
  ];

  const handlePlanTrip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/create-trip');
  };

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
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{userName || 'Traveler'} </Text>
              <Animated.View style={{ transform: [{ scale: sparklePulse }] }}>
                <Ionicons name="sparkles" size={22} color={Colors.accent} />
              </Animated.View>
            </View>
          </View>
          <Pressable
            style={styles.notifButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/notifications'); }}
            hitSlop={12}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
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

        {/* Welcome / Stats card */}
        <Animated.View
          style={[
            { opacity: welcomeOpacity, transform: [{ translateY: welcomeY }] },
          ]}
        >
          <Pressable onPress={handlePlanTrip}>
            <LinearGradient
              colors={['#5E8A5A', '#3D6B39']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeCard}
            >
              {/* Decorative icons */}
              <View style={styles.welcomeDecoTopRight}>
                <Ionicons name="compass-outline" size={48} color="rgba(255,255,255,0.1)" />
              </View>
              <View style={styles.welcomeDecoBottomLeft}>
                <Ionicons name="map-outline" size={40} color="rgba(255,255,255,0.08)" />
              </View>

              <View style={styles.welcomeContent}>
                <View style={styles.welcomeHeaderRow}>
                  <Animated.View style={{ transform: [{ scale: sparklePulse }] }}>
                    <Ionicons name="sparkles" size={18} color="rgba(255,255,255,0.8)" />
                  </Animated.View>
                  <Text style={styles.welcomeLabel}>Your Journey</Text>
                </View>
                <Text style={styles.welcomeTitle}>Your next adventure awaits</Text>
                <Text style={styles.welcomeSubtitle}>
                  {stats.upcomingCount} upcoming {stats.upcomingCount === 1 ? 'trip' : 'trips'} across {stats.countriesCount} {stats.countriesCount === 1 ? 'country' : 'countries'}
                </Text>

                {/* Stats row inside the card */}
                <View style={styles.welcomeStatsRow}>
                  <View style={styles.welcomeStat}>
                    <Ionicons name="navigate" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.welcomeStatValue}>{stats.upcomingCount}</Text>
                    <Text style={styles.welcomeStatLabel}>Upcoming</Text>
                  </View>
                  <View style={styles.welcomeStatDivider} />
                  <View style={styles.welcomeStat}>
                    <Ionicons name="checkmark-done" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.welcomeStatValue}>{stats.pastCount}</Text>
                    <Text style={styles.welcomeStatLabel}>Completed</Text>
                  </View>
                  <View style={styles.welcomeStatDivider} />
                  <View style={styles.welcomeStat}>
                    <Ionicons name="earth" size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.welcomeStatValue}>{stats.countriesCount}</Text>
                    <Text style={styles.welcomeStatLabel}>Countries</Text>
                  </View>
                </View>

                {/* CTA Button */}
                <View style={styles.welcomeCta}>
                  <Text style={styles.welcomeCtaText}>Plan a Trip</Text>
                  <Ionicons name="arrow-forward" size={16} color={Colors.sage} />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Quick insight chips */}
        <Animated.View
          style={[
            { opacity: chipsOpacity, transform: [{ translateY: chipsY }] },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
            style={styles.chipsScroll}
          >
            {insightChips.map((chip) => (
              <View
                key={chip.label}
                style={[
                  styles.chip,
                  { backgroundColor: `${chip.color}14` },
                ]}
              >
                <View style={[styles.chipIconWrap, { backgroundColor: `${chip.color}22` }]}>
                  <Ionicons name={chip.icon} size={14} color={chip.color} />
                </View>
                <Text style={[styles.chipLabel, { color: chip.color }]}>{chip.label}</Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Upcoming trips */}
        <Animated.View
          style={{
            opacity: sectionOpacity,
            transform: [{ translateY: sectionY }],
          }}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="briefcase" size={20} color={Colors.text} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Your Trips</Text>
            </View>
            <Pressable style={styles.seeAllButton}>
              <Text style={styles.seeAll}>See all</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
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
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="heart" size={20} color={Colors.text} style={styles.sectionIcon} />
                  <Text style={styles.sectionTitle}>Memories</Text>
                </View>
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
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  userName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
  },
  notifButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.error,
    borderWidth: 2,
    borderColor: Colors.white,
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

  // Welcome card
  welcomeCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.cardHover,
  },
  welcomeDecoTopRight: {
    position: 'absolute',
    top: -6,
    right: -6,
    opacity: 1,
  },
  welcomeDecoBottomLeft: {
    position: 'absolute',
    bottom: -4,
    left: -4,
    opacity: 1,
  },
  welcomeContent: {
    position: 'relative',
  },
  welcomeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  welcomeLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  welcomeTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.white,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: Spacing.md,
  },
  welcomeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  welcomeStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  welcomeStatValue: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  welcomeStatLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs - 1,
    color: 'rgba(255,255,255,0.65)',
  },
  welcomeStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.sm,
  },
  welcomeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'flex-start',
  },
  welcomeCtaText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.sage,
  },

  // Insight chips
  chipsScroll: {
    marginBottom: Spacing.lg,
  },
  chipsContainer: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.pill,
    gap: Spacing.xs + 2,
  },
  chipIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.xs,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAll: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.sm,
    color: Colors.accent,
  },
});
