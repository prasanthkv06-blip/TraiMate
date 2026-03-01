import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { usePlaceAutocomplete } from '../../src/hooks/useGooglePlaces';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Data ───────────────────────────────────────────────────────────────

const POPULAR_DESTINATIONS = [
  { name: 'Paris', country: 'France', tagline: 'City of Lights', gradient: ['#1a1a2e', '#16213e'] as const },
  { name: 'Tokyo', country: 'Japan', tagline: 'Where tradition meets future', gradient: ['#2d1b69', '#11052c'] as const },
  { name: 'Bali', country: 'Indonesia', tagline: 'Island of the Gods', gradient: ['#1b4332', '#081c15'] as const },
  { name: 'Dubai', country: 'UAE', tagline: 'City of Gold', gradient: ['#6b3a0a', '#3d1f00'] as const },
  { name: 'Bangkok', country: 'Thailand', tagline: 'Land of Smiles', gradient: ['#7b2d26', '#3b1218'] as const },
  { name: 'Goa', country: 'India', tagline: 'Sun, sand & serenity', gradient: ['#1a535c', '#0b2d30'] as const },
];

const TRAVEL_CATEGORIES = [
  { label: 'Beaches', icon: 'umbrella' as const, color: '#3B82F6', bgTint: 'rgba(59,130,246,0.12)' },
  { label: 'Mountains', icon: 'trail-sign' as const, color: '#22C55E', bgTint: 'rgba(34,197,94,0.12)' },
  { label: 'City Life', icon: 'business' as const, color: '#A855F7', bgTint: 'rgba(168,85,247,0.12)' },
  { label: 'Food Tours', icon: 'restaurant' as const, color: '#F59E0B', bgTint: 'rgba(245,158,11,0.12)' },
  { label: 'Adventure', icon: 'rocket' as const, color: '#EF4444', bgTint: 'rgba(239,68,68,0.12)' },
  { label: 'Culture', icon: 'color-palette' as const, color: '#F97316', bgTint: 'rgba(249,115,22,0.12)' },
];

const TRAVEL_TIPS = [
  {
    icon: 'bag-check' as const,
    title: 'Pack Light, Travel Far',
    description: 'Roll clothes instead of folding, pick versatile layers, and always leave room for souvenirs.',
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Stay Safe Abroad',
    description: 'Keep copies of documents, share your itinerary with someone, and trust your instincts.',
  },
  {
    icon: 'wallet' as const,
    title: 'Budget Travel Hacks',
    description: 'Travel off-season, eat where locals eat, and use public transport to save big.',
  },
  {
    icon: 'airplane' as const,
    title: 'Best Time to Book Flights',
    description: 'Book domestic flights 1-3 months ahead and international flights 2-8 months ahead for the best fares.',
  },
];

const TRENDING_TAGS = [
  'Cherry Blossoms',
  'Northern Lights',
  'Santorini',
  'Safari',
  'Maldives',
  'Swiss Alps',
];

// ── Component ──────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { results: autocompleteResults, isLoading: autocompleteLoading } = usePlaceAutocomplete(searchQuery);

  // Staggered entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;
  const destinationsAnim = useRef(new Animated.Value(0)).current;
  const categoriesAnim = useRef(new Animated.Value(0)).current;
  const tipsAnim = useRef(new Animated.Value(0)).current;
  const trendingAnim = useRef(new Animated.Value(0)).current;

  const headerY = useRef(new Animated.Value(18)).current;
  const searchY = useRef(new Animated.Value(18)).current;
  const destinationsY = useRef(new Animated.Value(22)).current;
  const categoriesY = useRef(new Animated.Value(22)).current;
  const tipsY = useRef(new Animated.Value(22)).current;
  const trendingY = useRef(new Animated.Value(22)).current;

  useEffect(() => {
    const sequence = Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(headerY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(searchAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(searchY, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(destinationsAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(destinationsY, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(categoriesAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(categoriesY, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(tipsAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(tipsY, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(trendingAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(trendingY, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ]);
    sequence.start();
  }, []);

  // ── Search filtering ────────────────────────────────────────────────
  const query = searchQuery.trim().toLowerCase();

  const filteredDestinations = query
    ? POPULAR_DESTINATIONS.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.country.toLowerCase().includes(query) ||
          d.tagline.toLowerCase().includes(query),
      )
    : POPULAR_DESTINATIONS;

  const filteredCategories = query
    ? TRAVEL_CATEGORIES.filter((c) => c.label.toLowerCase().includes(query))
    : TRAVEL_CATEGORIES;

  const filteredTips = query
    ? TRAVEL_TIPS.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query),
      )
    : TRAVEL_TIPS;

  const filteredTrending = query
    ? TRENDING_TAGS.filter((tag) => tag.toLowerCase().includes(query))
    : TRENDING_TAGS;

  // ── Handlers ────────────────────────────────────────────────────────

  const handleDestinationPress = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Discover', `Opening ${name} guide...`);
  };

  const handleCategoryPress = (label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Category', `Browsing ${label}`);
  };

  const handleTrendingPress = (tag: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery(tag);
  };

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Render helpers ──────────────────────────────────────────────────

  const renderNoResults = (section: string) => (
    <View style={styles.noResults}>
      <Ionicons name="search-outline" size={22} color={Colors.textMuted} />
      <Text style={styles.noResultsText}>No {section} match your search</Text>
    </View>
  );

  // ── JSX ─────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ────────────────────────────────── */}
        <Animated.View style={[styles.header, { opacity: headerAnim, transform: [{ translateY: headerY }] }]}>
          <Text style={styles.title}>Discover</Text>
          <Text style={styles.subtitle}>Find your next adventure</Text>
        </Animated.View>

        {/* ── Search Bar ────────────────────────────── */}
        <Animated.View style={[styles.searchWrapper, { opacity: searchAnim, transform: [{ translateY: searchY }] }]}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search any destination..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* ── Autocomplete Results ─────────────────────── */}
        {searchQuery.trim().length >= 2 && (autocompleteResults.length > 0 || autocompleteLoading) && (
          <Animated.View style={[styles.autocompleteContainer, { opacity: searchAnim }]}>
            {autocompleteLoading && autocompleteResults.length === 0 && (
              <View style={styles.autocompleteLoading}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <Text style={styles.autocompleteLoadingText}>Searching destinations...</Text>
              </View>
            )}
            {autocompleteResults.map((result) => (
              <Pressable
                key={result.placeId}
                style={({ pressed }) => [styles.autocompleteItem, pressed && { backgroundColor: Colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchQuery('');
                  router.push({
                    pathname: '/create-trip' as any,
                    params: { prefill: result.fullText },
                  });
                }}
              >
                <Ionicons name="location-outline" size={18} color={Colors.accent} />
                <View style={styles.autocompleteTextWrap}>
                  <Text style={styles.autocompleteMain}>{result.mainText}</Text>
                  {result.secondaryText ? (
                    <Text style={styles.autocompleteSecondary}>{result.secondaryText}</Text>
                  ) : null}
                </View>
                <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* ── Popular Destinations ───────────────────── */}
        <Animated.View style={{ opacity: destinationsAnim, transform: [{ translateY: destinationsY }] }}>
          <View style={styles.sectionHeader}>
            <Ionicons name="compass-outline" size={20} color={Colors.sage} />
            <Text style={styles.sectionTitle}>Popular Destinations</Text>
          </View>

          {filteredDestinations.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {filteredDestinations.map((dest, index) => (
                <Pressable
                  key={dest.name}
                  onPress={() => handleDestinationPress(dest.name)}
                  style={({ pressed }) => [
                    styles.destinationCard,
                    pressed && styles.pressedCard,
                  ]}
                >
                  <LinearGradient
                    colors={[dest.gradient[0], dest.gradient[1]]}
                    style={styles.destinationGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  >
                    {/* Decorative icon at top-right */}
                    <View style={styles.destinationIconBadge}>
                      <Ionicons name="location" size={16} color="rgba(255,255,255,0.5)" />
                    </View>

                    <View style={styles.destinationTextArea}>
                      <Text style={styles.destinationName}>{dest.name}</Text>
                      <Text style={styles.destinationCountry}>{dest.country}</Text>
                      <Text style={styles.destinationTagline} numberOfLines={1}>{dest.tagline}</Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            renderNoResults('destinations')
          )}
        </Animated.View>

        {/* ── Travel Categories ──────────────────────── */}
        <Animated.View style={{ opacity: categoriesAnim, transform: [{ translateY: categoriesY }] }}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid-outline" size={20} color={Colors.sage} />
            <Text style={styles.sectionTitle}>Travel Categories</Text>
          </View>

          {filteredCategories.length > 0 ? (
            <View style={styles.categoriesGrid}>
              {filteredCategories.map((cat) => (
                <Pressable
                  key={cat.label}
                  onPress={() => handleCategoryPress(cat.label)}
                  style={({ pressed }) => [
                    styles.categoryCard,
                    pressed && styles.pressedCard,
                  ]}
                >
                  <View style={[styles.categoryIconCircle, { backgroundColor: cat.bgTint }]}>
                    <Ionicons name={cat.icon} size={24} color={cat.color} />
                  </View>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            renderNoResults('categories')
          )}
        </Animated.View>

        {/* ── Travel Tips ────────────────────────────── */}
        <Animated.View style={{ opacity: tipsAnim, transform: [{ translateY: tipsY }] }}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={20} color={Colors.sage} />
            <Text style={styles.sectionTitle}>Travel Tips</Text>
          </View>

          {filteredTips.length > 0 ? (
            <View style={styles.tipsContainer}>
              {filteredTips.map((tip) => (
                <View key={tip.title} style={styles.tipCard}>
                  {/* Sage green left accent */}
                  <View style={styles.tipAccent} />
                  <View style={styles.tipIconWrap}>
                    <Ionicons name={tip.icon} size={22} color={Colors.sage} />
                  </View>
                  <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <Text style={styles.tipDescription}>{tip.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            renderNoResults('tips')
          )}
        </Animated.View>

        {/* ── Trending Now ───────────────────────────── */}
        <Animated.View style={{ opacity: trendingAnim, transform: [{ translateY: trendingY }] }}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up-outline" size={20} color={Colors.sage} />
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>

          {filteredTrending.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingScroll}
            >
              {filteredTrending.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => handleTrendingPress(tag)}
                  style={({ pressed }) => [
                    styles.trendingPill,
                    pressed && styles.trendingPillPressed,
                  ]}
                >
                  <Ionicons name="flame-outline" size={14} color={Colors.accent} style={{ marginRight: 4 }} />
                  <Text style={styles.trendingText}>{tag}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            renderNoResults('trends')
          )}
        </Animated.View>

        {/* Bottom spacer for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const DEST_CARD_WIDTH = 160;
const DEST_CARD_HEIGHT = 200;
const CATEGORY_GAP = Spacing.sm;
const CATEGORY_CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - CATEGORY_GAP * 2) / 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },

  // Header
  header: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxl,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // Search
  searchWrapper: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    padding: 0,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },

  // Popular Destinations
  horizontalScroll: {
    paddingRight: Spacing.xl,
    gap: Spacing.md,
  },
  destinationCard: {
    width: DEST_CARD_WIDTH,
    height: DEST_CARD_HEIGHT,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  destinationGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },
  destinationIconBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationTextArea: {
    gap: 2,
  },
  destinationName: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.lg,
    color: '#FFFFFF',
  },
  destinationCountry: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  destinationTagline: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },

  // Categories
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CATEGORY_GAP,
  },
  categoryCard: {
    width: CATEGORY_CARD_WIDTH,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  categoryLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },

  // Tips
  tipsContainer: {
    gap: Spacing.sm,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  tipAccent: {
    width: 4,
    backgroundColor: Colors.sage,
  },
  tipIconWrap: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
  },
  tipTitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: 4,
  },
  tipDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Trending
  trendingScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  trendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  trendingPillPressed: {
    backgroundColor: Colors.border,
  },
  trendingText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },

  // Shared
  pressedCard: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  noResults: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  noResultsText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },

  // Autocomplete
  autocompleteContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.card,
  },
  autocompleteLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  autocompleteLoadingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  autocompleteTextWrap: {
    flex: 1,
  },
  autocompleteMain: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  autocompleteSecondary: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
