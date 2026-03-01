import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ImageBackground,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { getDestinationImage } from '../../src/utils/destinationImages';

const CATEGORY_DESTINATIONS: Record<string, { name: string; country: string; tagline: string }[]> = {
  Beaches: [
    { name: 'Bali', country: 'Indonesia', tagline: 'Tropical paradise' },
    { name: 'Maldives', country: 'Maldives', tagline: 'Crystal clear waters' },
    { name: 'Goa', country: 'India', tagline: 'Sun, sand & serenity' },
    { name: 'Cancun', country: 'Mexico', tagline: 'Caribbean vibes' },
    { name: 'Miami', country: 'USA', tagline: 'Art Deco beaches' },
    { name: 'Santorini', country: 'Greece', tagline: 'Volcanic shores' },
  ],
  Mountains: [
    { name: 'Zurich', country: 'Switzerland', tagline: 'Alpine wonderland' },
    { name: 'New Zealand', country: 'New Zealand', tagline: 'Middle-earth landscapes' },
    { name: 'Cape Town', country: 'South Africa', tagline: 'Table Mountain views' },
  ],
  'City Life': [
    { name: 'Tokyo', country: 'Japan', tagline: 'Neon-lit streets' },
    { name: 'New York', country: 'USA', tagline: 'The city that never sleeps' },
    { name: 'Paris', country: 'France', tagline: 'City of Lights' },
    { name: 'London', country: 'UK', tagline: 'Historic & modern' },
    { name: 'Dubai', country: 'UAE', tagline: 'City of Gold' },
    { name: 'Singapore', country: 'Singapore', tagline: 'Garden city' },
  ],
  'Food Tours': [
    { name: 'Bangkok', country: 'Thailand', tagline: 'Street food paradise' },
    { name: 'Rome', country: 'Italy', tagline: 'Pasta, pizza, gelato' },
    { name: 'Tokyo', country: 'Japan', tagline: 'Ramen & sushi capital' },
    { name: 'Istanbul', country: 'Turkey', tagline: 'Bazaar flavors' },
    { name: 'Marrakech', country: 'Morocco', tagline: 'Spice markets' },
  ],
  Adventure: [
    { name: 'Bali', country: 'Indonesia', tagline: 'Surfing & volcanoes' },
    { name: 'New Zealand', country: 'New Zealand', tagline: 'Bungee & hiking' },
    { name: 'Cape Town', country: 'South Africa', tagline: 'Shark diving & safaris' },
    { name: 'Dubai', country: 'UAE', tagline: 'Desert safaris' },
  ],
  Culture: [
    { name: 'Kyoto', country: 'Japan', tagline: 'Ancient temples' },
    { name: 'Rome', country: 'Italy', tagline: 'Eternal city' },
    { name: 'Cairo', country: 'Egypt', tagline: 'Pyramids & pharaohs' },
    { name: 'Istanbul', country: 'Turkey', tagline: 'Where East meets West' },
    { name: 'Barcelona', country: 'Spain', tagline: 'Gaudi masterpieces' },
    { name: 'Prague', country: 'Czech Republic', tagline: 'Gothic charm' },
  ],
};

const CATEGORY_ICONS: Record<string, string> = {
  Beaches: 'umbrella',
  Mountains: 'trail-sign',
  'City Life': 'business',
  'Food Tours': 'restaurant',
  Adventure: 'rocket',
  Culture: 'color-palette',
};

export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ label: string }>();
  const label = params.label || 'Category';
  const destinations = CATEGORY_DESTINATIONS[label] || [];
  const icon = CATEGORY_ICONS[label] || 'grid-outline';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Ionicons name={icon as any} size={20} color={Colors.sage} />
          <Text style={styles.headerTitle}>{label}</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subtitle}>
          {destinations.length} destinations to explore
        </Text>

        {destinations.map((dest) => (
          <Pressable
            key={`${dest.name}-${dest.country}`}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push({ pathname: '/explore/destination', params: { name: dest.name, country: dest.country } });
            }}
            style={({ pressed }) => [styles.destCard, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          >
            <ImageBackground source={{ uri: getDestinationImage(dest.name) }} style={styles.destImage} imageStyle={styles.destImageStyle}>
              <LinearGradient colors={['transparent', 'rgba(44,37,32,0.8)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.destContent}>
                <Text style={styles.destName}>{dest.name}</Text>
                <Text style={styles.destCountry}>{dest.country}</Text>
                <Text style={styles.destTagline}>{dest.tagline}</Text>
              </View>
            </ImageBackground>
          </Pressable>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.text },
  scrollContent: { paddingHorizontal: Spacing.xl },
  subtitle: {
    fontFamily: Fonts.body, fontSize: FontSizes.sm, color: Colors.textMuted,
    marginBottom: Spacing.lg,
  },
  destCard: {
    height: 160, borderRadius: BorderRadius.lg, overflow: 'hidden',
    marginBottom: Spacing.md, ...Shadows.card,
  },
  destImage: { flex: 1, justifyContent: 'flex-end' },
  destImageStyle: { borderRadius: BorderRadius.lg },
  destContent: { padding: Spacing.lg },
  destName: { fontFamily: Fonts.heading, fontSize: FontSizes.xl, color: Colors.white },
  destCountry: {
    fontFamily: Fonts.bodySemiBold, fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 2,
  },
  destTagline: { fontFamily: Fonts.body, fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
});
