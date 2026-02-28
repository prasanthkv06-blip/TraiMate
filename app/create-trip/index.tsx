import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { POPULAR_DESTINATIONS } from '../../src/constants/destinations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DestinationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(15)).current;
  const gridOpacity = useRef(new Animated.Value(0)).current;
  const gridY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(headerY, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(gridOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(gridY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const filtered = POPULAR_DESTINATIONS.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.country.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dest = POPULAR_DESTINATIONS.find((d) => d.id === id);
    if (dest) {
      router.push({
        pathname: '/create-trip/details',
        params: { destination: `${dest.emoji} ${dest.name}, ${dest.country}` },
      });
    }
  };

  const handleNext = () => {
    if (!selectedId && !search.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dest = POPULAR_DESTINATIONS.find((d) => d.id === selectedId);
    const destination = dest ? `${dest.emoji} ${dest.name}, ${dest.country}` : search.trim();
    router.push({
      pathname: '/create-trip/details',
      params: { destination },
    });
  };

  const canProceed = selectedId || search.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View
        style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerY }] }]}
      >
        <Pressable onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
        </View>
        <View style={{ width: 28 }} />
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: headerOpacity, transform: [{ translateY: headerY }] }}>
          <Text style={styles.title}>Where are you{'\n'}heading? ✈️</Text>
          <Text style={styles.subtitle}>Pick a destination or type your own</Text>

          {/* Search input */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                if (text.length > 0) setSelectedId(null);
              }}
              placeholder="Search destinations..."
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Destination grid */}
        <Animated.View
          style={[styles.grid, { opacity: gridOpacity, transform: [{ translateY: gridY }] }]}
        >
          {filtered.map((dest) => {
            const isSelected = selectedId === dest.id;
            return (
              <Pressable
                key={dest.id}
                onPress={() => handleSelect(dest.id)}
                style={[
                  styles.destCard,
                  isSelected && styles.destCardSelected,
                ]}
              >
                <ImageBackground
                  source={{ uri: dest.image }}
                  style={styles.destImage}
                  imageStyle={styles.destImageStyle}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(44, 37, 32, 0.7)']}
                    style={styles.destGradient}
                  />
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                  <View style={styles.destInfo}>
                    <Text style={styles.destEmoji}>{dest.emoji}</Text>
                    <Text style={styles.destName}>{dest.name}</Text>
                    <Text style={styles.destCountry}>{dest.country}</Text>
                  </View>
                </ImageBackground>
              </Pressable>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Next button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          onPress={handleNext}
          disabled={!canProceed}
          style={({ pressed }) => [
            styles.nextButton,
            !canProceed && styles.nextButtonDisabled,
            pressed && canProceed && { transform: [{ scale: 0.97 }] },
          ]}
        >
          <LinearGradient
            colors={canProceed ? [Colors.accent, Colors.accentDark] : [Colors.border, Colors.border]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextButtonGradient}
          >
            <Text style={[styles.nextButtonText, !canProceed && { color: Colors.textMuted }]}>
              Next
            </Text>
            <Text style={[styles.nextButtonArrow, !canProceed && { color: Colors.textMuted }]}>
              →
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - CARD_GAP) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    fontSize: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
    width: 28,
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.accent,
    width: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 20,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.xxxl,
    color: Colors.text,
    lineHeight: 44,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: 14,
  },
  clearButton: {
    fontSize: 16,
    color: Colors.textMuted,
    padding: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  destCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.2,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  destCardSelected: {
    borderColor: Colors.accent,
  },
  destImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  destImageStyle: {
    borderRadius: BorderRadius.lg - 3,
  },
  destGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.lg - 3,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  destInfo: {
    padding: 12,
  },
  destEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  destName: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  destCountry: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
  },
  nextButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: Spacing.sm,
  },
  nextButtonText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  nextButtonArrow: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: FontSizes.xl,
    color: Colors.white,
  },
});
